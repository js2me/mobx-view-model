import { withViewModel } from 'mobx-view-model';
import { ItemCard } from '../../../widgets/item-card';
import { HomePageVM } from '../model';

export const HomePage = withViewModel(HomePageVM, ({ model }) => {
  return (
    <main className="w-full bg-base-bg pt-6 pb-10">
      <section className="mx-auto max-w-[1416px]">
        <div className="grid grid-cols-5 gap-3 pb-2">
          {model.products.map((product) => (
            <ItemCard key={product.title} imageSrc="" {...product} />
          ))}
        </div>
      </section>
    </main>
  );
});
