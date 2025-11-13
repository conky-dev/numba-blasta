import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/signup', '/forgot-password', '/onboarding']
  
  // API routes that don't require auth or org
  const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/signup',
    '/api/organizations',
    '/api/invitations/',
    '/api/user/org-check',
  ]

  // Check if route is public
  if (publicRoutes.some(route => pathname.startsWith(route) || pathname === route)) {
    return NextResponse.next()
  }

  // Check if route is a public API route
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Get auth token
  const token = request.cookies.get('auth_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  // If no token and not on public route, redirect to login (root page)
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Token exists, allow access
  // Org membership check will be done client-side via useRequireOrg hook
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

