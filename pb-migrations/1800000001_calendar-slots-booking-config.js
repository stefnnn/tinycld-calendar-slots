/// <reference path="../../../server/pb_data/types.d.ts" />
migrate(
    app => {
        const col = app.findCollectionByNameOrId('booking_pages')

        col.fields.add(new Field({
            id: 'book_pages_min_notice',
            name: 'min_notice_hours',
            type: 'number',
            required: false,
            min: 0,
        }))
        col.fields.add(new Field({
            id: 'book_pages_bk_window',
            name: 'booking_window',
            type: 'select',
            required: false,
            values: ['infinite', 'rolling', 'range'],
            maxSelect: 1,
        }))
        col.fields.add(new Field({
            id: 'book_pages_bk_rolling',
            name: 'booking_rolling_days',
            type: 'number',
            required: false,
            min: 1,
        }))
        col.fields.add(new Field({
            id: 'book_pages_bk_from',
            name: 'booking_date_from',
            type: 'text',
            required: false,
            max: 10,
        }))
        col.fields.add(new Field({
            id: 'book_pages_bk_to',
            name: 'booking_date_to',
            type: 'text',
            required: false,
            max: 10,
        }))
        col.fields.add(new Field({
            id: 'book_pages_max_count',
            name: 'max_bookings_count',
            type: 'number',
            required: false,
            min: 0,
        }))
        col.fields.add(new Field({
            id: 'book_pages_max_period',
            name: 'max_bookings_period',
            type: 'select',
            required: false,
            values: ['day', 'week', 'month'],
            maxSelect: 1,
        }))

        app.save(col)
    },
    app => {
        const col = app.findCollectionByNameOrId('booking_pages')
        const toRemove = [
            'min_notice_hours', 'booking_window', 'booking_rolling_days',
            'booking_date_from', 'booking_date_to', 'max_bookings_count', 'max_bookings_period',
        ]
        for (const name of toRemove) {
            const field = col.fields.getByName(name)
            if (field) col.fields.remove(field)
        }
        app.save(col)
    }
)
