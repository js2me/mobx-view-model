import { computed, makeObservable } from 'mobx';
import { describe, expect, it } from 'vitest';
import type { PropertyListItem } from '../list-item/property-list-item';
import {
  asPropertyListItemChain,
  createPropertyListItemChain,
} from '../__tests__/helpers/mock-property-editor-host';
import {
  ServiceDeploysTabVM,
  ServiceInfo,
} from '../__tests__/helpers/nova-permissions-fixture';
import { resolveComputedProducerForEdit } from './resolve-computed-producer';
import { setPropertyValue } from './set-property-value';

function createHasUserEditRolesItem(
  vm: ServiceDeploysTabVM,
): PropertyListItem {
  const service = vm.service;

  return {
    property: 'hasUserEditRoles',
    parentListItem: {
      property: 'permissions',
      data: service.permissions,
      parentListItem: {
        property: 'service',
        data: service,
        parentListItem: {
          data: vm,
        },
      },
    },
  } as unknown as PropertyListItem;
}

describe('resolveComputedProducerForEdit', () => {
  describe('live MobX model returned by parent computed (@computedModel)', () => {
    it('does not redirect edits on nested computed inside permissions model', () => {
      const vm = new ServiceDeploysTabVM();
      const item = createHasUserEditRolesItem(vm);

      expect(resolveComputedProducerForEdit(item, true)).toBeNull();
    });

    it('keeps sibling computed getters after direct setPropertyValue on nested computed', () => {
      const vm = new ServiceDeploysTabVM();
      const permissions = vm.service.permissions;

      expect(permissions.promoteDeployment).toEqual({
        value: false,
        reason: 'Нужна роль владельца или разработчика в команде сервиса.',
      });

      const result = setPropertyValue(permissions, 'hasUserEditRoles', true);

      expect(result.ok).toBe(true);
      expect(permissions.hasUserEditRoles).toBe(true);
      expect(permissions.promoteDeployment).toEqual({
        value: true,
        reason: 'Нужна роль владельца или разработчика в команде сервиса.',
      });
      expect(vm.canPromoteDeployment).toEqual({
        value: true,
        reason: 'Нужна роль владельца или разработчика в команде сервиса.',
      });
    });

    it('does not replace permissions model with a plain object snapshot', () => {
      const service = new ServiceInfo();
      const permissionsBefore = service.permissions;

      setPropertyValue(permissionsBefore, 'hasUserEditRoles', true);

      expect(service.permissions).toBe(permissionsBefore);
      expect(service.permissions.promoteDeployment).not.toBeUndefined();
      expect(typeof service.permissions.promoteDeployment).toBe('object');
    });
  });

  describe('plain object snapshot returned by computed', () => {
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

    it('redirects nested edits to the parent computed producer', () => {
      const host = new HostWithPlainSnapshot();
      const config = host.config;
      const item = asPropertyListItemChain(
        createPropertyListItemChain([
          { property: 'config', host },
          { property: 'canEdit', host: config },
        ]),
      );

      expect(resolveComputedProducerForEdit(item, true)).toEqual({
        host,
        key: 'config',
        value: { canEdit: true, canDelete: true },
      });
    });
  });
});
