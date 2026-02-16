import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token as any
        const method = req.method
        const pathname = req.nextUrl.pathname

        // Subscription Guardrails
        if (token?.organization) {
            const isExpired = token.organization.subscriptionStatus === 'EXPIRED' ||
                token.organization.subscriptionStatus === 'CANCELED'

            // 1. Protect API Writes
            if (isExpired && pathname.startsWith('/api/') && method !== 'GET') {
                return new NextResponse(
                    JSON.stringify({ success: false, error: 'Subscription Expired. Please upgrade to continue performing operations.' }),
                    { status: 403, headers: { 'content-type': 'application/json' } }
                )
            }
        }

        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: '/login',
        },
    }
)

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/products/:path*',
        '/inventory/:path*',
        '/sales/:path*',
        '/customers/:path*',
        '/suppliers/:path*',
        '/reports/:path*',
        '/settings/:path*',
        '/api/dashboard/:path*',
        '/api/products/:path*',
        '/api/sales/:path*',
    ],
}
