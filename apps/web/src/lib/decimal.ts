import { Decimal } from "decimal.js";

export function addDecimals(a: string | number, b: string | number): string {
  return new Decimal(a || 0).add(new Decimal(b || 0)).toString();
}

export function subDecimals(a: string | number, b: string | number): string {
  return new Decimal(a || 0).sub(new Decimal(b || 0)).toString();
}

export function mulDecimals(a: string | number, b: string | number): string {
  return new Decimal(a || 0).mul(new Decimal(b || 0)).toString();
}

export function divDecimals(a: string | number, b: string | number): string {
  const denom = new Decimal(b || 0);
  if (denom.isZero()) return "0";
  return new Decimal(a || 0).div(denom).toString();
}

export function sumDecimals<T>(arr: T[], keyExtractor: (item: T) => string | number): string {
  return arr.reduce((sum, item) => {
    return new Decimal(sum).add(new Decimal(keyExtractor(item) || 0));
  }, new Decimal(0)).toString();
}

export function formatDecimalString(val: string | number | undefined | null, fractionDigits = 2): string {
  if (val === undefined || val === null) return "0.00";
  try {
    const num = new Decimal(val);
    return num.toNumber().toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  } catch {
    return "0.00";
  }
}
