import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const normalizaEmail = ({ value }: { value: string }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @Transform(normalizaEmail)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a senha.' })
  senha!: string;
}

export class RegistrarDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe seu nome.' })
  @MaxLength(80)
  nome!: string;

  @Transform(normalizaEmail)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'A senha precisa ter 6 caracteres ou mais.' })
  @MaxLength(72)
  senha!: string;

  /** Entra numa família existente. Exclusivo com nomeFamilia. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  codigoConvite?: string;

  /** Cria uma família nova. Exclusivo com codigoConvite. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  nomeFamilia?: string;
}
