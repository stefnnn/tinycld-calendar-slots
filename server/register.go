package calendarSlots

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"tinycld.org/core/audit"
	"tinycld.org/core/notify"
)

type bookingRules struct {
	minNoticeHours    int
	bookingWindow     string // "infinite" | "rolling" | "range" | ""
	bookingRollingDays int
	bookingDateFrom   string // YYYY-MM-DD
	bookingDateTo     string // YYYY-MM-DD
	maxBookingsCount  int
	maxBookingsPeriod string // "day" | "week" | "month" | ""
}

func parseBookingRules(page *core.Record) bookingRules {
	return bookingRules{
		minNoticeHours:     page.GetInt("min_notice_hours"),
		bookingWindow:      page.GetString("booking_window"),
		bookingRollingDays: page.GetInt("booking_rolling_days"),
		bookingDateFrom:    page.GetString("booking_date_from"),
		bookingDateTo:      page.GetString("booking_date_to"),
		maxBookingsCount:   page.GetInt("max_bookings_count"),
		maxBookingsPeriod:  page.GetString("max_bookings_period"),
	}
}

func periodKey(t time.Time, period string) string {
	switch period {
	case "day":
		return t.Format("2006-01-02")
	case "week":
		year, week := t.ISOWeek()
		return fmt.Sprintf("%d-W%02d", year, week)
	case "month":
		return t.Format("2006-01")
	}
	return ""
}

func periodBounds(t time.Time, period string) (time.Time, time.Time) {
	switch period {
	case "day":
		start := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		return start, start.AddDate(0, 0, 1)
	case "week":
		weekday := int(t.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		start := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC).
			AddDate(0, 0, -(weekday - 1))
		return start, start.AddDate(0, 0, 7)
	case "month":
		start := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
		return start, start.AddDate(0, 1, 0)
	}
	return time.Time{}, time.Time{}
}

const pbTimeFormat = "2006-01-02 15:04:05.000Z"

type availableSlotsResponse struct {
	PageName   string          `json:"page_name"`
	IntroText  string          `json:"intro_text"`
	SlotTypes  []availableSlot `json:"slot_types"`
	TimeSlots  []timeSlotDay   `json:"time_slots"`
}

type availableSlot struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	DurationMinutes int    `json:"duration_minutes"`
	PaddingMinutes  int    `json:"padding_minutes"`
}

type timeSlotDay struct {
	Date  string     `json:"date"`
	Slots []timeSlot `json:"slots"`
}

type timeSlot struct {
	Start      string `json:"start"`
	End        string `json:"end"`
	SlotTypeID string `json:"slot_type_id"`
}

type bookingsCreateBody struct {
	SlotTypeID string `json:"slot_type_id"`
	GuestName  string `json:"guest_name"`
	GuestEmail string `json:"guest_email"`
	Start      string `json:"start"`
}

func Register(app *pocketbase.PocketBase) {
	audit.RegisterCollection(app, "booking_pages", &audit.CollectionConfig{
		ExtractLabel: audit.LabelFromField("name"),
	})
	audit.RegisterCollection(app, "booking_slot_types", &audit.CollectionConfig{
		ResolveOrg: func(a core.App, record *core.Record) string {
			pageID := record.GetString("page")
			if pageID == "" {
				return ""
			}
			return audit.ResolveViaRelation(a, "booking_pages", pageID, "org")
		},
		ExtractLabel: audit.LabelFromField("name"),
	})
	audit.RegisterCollection(app, "bookings", &audit.CollectionConfig{
		ResolveOrg: func(a core.App, record *core.Record) string {
			pageID := record.GetString("page")
			if pageID == "" {
				return ""
			}
			return audit.ResolveViaRelation(a, "booking_pages", pageID, "org")
		},
		ExtractLabel: audit.LabelFromField("guest_name"),
	})

	// Public API: get available slots for a booking page
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.GET("/api/book/{orgSlug}/{slug}/available-slots", func(re *core.RequestEvent) error {
			orgSlug := re.Request.PathValue("orgSlug")
			slug := re.Request.PathValue("slug")
			return handleAvailableSlots(app, re, orgSlug, slug)
		})

		e.Router.POST("/api/book/{orgSlug}/{slug}/book", func(re *core.RequestEvent) error {
			orgSlug := re.Request.PathValue("orgSlug")
			slug := re.Request.PathValue("slug")
			return handleCreateBooking(app, re, orgSlug, slug)
		})

		return e.Next()
	})

	// Auto-create calendar event + ical_uid when a booking is created
	app.OnRecordCreateRequest("bookings").BindFunc(func(e *core.RecordRequestEvent) error {
		if err := validateAndEnrichBooking(app, e); err != nil {
			return err
		}
		return e.Next()
	})

	app.OnRecordAfterCreateSuccess("bookings").BindFunc(func(e *core.RecordEvent) error {
		go handleBookingAutoCalendarEvent(app, e.Record)
		return e.Next()
	})
}

