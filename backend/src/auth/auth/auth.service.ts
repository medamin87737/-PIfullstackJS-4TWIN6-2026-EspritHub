import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '../../users/schemas/user.schema';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) {}

    // Valide l'utilisateur avant de générer un token
    async validateUser(email: string, password: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.usersService.findByEmail(normalizedEmail);
        if (!user) return null;

        // Vérifier le statut de l'utilisateur
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException(
                "Votre compte n'est pas actif. Contactez l'administrateur",
            );
        }

        let isPasswordValid = false;
        const storedPassword = String(user.password ?? '');
        const looksHashed = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$');

        if (looksHashed) {
            try {
                isPasswordValid = await bcrypt.compare(password, storedPassword);
            } catch {
                isPasswordValid = false;
            }
        } else {
            // Legacy fallback: support old plaintext records once, then auto-migrate to bcrypt.
            isPasswordValid = storedPassword === password;
            if (isPasswordValid) {
                user.password = await bcrypt.hash(password, 10);
                await user.save();
            }
        }

        if (!isPasswordValid) return null;

        return user;
    }

    private getRefreshSecret(): string {
        return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'defaultSecret';
    }

    // Génère les tokens JWT (access + refresh)
    async login(user: any) {
        const payload = { sub: user._id, role: user.role };
        const accessExpiresIn = (process.env.JWT_EXPIRES_IN || '1h') as any;
        const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any;
        return {
            access_token: this.jwtService.sign(payload as any, {
                expiresIn: accessExpiresIn,
            }),
            refresh_token: this.jwtService.sign(payload as any, {
                secret: this.getRefreshSecret(),
                expiresIn: refreshExpiresIn,
            }),
        };
    }

    async refreshAccessToken(refreshToken: string) {
        try {
            const decoded = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.getRefreshSecret(),
            });
            const user = await this.usersService.findById(decoded.sub);
            const payload = { sub: user.id ?? user._id, role: user.role };
            return {
                access_token: this.jwtService.sign(payload as any, {
                    expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as any,
                }),
            };
        } catch {
            throw new UnauthorizedException('Refresh token invalide ou expiré');
        }
    }
}
