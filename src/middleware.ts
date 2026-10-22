import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Rutas de página accesibles sin haber iniciado sesión. Cualquier otra página
// (dashboard, matches, upload, statistics, settings, partners, admin...) requiere
// sesión y, si no la hay, se redirige siempre a Inicio ('/').
const PUBLIC_PAGES = new Set(['/', '/login', '/register']);

// Rutas de API que deben seguir siendo accesibles sin sesión (el propio login/registro
// y el endpoint interno de NextAuth).
const PUBLIC_API_PREFIXES = ['/api/auth'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PAGES.has(pathname) || PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || 'secret-key-change-me',
  });

  if (token) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/', req.url));
}

export const config = {
  // Deja pasar sin pasar por el middleware: assets de Next, y cualquier ruta con
  // extensión de archivo (imágenes, favicon, manifest, service worker de la PWA...).
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
};
