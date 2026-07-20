import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { AUTH_INSTANCE } from './auth.constants';
import type { Auth } from './better-auth';

export interface AuthenticatedRequest extends Request {
  authUser?: { id: string; isAnonymous?: boolean | null };
}

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(@Inject(AUTH_INSTANCE) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Sign in required');
    }

    request.authUser = session.user;
    return true;
  }
}
