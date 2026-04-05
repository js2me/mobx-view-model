'use client';

import { configure } from 'mobx';
import { enableStaticRendering } from 'mobx-react-lite';
import { viewModelsConfig } from 'mobx-view-model';

configure({ enforceActions: 'always' });

enableStaticRendering(typeof window === 'undefined');

viewModelsConfig.observable.viewModels.useDecorators = false;
viewModelsConfig.observable.viewModelStores.useDecorators = false;
