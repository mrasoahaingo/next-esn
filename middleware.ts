import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { APP_ROUTE_PREFIXES } from '@/lib/config/app-routes'

// Liste explicite des routes protégées : les pages de l'app (dossiers de `app/`,
// voir lib/config/app-routes.ts) et toutes les routes API. Le reste est public
// (landing, connexion, inscription, sélection d'organisation, fichiers
// `.well-known`, image OG) ; un chemin inconnu tombe ainsi sur la vraie 404.
const isProtectedRoute = createRouteMatcher([
  ...APP_ROUTE_PREFIXES.flatMap((prefix) => [prefix, `${prefix}/(.*)`]),
  '/api(.*)',
  '/trpc(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/templates(.*)'])

export default clerkMiddleware(async (auth, request) => {
  if (!isProtectedRoute(request)) return

  try {
    const session = await auth.protect()
    const isSuperAdmin =
      session.sessionClaims?.metadata?.role === 'super_admin'

    if (isAdminRoute(request)) {
      if (!isSuperAdmin) {
        return NextResponse.redirect(new URL('/', request.url))
      }
      return
    }

    if (
      !session.orgId &&
      !request.nextUrl.pathname.startsWith('/org-selection')
    ) {
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
