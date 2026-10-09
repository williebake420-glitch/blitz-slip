export function formatAmerican(price: number): string {
  return price > 0 ? `+${price}` : `${price}`;
}

export function americanToDecimal(price: number): number {
  return price > 0 ? 1 + price / 100 : 1 + 100 / -price;
}

export function decimalToAmerican(dec: number): number {
  if (dec >= 2) return Math.round((dec - 1) * 100);
  return Math.round(-100 / (dec - 1));
}

export function impliedProbability(price: number): number {
  return price > 0 ? 100 / (price + 100) : -price / (-price + 100);
}

export function formatPayout(stake: number, americanPrice: number): number {
  const dec = americanToDecimal(americanPrice);
  return stake * dec;
}

export function formatUpdatedAgo(timestampSeconds: number | null): string {
  if (!timestampSeconds) return "unknown";
  const ms = timestampSeconds > 1e12 ? timestampSeconds : timestampSeconds * 1000;
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function formatGameTime(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}
