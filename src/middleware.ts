// src/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 🚀 CONFIGURATION
const AUTH_TIMEOUT_MS = 2500; // 2.5s max wait time for auth
const PROTECTED_PATHS = [
  '/dashboard',
  '/super-admin',
  '/ai-assistant',
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. 🚀 PERFORMANCE: Early exit for static assets
  // This prevents the middleware from running heavy logic on images/fonts
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api/auth') || // Let auth endpoints handle themselves
    path.startsWith('/api/payment/webhook') || // Webhooks usually need raw body/signature, handle elsewhere
    path.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|pdf|woff|woff2|ttf|eot|json|xml|txt|css|js)$/i)
  ) {
    return NextResponse.next();
  }

  // 2. Initialize the response
  // We start with the request headers to preserve the chain
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 3. Supabase Client Setup (The "Split-Brain" Fix)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // A. Update the REQUEST cookies (So Server Components see the new session NOW)
          cookiesToSet.forEach(({ name, value }) => 
            request.cookies.set(name, value)
          )
          
          // B. Update the RESPONSE object (So we don't lose the changes)
          response = NextResponse.next({
            request,
          })
          
          // C. Set the RESPONSE cookies (So the Browser sees the new session LATER)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 4. 🛡️ AUTH CHECK: Fail-closed with Timeout
  // We use getUser() to validate the JWT against the database (security over speed)
  let user = null;
  
  try {
    // Create a timeout promise to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), AUTH_TIMEOUT_MS)
    );

    // Race the auth check against the clock
    const { data: { user: authUser }, error } = await Promise.race([
      supabase.auth.getUser(),
      timeoutPromise
    ]) as any; // Casting to avoid complex Promise.race typing issues

    if (error) throw error;
    user = authUser;

  } catch (error) {
    // 🔍 LOGGING: Production monitoring
    if (process.env.NODE_ENV === 'production') {
       // Only log critical failures, not standard "no session" errors
       const msg = error instanceof Error ? error.message : 'Unknown';
       if (msg === 'Auth timeout') {
         console.error(`[Middleware] ⚠️ Auth Timeout on ${path}`);
       }
    }
  }

  // 5. 🛡️ ROUTE PROTECTION LOGIC
  
  // Helper: Is this a protected route?
  const isProtectedRoute = 
    PROTECTED_PATHS.some(prefix => path.startsWith(prefix)) ||
    (path.startsWith('/api/') && !path.startsWith('/api/auth') && !path.startsWith('/api/public'));

  // Helper: Is this an Auth route (Login/Signup)?
  // Exclude /auth/callback to prevent loops during OAuth exchange
  const isAuthRoute = 
    (path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/auth')) && 
    !path.startsWith('/auth/callback');


  // A. REDIRECT: Unauthenticated User accessing Protected Route
  if (isProtectedRoute && !user) {
    // API Route: Return 401 JSON
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Page Route: Redirect to Login
    const url = new URL('/login', request.url);
    url.searchParams.set('next', path); // Remember where they wanted to go
    return redirectWithCookies(url, response);
  }

  // B. REDIRECT: Authenticated User accessing Guest Route
  if (isAuthRoute && user) {
    const url = new URL('/dashboard', request.url);
    return redirectWithCookies(url, response);
  }

  // 6. 🛡️ SECURITY HEADERS (Production Best Practice)
  // Add basic security headers to every response
  response.headers.set('x-frame-options', 'DENY'); // Prevent clickjacking
  response.headers.set('x-content-type-options', 'nosniff'); // Prevent MIME sniffing

  return response;
}

/**
 * 🛠️ HELPER: Redirect while preserving cookies
 * Crucial! If we refreshed a token above, a standard NextResponse.redirect()
 * would discard the new cookies, causing an infinite loop.
 */
function redirectWithCookies(url: URL, sourceResponse: NextResponse) {
  const newResponse = NextResponse.redirect(url);
  
  // Copy cookies from the source response (which might contain a refreshed token)
  const cookiesToSet = sourceResponse.cookies.getAll();
  cookiesToSet.forEach((cookie) => {
    newResponse.cookies.set(cookie.name, cookie.value, cookie);
  });
  
  return newResponse;
}

export const config = {
  // Matcher ignores static files to save resources
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}