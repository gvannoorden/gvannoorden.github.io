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

Fonts come from Google Fonts: **Cinzel Decorative** for the big name, **Cinzel**
for headings and small caps, **EB Garamond** for body text, JetBrains Mono for
the little tech chips. Everything else is inline.

The surname is the Scott-Miller logo (Silverstone) rather than type —
`assets/scott-miller.svg`, painted as a CSS mask so the one monochrome file
picks up the theme colour in both light and dark.

## The sigil

The leaf mark exists as standalone artwork, in two forms, green-and-gold on a
transparent ground:

| file | what it is |
|---|---|
| `assets/sigil-triangle.svg` | leaf inside the triangle, as the hero uses it |
| `assets/sigil-leaf.svg` | the original leaf on its own |
| `assets/sigil-*.png` | the same two at 1024px, transparent |

The SVGs carry literal colours so they work anywhere. The copy drawn inline in
`index.html` uses the theme tokens instead, which is why it recolours with the
toggle and these files don't.

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
rather than the interior. To use an inside shot instead, save your screenshot as
`.shots/<name>.png` and re-encode just that one:

```bash
node tools/refresh-shots.mjs tree --no-capture
```

`--no-capture` skips the browser entirely and crops + encodes the PNG that's
already there.

## Local preview

```bash
python3 -m http.server 4712
```

Then open http://localhost:4712.
