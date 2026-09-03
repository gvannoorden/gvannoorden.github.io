# gvannoorden.github.io

Splash page for my projects — links out to my Notion site and to each of the
things I've built and hosted.

Live: https://gvannoorden.github.io

## What it is

A single static `index.html` plus five screenshots in `assets/`. No build step,
no dependencies, no framework. Dark and light: parchment in light mode, near-black
and green in dark, with a toggle in the bottom-right corner. It follows the
system setting until you click the toggle, after which your choice is remembered
in `localStorage`.

Fonts come from Google Fonts (Cinzel, Cinzel Decorative, EB Garamond, JetBrains
Mono). Everything else is inline.

## Adding a project

Copy an existing `<a class="work">` block in `index.html` and edit the numeral,
the `.kicker` category, the `<h3>`, the description, the `.chip`s, and the `href`
(which appears once, on the `<a>` itself).

Then add the screenshot: put an entry in `APPS` in
[`tools/refresh-shots.mjs`](tools/refresh-shots.mjs) and run it (see below).

Five cards are laid out as one wide feature (the first) above a 2×2. **If the
count changes, check the grid rules** under `/* WORKS */` — the feature span
assumes five.

## Refreshing the screenshots

When an app's UI changes:

```bash
node tools/refresh-shots.mjs
```

One app at a time works too: `node tools/refresh-shots.mjs map timer`.

It drives headless Edge over the DevTools protocol, waits for each app to
actually finish loading, crops to 16:10 and writes WebP into `assets/`. Needs
Node 22+ and Edge (or `EDGE=/path/to/chromium`). No npm install.

Two of the apps sit behind a password, so their thumbnails are the front door
rather than the interior. To use an inside shot instead, drop your own 16:10
image at `assets/tree.webp` or `assets/keys.webp` and leave the script alone.

## Local preview

```bash
python3 -m http.server 4712
```

Then open http://localhost:4712.
