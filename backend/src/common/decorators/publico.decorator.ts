import { SetMetadata } from '@nestjs/common';

export const PUBLICO = 'rota_publica';

/** Libera a rota do JwtAuthGuard global. Use só em login e cadastro. */
export const Publico = () => SetMetadata(PUBLICO, true);
