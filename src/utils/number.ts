/** Number formatting helpers. */

/** Group with thousands separators, rounded to whole numbers by default. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Volume with a unit suffix, e.g. "12,480 lbs". */
export function formatVolume(value: number, unit: string): string {
  return `${formatNumber(Math.round(value))} ${unit}`;
}

/** Compact form for large counts, e.g. 1.2k. */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}
