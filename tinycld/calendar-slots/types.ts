import type { Orgs, UserOrg } from '@tinycld/core/types/pbSchema'

export interface BookingPages {
    id: string
    org: string
    owner: string
    slug: string
    name: string
    intro_text: string
    active: boolean
    min_notice_hours: number
    booking_window: 'infinite' | 'rolling' | 'range' | ''
    booking_rolling_days: number
    booking_date_from: string
    booking_date_to: string
    max_bookings_count: number
    max_bookings_period: 'day' | 'week' | 'month' | ''
    created: string
    updated: string
}

export interface BookingSlotTypes {
    id: string
    page: string
    name: string
    duration_minutes: number
    padding_minutes: number
    color: string
    created: string
    updated: string
}

export interface BookingAvailability {
    id: string
    page: string
    day_of_week: number
    start_time: string
    end_time: string
    created: string
    updated: string
}

export interface Bookings {
    id: string
    page: string
    slot_type: string
    calendar: string
    guest_name: string
    guest_email: string
    start: string
    end: string
    status: 'confirmed' | 'cancelled'
    calendar_event: string
    created: string
    updated: string
}

export type BookingSlotsSchema = {
    booking_pages: {
        type: BookingPages
        relations: {
            org: Orgs
            owner: UserOrg
        }
    }
    booking_slot_types: {
        type: BookingSlotTypes
        relations: {
            page: BookingPages
        }
    }
    booking_availability: {
        type: BookingAvailability
        relations: {
            page: BookingPages
        }
    }
    bookings: {
        type: Bookings
        relations: {
            page: BookingPages
            slot_type: BookingSlotTypes
        }
    }
}
