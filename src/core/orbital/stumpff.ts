/** Stumpff functions C(z) and S(z) for universal-variable formulations. */

const SERIES_THRESHOLD = 1e-6;

export function stumpffC(z: number): number {
  if (z > SERIES_THRESHOLD) return (1 - Math.cos(Math.sqrt(z))) / z;
  if (z < -SERIES_THRESHOLD) return (Math.cosh(Math.sqrt(-z)) - 1) / -z;
  return 1 / 2 - z / 24 + (z * z) / 720;
}

export function stumpffS(z: number): number {
  if (z > SERIES_THRESHOLD) {
    const sz = Math.sqrt(z);
    return (sz - Math.sin(sz)) / (sz * sz * sz);
  }
  if (z < -SERIES_THRESHOLD) {
    const sz = Math.sqrt(-z);
    return (Math.sinh(sz) - sz) / (sz * sz * sz);
  }
  return 1 / 6 - z / 120 + (z * z) / 5040;
}
