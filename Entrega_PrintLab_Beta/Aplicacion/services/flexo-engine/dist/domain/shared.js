export function toMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
export function toPercent(value, fallback = 0) {
    const safeValue = value ?? fallback;
    return safeValue / 100;
}
export function safeDivide(value, divisor) {
    if (!divisor) {
        return 0;
    }
    return value / divisor;
}
