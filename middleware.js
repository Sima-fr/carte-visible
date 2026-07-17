import { NextResponse } from 'next/server';

export function middleware(req) {
  const auth = req.headers.get('authorization');
  const expectedUser = 'restaurateur';
  const expectedPass = process.env.ADMIN_PASSWORD || 'changeme';

  if (auth && auth.startsWith('Basic ')) {
    const decoded = atob(auth.split(' ')[1]);
    const [user, pass] = decoded.split(':');
    if (user === expectedUser && pass === expectedPass) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Authentification requise', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Espace restaurateur"' },
  });
}

export const config = {
  matcher: '/admin/:path*',
};
