import * as annotation from 'yummies/mobx';
import { applyObservable, type ObservableAnnotationsArray } from 'yummies/mobx';

export type DetailedPermission = {
  value: boolean;
  reason: string;
};

const permissionsAnnotations: ObservableAnnotationsArray<PermissionsModel> = [
  [annotation.observableRef, 'flags'],
  [
    annotation.computed,
    'hasUserEditRoles',
    'paasDefaultPermission',
    'promoteDeployment',
  ],
];

const serviceInfoAnnotations: ObservableAnnotationsArray<ServiceInfo> = [
  [annotation.computed, 'permissions'],
];

const serviceDeploysTabAnnotations: ObservableAnnotationsArray<ServiceDeploysTabVM> =
  [
    [annotation.observableRef, 'service'],
    [annotation.computed, 'canPromoteDeployment'],
  ];

/**
 * Minimal reproduction of Nova's ServicePermissions + ServiceInfo pattern:
 * - permissions is a @computedModel-like getter returning a live MobX model
 * - hasUserEditRoles is a nested @computed boolean
 * - promoteDeployment depends on paasDefaultPermission -> hasUserEditRoles
 */
export class PermissionsModel {
  flags = { hasUserEditRoles: false };

  constructor() {
    applyObservable(this, permissionsAnnotations);
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
    applyObservable(this, serviceInfoAnnotations);
  }

  get permissions() {
    return this.permissionsModel;
  }
}

export class ServiceDeploysTabVM {
  service = new ServiceInfo();

  constructor() {
    applyObservable(this, serviceDeploysTabAnnotations);
  }

  get canPromoteDeployment() {
    return this.service.permissions.promoteDeployment;
  }
}
