# Admin9 Web Project Guidance

## Project

Admin9 Web is the Admin9 management frontend. It is maintained on top of
`arco-design-pro-vite-simple`, while Admin9-specific capabilities are developed
in this repository.

The current objective is to integrate with the sibling `../admin9-api-laravel`
project. Use that project's current implementation and `docs/api.json` as the
backend contract evidence. Verify inconsistencies at the backend instead of
inferring current behavior from earlier frontend implementations.

## Repository Model

- `origin` owns Admin9 Web.
- `upstream` tracks `arco-design-pro-vite-simple` and must remain fetch-only.
- Keep upstream synchronization separate from Admin9 product changes.

## Change Boundary

Before changing, moving, or deleting code, determine whether it is inherited
from upstream or owned by Admin9 Web. Prefer the current upstream structure and
nearby project patterns; when ownership is unclear, preserve the code and verify
its provenance before making an architectural change.
