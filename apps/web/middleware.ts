import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = pathname === '/dashboard' || ['/leads', '/customers', '/catalogue', '/quotations', '/sales-orders', '/whatsapp', '/payments', '/production', '/marketing', '/reports', '/workflows', '/settings'].some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !request.cookies.has('commit_session')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/leads/:path*', '/customers/:path*', '/catalogue/:path*', '/quotations/:path*', '/sales-orders/:path*', '/whatsapp/:path*', '/payments/:path*', '/production/:path*', '/marketing/:path*', '/reports/:path*', '/workflows/:path*', '/settings/:path*', '/login'],
};
