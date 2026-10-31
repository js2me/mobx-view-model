import { computed, makeObservable, observable } from 'mobx';

export type DetailedPermission = {
  value: boolean;
  reason: string;
};

/**
 * Minimal reproduction of Nova's ServicePermissions + ServiceInfo pattern:
 * - permissions is a @computedModel-like getter returning a live MobX model
 * - hasUserEditRoles is a nested @computed boolean
 * - promoteDeployment depends on paasDefaultPermission -> hasUserEditRoles
 */
export class PermissionsModel {
  flags = { hasUserEditRoles: false };

  constructor() {
    makeObservable(this, {
      flags: observable.ref,
      hasUserEditRoles: computed,
      paasDefaultPermission: computed,
      promoteDeployment: computed,
    });
  }

  get hasUserEditRoles() {
    return this.flags.hasUserEditRoles;
  }

  get paasDefaultPermission(): DetailedPermission {
    return {
      value: this.hasUserEditRoles,
      reason: 'Нужна роль владельца или разработчика в команде сервиса.',
    };
  }

  get promoteDeployment(): DetailedPermission {
    return this.paasDefaultPermission;
  }
}

export class ServiceInfo {
  private permissionsModel = new PermissionsModel();

  constructor() {
    makeObservable(this, {
      permissions: computed,
    });
  }

  get permissions() {
    return this.permissionsModel;
  }
}

export class ServiceDeploysTabVM {
  service = new ServiceInfo();

  constructor() {
    makeObservable(this, {
      service: observable.ref,
      canPromoteDeployment: computed,
    });
  }

  get canPromoteDeployment() {
    return this.service.permissions.promoteDeployment;
  }
}
