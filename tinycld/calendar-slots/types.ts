// Schema types for this package, merged into core's MergedSchema by the
// generator. Each entry maps a pbtsdb collection name to its record type
// and optional relations. Rename, replace, or delete calendar_slots_items
// when you wire up your first real collection.

export interface CalendarSlotsItem {
    id: string
    name: string
    owner: string
    created: string
    updated: string
}

export type CalendarSlotsSchema = {
    calendar_slots_items: {
        type: CalendarSlotsItem
    }
}