func handleAvailableSlots(app *pocketbase.PocketBase, re *core.RequestEvent, orgSlug, slug string) error {
	org, err := app.FindFirstRecordByFilter("orgs", "slug = {:slug}", map[string]any{"slug": orgSlug})
	if err != nil {
		return apis.NewNotFoundError("Organization not found", err)
	}

	page, err := app.FindFirstRecordByFilter("booking_pages", "org = {:orgId} && slug = {:slug} && active = true", map[string]any{"orgId": org.Id, "slug": slug})
	if err != nil {
		return apis.NewNotFoundError("Booking page not found", err)
	}

	slotTypes, err := app.FindRecordsByFilter("booking_slot_types", "page = {:pageId}", "", 0, 0, map[string]any{"pageId": page.Id})
	if err != nil {
		return apis.NewInternalServerError("Failed to load slot types", err)
	}

	availRecords, err := app.FindRecordsByFilter("booking_availability", "page = {:pageId}", "", 0, 0, map[string]any{"pageId": page.Id})
	if err != nil {
		return apis.NewInternalServerError("Failed to load availability", err)
	}

	ownerID := page.GetString("owner")
	ownerMemberships, err := app.FindRecordsByFilter(
		"calendar_members",
		"user_org = {:ownerId} && role = 'owner'",
		"", 0, 0,
		map[string]any{"ownerId": ownerID},
	)
	if err != nil {
		return apis.NewInternalServerError("Failed to load calendars", err)
	}

	var ownerCalendarIDs []string
	for _, m := range ownerMemberships {
		ownerCalendarIDs = append(ownerCalendarIDs, m.GetString("calendar"))
	}

	now := time.Now().UTC()
	rules := parseBookingRules(page)

	// Earliest bookable time (min notice)
	earliest := now
	if rules.minNoticeHours > 0 {
		earliest = now.Add(time.Duration(rules.minNoticeHours) * time.Hour)
	}

	// Scan range and optional window boundaries
	scanDays := 28
	var windowStart, windowEnd time.Time
	switch rules.bookingWindow {
	case "rolling":
		if rules.bookingRollingDays > 0 {
			scanDays = rules.bookingRollingDays
		}
		windowEnd = now.AddDate(0, 0, scanDays)
	case "range":
		scanDays = 365
		if rules.bookingDateFrom != "" {
			if d, err := time.Parse("2006-01-02", rules.bookingDateFrom); err == nil {
				windowStart = d
			}
		}
		if rules.bookingDateTo != "" {
			if d, err := time.Parse("2006-01-02", rules.bookingDateTo); err == nil {
				windowEnd = d.AddDate(0, 0, 1) // inclusive
			}
		}
	default: // "infinite" or ""
		scanDays = 365
	}
	if windowEnd.IsZero() {
		windowEnd = now.AddDate(1, 0, 0)
	}

	// Pre-fetch confirmed bookings for max-bookings counting
	bookingsByPeriod := make(map[string]int)
	if rules.maxBookingsCount > 0 && rules.maxBookingsPeriod != "" {
		periodStart, _ := periodBounds(now, rules.maxBookingsPeriod)
		allPageBookings, _ := app.FindRecordsByFilter("bookings",
			"page = {:pageId} && status = 'confirmed' && start >= {:from}",
			"", 0, 0,
			map[string]any{"pageId": page.Id, "from": periodStart.Format(pbTimeFormat)})
		for _, bk := range allPageBookings {
			t, err := time.Parse(pbTimeFormat, bk.GetString("start"))
			if err != nil {
				continue
			}
			bookingsByPeriod[periodKey(t, rules.maxBookingsPeriod)]++
		}
	}

	// Collect busy times from owner's calendar events
	busySlots := make(map[string][]busyRange) // date -> ranges
	if len(ownerCalendarIDs) > 0 {
		for _, calID := range ownerCalendarIDs {
			events, _ := app.FindRecordsByFilter("calendar_events",
				"calendar = {:calId} && start < {:rangeEnd} && end > {:now} && busy_status = 'busy'",
				"", 0, 0,
				map[string]any{"calId": calID, "rangeEnd": windowEnd.Format(pbTimeFormat), "now": now.Format(pbTimeFormat)})
			for _, evt := range events {
				addBusyRange(busySlots, evt.GetString("start"), evt.GetString("end"))
			}
		}
	}

	// Collect existing bookings
	existingBookings, _ := app.FindRecordsByFilter("bookings",
		"page = {:pageId} && start > {:now} && status = 'confirmed'",
		"", 0, 0,
		map[string]any{"pageId": page.Id, "now": now.Format(pbTimeFormat)})
	for _, bk := range existingBookings {
		addBusyRange(busySlots, bk.GetString("start"), bk.GetString("end"))
	}

	// Build availability map
	type availWindow struct {
		startTime string
		endTime   string
	}
	dailyAvail := make(map[int][]availWindow) // dayOfWeek -> windows
	for _, a := range availRecords {
		dow := a.GetInt("day_of_week")
		start := a.GetString("start_time")
		end := a.GetString("end_time")
		dailyAvail[dow] = append(dailyAvail[dow], availWindow{startTime: start, endTime: end})
	}

	// Generate slots across the scan range
	var timeSlots []timeSlotDay
	for d := 0; d < scanDays; d++ {
		date := now.AddDate(0, 0, d)
		dateStr := date.Format("2006-01-02")
		dow := int(date.Weekday())
		windows, ok := dailyAvail[dow]
		if !ok || len(windows) == 0 {
			continue
		}

		// Booking window: skip days outside the allowed range
		if !windowStart.IsZero() && date.Before(windowStart) {
			continue
		}
		if !windowEnd.IsZero() && !date.Before(windowEnd) {
			break
		}

		// Max bookings: skip days where the period limit is already reached
		if rules.maxBookingsCount > 0 && rules.maxBookingsPeriod != "" {
			key := periodKey(date, rules.maxBookingsPeriod)
			if bookingsByPeriod[key] >= rules.maxBookingsCount {
				continue
			}
		}

		busy := busySlots[dateStr]

		var daySlots []timeSlot
		for _, slotType := range slotTypes {
			duration := slotType.GetInt("duration_minutes")
			padding := slotType.GetInt("padding_minutes")
			totalMinutes := duration + padding

			for _, w := range windows {
				startT, err := time.Parse("15:04", w.startTime)
				if err != nil {
					continue
				}
				endT, err := time.Parse("15:04", w.endTime)
				if err != nil {
					continue
				}

				slotStart := time.Date(date.Year(), date.Month(), date.Day(),
					startT.Hour(), startT.Minute(), 0, 0, time.UTC)
				slotEnd := time.Date(date.Year(), date.Month(), date.Day(),
					endT.Hour(), endT.Minute(), 0, 0, time.UTC)

				// Start scanning from the earliest bookable time.
				t := slotStart
				if t.Before(earliest) {
					t = earliest
				}

				for {
					tEnd := t.Add(time.Duration(duration) * time.Minute)
					tEndWithPadding := t.Add(time.Duration(totalMinutes) * time.Minute)
					tPaddingStart := t.Add(-time.Duration(padding) * time.Minute)

					// Slot (duration only) must fit within the availability window.
					if tEnd.After(slotEnd) {
						break
					}

					// A slot at T conflicts with any event overlapping [T-padding, T+duration+padding].
					// This ensures padding is respected both before (provider prep time after a prior
					// event) and after (cleanup time before the next event).
					var conflictEnd time.Time
					for _, b := range busy {
						bs, _ := time.Parse(time.RFC3339, b.start)
						be, _ := time.Parse(time.RFC3339, b.end)
						if tPaddingStart.Before(be) && tEndWithPadding.After(bs) {
							if conflictEnd.IsZero() || be.After(conflictEnd) {
								conflictEnd = be
							}
						}
					}

					if !conflictEnd.IsZero() {
						// Jump to conflictEnd + padding so [t-padding, ...] clears the event.
						t = conflictEnd.Add(time.Duration(padding) * time.Minute)
					} else {
						daySlots = append(daySlots, timeSlot{
							Start:      t.Format(time.RFC3339),
							End:        tEnd.Format(time.RFC3339),
							SlotTypeID: slotType.Id,
						})
						// Advance by duration only — proposed slots are concurrent options,
						// not sequential bookings, so slot granularity drives iteration.
						t = t.Add(time.Duration(duration) * time.Minute)
					}
				}
			}
		}

		if len(daySlots) > 0 {
			timeSlots = append(timeSlots, timeSlotDay{
				Date:  dateStr,
				Slots: daySlots,
			})
		}
	}

	// Build slot types list
	var availTypes []availableSlot
	for _, st := range slotTypes {
		availTypes = append(availTypes, availableSlot{
			ID:              st.Id,
			Name:            st.GetString("name"),
			DurationMinutes: st.GetInt("duration_minutes"),
			PaddingMinutes:  st.GetInt("padding_minutes"),
		})
	}
	sort.Slice(availTypes, func(i, j int) bool {
		return availTypes[i].DurationMinutes < availTypes[j].DurationMinutes
	})

	resp := availableSlotsResponse{
		PageName:  page.GetString("name"),
		IntroText: page.GetString("intro_text"),
		SlotTypes: availTypes,
		TimeSlots: timeSlots,
	}

	return re.JSON(http.StatusOK, resp)
}

