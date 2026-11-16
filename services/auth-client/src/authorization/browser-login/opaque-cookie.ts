import type { Request } from 'express';

export function readOpaqueCookie(request: Request, name: string): string | undefined {
  const matches = (request.headers.cookie ?? '')
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith(`${name}=`));
  const cookie = matches[0]?.slice(name.length + 1);
  return matches.length === 1 && cookie && /^[A-Za-z0-9_-]{43}$/.test(cookie) ? cookie : undefined;
}
