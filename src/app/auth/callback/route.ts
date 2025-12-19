// src/app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // If "next" is passed, use it, otherwise default to /dashboard
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // 1. Create a temporary cookie store to capture the session
    const cookieStore = new Map<string, { value: string; options: any }>()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // 🏆 FIX: Use request.cookies.getAll() which returns the correct array format
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, { value, options })
            })
          },
        },
      }
    )

    // 2. Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 3. Create the redirect response
      const forwardedUrl = `${origin}${next}`
      const response = NextResponse.redirect(forwardedUrl)

      // 4. 🛡️ BRIDGE: Copy the captured cookies to the final response
      // This ensures the browser actually receives the "logged in" cookie
      cookieStore.forEach((data, name) => {
        response.cookies.set(name, data.value, data.options)
      })

      return response
    }
  }

  // Error Case: Redirect to an error page
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}