import type { Express } from 'express';

/**
 * Tells Express how many reverse proxies sit in front of it, so req.ip (which the rate limiters key on)
 * is the visitor's address and not the proxy's. Deployed, traffic goes browser -> Vercel -> Render's load
 * balancer -> Express, so the count is 2; run directly (local dev) it is 0 and the header is never trusted.
 * Trusting more hops than really exist would let a visitor forge their own address with X-Forwarded-For.
 */
export function applyTrustProxy(app: Express, hops: number): void {
  if (Number.isInteger(hops) && hops > 0) app.set('trust proxy', hops);
}

/** Reads TRUST_PROXY_HOPS; anything missing or not a whole number >= 0 means "no proxy". */
export function parseTrustProxyHops(raw: string | undefined): number {
  const n = Number(raw);
  return raw !== undefined && raw.trim() !== '' && Number.isInteger(n) && n >= 0 ? n : 0;
}
