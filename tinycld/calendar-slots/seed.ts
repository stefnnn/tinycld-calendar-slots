import type PocketBase from 'pocketbase'

interface SeedContext {
    user: { id: string; email: string; name: string }
    org: { id: string }
    userOrg: { id: string }
}

export default async function seed(pb: PocketBase, ctx: SeedContext): Promise<void> {
    // Create a demo booking page
    const pages = await pb.collection('booking_pages').getFullList({ filter: `slug = 'demo'` })
    if (pages.length > 0) return

    const page = await pb.collection('booking_pages').create({
        org: ctx.org.id,
        owner: ctx.userOrg.id,
        slug: 'demo',
        name: 'Demo Booking Page',
        intro_text: 'Welcome! Choose a time below to schedule a demo appointment.',
        active: true,
    })

    // Create slot types
    await pb.collection('booking_slot_types').create({
        page: page.id,
        name: 'Quick Chat',
        duration_minutes: 15,
        padding_minutes: 5,
        color: '#3b82f6',
    })

    await pb.collection('booking_slot_types').create({
        page: page.id,
        name: 'Meeting',
        duration_minutes: 30,
        padding_minutes: 15,
        color: '#8b5cf6',
    })

    await pb.collection('booking_slot_types').create({
        page: page.id,
        name: 'Deep Dive',
        duration_minutes: 60,
        padding_minutes: 30,
        color: '#22c55e',
    })

    // Create availability: Mon-Fri 9-5
    for (let day = 1; day <= 5; day++) {
        await pb.collection('booking_availability').create({
            page: page.id,
            day_of_week: day,
            start_time: '09:00',
            end_time: '17:00',
        })
    }
}
