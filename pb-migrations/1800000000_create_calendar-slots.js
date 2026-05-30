/// <reference path="../../../server/pb_data/types.d.ts" />
migrate(
    app => {
        // Phase 1: Create all collections without access rules

        // 1. booking_pages — a user's public booking page
        const bookingPages = new Collection({
            id: 'pbc_book_pages_01',
            name: 'booking_pages',
            type: 'base',
            system: false,
            fields: [
                {
                    id: 'book_pages_org',
                    name: 'org',
                    type: 'relation',
                    required: true,
                    collectionId: 'pbc_orgs_00001',
                    cascadeDelete: true,
                    maxSelect: 1,
                },
                {
                    id: 'book_pages_owner',
                    name: 'owner',
                    type: 'relation',
                    required: true,
                    collectionId: 'pbc_user_org_01',
                    cascadeDelete: true,
                    maxSelect: 1,
                },
                {
                    id: 'book_pages_slug',
                    name: 'slug',
                    type: 'text',
                    required: true,
                    min: 1,
                    max: 100,
                },
                {
                    id: 'book_pages_name',
                    name: 'name',
                    type: 'text',
                    required: true,
                    min: 1,
                    max: 200,
                },
                {
                    id: 'book_pages_intro_text',
                    name: 'intro_text',
                    type: 'text',
                    required: false,
                    max: 500,
                },
                {
                    id: 'book_pages_active',
                    name: 'active',
                    type: 'bool',
                },
                {
                    id: 'book_pages_created',
                    name: 'created',
                    type: 'autodate',
                    onCreate: true,
                    onUpdate: false,
                },
                {
                    id: 'book_pages_updated',
                    name: 'updated',
                    type: 'autodate',
                    onCreate: true,
                    onUpdate: true,
                },
            ],
            indexes: [
                'CREATE UNIQUE INDEX `idx_book_pages_slug_org` ON `booking_pages` (`org`, `slug`)',
                'CREATE INDEX `idx_book_pages_org` ON `booking_pages` (`org`)',
                'CREATE INDEX `idx_book_pages_owner` ON `booking_pages` (`owner`)',
            ],
        })
        app.save(bookingPages)

        // 2. booking_slot_types — predefined appointment types
        const bookingSlotTypes = new Collection({
            id: 'pbc_book_slots_01',
            name: 'booking_slot_types',
            type: 'base',
            system: false,
            fields: [
                {
                    id: 'book_slots_page',
                    name: 'page',
                    type: 'relation',
                    required: true,
                    collectionId: 'pbc_book_pages_01',
                    cascadeDelete: true,
                    maxSelect: 1,
                },
                {
                    id: 'book_slots_name',
                    name: 'name',
                    type: 'text',
                    required: true,
                    min: 1,
                    max: 200,
                },
                {
                    id: 'book_slots_duration',
                    name: 'duration_minutes',
                    type: 'number',
                    required: true,
                    min: 5,
                },
                {
                    id: 'book_slots_padding',
                    name: 'padding_minutes',
                    type: 'number',
                    required: true,
                    min: 0,
                },
                {
                    id: 'book_slots_color',
                    name: 'color',
                    type: 'text',
                    required: false,
                    max: 50,
                },
                {
                    id: 'book_slots_created',
                    name: 'created',
                    type: 'autodate',
                    onCreate: true,
                    onUpdate: false,
                },
                {
                    id: 'book_slots_updated',
                    name: 'updated',
                    type: 'autodate',
                    onCreate: true,
                    onUpdate: true,
                },
            ],
            indexes: [
                'CREATE INDEX `idx_book_slots_page` ON `booking_slot_types` (`page`)',
            ],
        })
        app.save(bookingSlotTypes)

        // 3. booking_availability — recurring weekly availability
        const bookingAvailability = new Collection({
            id: 'pbc_book_avail_01',
            name: 'booking_availability',
            type: 'base',
            system: false,
            fields: [
                {
                    id: 'book_avail_page',
                    name: 'page',
                    type: 'relation',
                    required: true,
                    collectionId: 'pbc_book_pages_01',
                    cascadeDelete: true,
                    maxSelect: 1,
                },
                {
                    id: 'book_avail_day',
                    name: 'day_of_week',
                    type: 'number',
                    required: true,
                    min: 0,
                    max: 6,
                },
                {
                    id: 'book_avail_start',
                    name: 'start_time',
                    type: 'text',
                    required: true,
                    min: 1,
                    max: 5,
                },
                {
                    id: 'book_avail_end',
                    name: 'end_time',
                    type: 'text',
                    required: true,
                    min: 1,
                    max: 5,
                },
                {
                    id: 'book_avail_created',
                    name: 'created',
                    type: 'autodate',
                    onCreate: true,
                    onUpdate: false,
                },
                {
                    id: 'book_avail_updated',
                    name: 'updated',
                    type: 'autodate',
                    onCreate: true,
                    onUpdate: true,
                },
            ],
            indexes: [
                'CREATE INDEX `idx_book_avail_page` ON `booking_availability` (`page`)',
            ],
        })
        app.save(bookingAvailability)

        // 4. bookings — actual booked appointments
        const bookings = new Collection({
            id: 'pbc_book_bookings_01',
            name: 'bookings',
            type: 'base',
            system: false,
            fields: [
                {
                    id: 'book_bookings_page',
                    name: 'page',
                    type: 'relation',
                    required: true,
                    collectionId: 'pbc_book_pages_01',
                    cascadeDelete: false,
                    maxSelect: 1,
                },
                {
                    id: 'book_bookings_slot_type',
                    name: 'slot_type',
                    type: 'relation',
                    required: true,
                    collectionId: 'pbc_book_slots_01',
                    cascadeDelete: false,
                    maxSelect: 1,
                },
                {
                    id: 'book_bookings_calendar',
                    name: 'calendar',
                    type: 'relation',
                    required: false,
                    collectionId: 'pbc_cal_calendars_01',
                    cascadeDelete: false,
                    maxSelect: 1,
                },
                {
                    id: 'book_bookings_guest_name',
                    name: 'guest_name',
                    type: 'text',
                    required: true,
                    min: 1,
                    max: 200,
                },
                {
                    id: 'book_bookings_guest_email',
                    name: 'guest_email',
                    type: 'email',
                    required: true,
                },
                {
                    id: 'book_bookings_start',
                    name: 'start',
                    type: 'date',
                    required: true,
                },
                {
                    id: 'book_bookings_end',
                    name: 'end',
                    type: 'date',
                    required: true,
                },
                {
                    id: 'book_bookings_status',
                    name: 'status',
                    type: 'select',
                    required: true,
                    values: ['confirmed', 'cancelled'],
                    maxSelect: 1,
                },
                {
                    // soft reference to calendar_events — text instead of relation to avoid
                    // coupling to the calendar package; cascade delete not required here
                    id: 'book_bookings_calendar_event',
                    name: 'calendar_event',
                    type: 'text',
                    required: false,
                    max: 100,
                },
                {
                    id: 'book_bookings_created',
                    name: 'created',
                    type: 'autodate',
                    onCreate: true,
                    onUpdate: false,
                },
                {
                    id: 'book_bookings_updated',
                    name: 'updated',
                    type: 'autodate',
                    onCreate: true,
                    onUpdate: true,
                },
            ],
            indexes: [
                'CREATE INDEX `idx_book_bookings_page` ON `bookings` (`page`)',
                'CREATE INDEX `idx_book_bookings_start` ON `bookings` (`start`)',
                'CREATE INDEX `idx_book_bookings_calendar` ON `bookings` (`calendar`)',
            ],
        })
        app.save(bookings)

        // Phase 2: Apply access rules
        const orgMemberRule = 'org.user_org_via_org.user ?= @request.auth.id'
        const pageOwnerRule = 'page.owner.user ?= @request.auth.id'
        const pageOwnerViaPageRule = 'owner.user = @request.auth.id'

        // booking_pages: viewable by org members, manageable by owner
        const pagesCol = app.findCollectionByNameOrId('booking_pages')
        pagesCol.listRule = orgMemberRule
        pagesCol.viewRule = orgMemberRule
        pagesCol.createRule = orgMemberRule
        pagesCol.updateRule = pageOwnerViaPageRule
        pagesCol.deleteRule = pageOwnerViaPageRule
        app.save(pagesCol)

        // booking_slot_types: manageable by page owner
        const slotTypesCol = app.findCollectionByNameOrId('booking_slot_types')
        slotTypesCol.listRule = pageOwnerRule
        slotTypesCol.viewRule = pageOwnerRule
        slotTypesCol.createRule = pageOwnerRule
        slotTypesCol.updateRule = pageOwnerRule
        slotTypesCol.deleteRule = pageOwnerRule
        app.save(slotTypesCol)

        // booking_availability: manageable by page owner
        const availCol = app.findCollectionByNameOrId('booking_availability')
        availCol.listRule = pageOwnerRule
        availCol.viewRule = pageOwnerRule
        availCol.createRule = pageOwnerRule
        availCol.updateRule = pageOwnerRule
        availCol.deleteRule = pageOwnerRule
        app.save(availCol)

        // bookings: viewable by page owner, creatable by anyone (public)
        const bookingsCol = app.findCollectionByNameOrId('bookings')
        bookingsCol.listRule = pageOwnerRule
        bookingsCol.viewRule = pageOwnerRule
        bookingsCol.createRule = '' // public — anyone can book
        bookingsCol.updateRule = pageOwnerRule
        bookingsCol.deleteRule = pageOwnerRule
        app.save(bookingsCol)
    },
    app => {
        const collections = [
            'bookings',
            'booking_availability',
            'booking_slot_types',
            'booking_pages',
        ]
        for (const name of collections) {
            const collection = app.findCollectionByNameOrId(name)
            app.delete(collection)
        }
    }
)
