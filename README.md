# gvannoorden.github.io

Splash page for my projects — links out to my Notion site and to each of the
things I've built and hosted.

Live: https://gvannoorden.github.io

## What it is

A single static `index.html`. No build step, no dependencies, no framework.
Dark, green, vaguely high-fantasy. Fonts come from Google Fonts (Cinzel,
Cinzel Decorative, EB Garamond, JetBrains Mono); everything else is inline.

## Adding a project

Copy an existing `<article class="work">` block in `index.html` and edit:

- `.numeral` — the roman numeral
- `.kicker` — the one-word category label
- `<h3>` — the name
- `<p>` — a sentence or two, plain language
- `.chip`s — the stack
- `.links` — the live URL and the repo URL

The `.work-mark` SVG is the faint watermark that appears on hover. Swap it for
something that suits the project, or drop it.

Five cards fill two rows cleanly because the last card spans the leftover
cells. If the count changes, check the grid rules near `/* works grid */`.

## Local preview

```
python3 -m http.server 4712
```

Then open http://localhost:4712.
