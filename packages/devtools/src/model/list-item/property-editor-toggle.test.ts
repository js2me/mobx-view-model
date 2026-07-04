import { computed, makeObservable } from 'mobx';
import { describe, expect, it } from 'vitest';
import { PropertyEditor } from './property-editor';
import {
  createDevtoolsStub,
  createPropertyEditorHost,
  createPropertyListItemChain,
  asPropertyListItemChain,
} from '../__tests__/helpers/mock-property-editor-host';
import { ServiceDeploysTabVM } from '../__tests__/helpers/nova-permissions-fixture';

describe('PropertyEditor.toggleBoolean', () => {
  it('toggling hasUserEditRoles keeps promoteDeployment available in VM', () => {
    const vm = new ServiceDeploysTabVM();
    const service = vm.service;
    const permissions = service.permissions;

    expect(permissions.hasUserEditRoles).toBe(false);
    expect(vm.canPromoteDeployment).toEqual({
      value: false,
      reason: 'Нужна роль владельца или разработчика в команде сервиса.',
    });

    const item = createPropertyListItemChain([
      { property: 'service', host: vm },
      { property: 'permissions', host: service },
      { property: 'hasUserEditRoles', host: permissions },
    ]);

    const devtools = createDevtoolsStub();
    const editor = new PropertyEditor(
      createPropertyEditorHost({
        item,
        devtools,
        dataType: 'boolean',
      }),
    );

    editor.toggleBoolean();

    expect(devtools.notifications.push).not.toHaveBeenCalled();
    expect(permissions.hasUserEditRoles).toBe(true);
    expect(permissions.promoteDeployment).toEqual({
      value: true,
      reason: 'Нужна роль владельца или разработчика в команде сервиса.',
    });
    expect(vm.canPromoteDeployment).toEqual({
      value: true,
      reason: 'Нужна роль владельца или разработчика в команде сервиса.',
    });
    expect(vm.canPromoteDeployment).not.toBeUndefined();
  });

  it('can toggle back to false', () => {
    const vm = new ServiceDeploysTabVM();
    const permissions = vm.service.permissions;

    const item = createPropertyListItemChain([
      { property: 'service', host: vm },
      { property: 'permissions', host: vm.service },
      { property: 'hasUserEditRoles', host: permissions },
    ]);

    const editor = new PropertyEditor(
      createPropertyEditorHost({
        item,
        devtools: createDevtoolsStub(),
        dataType: 'boolean',
      }),
    );

    editor.toggleBoolean();
    editor.toggleBoolean();

    expect(permissions.hasUserEditRoles).toBe(false);
    expect(vm.canPromoteDeployment?.value).toBe(false);
  });

  it('still redirects nested plain snapshot edits through parent computed', () => {
    class HostWithPlainSnapshot {
      constructor() {
        makeObservable(this, {
          config: computed,
        });
      }

      get config() {
        return { canEdit: false, canDelete: true };
      }
    }

    const host = new HostWithPlainSnapshot();
    const config = host.config;
    const devtools = createDevtoolsStub();
    const item = asPropertyListItemChain(
      createPropertyListItemChain([
        { property: 'config', host },
        { property: 'canEdit', host: config },
      ]),
    );

    const editor = new PropertyEditor(
      createPropertyEditorHost({
        item,
        devtools,
        dataType: 'boolean',
      }),
    );

    editor.toggleBoolean();

    expect(devtools.notifications.push).not.toHaveBeenCalled();
    expect(host.config).toEqual({ canEdit: true, canDelete: true });
  });
});
