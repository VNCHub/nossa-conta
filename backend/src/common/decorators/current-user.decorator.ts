import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  email: string;
  familyId: string | null;
}

/**
 * User resolved by the JwtStrategy. It is the ONLY accepted source of familyId:
 * no service may trust a familyId coming from the request body.
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser =>
    ctx.switchToHttp().getRequest().user,
);
