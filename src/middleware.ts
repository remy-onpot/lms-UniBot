// src/middleware.ts (FINAL, SECURE, LOOP-FREE REWRITE)

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Initialize the response object that will carry the refreshed cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Create the Supabase client (Session Refresh happens here)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        /** * 🏆 CRITICAL FIX: Set the refreshed session tokens directly on 
         * the response object, ensuring they are sent back to the client.
         */
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname;

  // 🛡️ SECURITY CONFIGURATION
  const isProtectedRoute = 
    path.startsWith('/dashboard') || 
    path.startsWith('/super-admin') ||
    path.startsWith('/ai-assistant') ||
    // Protect API routes
    (path.startsWith('/api/') && !path.startsWith('/api/auth') && !path.startsWith('/api/payment/webhook'));

  // Define paths that are ONLY for guests (Login, Sign-Up). 
  // ✅ FIX: Exclude /auth/callback to prevent the loop after successful exchange.
  const isAuthRoute = 
    (path.startsWith('/login') || path.startsWith('/auth')) && 
    !path.startsWith('/auth/callback');

  // 3. LOGIC: Redirect Unauthenticated Users (Accessing protected resources)
  if (isProtectedRoute && !user) {
    // If it's an API call, return 401 JSON
    if (path.startsWith('/api/')) {
        return NextResponse.json(
            { error: 'Unauthorized: Please log in first.' }, 
            { status: 401 }
        );
    }
    // If it's a Page request, redirect to Login
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', path); 
    return NextResponse.redirect(redirectUrl);
  }

  // 4. LOGIC: Redirect Authenticated Users (Accessing guest-only routes)
  if (isAuthRoute && user) {
    // If they are already logged in and try to hit /login, send them to /dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 5. Return the response, containing the refreshed cookies (if any)
  return response
}

export const config = {
  matcher: [
    /* Match all paths except static assets */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)',
  ],
}