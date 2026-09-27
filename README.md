# Paila Pilates website · live review preview

This is the Paila-owned static website draft. This preview can be published for live review, with unapproved details clearly withheld. The source architecture takes inspiration from [the reference prototype](https://github.com/FabinGurung/sumita-pilates-studio), but its example schedule, prices, people, contact details, claims and browser-only booking/member demos are not Paila data.

## Preview locally

Run `python3 -m http.server 8000` in the repository and open `http://localhost:8000`. The generated pages also open directly from disk. No build dependencies are needed.

## Structure

- Eight HTML pages: home, schedule, passes, instructors, about, contact, directions, member.
- `assets/css/styles.css` holds the responsive design.
- `assets/js/shared.js` handles the mobile navigation and copyright year.
- `data/site-data.js` records the currently approved public fields. The blank fields are deliberate.
- `tools_build.py` regenerates the HTML pages (`python3 tools_build.py`). Edit it when changing page copy or structure.
- `docs/LAUNCH_CHECKLIST.md` lists the content and service decisions before publication.

Pages carry a `noindex` meta tag during review. **A published GitHub Pages site is public even when its source repository is private.** Remove `noindex` only for the approved public launch.

The directions page uses the map pin supplied by Paila (27.6728007, 85.3155726) and links to Google Maps. The written street address and opening hours are still pending.

The operational workbook and confidential customer or staff data belong in private Paila Drive. Only owner-approved public exports belong here. No booking, payment, contact form or member authentication is active.

## Studio layout preview

`/studio/` contains the interactive 2D plan and lazy-loaded 3D cutaway. Both portals consume the same geometry version and canonical SHA-256, recorded in `studio/manifest.json`. The view remains a source-derived preview; height is illustrative and dimensional conflicts remain unresolved. Original plan/video and private lineage stay in restricted project storage. Three.js 0.170.0 is vendored with its MIT license. No build or runtime CDN is needed.
