/**
 * One spelling for a myScheme scheme link, so the same scheme is never added twice under a slightly different link
 * (http/https, with or without www, a trailing slash, upper/lower case, a ?query or #part).
 */
const HOST = 'https://www.myscheme.gov.in';

/** The scheme's slug ("sui" in .../schemes/sui), lowercased; null when the link is not a myScheme scheme page. */
export function schemeSlug(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim(), HOST);
  } catch {
    return null;
  }
  if (!/^(www\.)?myscheme\.gov\.in$/i.test(parsed.hostname)) return null;
  const m = parsed.pathname.match(/^\/schemes\/([^/]+)\/?$/i);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
}

/** The link as the CSV writes it: https://www.myscheme.gov.in/schemes/<slug>. Null when it is not a scheme page. */
export function canonicalSchemeUrl(url: string): string | null {
  const slug = schemeSlug(url);
  return slug ? `${HOST}/schemes/${slug}` : null;
}
