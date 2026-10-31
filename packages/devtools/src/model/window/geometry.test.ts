import { describe, expect, it } from 'vitest';
import { constrainRect, type ResizeEdge, resizeRect } from './geometry';

const viewport = { width: 1280, height: 900 };
const start = { x: 300, y: 200, width: 520, height: 500 };

describe('popup geometry', () => {
  it.each<ResizeEdge>([
    'left',
    'right',
    'top',
    'bottom',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ])('resizes %s within the viewport', (edge) => {
    const result = resizeRect(start, edge, { x: 90, y: 50 }, viewport);
    expect(result.width).toBeGreaterThanOrEqual(325);
    expect(result.height).toBeGreaterThanOrEqual(250);
    expect(result.x).toBeGreaterThanOrEqual(12);
    expect(result.y).toBeGreaterThanOrEqual(12);
    expect(result.x + result.width).toBeLessThanOrEqual(viewport.width - 12);
    expect(result.y + result.height).toBeLessThanOrEqual(viewport.height - 12);
    if (edge.includes('left'))
      expect(result.x + result.width).toBe(start.x + start.width);
    if (edge.includes('top'))
      expect(result.y + result.height).toBe(start.y + start.height);
  });
  it('keeps the whole panel reachable when the viewport is smaller than its minimum size', () => {
    const result = constrainRect(start, { width: 300, height: 220 });
    expect(result).toEqual({ x: 12, y: 12, width: 276, height: 196 });
    const resized = resizeRect(
      start,
      'top-left',
      { x: 1000, y: 1000 },
      { width: 300, height: 220 },
    );
    expect(resized.width).toBeLessThanOrEqual(276);
    expect(resized.height).toBeLessThanOrEqual(196);
    expect(resized.x).toBeGreaterThanOrEqual(0);
    expect(resized.y).toBeGreaterThanOrEqual(0);
  });
});
