import { withViewModel } from "mobx-view-model";
import { HomePageVM } from "../model";

export const HomePage = withViewModel(HomePageVM, ({ model }) => {
  return (
    <main className="mx-auto max-w-[40rem] px-5 pb-16 pt-8">
      <h1 className="mb-4 text-2xl font-semibold">
        SSR + mobx-view-model + hydration
      </h1>
      <p className="text-sm text-demo-muted">
        View page source: the card HTML comes from the same markup as after
        attach/mount; the button is disabled until the ViewModel is live. After
        hydration, MobX on the VM handles clicks.
      </p>
      {/* <DemoPageClient payload={model.globals} /> */}
    </main>
  )
})