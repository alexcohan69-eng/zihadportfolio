import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import LinkedIn from 'next-auth/providers/linkedin'
import Twitter from 'next-auth/providers/twitter'
import Credentials from 'next-auth/providers/credentials'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { hashPassword, makeClientSessionToken, stripUser, CLIENT_SESSION_COOKIE } from '@/lib/client-auth'
import type { User as AppUser } from '@/lib/types'

/**
 * Upserts an OAuth-authenticated identity into the existing `users` collection,
 * defaulting new accounts to the `client` role. Reuses the same collection our
 * custom credential system (`lib/client-auth.ts`) already reads from, so both
 * auth paths resolve to one unified user record.
 */
async function upsertOAuthUser(email: string, name: string, provider: string): Promise<AppUser> {
  const db = await getDb()
  const cleanEmail = email.trim().toLowerCase()
  const existing = await db.collection<AppUser>('users').findOne({ email: cleanEmail })
  if (existing) return existing

  const newUser: AppUser = {
    id: `user-${Date.now()}`,
    role: 'client',
    name: name || cleanEmail.split('@')[0],
    email: cleanEmail,
    passwordHash: '',
    salt: '',
    createdAt: new Date().toISOString(),
  }
  await db.collection<AppUser>('users').insertOne(newUser as any)
  void provider // reserved for future per-provider bookkeeping
  return newUser
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    }),
    // Integrates our existing PBKDF2 credential store directly into NextAuth,
    // so email/password sign-in from the modal can use the `signIn()` client API too.
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? '').trim().toLowerCase()
        const password = String(creds?.password ?? '')
        if (!email || !password) return null

        const db = await getDb()
        const user = await db.collection<AppUser>('users').findOne({ email })
        if (!user || !user.passwordHash || !user.salt) return null

        const computed = await hashPassword(password, user.salt)
        if (computed !== user.passwordHash) return null

        return { id: user.id, name: user.name, email: user.email, role: user.role } as any
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Only OAuth providers need the upsert; the Credentials provider already
      // resolved an existing DB user in `authorize`.
      if (account?.provider && account.provider !== 'credentials') {
        if (!user.email) return false
        try {
          const dbUser = await upsertOAuthUser(user.email, user.name ?? '', account.provider)
          user.id = dbUser.id
          ;(user as any).role = dbUser.role
        } catch (err) {
          // Never let a DB hiccup surface as an unhandled crash in the OAuth
          // flow — bounce back to NextAuth's own error page instead so the
          // client-side signIn() promise rejects cleanly and the UI can show
          // a toast rather than a blank screen.
          console.error(`[auth signIn] failed to upsert ${account.provider} user`, err)
          return false
        }
      }

      // Bridge into our existing signed-cookie session so the rest of the app
      // (which reads `CLIENT_SESSION_COOKIE` via lib/client-auth.ts) recognizes
      // this session immediately, without a second login step.
      try {
        const sessionUser = stripUser({
          id: (user as any).id,
          role: ((user as any).role ?? 'client') as 'admin' | 'client',
          name: user.name ?? '',
          email: user.email ?? '',
          passwordHash: '',
          salt: '',
          createdAt: new Date().toISOString(),
        })
        const token = await makeClientSessionToken(sessionUser)
        const cookieStore = await cookies()
        cookieStore.set(CLIENT_SESSION_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        })
      } catch (err) {
        console.error('[auth signIn] failed to bridge legacy session cookie', err)
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role ?? 'client'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: '/',
  },
})
