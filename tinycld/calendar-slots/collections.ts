import type { CoreStores } from '@tinycld/core/lib/pocketbase'
import type { Schema } from '@tinycld/core/types/pbSchema'
import type { createCollection } from 'pbtsdb/core'
import { BasicIndex } from 'pbtsdb/core'
import type { CalendarSlotsSchema } from './types'

type MergedSchema = Schema & CalendarSlotsSchema

export function registerCollections(
    newCollection: ReturnType<typeof createCollection<MergedSchema>>,
    _core: CoreStores
) {
    const booking_pages = newCollection('booking_pages', {
        omitOnInsert: ['created', 'updated'] as const,
        expand: { owner: _core.user_org, org: _core.orgs },
        collectionOptions: {
            autoIndex: 'eager' as const,
            defaultIndexType: BasicIndex,
        },
    })

    const booking_slot_types = newCollection('booking_slot_types', {
        omitOnInsert: ['created', 'updated'] as const,
        collectionOptions: {
            autoIndex: 'eager' as const,
            defaultIndexType: BasicIndex,
        },
    })

    const booking_availability = newCollection('booking_availability', {
        omitOnInsert: ['created', 'updated'] as const,
        collectionOptions: {
            autoIndex: 'eager' as const,
            defaultIndexType: BasicIndex,
        },
    })

    const bookings = newCollection('bookings', {
        omitOnInsert: ['created', 'updated'] as const,
        expand: { slot_type: booking_slot_types },
        collectionOptions: {
            autoIndex: 'eager' as const,
            defaultIndexType: BasicIndex,
        },
    })

    return {
        booking_pages,
        booking_slot_types,
        booking_availability,
        bookings,
    }
}
