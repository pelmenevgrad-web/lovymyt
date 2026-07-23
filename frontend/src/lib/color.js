// Converts a "#RRGGBB" hex color to an "rgba(r,g,b,a)" string — used for the
// gift badge's glow shadow, which needs an alpha channel a plain hex can't give.
export function hexToRgba(hex, alpha = 1) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex ?? '')
  if (!match) return `rgba(99,102,241,${alpha})`
  const [, r, g, b] = match
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`
}
