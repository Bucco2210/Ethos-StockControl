export type Currency = 'ARS' | 'USD';

const DEFAULT_CURRENCY: Currency = 'ARS';

export function formatCurrency(
  value: number | null | undefined,
  currency: Currency | string | undefined = DEFAULT_CURRENCY,
  options: { showSymbol?: boolean; minimumFractionDigits?: number } = {},
): string {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const cur = (currency === 'USD' ? 'USD' : 'ARS') as Currency;
  const { showSymbol = true, minimumFractionDigits = 2 } = options;
  if (!showSymbol) {
    return safe.toLocaleString('es-AR', {
      minimumFractionDigits,
      maximumFractionDigits: 2,
    });
  }
  return safe.toLocaleString('es-AR', {
    style: 'currency',
    currency: cur,
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });
}

export function currencyLabel(currency: Currency | string | undefined): string {
  return currency === 'USD' ? 'USD' : 'ARS';
}
