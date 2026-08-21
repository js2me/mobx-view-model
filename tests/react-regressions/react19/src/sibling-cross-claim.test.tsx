import { makeObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  ViewModelBase,
  ViewModelStoreBase,
  type AnyViewModel,
  type AnyViewModelSimple,
  type ViewModelParams,
} from 'mobx-view-model';
import {
  ActiveViewModelProvider,
  ViewModelsProvider,
  useCreateViewModel,
  withViewModel,
} from 'mobx-view-model-react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

class ViewModelBaseMock<
  Payload extends Record<string, unknown> = Record<string, never>,
  ParentViewModel extends AnyViewModel | AnyViewModelSimple | null = null,
> extends ViewModelBase<Payload, ParentViewModel> {
  constructor(params?: Partial<ViewModelParams<Payload, ParentViewModel>>) {
    super({
      ...params,
      id: params?.id ?? '1',
      payload: params?.payload as Payload,
    });
    makeObservable(this);
  }
}

class ViewModelStoreBaseMock extends ViewModelStoreBase {
  constructor() {
    super({});
  }
}

afterEach(() => {
  cleanup();
});

/**
 * The pending-unmount claim is keyed by (VM class, parentId, store) — that key
 * is shared by same-class siblings under one parent (githome's GitlabAvatar
 * lists). With a single pending entry, a freshly-mounting sibling used to
 * steal the unmounting sibling's VM instance (wrong payload, skipped
 * willMount, foreign id). Payload now discriminates the claim.
 */
describe('sibling same-class VMs: claim discriminated by payload', () => {
  const setup = () => {
    const vmStore = new ViewModelStoreBaseMock();

    class LayoutVM extends ViewModelBaseMock {}
    class AvatarVM extends ViewModelBaseMock<{ name: string }> {}

    const Avatar = withViewModel(
      AvatarVM,
      ({ model }: { model: InstanceType<typeof AvatarVM> }) => (
        <span data-testid={`avatar-${model.payload.name}`}>{model.id}</span>
      ),
    );

    const Layout = observer(({ names }: { names: string[] }) => {
      const layoutVm = useCreateViewModel(LayoutVM);
      return (
        <ActiveViewModelProvider value={layoutVm}>
          <div>
            {names.map((name) => (
              <Avatar key={name} payload={{ name }} />
            ))}
          </div>
        </ActiveViewModelProvider>
      );
    });

    const App = ({ names }: { names: string[] }) => (
      <ViewModelsProvider value={vmStore}>
        <Layout names={names} />
      </ViewModelsProvider>
    );

    return { vmStore, AvatarVM, App };
  };

  test('new sibling with a different payload does NOT steal the pending VM', async () => {
    const { vmStore, AvatarVM, App } = setup();

    const view = await act(async () => render(<App names={['X']} />));
    const [vmX] = vmStore.getAll(AvatarVM);
    expect(vmX.payload).toEqual({ name: 'X' });

    // Remove X (cleanup schedules its unmount into the microtask grace
    // window), then mount sibling Y before the microtask flushes — the exact
    // window where the old claim heuristic cross-claimed X's instance.
    act(() => {
      view.rerender(<App names={[]} />);
    });
    act(() => {
      view.rerender(<App names={['Y']} />);
    });

    const vmY = vmStore
      .getAll(AvatarVM)
      .find((vm) => vm.payload.name === 'Y');
    expect(vmY).toBeDefined();
    expect(vmY).not.toBe(vmX);

    // After the grace window X is gone, only Y remains.
    await act(async () => {});
    expect(vmStore.getAll(AvatarVM)).toHaveLength(1);
    expect(vmStore.getAll(AvatarVM)[0].payload).toEqual({ name: 'Y' });
  });

  test('remount with an equal payload creates a fresh instance (no reclaim)', async () => {
    const { vmStore, AvatarVM, App } = setup();

    const view = await act(async () => render(<App names={['X']} />));
    const [vmX] = vmStore.getAll(AvatarVM);

    act(() => {
      view.rerender(<App names={[]} />);
    });
    act(() => {
      view.rerender(<App names={['X']} />);
    });

    // Reclaim was intentionally removed: unmount drops the VM from the
    // store immediately (no grace window), so the remounting fiber defines
    // a fresh instance even with an equal payload.
    expect(vmStore.getAll(AvatarVM)).toHaveLength(1);
    expect(vmStore.getAll(AvatarVM)[0]).not.toBe(vmX);
    expect(vmStore.getAll(AvatarVM)[0].payload).toEqual({ name: 'X' });

    await act(async () => {});
    expect(vmStore.getAll(AvatarVM)).toHaveLength(1);
    expect(vmX.isMounted).toBe(false);
    expect(vmStore.getAll(AvatarVM)[0].isMounted).toBe(true);
  });
});
