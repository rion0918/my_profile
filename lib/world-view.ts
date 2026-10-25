export const viewOffset = { x: 12, y: 12.4, z: 20 };
export const clampZoom = (zoom: number) => Math.max(.65, Math.min(1.6, zoom));

export function getTouchDirection(dx: number, dy: number, offset = viewOffset) {
  if (Math.hypot(dx, dy) <= 10) return { x: 0, z: 0 };
  const horizontal = Math.hypot(offset.x, offset.z);
  const vertical = offset.y / Math.hypot(horizontal, offset.y);
  const x = dx * offset.z / horizontal + dy * offset.x / horizontal / vertical;
  const z = -dx * offset.x / horizontal + dy * offset.z / horizontal / vertical;
  const length = Math.hypot(x, z);
  return { x: x / length, z: z / length };
}

export function getViewSpan(width: number, height: number, overview = false, zoom = 1) {
  const aspect = width / height;
  return (overview ? Math.max(43, 53 / aspect) : Math.max(7.5, 6.2 / aspect)) / clampZoom(zoom);
}

export function panView(target: {x:number;z:number}, dx: number, dy: number, scale: number, offset = viewOffset) {
  const horizontal = Math.hypot(offset.x, offset.z);
  const vertical = offset.y / Math.hypot(horizontal, offset.y);
  return {
    x: Math.max(-45, Math.min(45, target.x - dx * scale * offset.z / horizontal - dy * scale * offset.x / horizontal / vertical)),
    z: Math.max(-51, Math.min(40, target.z + dx * scale * offset.x / horizontal - dy * scale * offset.z / horizontal / vertical)),
  };
}
