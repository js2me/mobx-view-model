import { ExtraListItem } from '@/model/list-item/extra-list-item';
import type { ListItem } from '@/model/list-item/list-item';
import { MetaListItem } from '@/model/list-item/meta-list-item';
import { PropertyListItem } from '@/model/list-item/property-list-item';
import { PropertyWatchHistoryHeaderListItem } from '@/model/list-item/property-watch-history-header-item';
import { PropertyWatchHistoryListItem } from '@/model/list-item/property-watch-history-item';
import { VMListItem } from '@/model/list-item/vm-list-item';
import { ExtraListItemRender } from './extra-list-item-render';
import { MetaListItemRender } from './meta-list-item-render';
import { PropertyListItemRender } from './property-list-item-render';
import { PropertyWatchHistoryHeaderRender } from './property-watch-history-header-render';
import { PropertyWatchHistoryItemRender } from './property-watch-history-item-render';
import { VmListItemRender } from './vm-list-item-render';

export function ListItemRender({ item }: { item: ListItem<any> }) {
  if (item instanceof VMListItem) return <VmListItemRender item={item} />;
  if (item instanceof ExtraListItem) return <ExtraListItemRender item={item} />;
  if (item instanceof PropertyListItem)
    return <PropertyListItemRender item={item} />;
  if (item instanceof PropertyWatchHistoryHeaderListItem)
    return <PropertyWatchHistoryHeaderRender item={item} />;
  if (item instanceof PropertyWatchHistoryListItem)
    return <PropertyWatchHistoryItemRender item={item} />;
  if (item instanceof MetaListItem) return <MetaListItemRender item={item} />;
  return null;
}
