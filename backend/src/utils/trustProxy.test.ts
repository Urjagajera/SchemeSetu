import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { applyTrustProxy, parseTrustProxyHops } from './trustProxy.js';

function ipSeenBy(hops: number, forwardedFor: string) {
  const app = express();
  applyTrustProxy(app, hops);
  app.get('/ip', (req, res) => {
    res.json({ ip: req.ip });
  });
  return request(app).get('/ip').set('X-Forwarded-For', forwardedFor).then((r) => r.body.ip as string);
}

describe('applyTrustProxy', () => {
  it('with no proxy configured, a forged X-Forwarded-For is ignored', async () => {
    const ip = await ipSeenBy(0, '6.6.6.6');
    expect(ip).not.toContain('6.6.6.6');
  });

  it('behind Vercel and Render (2 hops) the visitor is the first address, not either proxy', async () => {
    // Vercel puts the visitor in the header; Render's load balancer appends Vercel's address.
    expect(await ipSeenBy(2, '203.0.113.7, 76.76.21.21')).toBe('203.0.113.7');
  });

  it('a visitor cannot forge their way past the trusted hops', async () => {
    // The visitor sent "6.6.6.6" themselves; the proxies then appended the real visitor and Vercel.
    expect(await ipSeenBy(2, '6.6.6.6, 203.0.113.7, 76.76.21.21')).toBe('203.0.113.7');
  });
});

describe('parseTrustProxyHops', () => {
  it('reads whole numbers and treats anything else as no proxy', () => {
    expect(parseTrustProxyHops('2')).toBe(2);
    expect(parseTrustProxyHops('0')).toBe(0);
    for (const bad of [undefined, '', '  ', 'two', '-1', '1.5']) expect(parseTrustProxyHops(bad)).toBe(0);
  });
});
