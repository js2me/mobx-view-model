
import { ViewModelStore } from 'mobx-view-model';
import { AppInfoStore } from './stores/app-info';
import { GlobalsCreateParams } from './types';
import { AnyObject, Maybe } from 'yummies/types';
import { assert } from 'yummies/assert';
import { Router } from './router';
import { VMStore } from '../shared/lib/view-models/vm-store';

export class Globals {
  readonly router: Router;
  readonly stores: { appInfo: AppInfoStore; viewModels: ViewModelStore };

  constructor(private params: GlobalsCreateParams) {
    this.router = new Router(params.router);
    this.stores = {
      appInfo: new AppInfoStore(this.router),
      viewModels: new VMStore(this, {
      vmConfig: {
        observable: {
          viewModels: {
            useDecorators: false,
          },
          viewModelStores: {
            useDecorators: false,
          },
        },
      },
    }),
    }
  }

  static fromSnapshot(ssrData: Maybe<AnyObject>): Globals {
    assert.defined(ssrData, 'Missing SSR data');
    return new Globals(ssrData);
  }

  toSnapshot(): AnyObject {
    return this.params;
  }
}
