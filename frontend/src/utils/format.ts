export function formatCurrency(amount: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(amount));
}

export function formatPercent(rate: string): string {
  return `${(parseFloat(rate) * 100).toFixed(2)}%`;
}
