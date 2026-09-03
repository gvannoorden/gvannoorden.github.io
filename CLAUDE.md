# CLAUDE.md — gvannoorden.github.io

## What this is

Gavin's personal splash page. A single static `index.html` served by GitHub
Pages at https://gvannoorden.github.io. It links out to his Notion site and to
each hosted project.

Local folder name matches the repo name (`gvannoorden.github.io`) because
GitHub requires that exact name for a user Pages site — this is the one place
the `personal-` prefix convention in the global CLAUDE.md does not apply.

## Constraints

- **One file.** No build step, no npm, no framework. If a change needs a
  bundler, it's the wrong change.
- **No external assets except Google Fonts.** CSS and JS stay inline; the
  favicon is a data URI.
- Dark mode only. Green + gold on near-black. High-fantasy typography
  (Cinzel / EB Garamond) without tipping into costume.
- Respect `prefers-reduced-motion` — the mote canvas and the turning sigil
  rings must both switch off.

## Design tokens

Defined as CSS custom properties in `:root`. Use them; don't hardcode colors.
`--verdant` is the green, `--gold` the accent, `--mithril` the body text,
`--muted` / `--muted-dim` the two quieter greys.

## The works grid

Five cards, and the last one spans the leftover cells so both rows fill:
1 column under 660px, 2 columns to 1000px, 3 columns above. **If the number of
projects changes, re-check those rules** — the `:last-child` span assumes a
count that leaves a partial final row.

## Deploying

Push to `main`. GitHub Pages serves from the branch root; there is no action
or workflow. Give it a minute, then hard-refresh.

## Preview

`python3 -m http.server 4712`, then http://localhost:4712.
