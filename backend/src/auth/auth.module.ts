import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '../users/users.module';
import {AuthService} from "./auth/auth.service";
import {JwtStrategy} from "./auth/jwt.strategy/jwt.strategy"; // Chemin correct
import { GoogleStrategy } from './auth/google.strategy/google.strategy';

@Module({
  imports: [
    forwardRef(() => UsersModule), // Dépendance circulaire
    PassportModule.register({ session: false }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'defaultSecret', // Clé JWT
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as any }, // Access token
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
