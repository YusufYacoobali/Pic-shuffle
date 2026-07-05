// Largest board (in px) that fits the available area while keeping the image's
// aspect ratio. `aspect` is width / height.
export function fitBoard(areaW: number, areaH: number, aspect: number) {
  if (areaW <= 0 || areaH <= 0) return { w: 0, h: 0 };
  const maxW = areaW - 4;
  const maxH = areaH - 4;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  return { w: Math.floor(w), h: Math.floor(h) };
}
