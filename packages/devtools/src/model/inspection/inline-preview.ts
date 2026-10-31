export const INLINE_PREVIEW_MAX_ITEMS = 256;

export type InlinePreviewSlice = {
  count: number;
  hasMore: boolean;
  isEmpty: boolean;
  isOverflow: boolean;
};

export function resolveInlinePreviewSlice(
  visibleCount: number,
  scannedLength: number,
  totalCount: number,
): InlinePreviewSlice {
  const count = Math.max(0, Math.min(visibleCount, scannedLength));

  return {
    count,
    hasMore: count < totalCount,
    isEmpty: totalCount === 0,
    isOverflow: totalCount > 0 && count === 0,
  };
}
