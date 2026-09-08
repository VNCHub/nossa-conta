import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFamilyDto {
  @IsString()
  @IsNotEmpty({ message: 'Dê um nome à família.' })
  @MaxLength(60)
  name!: string;
}

export class UpdateFamilyDto {
  @IsString()
  @IsNotEmpty({ message: 'Dê um nome à família.' })
  @MaxLength(60)
  name!: string;
}

export class JoinFamilyDto {
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Informe o código de convite.' })
  @MaxLength(40)
  code!: string;
}
