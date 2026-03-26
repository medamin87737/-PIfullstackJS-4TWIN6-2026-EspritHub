// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // Pas de rôle requis
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) return false;

    const token = authHeader.split(' ')[1];
    try {
      const decoded = this.jwtService.verify(token);
      request.user = decoded; // on attache l'utilisateur décodé à la requête
      const role = String(decoded?.role ?? '').toUpperCase();
      return requiredRoles.map((r) => String(r).toUpperCase()).includes(role);
    } catch (e) {
      return false;
    }
  }
}
