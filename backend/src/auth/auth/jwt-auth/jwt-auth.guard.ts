// auth/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(JwtAuthGuard.name);
    constructor(private readonly jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader) return false;

        const token = authHeader.split(' ')[1];
        try {
            const decoded = this.jwtService.verify(token);
            request.user = decoded;
            return true;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`JWT verification failed: ${message}`);
            return false;
        }
    }
}