type busyRange struct {
	start string
	end   string
}

func addBusyRange(m map[string][]busyRange, startStr, endStr string) {
	start, err := time.Parse(pbTimeFormat, startStr)
	if err != nil {
		return
	}
	end, err := time.Parse(pbTimeFormat, endStr)
	if err != nil {
		return
	}
	dateKey := start.Format("2006-01-02")
	m[dateKey] = append(m[dateKey], busyRange{
		start: start.Format(time.RFC3339),
		end:   end.Format(time.RFC3339),
	})
}

func handleCreateBooking(app *pocketbase.PocketBase, re *core.RequestEvent, orgSlug, slug string) error {
	org, err := app.FindFirstRecordByFilter("orgs", "slug = {:slug}", map[string]any{"slug": orgSlug})
	if err != nil {
		return apis.NewNotFoundError("Organization not found", err)
	}

	page, err := app.FindFirstRecordByFilter("booking_pages", "org = {:orgId} && slug = {:slug} && active = true", map[string]any{"orgId": org.Id, "slug": slug})
	if err != nil {
		return apis.NewNotFoundError("Booking page not found", err)
	}

	var body bookingsCreateBody
	if err := json.NewDecoder(re.Request.Body).Decode(&body); err != nil {
		return apis.NewBadRequestError("Invalid request body", err)
	}

	if body.SlotTypeID == "" || body.GuestName == "" || body.GuestEmail == "" || body.Start == "" {
		return apis.NewBadRequestError("Missing required fields", nil)
	}
	if !strings.Contains(body.GuestEmail, "@") {
		return apis.NewBadRequestError("Invalid email address", nil)
	}

	// Validate slot type belongs to this page
	slotType, err := app.FindRecordById("booking_slot_types", body.SlotTypeID)
	if err != nil || slotType.GetString("page") != page.Id {
		return apis.NewBadRequestError("Invalid slot type", nil)
	}

	startTime, err := time.Parse(time.RFC3339, body.Start)
	if err != nil {
		return apis.NewBadRequestError("Invalid start time", err)
	}
	now := time.Now().UTC()
	if startTime.Before(now.Add(-5 * time.Minute)) {
		return apis.NewBadRequestError("Cannot book in the past", nil)
	}

	rules := parseBookingRules(page)

	// Min notice
	if rules.minNoticeHours > 0 {
		earliest := now.Add(time.Duration(rules.minNoticeHours) * time.Hour)
		if startTime.Before(earliest) {
			return apis.NewBadRequestError(
				fmt.Sprintf("Bookings require at least %d hours notice", rules.minNoticeHours), nil)
		}
	}

	// Booking window
	switch rules.bookingWindow {
	case "rolling":
		if rules.bookingRollingDays > 0 {
			windowEnd := now.AddDate(0, 0, rules.bookingRollingDays)
			if startTime.After(windowEnd) {
				return apis.NewBadRequestError("Booking is outside the available date range", nil)
			}
		}
	case "range":
		if rules.bookingDateFrom != "" {
			from, err := time.Parse("2006-01-02", rules.bookingDateFrom)
			if err == nil && startTime.Before(from) {
				return apis.NewBadRequestError("Booking is before the available date range", nil)
			}
		}
		if rules.bookingDateTo != "" {
			to, err := time.Parse("2006-01-02", rules.bookingDateTo)
			if err == nil && startTime.After(to.AddDate(0, 0, 1)) {
				return apis.NewBadRequestError("Booking is after the available date range", nil)
			}
		}
	}

	// Max bookings per period
	if rules.maxBookingsCount > 0 && rules.maxBookingsPeriod != "" {
		periodStart, periodEnd := periodBounds(startTime, rules.maxBookingsPeriod)
		existing, _ := app.FindRecordsByFilter("bookings",
			"page = {:pageId} && status = 'confirmed' && start >= {:start} && start < {:end}",
			"", 0, 0,
			map[string]any{
				"pageId": page.Id,
				"start":  periodStart.Format(pbTimeFormat),
				"end":    periodEnd.Format(pbTimeFormat),
			})
		if len(existing) >= rules.maxBookingsCount {
			return apis.NewBadRequestError(
				fmt.Sprintf("Maximum bookings per %s has been reached", rules.maxBookingsPeriod), nil)
		}
	}

	duration := slotType.GetInt("duration_minutes")
	endTime := startTime.Add(time.Duration(duration) * time.Minute)

	// Check for conflicts with existing bookings
	conflicts, _ := app.FindRecordsByFilter("bookings",
		"page = {:pageId} && status = 'confirmed' && start < {:endTime} && end > {:startTime}",
		"", 1, 0,
		map[string]any{
			"pageId":    page.Id,
			"startTime": startTime.Format(pbTimeFormat),
			"endTime":   endTime.Format(pbTimeFormat),
		})
	if len(conflicts) > 0 {
		return apis.NewBadRequestError("This time slot is no longer available", nil)
	}

	// Find the owner's calendar to use
	ownerID := page.GetString("owner")
	var calendarID string
	ownerMemberships, _ := app.FindRecordsByFilter(
		"calendar_members",
		"user_org = {:ownerId} && role = 'owner'",
		"", 1, 0,
		map[string]any{"ownerId": ownerID},
	)
	if len(ownerMemberships) > 0 {
		calendarID = ownerMemberships[0].GetString("calendar")
	}

	collection, err := app.FindCollectionByNameOrId("bookings")
	if err != nil {
		return apis.NewInternalServerError("Server error", err)
	}

	record := core.NewRecord(collection)
	record.Set("page", page.Id)
	record.Set("slot_type", body.SlotTypeID)
	record.Set("calendar", calendarID)
	record.Set("guest_name", body.GuestName)
	record.Set("guest_email", body.GuestEmail)
	record.Set("start", startTime.Format(pbTimeFormat))
	record.Set("end", endTime.Format(pbTimeFormat))
	record.Set("status", "confirmed")

	if err := app.Save(record); err != nil {
		return apis.NewInternalServerError("Failed to create booking", err)
	}

	return re.JSON(http.StatusOK, map[string]any{
		"id":         record.Id,
		"guest_name": body.GuestName,
	})
}

