import { annotation, applyObservable } from 'yummies/mobx';

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
    applyObservable(this, [
      [annotation.observable('ref'), 'flags'],
      [
        annotation.computed(),
        'hasUserEditRoles',
        'paasDefaultPermission',
        'promoteDeployment',
      ],
    ]);
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
    applyObservable(this, [[annotation.computed(), 'permissions']]);
  }

  get permissions() {
    return this.permissionsModel;
  }
}

export class ServiceDeploysTabVM {
  service = new ServiceInfo();

  constructor() {
    applyObservable(this, [
      [annotation.observable('ref'), 'service'],
      [annotation.computed(), 'canPromoteDeployment'],
    ]);
  }

  get canPromoteDeployment() {
    return this.service.permissions.promoteDeployment;
  }
}
