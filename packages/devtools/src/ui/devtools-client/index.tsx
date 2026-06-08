import {
  ActiveViewModelProvider,
  ViewModelsProvider,
  withViewModel,
} from 'mobx-view-model';
import { VmDevtoolsButton } from '../devtools-button';
import { VmDevtoolsPopup } from '../devtools-popup';
import { DevtoolsClientVM } from './model';

export const DevtoolsClient = withViewModel(DevtoolsClientVM, ({ model }) => {
  return (
    <ViewModelsProvider value={model.devtools.vmStore}>
      <ActiveViewModelProvider value={model}>
        <VmDevtoolsButton />
        {model.devtools.isPopupOpened &&
          model.devtools.displayType === 'popup' && <VmDevtoolsPopup />}
      </ActiveViewModelProvider>
    </ViewModelsProvider>
  );
});
