const manifest = {
  name: "Calendar Slots",
  slug: "calendar-slots",
  version: "0.1.0",
  description: "Let users book a slot on your calendar",
  routes: { directory: "screens" },
  publicRoutes: { directory: "public-screens" },
  nav: {
    label: "Calendar Slots",
    icon: "calendar-plus-2",
    order: 9,
    shortcut: "",
  },
  sidebar: { component: "sidebar" },
  provider: { component: "provider" },
  migrations: { directory: "pb-migrations" },
  collections: { register: "collections", types: "types" },
  seed: { script: "seed" },
  server: { package: "server", module: "tinycld.org/packages/calendar-slots" },
};

export default manifest;
