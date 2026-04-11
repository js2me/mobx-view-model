import { Globals } from '../globals';

import { ViewModelsProvider } from 'mobx-view-model';
import { Routing } from './routing.js';
import { Layout } from '../widgets/layout';

export function App({ globals }: { globals: Globals }) {
  return (
    <ViewModelsProvider value={globals.stores.viewModels}>
      <Layout>
        <Routing globals={globals} />
      </Layout>
    </ViewModelsProvider>
  );
}
