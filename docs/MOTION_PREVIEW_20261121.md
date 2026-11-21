# Paila customer motion preview

Artifact ID: PAILA-CUSTOMER-MOTION-20261121
Status: PREVIEW
Date: 2026-11-21 (Asia/Kathmandu)
Repository: pailapilates09-sys/Customer
Route: /experience.html

## Result

An optional interactive browsing page, linked from the existing public homepage.
The Curved gallery supports pointer dragging, keyboard selection and a native
details dialog. On the rail turns the selected section forward and updates its
description and destination. On phones, the rail scrolls horizontally to the
selection. System reduced-motion settings use a static card grid and remove
transition animations.

Both modes link to the existing Studio, Classes, Passes, Team, About and
Directions pages. They are navigation, not booking, checkout or authentication.
All artwork is original inline SVG illustration; it is not a studio photograph.
No public claims, contact channels, prices or staff records are invented.
The separate Operator portal and private Sheets are not linked or fetched.

## Inspected references

- https://www.instagram.com/reels/Df_FX4uxE7t/
  w.wearebrand: screen footage of a curved gallery and an item-detail page.
- https://www.instagram.com/reels/Degpd1kt_ZZ/
  velvetica.studio: a hanging clothing rail; selected clothes face forward and
  the product name changes.

The reels were inspected in the public Instagram browser UI. Web fetches alone
could not retrieve them. Their playback, rendered frames and captions informed
the interaction design. No proprietary code, media, clothing assets or branding
was copied. These adaptations do not require WordPress or Shopify.

## PRE and rollback

Before head: 0b03f8a5aaa61156cd4180a949ee7add57f485c1
Before tree: 78a18bc98011f457da6b6541b9dcc87c9bc96f01
Preservation branch: rollback/before-customer-motion-20261121

Revert the motion-preview commit to remove the new page and restore its home
entry. Do not reset or force-push main. The existing Studio geometry and all
other customer pages are outside this change. The homepage CTA is also kept
in tools_build.py so regeneration retains its link. experience.html and its
experience.css / experience.js assets are maintained directly.

## Authority boundary

The five original A9 read-first names were searched in the currently connected
live Drive; none were visible. The repository's docs/DRIVE_RECOVERY_09.md records
this migration boundary. This scoped update uses current provider-read
repository content, preserved IDs and the approved public content registry.
No central library sequence, registry ACK, recovered approval or formal next
Studio OS release is asserted.

## Validation

- Node syntax check and Python generator compile.
- Live source shape and destination paths checked before modification.
- Desktop browser: selection, detail dialog, Escape close, focus return and rail.
- Phone-width browser: mobile layout, selection and horizontal rail centering.
- No-JS links and reduced-motion CSS included; no operating-system preference
  change was made during browser verification.
- Native GitHub Pages publication and live provider readback to be confirmed
  for the final commit; consult its Actions run for the deployment outcome.

