import type { ListItem } from '../list-item/list-item';
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

  const candidates = getCandidatePropsAtDepth(ctx, rootItems, pathSegments);
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