func validateAndEnrichBooking(app *pocketbase.PocketBase, e *core.RecordRequestEvent) error {
	// If the request is coming through the API (not our custom handler),
	// validate the page belongs to a real booking page
	pageID := e.Record.GetString("page")
	if pageID == "" {
		return apis.NewBadRequestError("Page is required", nil)
	}
	page, err := app.FindRecordById("booking_pages", pageID)
	if err != nil {
		return apis.NewBadRequestError("Booking page not found", nil)
	}
	if !page.GetBool("active") {
		return apis.NewBadRequestError("Booking page is not active", nil)
	}
	return nil
}

func handleBookingAutoCalendarEvent(app *pocketbase.PocketBase, bookingRecord *core.Record) {
	if !appIsLive(app) {
		return
	}

	status := bookingRecord.GetString("status")
	if status != "confirmed" {
		return
	}

	// Don't double-create
	if bookingRecord.GetString("calendar_event") != "" {
		return
	}

	calendarID := bookingRecord.GetString("calendar")
	if calendarID == "" {
		return
	}

	slotTypeID := bookingRecord.GetString("slot_type")
	slotType, err := app.FindRecordById("booking_slot_types", slotTypeID)
	if err != nil {
		return
	}

	pageID := bookingRecord.GetString("page")
	page, err := app.FindRecordById("booking_pages", pageID)
	if err != nil {
		return
	}

	ownerID := page.GetString("owner")
	ownerRecord, err := app.FindRecordById("user_org", ownerID)
	if err != nil {
		return
	}

	collection, err := app.FindCollectionByNameOrId("calendar_events")
	if err != nil {
		return
	}

	guestName := bookingRecord.GetString("guest_name")
	guestEmail := bookingRecord.GetString("guest_email")
	startStr := bookingRecord.GetString("start")
	endStr := bookingRecord.GetString("end")

	event := core.NewRecord(collection)
	event.Set("calendar", calendarID)
	event.Set("created_by", ownerID)
	event.Set("title", fmt.Sprintf("%s — %s", slotType.GetString("name"), guestName))
	event.Set("description", fmt.Sprintf("Booked by %s (%s) via booking page", guestName, guestEmail))
	event.Set("start", startStr)
	event.Set("end", endStr)
	event.Set("all_day", false)
	event.Set("busy_status", "busy")
	event.Set("visibility", "default")
	event.Set("ical_uid", "urn:uuid:"+uuid.NewString())
	event.Set("guests", []map[string]any{
		{
			"name":  guestName,
			"email": guestEmail,
			"rsvp":  "accepted",
			"role":  "attendee",
		},
	})

	if err := app.Save(event); err != nil {
		app.Logger().Warn("calendar-slots: failed to auto-create calendar event",
			"booking", bookingRecord.Id, "error", err)
		return
	}

	// Link the booking to the calendar event
	bookingRecord.Set("calendar_event", event.Id)
	if err := app.Save(bookingRecord); err != nil {
		app.Logger().Warn("calendar-slots: failed to link booking to event",
			"booking", bookingRecord.Id, "event", event.Id, "error", err)
	}

	// Notify the owner
	// Look up org slug for the notification URL
	orgRecord, err := app.FindRecordById("orgs", page.GetString("org"))
	notifyOrgSlug := ""
	if err == nil && orgRecord != nil {
		notifyOrgSlug = orgRecord.GetString("slug")
	}

	notify.NotifyUser(app, notify.NotifyParams{
		UserID:  ownerRecord.GetString("user"),
		OrgID:   ownerRecord.GetString("org"),
		Type:    "booking_new",
		Package: "calendar-slots",
		Title:   fmt.Sprintf("New booking: %s — %s", slotType.GetString("name"), guestName),
		Body:    fmt.Sprintf("%s (%s) booked %s on %s", guestName, guestEmail, slotType.GetString("name"), startStr),
		URL:     "/a/" + notifyOrgSlug + "/calendar-slots",
	})
}

func appIsLive(app *pocketbase.PocketBase) bool {
	return app != nil && app.ConcurrentDB() != nil
}
