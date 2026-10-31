import {
  captureProjectStores,
  StandaloneConnection,
} from './model/connection/standalone-connection';
import { ViewModelDevtools } from './model/view-model-devtools';

const existingStores = captureProjectStores();
Object.assign(globalThis, { ViewModelDevtools });
const devtools = ViewModelDevtools.define({
  position: 'top-right',
  defaultIsOpened: false,
});
devtools.setExtras({ globalThis });
new StandaloneConnection(devtools, existingStores);
