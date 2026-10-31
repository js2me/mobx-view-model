import type { Maybe } from 'yummies/types';
import type { AnyObject } from 'yummies/types';
import { ExtraListItem } from './list-item/extra-list-item';
import type { ListItem } from './list-item/list-item';
import { PropertyListItem } from './list-item/property-list-item';
import { VMListItem } from './list-item/vm-list-item';

export interface SearchContext {
  segments: string[];
  endsWithDot: boolean;
  isActive: boolean;
  selectedPathOwnerKey: string | null;
  selectedPathSegment: string | null;
}

export function propertyMatchesSegmentExact(
  item: PropertyListItem,
  segment: string,
): boolean {
  const { property, mapKey } = item.searchData;
  return property === segment || (mapKey !== '' && mapKey === segment);
}

export function propertyMatchesSegmentPartial(
  item: PropertyListItem,
  segment: string,
): boolean {
  const { property, mapKey } = item.searchData;
  return (
    property.includes(segment) || (mapKey !== '' && mapKey.includes(segment))
  );
}

export function getBestSuggestionAlias(
  prop: PropertyListItem,
  prefix: string,
): { lower: string; original: string } {
  const { property, mapKey, mapKeyOriginal } = prop.searchData;

  if (mapKey && mapKey.startsWith(prefix)) {
    return { lower: mapKey, original: mapKeyOriginal };
  }

  return { lower: property, original: prop.property ?? '' };
}

export interface OwnerInfo {
  type: 'vm' | 'extras' | 'unknown';
  name: string;
  key: string;
}

export function getOwnerInfo(item: PropertyListItem): OwnerInfo {
  let parent: ListItem<any> = item.parentListItem;

  while (parent instanceof PropertyListItem) {
    parent = parent.parentListItem;
  }

  if (parent instanceof VMListItem) {
    return { name: parent.displayName, type: 'vm', key: parent.key };
  }

  if (parent instanceof ExtraListItem) {
    return { name: parent.displayName, type: 'extras', key: parent.key };
  }

  return { name: '', type: 'unknown', key: '-unknown' };
}

export function getDirectPropertyChildren(
  item: ListItem<any>,
): PropertyListItem[] {
  return item.children.filter(
    (child): child is PropertyListItem => child instanceof PropertyListItem,
  );
}

export function getPathMatchingProps(
  props: PropertyListItem[],
  segment: string,
): PropertyListItem[] {
  return props.filter((p) => propertyMatchesSegmentExact(p, segment));
}

export function navigatePropertyPath(
  props: PropertyListItem[],
  segments: string[],
): PropertyListItem[] {
  if (segments.length === 0) return props;

  const [seg, ...rest] = segments;
  const matchingProps = getPathMatchingProps(props, seg);

  if (rest.length === 0) {
    const result: PropertyListItem[] = [];
    for (const prop of matchingProps) {
      result.push(...prop.children);
    }
    return result;
  }

  const result: PropertyListItem[] = [];
  for (const prop of matchingProps) {
    result.push(...navigatePropertyPath(prop.children, rest));
  }
  return result;
}

function isOwnerAllowedForFirstPathSegment(
  ctx: SearchContext,
  owner: ListItem<any>,
  firstSegment: string,
): boolean {
  if (
    !ctx.selectedPathOwnerKey ||
    ctx.selectedPathSegment !== firstSegment
  ) {
    return true;
  }

  return owner.key === ctx.selectedPathOwnerKey;
}

export function isPathOwnerLockedToAnotherOwner(
  ctx: SearchContext,
  owner: ListItem<any>,
  firstSegment: string,
): boolean {
  return !isOwnerAllowedForFirstPathSegment(ctx, owner, firstSegment);
}

function getPropertyPathCandidates(
  ctx: SearchContext,
  directProps: PropertyListItem[],
  pathSegments: string[],
): PropertyListItem[] {
  const [firstSeg, ...restSegments] = pathSegments;
  const matchingProps = getPathMatchingProps(directProps, firstSeg);

  if (restSegments.length === 0) {
    return matchingProps.flatMap((prop) => prop.children);
  }

  return matchingProps.flatMap((prop) =>
    navigatePropertyPath(prop.children, restSegments),
  );
}

