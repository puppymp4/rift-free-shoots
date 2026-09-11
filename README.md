# Free Shoots - shoot.riftmedia.cc

Lead-capture page for Rift Media's free 7-photo business shoot offer.

**The offer:** Rift shoots 7 photos of a local business at no cost. The business gets a
perpetual, unrestricted license to the photos. In exchange, Rift can show the same photos
inside **Karo** (karoslides.com) and its marketing, with the business name and business type
displayed next to them.

Built by Rift Media. Fresno, CA.

## What this is for

The Karo landing page currently uses hand-made fake mockups for its showcase. This page
sources real photography of real local businesses to replace them, and doubles as portfolio
work.

## Current round

- **Spots:** 2 businesses
- **Service area:** Fresno and Clovis only
- **Out-of-area applicants** are not blocked. They see a note and their application is kept
  for the next round.

## Stack

Static HTML, CSS and vanilla JS. No build step, no dependencies, no framework.

| File | Purpose |
|---|---|
| `index.html` | The whole landing page and application form |
| `styles.css` | Design system. Matches riftmedia.cc "Cinematic Operator" tokens |
| `thanks.html` | Post-submit confirmation, served at `/thanks` |
| `404.html` | Branded not-found page |
| `vercel.json` | Static config, clean URLs, security headers |

## Design system

Inherited from riftmedia.cc so this reads as the same brand:

- **Display:** Cabinet Grotesk 700/800 (Fontshare)
- **Body:** Switzer 400/500/600/700 (Fontshare)
- **Palette:** `--ink` #0A0A0A, `--paper` #F5F1EA, `--signal` #00E5FF
- 8-point spacing grid, modular 1.250 type scale
- Fonts load async via the preload + `onload` swap pattern (ui-ux-pro-max Pillar 5)

## Form handling

Posts to **FormSubmit** at `rift.clb.media@gmail.com`, the same service the Tailored Customs
spec build uses.

- Native `POST` with a `_next` redirect to `/thanks`. Works with JavaScript disabled.
- JS adds inline validation on blur and on submit, focuses the first bad field.
- `_honey` honeypot field catches basic bots. `_captcha` is off.

> **First-run requirement:** FormSubmit activates a destination address the first time a form
> posts to it, by emailing a confirmation link. If `rift.clb.media@gmail.com` was already
> activated by the Tailored Customs build, submissions arrive immediately. If not, the first
> submission triggers the activation email instead of delivering. **Send one test application
> after deploying and confirm it lands in the inbox.**

### Fields collected

Name, business name, type of business (17-option select plus a free-text "something else"),
city, Instagram handle (optional), phone, what they want shot (optional), and a required
usage-consent checkbox.

The **type of business** value is the one that matters most downstream. It maps to Karo's
`brand_kits.business_type` vertical, so the shoot fills a named category rather than a
generic photo pile.

## Local preview

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Note that `/thanks` only resolves as a clean URL on Vercel. Locally, use `/thanks.html`.

## Editing the common things

| Change | Where |
|---|---|
| Number of spots | `index.html` - hero eyebrow, apply-section eyebrow, the "Why only 2" FAQ, and the footer colophon |
| Service area | `index.html` - hero eyebrow, the `#city` select, the out-of-area FAQ, and the JSON-LD `areaServed` |
| Business types in the dropdown | `index.html` - the `#type` select, and the `.chips` list in the `#who` section |
| Where submissions go | `index.html` - the `action` on `#apply-form` |

## Deliberately excluded

Wrap, tint and PPF shops, and used car lots, are left off the target list on purpose.
Coronas Customz (wraps, tint, PPF) and 786 Auto Sales (used cars) are live paying clients in
Fresno. Offering free work to their direct competitors is a conflict. See the
"No Client Competitors" rule.

## Open item

There is no sample photography on the page yet, because no general local-business work
existed in the archive at build time. The page is designed to hold up without it, using the
numbered shot list as the visual anchor. Once the first two shoots are delivered, adding a
3 to 6 photo sample strip above the form is the single highest-leverage upgrade here.
