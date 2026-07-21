---
name: consumer-projects
description: >-
  When changing mobx-view-model / React integration, prefer real consumer apps
  over outdated unit/regression tests in this repo. Use for SSR, Suspense,
  useCreateViewModel, async willMount, routing, and VM lifecycle. Project list:
  TEST_PROJECTS.md at repo root (if present).
---

# Consumer projects as source of truth

Unit/regression tests under `packages/*/src/**/*.test.*` and
`tests/react-regressions/**` are often outdated vs the real API.

**Source of truth:** how the library behaves in the apps listed in
[`TEST_PROJECTS.md`](../../../TEST_PROJECTS.md) at the repo root, **if that
file exists**. Read it first and inspect those projects before changing
lifecycle / SSR / Suspense behavior.

If `TEST_PROJECTS.md` is missing, ask the user which consumer apps to use, or
skip consumer-driven validation.

## Rules

1. Before fixing lifecycle / SSR / Suspense — check usage in the projects from
   `TEST_PROJECTS.md` (when present).
2. Do not “fix tests in this repo” when that would diverge from consumer behavior.
3. Suspense: keep Layout **outside** page Suspense (see githome-style
   `routing.tsx` + `widgets/layout`). Do not wrap all of
   `RouteViewGroup layout={Layout}` — otherwise `use(mountPromise)` in ssr mode
   remounts Layout and loops on async mount.
4. `useCreateViewModel` in ssr mode: a remount with a new `useId` must reuse the
   in-flight VM and the same mount Promise.
5. Sibling VMs of the same class must not steal each other — reuse only a single
   async-mount-in-flight orphan.
