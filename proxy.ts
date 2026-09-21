import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

// Proxy builds its own NextAuth instance from the Prisma-free config rather
// than importing `@/lib/auth`, keeping the DB out of the request gate.
const { auth } = NextAuth(authConfig)

// Settings is every user's own account (password change), so it isn't gated.
const EMPLOYEE_BLOCKED_PREFIXES = [
  '/dashboard/team',
  '/dashboard/activity',
  '/dashboard/recycle-bin',
  '/dashboard/quotations',
  // The quotation PDF lives outside /dashboard, so block it by name too.
  '/print/quotations',
]
const ADMIN_BLOCKED_PREFIXES = ['/dashboard/team', '/dashboard/activity', '/dashboard/recycle-bin']

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isDashboardRoute = nextUrl.pathname.startsWith('/dashboard')
  // Print pages (quotation PDFs) sit outside /dashboard to skip the app
  // shell, but are just as private.
  const isPrintRoute = nextUrl.pathname.startsWith('/print')

  if ((isDashboardRoute || isPrintRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isLoggedIn && (isDashboardRoute || isPrintRoute)) {
    const role = req.auth?.user?.role

    if (role === 'EMPLOYEE') {
      const blocked = EMPLOYEE_BLOCKED_PREFIXES.some((p) =>
        nextUrl.pathname.startsWith(p)
      )
      if (blocked) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl))
      }
    }

    if (role === 'ADMIN') {
      const blocked = ADMIN_BLOCKED_PREFIXES.some((p) =>
        nextUrl.pathname.startsWith(p)
      )
      if (blocked) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/print/:path*'],
}