# Large-store opening measurements

Measured on 31 October 2026 in local Playwright Chromium, production devtools bundle, 1280×900 viewport. Each scenario uses a real `ViewModelStoreBase` and `ProjectViewModel` instances. Hierarchical stores have nine children per root; flat stores have no parents.

Opening starts in the Open devtools handler and ends after two animation frames. Host-store creation is excluded. Cold means the first opening in a fresh page; warm means closing and reopening the same panel. The after results are medians of three repetitions, with raw samples in [opening-2026-10-31.json](./tests/performance/opening-2026-10-31.json). These local measurements describe this fixture, not a timing guarantee.

| Scenario | Cold median | Warm median | Maximum cached inspector items | DOM rows |
| --- | ---: | ---: | ---: | ---: |
| 100/default | 97 ms | 64 ms | 234 | 43 |
| 1000/collapsed | 64 ms | 48 ms | 0 | 43 |
| 10000/collapsed | 67 ms | 48 ms | 0 | 43 |
| 10000/flat | 70 ms | 48 ms | 0 | 43 |
| 10000/expanded | 205 ms | 164 ms | 234 | 43 |

Before this change, individual measurements of the previous production bundle were 179 ms / 1,295 cached property items at 100 VM, and 981 ms / 11,195 items at 1,000 VM. At 10,000 VM the click exceeded Playwright's 30-second timeout; that is a failed interaction, not a precise 30-second opening measurement. The before values were single samples and the default expansion policy differed for large stores. The fully expanded 10,000-VM scenario above verifies that the improvement also holds with every VM explicitly expanded.

The cache counts include nested preview properties and any history nodes, not just visible top-level properties. They grow as users inspect more rows; they are not a global memory cap. Removed VMs release cached properties, watch history, subscriptions and expansion state.

## Reproduce

From the repository root:

```sh
pnpm build
pnpm --filter mobx-view-model-devtools exec vite --config tests/e2e/vite.config.ts --host 127.0.0.1 --port 4178 --strictPort
```

Then in another terminal:

```sh
pnpm --filter mobx-view-model-devtools measure:performance
```

`PERF_REPETITIONS` controls repetitions; `DEVTOOLS_FIXTURE_URL` overrides the fixture URL. Do not rebuild or edit fixture imports while measuring. The fixture imports `dist/index.js`, so source changes require a new production build.

## Regression coverage and limits

Unit tests assert bounded materialization, model identity, iterative deep-tree indexing, cycle handling, search row parity and disposal. Browser regressions cover 10,000 hierarchical, flat, fully expanded and list-mode VM, far-ID search, reopening, live updates and watch-history cleanup. Timing thresholds are intentionally excluded from CI; DOM and cache bounds provide deterministic checks.

Tree indexing is linear in VM count. Row metadata remains proportional to expanded VM and direct-property count; model creation follows the requested viewport. Plain-text search keeps direct-property rows lazy. Resolving nested object paths and inspecting Extras still materializes traversed property branches and can cost more for broad matches. No claim is made about arbitrary object graphs or unbounded history payloads.
