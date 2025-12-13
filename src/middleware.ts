// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Create an initial response object. 
  // We will attach cookies to this object, but if we redirect, 
  // we must copy these cookies to the redirect response.
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
          cookiesToSet.forEach(({ name, value, options }) => {
            // Update the request cookies so the client sees them immediately
            request.cookies.set(name, value)
            // Update the response cookies (what passes to the browser)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 2. Check the user session
  // IMPORTANT: This triggers the token refresh if needed.
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname;

  // 🛡️ SECURITY CONFIGURATION
  const isProtectedRoute = 
    path.startsWith('/dashboard') || 
    path.startsWith('/super-admin') ||
    path.startsWith('/ai-assistant') ||
    (path.startsWith('/api/') && !path.startsWith('/api/auth') && !path.startsWith('/api/payment/webhook'));

  const isAuthRoute = 
    (path.startsWith('/login') || path.startsWith('/auth')) && 
    !path.startsWith('/auth/callback');

  // 3. LOGIC: Redirect Unauthenticated Users
  if (isProtectedRoute && !user) {
    if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    
    // 🏆 FIX: Create redirect response & COPY cookies from 'response'
    const redirectResponse = NextResponse.redirect(url)
    const allCookies = response.cookies.getAll()
    allCookies.forEach(c => redirectResponse.cookies.set(c))
    
    return redirectResponse
  }

  // 4. LOGIC: Redirect Authenticated Users
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    
    // 🏆 FIX: Create redirect response & COPY cookies from 'response'
    const redirectResponse = NextResponse.redirect(url)
    const allCookies = response.cookies.getAll()
    allCookies.forEach(c => redirectResponse.cookies.set(c))
    
    return redirectResponse
  }

  // 5. If no redirect, return the original response with the cookies set
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)',
  ],
}