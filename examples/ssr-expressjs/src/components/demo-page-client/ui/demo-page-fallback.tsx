export function DemoPageFallback() {
  return (
    <div className="mt-6 flex flex-col gap-2 rounded-xl border border-dashed border-demo-border px-6 py-5 text-sm text-demo-muted">
      <p className="m-0">Loading view model…</p>
      <p className="m-0">
        On SSR and the first hydration frame you often see this fallback:{' '}
        <code>attach</code> to the store runs in an effect after the first
        render.
      </p>
    </div>
  );
}
