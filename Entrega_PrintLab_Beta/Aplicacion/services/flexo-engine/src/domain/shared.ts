export function toMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toPercent(value: number | undefined, fallback = 0): number {
  const safeValue = value ?? fallback;
  return safeValue / 100;
}

export function safeDivide(value: number, divisor: number): number {
  if (!divisor) {
    return 0;
  }

  return value / divisor;
}
