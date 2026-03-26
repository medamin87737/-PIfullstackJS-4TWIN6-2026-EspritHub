import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET || 'defaultSecret',
        });
    }

    // La fonction validate est appelée automatiquement par le guard
    async validate(payload: any) {
        return { userId: payload.sub, role: payload.role };
    }
}
