# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Deliverance For Me** is a single-page static website (`index.html`) with no build tools, frameworks, or dependencies. All HTML, CSS, and JavaScript live in that one file.

## Development

Open `index.html` directly in a browser — no server, no build step. For local development with auto-reload, any static file server works:

```bash
python3 -m http.server 8080
# or
npx serve .
```

## Architecture

The page has one interactive feature: a **circular reveal effect** that shows a "happy" image beneath a "depressed" image (or vice versa) as the user hovers or touches. It works via CSS custom properties and `mask-image`:

- `--mx`, `--my` — cursor/touch position as percentages of the container
- `--radius` — reveal circle size in pixels (0 = hidden, 120 = fully open)
- `mask-image: radial-gradient(circle var(--radius) at var(--mx) var(--my), transparent 0%, transparent 80%, black 100%)` applied to whichever image is "on top"

**Dark mode** (default): `depressed.png` is on top with the mask; reveal shows `happy.png` underneath.  
**Light mode**: roles are swapped — `happy.png` on top, reveals `depressed.png`.

The toggle button and `isDarkMode` flag control which image gets `applyMask()` vs `clearMask()` at any given time. `getTopImage()` always returns whichever image currently holds the mask.

Touch devices get a `touchRing` visual indicator instead of the custom cursor, with an `animateFadeOut()` RAF loop that smoothly shrinks the reveal radius after `touchend`.

## Contact form

The "Get Help!" button opens a form overlay via a circular expanding backdrop (CSS transition on `width`/`height` of `.contact-backdrop`). The form currently **does not submit data anywhere** — `btnSubmit` only validates fields and shows a success message. Actual submission needs a backend endpoint or third-party form service wired into `btnSubmit`'s click handler.

## Deployment

Static site — deploy by copying `index.html` and the `images/` folder to any web host or CDN.
