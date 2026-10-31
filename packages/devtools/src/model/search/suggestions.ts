import type { ListItem } from '../list-item/list-item';
import { PropertyListItem } from '../list-item/property-list-item';
import { VMListItem } from '../list-item/vm-list-item';
import { getSearchPathParts } from './parse-search-path';
import {
  getOwnerInfo as filterGetOwnerInfo,
  getBestSuggestionAlias,
  getCandidatePropsAtDepth,
  type OwnerInfo,
  propertyMatchesSegmentPartial,
  type SearchContext,
} from './path-matching';
import { getSuggestionSuffix } from './search-suggestion-text';

export interface SearchSuggestion {
  value: string;
  suffix: string;
  owner: OwnerInfo;
}

export function buildSearchSuggestions(
  text: string,
  ctx: SearchContext,
  rootItems: ListItem<any>[],
): SearchSuggestion[] {
  const formatted = text.toLowerCase().trim();
  if (!formatted) return [];

  const { pathSegments, completingSegment, endsWithDot, hasBracketKeySyntax } =
    getSearchPathParts(text);

  if (pathSegments.length === 0 && !completingSegment && !endsWithDot) {
    return [];
  }

  if (!endsWithDot && !completingSegment && !hasBracketKeySyntax) {
    return [];
  }

  const candidates =
    pathSegments.length === 0
      ? topLevelCandidates(rootItems, completingSegment)
      : getCandidatePropsAtDepth(ctx, rootItems, pathSegments);
  const suggestionsByVM = new Map<string, SearchSuggestion[]>();
  const seen = new Set<string>();

  for (const prop of candidates) {
    if (!propertyMatchesSegmentPartial(prop, completingSegment)) {
      continue;
    }

    const alias = getBestSuggestionAlias(prop, completingSegment);
    const owner = filterGetOwnerInfo(prop);
    const uniqueKey = `${owner.key}/${alias.lower}`;

    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    const suggestions = suggestionsByVM.get(owner.name) ?? [];
    suggestions.push({
      value: alias.original,
      suffix: getSuggestionSuffix(alias.original, completingSegment),
      owner,
    });
    suggestionsByVM.set(owner.name, suggestions);
  }

  const result: SearchSuggestion[] = [];
  const groups = [...suggestionsByVM.values()];
  let offset = 0;

  while (result.length < 10) {
    let hasSuggestion = false;

    for (const group of groups) {
      const suggestion = group[offset];
      if (!suggestion) continue;

      result.push(suggestion);
      hasSuggestion = true;

      if (result.length >= 10) {
        return result;
      }
    }

    if (!hasSuggestion) break;
    offset++;
  }

  return result;
}

function* topLevelCandidates(
  roots: ListItem<any>[],
  prefix: string,
): Generator<PropertyListItem> {
  const stack = [...roots].reverse();
  const counts = new Map<string, number>();
  while (stack.length) {
    const owner = stack.pop()!;
    if (!(owner instanceof VMListItem)) {
      yield* owner.children.filter(
        (item): item is PropertyListItem => item instanceof PropertyListItem,
      );
      continue;
    }
    const count = counts.get(owner.displayName) ?? 0;
    if (count < 10) {
      for (const [order, key] of owner.propertyKeys.entries()) {
        if (!key.toLowerCase().includes(prefix)) continue;
        yield PropertyListItem.create(owner.inspector, key, key, order, owner);
        counts.set(owner.displayName, (counts.get(owner.displayName) ?? 0) + 1);
        if (counts.get(owner.displayName)! >= 10) break;
      }
    }
    const children = owner.childVMListItems;
    for (let index = children.length - 1; index >= 0; index--)
      stack.push(children[index]);
  }
}
