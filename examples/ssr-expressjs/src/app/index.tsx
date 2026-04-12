import { ViewModelsProvider } from 'mobx-view-model';
import type { Globals } from '../globals';
import { Layout } from '../widgets/layout';
import { Routing } from './routing.js';

export function App({ globals }: { globals: Globals }) {
  return (
    <ViewModelsProvider value={globals.stores.viewModels}>
      <Layout>
        <Routing globals={globals} />
      </Layout>
    </ViewModelsProvider>
  );
}
