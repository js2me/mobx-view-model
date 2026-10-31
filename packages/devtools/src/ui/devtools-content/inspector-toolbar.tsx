import {
  BarsAscendingAlignLeftArrowDown,
  BarsDescendingAlignCenter,
  BarsDescendingAlignLeftArrowUp,
  FolderTree,
  ListUl,
} from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import type { DevtoolsSettings } from '@/model/devtools-settings';
import { IconToggleButton } from '../shared/icon-toggle-button';
import css from './styles.module.css';

export const InspectorToolbar = observer(
  ({ settings }: { settings: DevtoolsSettings }) => (
    <div className={css.vmContentControlPanelActions}>
      <IconToggleButton
        value={settings.presentationMode}
        onUpdate={settings.setPresentationMode}
        options={[
          { value: 'tree', label: 'Tree view', icon: FolderTree },
          { value: 'list', label: 'List view', icon: ListUl },
        ]}
      />
      <IconToggleButton
        value={settings.sortPropertiesBy}
        onUpdate={settings.setSortPropertiesBy}
        options={[
          {
            value: 'none',
            label: 'Original order',
            icon: BarsDescendingAlignCenter,
          },
          {
            value: 'asc',
            label: 'Sort ascending',
            icon: BarsAscendingAlignLeftArrowDown,
          },
          {
            value: 'desc',
            label: 'Sort descending',
            icon: BarsDescendingAlignLeftArrowUp,
          },
        ]}
      />
    </div>
  ),
);
