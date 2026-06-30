// Currency-code prefix + grouped, 2-decimal amount. We prepend the code
// (rather than Intl currency style) because SZL has no stable locale symbol.
export function formatPrice(price: number, currency: string): string {
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
  return `${currency} ${amount}`;
}