function getOwnerMatchedPathCandidates(
  directProps: PropertyListItem[],
  pathSegments: string[],
): PropertyListItem[] {
  if (pathSegments.length === 1) {
    return directProps;
  }

  return navigatePropertyPath(directProps, pathSegments.slice(1));
}

export function collectAllVMs(rootItems: ListItem<any>[]): VMListItem[] {
  const result: VMListItem[] = [];
  const traverse = (item: ListItem<any>) => {
    if (item instanceof VMListItem) {
      result.push(item);
      for (const child of item.children) {
        traverse(child);
      }
    }
  };
  for (const item of rootItems) {
    traverse(item);
  }
  return result;
}

export function getCandidatePropsAtDepth(
  ctx: SearchContext,
  rootItems: ListItem<any>[],
  pathSegments: string[],
): PropertyListItem[] {
  const allVMs = collectAllVMs(rootItems);
  const extras = rootItems.filter(
    (item): item is ExtraListItem => item instanceof ExtraListItem,
  );

  if (pathSegments.length === 0) {
    return [...allVMs, ...extras].flatMap((item) =>
      getDirectPropertyChildren(item),
    );
  }

  const firstSeg = pathSegments[0];
  const result: PropertyListItem[] = [];

  for (const vm of allVMs) {
    if (!isOwnerAllowedForFirstPathSegment(ctx, vm, firstSeg)) continue;

    const directProps = getDirectPropertyChildren(vm);
    const firstSegmentIsExactProperty = directProps.some((prop) =>
      propertyMatchesSegmentExact(prop, firstSeg),
    );
    const vmNameMatch =
      !firstSegmentIsExactProperty &&
      (vm.searchData.name.includes(firstSeg) ||
        vm.searchData.id.includes(firstSeg));

    if (vmNameMatch) {
      result.push(
        ...getOwnerMatchedPathCandidates(directProps, pathSegments),
      );
    } else if (firstSegmentIsExactProperty) {
      result.push(
        ...getPropertyPathCandidates(ctx, directProps, pathSegments),
      );
    }
  }

  for (const extra of extras) {
    if (!isOwnerAllowedForFirstPathSegment(ctx, extra, firstSeg)) continue;

    const directProps = getDirectPropertyChildren(extra);
    const firstSegmentIsExactProperty = directProps.some((prop) =>
      propertyMatchesSegmentExact(prop, firstSeg),
    );

    if (!firstSegmentIsExactProperty) continue;

    result.push(...getPropertyPathCandidates(ctx, directProps, pathSegments));
  }

  return result;
}

export function getFlatListItems(rootItems: ListItem<any>[]): ListItem<any>[] {
  const result: ListItem<any>[] = [];

  const collectItem = (item: ListItem<any>) => {
    if (item instanceof VMListItem) {
      result.push(item);
      if (item.isExpanded) {
        for (const child of item.children) {
          if (!(child instanceof VMListItem)) {
            result.push(...child.expandedChildrenWithSelf);
          }
        }
      }
      for (const child of item.children) {
        if (child instanceof VMListItem) {
          collectItem(child);
        }
      }
    } else {
      result.push(item);
      if (item.isExpanded) {
        result.push(...item.expandedChildren);
      }
      for (const trailing of item.trailingItems) {
        result.push(...trailing.expandedChildrenWithSelf);
      }
    }
  };

  for (const item of rootItems) {
    collectItem(item);
  }

  return result;
}

export function getListItems(
  ctx: SearchContext,
  rootItems: ListItem<any>[],
  presentationMode: 'tree' | 'list',
): ListItem<any>[] {
  if (!ctx.isActive) {
    if (presentationMode === 'list') {
      return getFlatListItems(rootItems);
    }
    return rootItems.flatMap((item) => item.expandedChildrenWithSelf);
  }
  return rootItems.flatMap((item) => getFilteredItemsForSearch(ctx, item));
}

