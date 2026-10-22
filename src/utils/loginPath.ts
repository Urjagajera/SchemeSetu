/**
 * The login link for someone on `pathname` + `search`: it carries the page as `redirect`, so signing in brings them back there.
 * From the home page or the login page itself there is nothing to come back to, and the login page's own default applies.
 */
export function loginPath(pathname: string, search = ''): string {
  if (pathname === '/' || pathname === '/login' || pathname === '/register') return '/login';
  return '/login?redirect=' + encodeURIComponent(pathname + search);
}
