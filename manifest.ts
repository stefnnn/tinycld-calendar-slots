const manifest = {
  name: "Calendar Slots",
  slug: "calendar-slots",
  version: "0.1.0",
  description: "Let users book a slot on your calendar",
  routes: { directory: "screens" },
  publicRoutes: { directory: "public-screens" },
  sidebar: { component: "sidebar" },
  provider: { component: "provider" },
  migrations: { directory: "pb-migrations" },
  collections: { register: "collections", types: "types" },
  seed: { script: "seed" },
  server: { package: "server", module: "tinycld.org/packages/calendar-slots" },
  repository: { url: "https://github.com/stefnnn/tinycld-calendar-slots" },
  tests: { directory: "tests" },
  sidebarContributions: [
    {
      target: "calendar",
      slot: "sidebar.after-calendars",
      component: "sidebar-contributions/booking-pages",
      order: 0,
    },
  ],
};

export default manifest;
