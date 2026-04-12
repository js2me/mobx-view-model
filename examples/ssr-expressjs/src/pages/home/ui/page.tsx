import { withViewModel } from "mobx-view-model";
import { HomePageVM } from "../model";
import { ItemCard } from "../../../widgets/item-card";

export const HomePage = withViewModel(HomePageVM, ({ model }) => {
  return (
    <main className="w-full bg-base-bg pb-10 pt-6">
      <section className="mx-auto max-w-[1416px]">
          <div className="pb-2 gap-3 grid grid-cols-5">
            {model.products.map((product) => (
              <ItemCard
                key={product.title}
                imageSrc=""
                {...product}
              />
            ))}
          </div>
      </section>
    </main>
  )
})