import { ExtraListItem } from '../list-item/extra-list-item';
import type { ListItem } from '../list-item/list-item';
import { PropertyListItem } from '../list-item/property-list-item';
import { VMListItem } from '../list-item/vm-list-item';

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

  if (mapKey?.startsWith(prefix)) {
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
  if (!ctx.selectedPathOwnerKey || ctx.selectedPathSegment !== firstSegment) {
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
  _ctx: SearchContext,
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
      result.push(...getOwnerMatchedPathCandidates(directProps, pathSegments));
    } else if (firstSegmentIsExactProperty) {
      result.push(...getPropertyPathCandidates(ctx, directProps, pathSegments));
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
