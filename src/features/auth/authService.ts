import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { getSupabase } from '@/src/lib/supabase';
import { ServiceError, readableServiceError } from '@/src/lib/serviceError';
import { authRedirectUrl, EMAIL_CONFIRMATION_WEB_URL } from './authRedirects';

export type SignUpInput = {
  email: string;
  password: string;
  username: string;
};

export const EMAIL_CONFIRM_REDIRECT = EMAIL_CONFIRMATION_WEB_URL;
const PENDING_EMAIL_KEY = 'watchudoin.pending-verification-email';

function authError(error: { message: string; code?: string | null }) {
  const message = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? '';
  if (message.includes('invalid login')) return new ServiceError('Email or password is incorrect.', 'invalid_credentials', error);
  if (message.includes('already registered') || message.includes('user already exists')) return new ServiceError('An account already uses this email.', 'email_in_use', error);
  if (message.includes('database error saving new user')) return new ServiceError('We could not create the profile. The username may already be taken.', 'profile_creation_failed', error);
  if (message.includes('password')) return new ServiceError('Use a stronger password with at least 8 characters.', 'weak_password', error);
  if (message.includes('email not confirmed')) return new ServiceError('Confirm your email, then sign in.', 'email_not_confirmed', error);
  if (code.includes('rate_limit') || message.includes('rate limit') || message.includes('too many')) return new ServiceError('Too many attempts. Try again in a few minutes.', 'rate_limited', error);
  return readableServiceError(error);
}

export const authService = {
  async requestPasswordReset(email: string) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: authRedirectUrl('reset-password') });
    if (error) throw authError(error);
  },

  async updatePassword(password: string) {
    if (password.length < 8) throw new ServiceError('Use at least 8 characters.', 'weak_password');
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) throw authError(error);
  },

  async getSession() {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) throw authError(error);
    return data.session;
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return getSupabase().auth.onAuthStateChange(callback).data.subscription;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw authError(error);
    return data.session;
  },

  async signUp(input: SignUpInput) {
    const { data, error } = await getSupabase().auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {
          username: input.username.trim().toLowerCase(),
          display_name: input.username.trim().toLowerCase(),
        },
        emailRedirectTo: authRedirectUrl('email-confirmed'),
      },
    });
    if (error) throw authError(error);
    if (data.user && data.user.identities?.length === 0) {
      throw new ServiceError('An account already uses this email.', 'email_in_use');
    }
    return data;
  },

  async resendSignupConfirmation(email: string) {
    const { error } = await getSupabase().auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: authRedirectUrl('email-confirmed') },
    });
    if (error) throw authError(error);
  },

  async setSession(accessToken: string, refreshToken: string) {
    const { data, error } = await getSupabase().auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw authError(error);
    return data.session;
  },

  async rememberPendingVerificationEmail(email: string) {
    await AsyncStorage.setItem(PENDING_EMAIL_KEY, email.trim().toLowerCase());
  },

  async getPendingVerificationEmail() {
    return AsyncStorage.getItem(PENDING_EMAIL_KEY);
  },

  async clearPendingVerificationEmail() {
    await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
  },

  async signOut() {
    const { error } = await getSupabase().auth.signOut({ scope: 'local' });
    if (error) throw authError(error);
  },

  async clearLocalSession() {
    const { error } = await getSupabase().auth.signOut({ scope: 'local' });
    if (error) throw authError(error);
  },
};