function getFilteredItemsForSearch(
  ctx: SearchContext,
  item: ListItem<any>,
): ListItem<any>[] {
  if (item instanceof VMListItem) {
    return getVMSearchItems(ctx, item);
  }
  if (item instanceof ExtraListItem) {
    return getExtraSearchItems(ctx, item);
  }
  return [item];
}

function getExtraSearchItems(
  ctx: SearchContext,
  item: ExtraListItem,
): ListItem<any>[] {
  if (isPathOwnerLockedToAnotherOwner(ctx, item, ctx.segments[0] ?? '')) {
    return [];
  }

  const directProps = getDirectPropertyChildren(item);
  const matchesByProperty = directProps.some((prop) =>
    propertyMatchesSegmentPartial(prop, ctx.segments[0] ?? ''),
  );

  if (!matchesByProperty) return [];

  return [item, ...getPropertySearchItems(ctx, directProps, ctx.segments)];
}

function getVMSearchItems(
  ctx: SearchContext,
  vmItem: VMListItem,
): ListItem<any>[] {
  const result: ListItem<any>[] = [];
  const firstSeg = ctx.segments[0] ?? '';

  if (isPathOwnerLockedToAnotherOwner(ctx, vmItem, firstSeg)) {
    for (const child of vmItem.children) {
      if (child instanceof VMListItem) {
        result.push(...getVMSearchItems(ctx, child));
      }
    }
    return result;
  }

  if (!vmMatchesSearch(ctx, vmItem)) {
    for (const child of vmItem.children) {
      if (child instanceof VMListItem) {
        result.push(...getVMSearchItems(ctx, child));
      }
    }
    return result;
  }

  result.push(vmItem);

  const { segments } = ctx;
  const directProps = vmItem.children.filter(
    (c): c is PropertyListItem => c instanceof PropertyListItem,
  );
  const nestedVMs = vmItem.children.filter(
    (c): c is VMListItem => c instanceof VMListItem,
  );
  const hasPathSyntax = ctx.endsWithDot || segments.length > 1;
  const firstSegmentIsExactProperty =
    hasPathSyntax &&
    directProps.some((prop) => propertyMatchesSegmentExact(prop, firstSeg));
  const vmMatchesByName =
    !firstSegmentIsExactProperty &&
    (vmItem.searchData.name.includes(firstSeg) ||
      vmItem.searchData.id.includes(firstSeg));

  const propSegments = vmMatchesByName ? segments.slice(1) : segments;

  result.push(...getPropertySearchItems(ctx, directProps, propSegments));

  for (const nestedVM of nestedVMs) {
    result.push(...getVMSearchItems(ctx, nestedVM));
  }

  return result;
}

export function vmMatchesSearch(
  ctx: SearchContext,
  item: VMListItem,
): boolean {
  const { segments } = ctx;
  if (segments.length === 0) return true;

  const firstSegment = segments[0];

  if (isPathOwnerLockedToAnotherOwner(ctx, item, firstSegment)) {
    return false;
  }

  if (
    item.searchData.name.includes(firstSegment) ||
    item.searchData.id.includes(firstSegment)
  ) {
    return true;
  }

  return item.children.some(
    (child) =>
      child instanceof PropertyListItem &&
      propertyMatchesSegmentPartial(child, firstSegment),
  );
}

/** Сегменты path-поиска для свойств внутри VM/Extras (как в getVMSearchItems). */
export function getVmPropSegmentsForProperty(
  ctx: SearchContext,
  item: PropertyListItem,
): string[] | null {
  let parent: ListItem<any> = item.parentListItem;

  while (parent instanceof PropertyListItem) {
    parent = parent.parentListItem;
  }

  if (!(parent instanceof VMListItem) && !(parent instanceof ExtraListItem)) {
    return null;
  }

  const { segments } = ctx;
  if (segments.length === 0) return null;

  const firstSeg = segments[0];
  if (isPathOwnerLockedToAnotherOwner(ctx, parent, firstSeg)) {
    return null;
  }

  const directProps = getDirectPropertyChildren(parent);
  const hasPathSyntax = ctx.endsWithDot || segments.length > 1;
  const firstSegmentIsExactProperty =
    hasPathSyntax &&
    directProps.some((prop) => propertyMatchesSegmentExact(prop, firstSeg));

  const vmMatchesByName =
    parent instanceof VMListItem &&
    !firstSegmentIsExactProperty &&
    (parent.searchData.name.includes(firstSeg) ||
      parent.searchData.id.includes(firstSeg));

  return vmMatchesByName ? segments.slice(1) : segments;
}

