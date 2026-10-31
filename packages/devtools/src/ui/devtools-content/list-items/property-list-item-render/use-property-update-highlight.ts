import { reaction } from 'mobx';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PropertyListItem } from '@/model/list-item/property-list-item';
import {
  arePropertyValueSnapshotsEqual,
  createPropertyValueSnapshot,
} from '@/model/utils/get-property-value-snapshot';

const HIGHLIGHT_MS = 900;

export const usePropertyUpdateHighlight = (item: PropertyListItem) => {
  const enabled = item.devtools.highlightUpdates;
  const [isHighlighted, setIsHighlighted] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const flashHighlight = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    setIsHighlighted(false);

    rafRef.current = requestAnimationFrame(() => {
      setIsHighlighted(true);
      rafRef.current = null;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setIsHighlighted(false);
        timeoutRef.current = null;
      }, HIGHLIGHT_MS);
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsHighlighted(false);
      return;
    }

    const dispose = reaction(
      () => createPropertyValueSnapshot(item.data),
      (snapshot, prevSnapshot) => {
        if (prevSnapshot === undefined) {
          return;
        }

        if (arePropertyValueSnapshotsEqual(prevSnapshot, snapshot)) {
          return;
        }

        flashHighlight();
      },
    );

    return () => {
      dispose();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, item, flashHighlight]);

  return isHighlighted;
};
