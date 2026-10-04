# Roll Desk

An editor and viewer for critical editions of piano rolls. It collates
the copies of a roll, places the versions they carry in a stemma, and
shows the editorial assumptions an edition rests on, each with its
certainty and reasons. A version can be played through an emulated
reproducing piano and downloaded as MIDI.

The desk is the interface to [linked-rolls](https://github.com/pfefferniels/linked-rolls),
which does the reading, collating and emulating, and which defines the
format the desk reads and writes: the Roll Edition Format, JSON-LD built
on the Roll Edition Ontology, documented at
https://pfefferniels.github.io/linked-rolls/.

| | |
|---|---|
| Viewer | https://rolldesk.welte225.org/, showing the edition of Welte-Mignon roll 225 |
| Editor | https://rolldesk.welte225.org/editor |
| Edition shown | https://welte225.org/edition.jsonld, from [pfefferniels/welte225.org](https://github.com/pfefferniels/welte225.org) |

The viewer loads the published edition and cannot change it. The editor
opens an edition from a file or starts a new one, and the Save button
downloads it again as JSON-LD. Nothing is stored in the browser.

## Development

Requires Node 24 or later.

```
npm ci
npm run dev        # http://localhost:5173
npm run test:run   # once; `npm test` keeps watching
npm run lint
npm run typecheck
npm run build      # into build/
npm run serve      # serves build/
```

A push to `main` is linted, type-checked, tested, built and deployed to
GitHub Pages (`.github/workflows/deploy.yml`), under the custom domain
`rolldesk.welte225.org`. The desk has no releases: a build is named by
the commit it was made from, which the About dialog shows.

## What lives where

| Path | Content |
|---|---|
| `src/` | the desk |
| `public/facsimiles/` | scans of three copies of roll 225 as static IIIF tiles, see the README there |
| `scripts/` | scripts that changed the edition of roll 225 outside the desk |

The scripts read and write `edition.jsonld` in a checkout of
welte225.org beside this one (`../welte225.org`). Each says at its top
what it does.

## Licence

The code is released under the MIT licence, see `LICENSE`. The scans in
`public/facsimiles/` are not covered by it.