/**
 * Свойство на пути поиска должно выглядеть раскрытым (без inline-preview),
 * как после ручного клика — см. getPropertySearchItems autoExpandProps.
 */
export function isPropertySearchAutoExpanded(
  ctx: SearchContext,
  item: PropertyListItem,
): boolean {
  if (!ctx.isActive) return false;

  const propSegments = getVmPropSegmentsForProperty(ctx, item);
  if (!propSegments || propSegments.length === 0) return false;

  const chain: PropertyListItem[] = [];
  let current: ListItem<any> = item;

  while (current instanceof PropertyListItem) {
    chain.unshift(current);
    current = current.parentListItem;
  }

  if (chain.length > propSegments.length) return false;

  for (let i = 0; i < chain.length; i++) {
    if (!propertyMatchesSegmentExact(chain[i], propSegments[i])) {
      return false;
    }
  }

  const depth = chain.length - 1;
  const remainingAtLevel = propSegments.slice(depth);

  return remainingAtLevel.length > 1 || ctx.endsWithDot;
}

function getPropertySearchItems(
  ctx: SearchContext,
  properties: PropertyListItem[],
  propSegments: string[],
): ListItem<any>[] {
  const result: ListItem<any>[] = [];

  if (propSegments.length === 0) {
    for (const prop of properties) {
      result.push(prop);
      if (prop.isExpanded) {
        result.push(...prop.expandedChildren);
      }
      for (const trailing of prop.trailingItems) {
        result.push(...trailing.expandedChildrenWithSelf);
      }
    }
    return result;
  }

  const currentSeg = propSegments[0];
  const isNotLastSeg = propSegments.length > 1 || ctx.endsWithDot;
  const autoExpandProps = isNotLastSeg
    ? getPathMatchingProps(properties, currentSeg)
    : [];

  for (const prop of properties) {
    result.push(prop);

    const matches = autoExpandProps.includes(prop);

    if (matches && isNotLastSeg) {
      const restSegments = propSegments.slice(1);
      result.push(...getPropertySearchItems(ctx, prop.children, restSegments));

      // Как в expandedChildren: закрывающая `}`/`]` после детей path-узла.
      if (prop.isExpanded && prop.closingItem && restSegments.length === 0) {
        result.push(prop.closingItem);
      }
    } else if (prop.isExpanded) {
      result.push(...prop.expandedChildren);
    }

    for (const trailing of prop.trailingItems) {
      result.push(...trailing.expandedChildrenWithSelf);
    }
  }

  return result;
}

export function isItemFitted(
  ctx: SearchContext,
  item: ListItem<any>,
): boolean {
  if (!ctx.isActive) return true;

  if (item instanceof PropertyListItem) {
    const { segments } = ctx;
    if (segments.length === 0) return true;

    let parent: ListItem<any> = item.parentListItem;
    let propLevel = 0;
    const ancestors: PropertyListItem[] = [];

    while (parent instanceof PropertyListItem) {
      ancestors.push(parent);
      propLevel++;
      parent = parent.parentListItem;
    }

    if (
      !(parent instanceof VMListItem) &&
      !(parent instanceof ExtraListItem)
    ) {
      return true;
    }

    const firstSeg = segments[0];
    if (isPathOwnerLockedToAnotherOwner(ctx, parent, firstSeg)) return false;

    const hasPathSyntax = ctx.endsWithDot || segments.length > 1;
    const parentDirectProps = getDirectPropertyChildren(parent);
    const firstSegmentIsExactProperty =
      hasPathSyntax &&
      parentDirectProps.some((prop) =>
        propertyMatchesSegmentExact(prop, firstSeg),
      );
    const vmMatchesByName =
      parent instanceof VMListItem &&
      !firstSegmentIsExactProperty &&
      (parent.searchData.name.includes(firstSeg) ||
        parent.searchData.id.includes(firstSeg));

    const propSegments = vmMatchesByName ? segments.slice(1) : segments;

    const depthToCheck = Math.min(propLevel, propSegments.length);
    for (let i = 0; i < depthToCheck; i++) {
      const ancestor = ancestors[propLevel - 1 - i];
      if (!isPropertyFittedToSegment(ancestor, propSegments[i], true)) {
        return false;
      }
    }

    if (propLevel >= propSegments.length) {
      return true;
    }

    const seg = propSegments[propLevel];
    const isPathSegment =
      ctx.endsWithDot || propLevel < propSegments.length - 1;
    return isPropertyFittedToSegment(item, seg, isPathSegment);
  }

  return true;
}

