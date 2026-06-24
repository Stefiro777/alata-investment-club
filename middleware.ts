import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const MEMBERSHIP_EXEMPT_EMAIL = 'finullistefano@gmail.com'

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/api/sync-notion-calendar') {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired — required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect /dashboard and /admin: redirect to /login if not authenticated
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/admin'))
  ) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from /login
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Membership expiry gate
  // Allowed even when expired: /dashboard (exact) and /dashboard/membership[/*]
  // Everything else under /dashboard/* → redirect to /dashboard?membership=expired
  if (
    user &&
    request.nextUrl.pathname.startsWith('/dashboard') &&
    user.email !== MEMBERSHIP_EXEMPT_EMAIL
  ) {
    const path = request.nextUrl.pathname
    const isExpiredExempt =
      path === '/dashboard' ||
      path.startsWith('/dashboard/membership')

    if (!isExpiredExempt) {
      try {
        const adminClient = createSupabaseAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const { data: member } = await adminClient
          .from('club_members')
          .select('membership_expires_at')
          .eq('email', user.email ?? '')
          .maybeSingle()

        if (member) {
          if (!member.membership_expires_at) {
            // Never set — new member, needs to activate
            const url = new URL('/dashboard/membership', request.url)
            url.searchParams.set('new', 'true')
            return NextResponse.redirect(url)
          }
          if (new Date(member.membership_expires_at) < new Date()) {
            // Expired
            const url = new URL('/dashboard', request.url)
            url.searchParams.set('membership', 'expired')
            return NextResponse.redirect(url)
          }
        }
      } catch {
        // Non-blocking: if check fails, let the request through
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
}
