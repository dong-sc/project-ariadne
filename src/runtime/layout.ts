const DESIGN_WIDTH = 520;
const DESIGN_HEIGHT = 650;

export interface WorldLayout {
  scale: number;
  x: number;
  y: number;
}

export function calculateWorldLayout(viewportWidth: number, viewportHeight: number): WorldLayout {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight);
  const scale = Math.min(1, safeWidth / DESIGN_WIDTH, safeHeight / DESIGN_HEIGHT);
  const renderedWidth = DESIGN_WIDTH * scale;
  const renderedHeight = DESIGN_HEIGHT * scale;

  return {
    scale,
    x: Math.max(0, (safeWidth - renderedWidth) / 2),
    y: Math.max(0, (safeHeight - renderedHeight) * 0.45),
  };
}
