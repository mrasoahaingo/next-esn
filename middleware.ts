import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/org-selection(.*)',
  '/.well-known/(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return

  try {
    const { orgId } = await auth.protect()

    if (!orgId && !request.nextUrl.pathname.startsWith('/org-selection')) {
      return NextResponse.redirect(new URL('/org-selection', request.url))
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[middleware] auth.protect() failed for ${request.method} ${request.nextUrl.pathname}:`, (err as Error).message ?? err)
    }
    throw err
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
