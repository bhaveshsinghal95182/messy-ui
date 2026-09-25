## What changed

<!-- One or two sentences. The commit history carries the detail. -->

## Why

<!-- The problem this solves. Link an issue if there is one. -->

## Checklist

- [ ] Commits follow [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, etc. The release notes are generated from these.
- [ ] Tests cover the change (`pnpm test`), and the coverage gate still passes (`pnpm test:coverage`).
- [ ] If a registry component changed: `pnpm registry:build` was run and `public/r/` is committed. CI fails otherwise.
- [ ] If a new component was added: it has a `registry.json` entry, a `meta.ts` whose `componentFiles` lists every file the CLI installs, and a colocated `*.test.tsx`.
- [ ] Interactive changes are reachable by keyboard and named for screen readers.

## How to check it

<!-- The steps a reviewer should follow to see this working. -->
