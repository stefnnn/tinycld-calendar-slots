const manifest = {
    name: 'Calendar Slots',
    slug: 'calendar-slots',
    version: '0.1.0',
    description: 'Let users book a slot on your calendar',
    routes: { directory: 'screens' },
    publicRoutes: { directory: 'public-screens' },
    sidebar: { component: 'sidebar' },
    provider: { component: 'provider' },
    migrations: { directory: 'pb-migrations' },
    collections: { register: 'collections', types: 'types' },
    seed: { script: 'seed' },
    server: { package: 'server', module: 'tinycld.org/packages/calendar-slots' },
    repository: { url: 'https://github.com/stefnnn/tinycld-calendar-slots' },
    tests: { directory: 'tests' },
    // calendar-slots is hard-coupled to the calendar package: the `bookings`
    // collection (1800000000_create_calendar-slots.js) has a relation field into
    // calendar's `pbc_cal_calendars_01`, so the create migration only succeeds
    // when calendar is already installed. `dependencies` orders seeds after
    // calendar; `peerVersions` is the ENFORCED constraint the compat solver
    // rejects an install/version-change against when calendar is absent or out of
    // range — without it the create migration throws and rolls back, leaving no
    // booking tables.
    dependencies: ['calendar'],
    peerVersions: { calendar: '^0.1.0' },
    sidebarContributions: [
        {
            target: 'calendar',
            slot: 'sidebar.after-calendars',
            component: 'sidebar-contributions/booking-pages',
            order: 0,
        },
    ],
}

export default manifest
