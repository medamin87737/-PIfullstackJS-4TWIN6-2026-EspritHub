import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Profile, Strategy } from 'passport-google-oauth20'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      // Keep app bootable in dev when Google OAuth env vars are missing.
      // Real OAuth login endpoints are guarded in controller with explicit checks.
      clientID: process.env.GOOGLE_CLIENT_ID ?? 'dev-missing-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? 'dev-missing-google-client-secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3000/users/google/callback',
      scope: ['email', 'profile'],
    })
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    return {
      provider: 'google',
      providerId: profile.id,
      email: profile.emails?.[0]?.value?.toLowerCase() ?? '',
      name: profile.displayName ?? profile.name?.givenName ?? 'Google User',
    }
  }
}
