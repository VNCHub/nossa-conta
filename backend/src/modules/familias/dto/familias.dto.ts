import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CriarFamiliaDto {
  @IsString()
  @IsNotEmpty({ message: 'Dê um nome à família.' })
  @MaxLength(60)
  nome!: string;
}

export class EntrarFamiliaDto {
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Informe o código de convite.' })
  @MaxLength(40)
  codigo!: string;
}
