import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { createUser, findUserByEmail, findUserByProvider } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || ''
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const email = String(credentials?.email || '').trim();
        const password = String(credentials?.password || '');
        if (!email || !password) return null;
        const user = await findUserByEmail(email);
        if (!user?.password_hash) return null;
        const ok = await compare(password, user.password_hash);
        if (!ok) return null;
        return { id: String(user.id), name: user.name, email: user.email };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) return false;
      if (!account) return true;

      if (account.provider === 'google' || account.provider === 'facebook') {
        const providerId = account.providerAccountId;
        const existingByProvider = await findUserByProvider(account.provider, providerId);
        if (existingByProvider) return true;

        const existingByEmail = await findUserByEmail(user.email);
        if (!existingByEmail) {
          await createUser({
            name: user.name,
            email: user.email,
            provider: account.provider,
            providerId
          });
        }
      }
      return true;
    }
  },
  pages: {
    signIn: '/login'
  },
  secret: process.env.NEXTAUTH_SECRET
};
