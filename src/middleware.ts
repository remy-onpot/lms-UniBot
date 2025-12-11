import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Refresh Session (This is critical for Supabase SSR)
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname;

  // 🛡️ SECURITY CONFIGURATION
  // Define paths that require authentication
  const isProtectedRoute = 
    path.startsWith('/dashboard') || 
    path.startsWith('/super-admin') ||
    path.startsWith('/ai-assistant') ||
    // Protect API routes that perform mutations or access sensitive data
    (path.startsWith('/api/') && !path.startsWith('/api/auth') && !path.startsWith('/api/payment/webhook'));

  // Define paths that are ONLY for guests (e.g. Login)
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/auth');

  // 2. LOGIC: Redirect Unauthenticated Users
  if (isProtectedRoute && !user) {
    // A. API Request? -> Return 401 JSON (Don't redirect APIs)
    if (path.startsWith('/api/')) {
        return NextResponse.json(
            { error: 'Unauthorized: Please log in first.' }, 
            { status: 401 }
        );
    }
    // B. Page Request? -> Redirect to Login
    const redirectUrl = new URL('/login', request.url);
    // Optional: Save the return URL to redirect back after login
    redirectUrl.searchParams.set('next', path); 
    return NextResponse.redirect(redirectUrl);
  }

  // 3. LOGIC: Redirect Authenticated Users (Guest Only Routes)
  if (isAuthRoute && user) {
    // If they are already logged in, send them to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth callback routes (handled explicitly)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}