import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface ClientInfo {
  ip: string;
  userAgent: string;
  isGuest: boolean;
}

export const ClientInfo = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientInfo => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const forwarded = request.headers['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : request.ip || request.socket?.remoteAddress || 'unknown';

    const userAgent = (request.headers['user-agent'] as string) || 'unknown';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const authUser = (request as any).authUser as
      | { id: string; isAnonymous?: boolean | null }
      | undefined;

    return {
      ip,
      userAgent,
      isGuest: authUser?.isAnonymous === true,
    };
  },
);
