import { computed, makeObservable, observable, runInAction } from 'mobx';
import {
  ViewModelBase,
  type ViewModelParams,
  ViewModelStoreBase,
} from 'mobx-view-model';

interface DemoPayload {
  index: number;
}
export const demoDiagnostics = { computedReads: 0 };

export class ProjectViewModel extends ViewModelBase<
  DemoPayload,
  ProjectViewModel | null
> {
  name = `Project ${this.payload.index}`;
  status = ['healthy', 'building', 'paused'][this.payload.index % 3];
  requests = this.payload.index * 17;
  selected = false;
  environment = {
    region: 'eu-west',
    replicas: 3,
    limits: { cpu: 4, memory: 8192 },
  };
  tags = ['production', 'frontend', 'managed'];
  permissions = new Set(['read', 'deploy']);
  metrics = new Map([
    ['latency', 42],
    ['availability', 99.98],
  ]);
  history = Array.from({ length: 12 }, (_, index) => ({
    id: index,
    status: 'completed',
    duration: index * 13,
  }));

  constructor(params: ViewModelParams<DemoPayload, ProjectViewModel | null>) {
    super(params);
    makeObservable(this, {
      requests: observable.ref,
      selected: observable.ref,
      summary: computed,
    });
  }
  get summary() {
    demoDiagnostics.computedReads++;
    return `${this.name}: ${this.requests} requests`;
  }
  increment = () => {
    this.requests++;
  };
}

export function createDemoStore(count: number, childrenPerRoot = 9) {
  count = Math.min(50000, Math.max(0, Math.trunc(count) || 0));
  childrenPerRoot = Math.min(
    1000,
    Math.max(0, Math.trunc(childrenPerRoot) || 0),
  );
  const store = new ViewModelStoreBase({
    vmConfig: {
      observable: {
        viewModels: { useDecorators: false },
        viewModelStores: { useDecorators: false },
      },
    },
  });
  const instances: ProjectViewModel[] = [];
  runInAction(() => {
    for (let index = 0; index < count; index++) {
      const rootIndex = index - (index % (childrenPerRoot + 1));
      const parent =
        childrenPerRoot > 0 && index !== rootIndex
          ? instances[rootIndex]
          : null;
      instances.push(
        store.define({
          VM: ProjectViewModel,
          id: `project-${String(index).padStart(5, '0')}`,
          payload: { index },
          parentViewModel: parent,
        }),
      );
    }
  });
  return { store, instances };
}