export function isSearchTargetMatched(
  ctx: SearchContext,
  item: ListItem<any>,
): boolean {
  if (!ctx.isActive) return false;

  if (item instanceof VMListItem) {
    return isVMSearchTargetMatched(ctx, item);
  }

  if (item instanceof PropertyListItem) {
    return isPropertySearchTargetMatched(ctx, item);
  }

  return false;
}

function isVMSearchTargetMatched(
  ctx: SearchContext,
  item: VMListItem,
): boolean {
  const { segments } = ctx;
  if (segments.length === 0) return false;

  const firstSeg = segments[0];
  if (isPathOwnerLockedToAnotherOwner(ctx, item, firstSeg)) return false;

  const hasPathSyntax = ctx.endsWithDot || segments.length > 1;
  const firstSegmentIsExactProperty =
    hasPathSyntax &&
    item.children.some(
      (child) =>
        child instanceof PropertyListItem &&
        propertyMatchesSegmentExact(child, firstSeg),
    );

  return (
    !firstSegmentIsExactProperty &&
    (item.searchData.name.includes(firstSeg) ||
      item.searchData.id.includes(firstSeg))
  );
}

function isPropertySearchTargetMatched(
  ctx: SearchContext,
  item: PropertyListItem,
): boolean {
  const { segments } = ctx;
  if (segments.length === 0) return false;

  let parent: ListItem<any> = item.parentListItem;
  let propLevel = 0;
  const ancestors: PropertyListItem[] = [];

  while (parent instanceof PropertyListItem) {
    ancestors.push(parent);
    propLevel++;
    parent = parent.parentListItem;
  }

  if (!(parent instanceof VMListItem) && !(parent instanceof ExtraListItem)) {
    return false;
  }

  const firstSeg = segments[0];
  if (isPathOwnerLockedToAnotherOwner(ctx, parent, firstSeg)) return false;

  const hasPathSyntax = ctx.endsWithDot || segments.length > 1;
  const parentDirectProps = getDirectPropertyChildren(parent);
  const firstSegmentIsExactProperty =
    hasPathSyntax &&
    parentDirectProps.some((prop) =>
      propertyMatchesSegmentExact(prop, firstSeg),
    );
  const vmMatchesByName =
    parent instanceof VMListItem &&
    !firstSegmentIsExactProperty &&
    (parent.searchData.name.includes(firstSeg) ||
      parent.searchData.id.includes(firstSeg));

  const propSegments = vmMatchesByName ? segments.slice(1) : segments;
  if (propSegments.length === 0) return false;

  const targetLevel = propSegments.length - 1;

  const depthToCheck = Math.min(propLevel, targetLevel);
  for (let i = 0; i < depthToCheck; i++) {
    const ancestor = ancestors[propLevel - 1 - i];
    if (!isPropertyFittedToSegment(ancestor, propSegments[i], true)) {
      return false;
    }
  }

  if (propLevel !== targetLevel) return false;

  const isPathSegment =
    ctx.endsWithDot || propLevel < propSegments.length - 1;
  return isPropertyFittedToSegment(
    item,
    propSegments[targetLevel],
    isPathSegment,
  );
}

function isPropertyFittedToSegment(
  item: PropertyListItem,
  segment: string | undefined,
  preferExact: boolean,
): boolean {
  if (!segment) return true;

  return preferExact
    ? propertyMatchesSegmentExact(item, segment)
    : propertyMatchesSegmentPartial(item, segment);
}
