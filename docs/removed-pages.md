# Removed: the Mostar page at /home

`/home` used to render a travel-guide template about Mostar, Bosnia and Herzegovina. It had nothing to do with SchemeSetu, was
linked from nowhere, and its stylesheet loaded a font from a third-party host. It was removed on the owner's decision.

Files removed: `src/pages/Landing/MostarLanding.tsx`, `src/pages/Landing/mostar-landing.css`, `src/pages/Landing/index.tsx`.
Also removed: the `/home` route in `AppRoutes.tsx` and the `/home` special cases in `MainLayout.tsx` and `Navbar.tsx`, so
`/home` now shows the normal 404 page with the usual navigation.

Kept on purpose: the unrouted SchemeSetu landing pieces in `src/components/landing/` and the archived `OldLanding.tsx`.
`src/pages/RemovedPages.test.tsx` fails if the route, the files or any mention of Mostar comes back.
