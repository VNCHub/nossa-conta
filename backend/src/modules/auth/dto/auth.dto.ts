import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const normalizeEmail = ({ value }: { value: string }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a senha.' })
  password!: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe seu nome.' })
  @MaxLength(80)
  name!: string;

  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'A senha precisa ter 6 caracteres ou mais.' })
  @MaxLength(72)
  password!: string;

  /** Joins an existing family. Mutually exclusive with familyName. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  inviteCode?: string;

  /** Creates a new family. Mutually exclusive with inviteCode. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  familyName?: string;
}
