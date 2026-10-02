# Media for the top-up pages — 2026-10-02

## In use

- Game catalog cards: `assets/images/games/{genshin,hsr,zzz,wuwa}_card.jpg` (existing assets, 48–82 KB).
- Detail headers: matching `_banner.jpg` assets (existing assets, 76–145 KB). The header has a subtle CSS drift that stops with `prefers-reduced-motion`.
- Package thumbnails: three original SVG icons in `assets/images/topup/` for crystals, monthly passes, and battle passes (353–460 bytes). They replace symbols and avoid nonexistent `.webp` paths.

## Candidate background video

- Blue particles, 10 seconds, 1920×1080: https://www.pexels.com/video/abstract-blue-particles-on-dark-background-29919008/
- Blue bokeh flicker: https://www.pexels.com/video/abstract-blue-bokeh-flicker-852325/

Pexels license: https://www.pexels.com/legal-pages/license/ — free use on commercial websites, modification allowed, attribution optional. Retain source/creator metadata if a clip is downloaded.

These clips are **curated, not shipped**. A source clip would add avoidable load to a checkout page. Before publishing one: trim to 5–8 seconds; encode a muted, looping, low-motion WebM/MP4 variant around 720p; aim below 500 KB; provide a still poster; lazy-load only outside the first screen and only for users without reduced-motion or data-saving preferences. Keep product names, forms, and payment information on opaque surfaces for readability.

## Art policy

Use existing game art only where already present in the project. For any new character/game artwork, obtain permission or use official publisher-approved promotional assets. Do not treat an image-search result as a reuse license.