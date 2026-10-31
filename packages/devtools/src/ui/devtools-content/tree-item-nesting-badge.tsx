import { ArrowUpLeft } from '@gravity-ui/icons';
import css from '@/styles.module.css';

export const TreeItemNestingBadge = ({
  depth,
  parentLabel,
}: {
  depth: number;
  parentLabel?: string | null;
}) => {
  if (depth <= 0) {
    return null;
  }

  const title = parentLabel
    ? `Nested in ${parentLabel} · level ${depth}`
    : `Nesting level ${depth}`;

  return (
    <span className={css.treeItemNestingBadge} title={title} aria-hidden="true">
      <ArrowUpLeft />
      <span className={css.treeItemNestingBadgeLevel}>{depth}</span>
    </span>
  );
};
