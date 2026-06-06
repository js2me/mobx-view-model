import type { ViewModelDevtools } from '../view-model-devtools';
import { ListItem } from './list-item';

export class MetaListItem extends ListItem<any> {
  get depth() {
    return this._depth;
  }

  constructor(
    devtools: ViewModelDevtools,
    key: string,
    public content: string,
    private _depth: number,
  ) {
    super(devtools, key, undefined);
  }
}
