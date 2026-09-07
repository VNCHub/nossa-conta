import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Releases the route from the global JwtAuthGuard. Use only on login and signup. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
