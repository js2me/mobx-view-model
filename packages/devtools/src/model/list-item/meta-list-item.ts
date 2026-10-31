import type { DevtoolsInspector } from '../devtools-inspector';
import { ListItem } from './list-item';

export class MetaListItem extends ListItem<any> {
  get depth() {
    return this._depth;
  }

  constructor(
    inspector: DevtoolsInspector,
    key: string,
    public content: string,
    private _depth: number,
  ) {
    super(inspector, key, undefined);
  }
}
