import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..', '..');
const read = (...p: string[]) => fs.readFileSync(path.join(root, ...p), 'utf8');

// /home used to show a Bosnian (Mostar) tourism template that had nothing to do with SchemeSetu. It is gone for good.
describe('the Mostar template stays removed', () => {
  it('its files are gone', () => {
    for (const f of ['MostarLanding.tsx', 'mostar-landing.css', 'index.tsx']) {
      expect(fs.existsSync(path.join(root, 'src', 'pages', 'Landing', f)), f).toBe(false);
    }
  });

  it('there is no /home route and nothing imports a landing page from the routes', () => {
    const routes = read('src', 'routes', 'AppRoutes.tsx');
    expect(routes).not.toMatch(/path="\/home"/);
    expect(routes).not.toMatch(/Landing/);
  });

  it('no source file mentions Mostar, Bosnia or the template\'s font host', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(tsx?|css|json|html)$/.test(e.name) && !/\.test\./.test(e.name)) {
          if (/mostar|bosnia|herzegovina|cloudfront\.net/i.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(root, p));
        }
      }
    };
    walk(path.join(root, 'src'));
    walk(path.join(root, 'locales'));
    expect(hits).toEqual([]);
  });

  it('the layout and navbar no longer special-case /home', () => {
    expect(read('src', 'layouts', 'MainLayout.tsx')).not.toMatch(/'\/home'|isLandingPage/);
    expect(read('src', 'components', 'Navbar.tsx')).not.toMatch(/'\/home'|isLandingPage/);
  });
});
