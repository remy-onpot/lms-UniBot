import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Initialize Response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Create Client
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
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 3. Get User
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname;

  // --- CONFIGURATION ---
  const isProtectedRoute = 
    path.startsWith('/dashboard') || 
    path.startsWith('/admin') ||
    (path.startsWith('/api/') && !path.startsWith('/api/auth') && !path.startsWith('/api/payment/webhook'));

  const isAuthRoute = path.startsWith('/login') || path.startsWith('/signup');

  // --- LOGIC ---

  // A. Protect Private Routes
  if (isProtectedRoute && !user) {
    if (path.startsWith('/api/')) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    
    // Redirect AND Copy Cookies (Crucial for Auth state)
    const redirectResponse = NextResponse.redirect(url)
    const allCookies = response.cookies.getAll()
    allCookies.forEach(c => redirectResponse.cookies.set(c))
    
    return redirectResponse
  }

  // B. Protect Auth Routes (Don't let logged-in users see login)
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    
    const redirectResponse = NextResponse.redirect(url)
    const allCookies = response.cookies.getAll()
    allCookies.forEach(c => redirectResponse.cookies.set(c))
    
    return redirectResponse
  }

  // C. Role-Based Access Control (Lecturer vs Student)
  if (path.startsWith('/dashboard/lecturer') && user) {
    // We must fetch the role from DB to be secure
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'lecturer') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard' // Kick back to main dashboard
      
      const redirectResponse = NextResponse.redirect(url)
      const allCookies = response.cookies.getAll()
      allCookies.forEach(c => redirectResponse.cookies.set(c))
      return redirectResponse
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)',
  ],
}