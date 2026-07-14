import { describe, expect, it } from 'vitest';
import { calculateWorldLayout } from './layout';

describe('calculateWorldLayout', () => {
  it('fits the 520px game world inside a narrow portrait phone', () => {
    const layout = calculateWorldLayout(390, 844);

    expect(layout.scale).toBe(0.75);
    expect(layout.x).toBe(0);
    expect(520 * layout.scale).toBeLessThanOrEqual(390);
    expect(layout.y + 650 * layout.scale).toBeLessThanOrEqual(844);
  });

  it('does not upscale the world beyond its designed size', () => {
    const layout = calculateWorldLayout(900, 1000);

    expect(layout.scale).toBe(1);
    expect(layout.x).toBe(190);
  });
});
