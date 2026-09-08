import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { INCOME_TYPES, type IncomeType } from '@shared/domain';

export class CreateIncomeDto {
  @IsIn(INCOME_TYPES as unknown as string[])
  type!: IncomeType;

  @IsString()
  @IsNotEmpty({ message: 'Descreva a entrada.' })
  @MaxLength(120)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Informe um valor válido.' })
  @IsPositive({ message: 'O valor precisa ser maior que zero.' })
  @Max(99_999_999)
  amount!: number;

  @ValidateIf((o: CreateIncomeDto) => o.type === 'recurring')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ValidateIf((o: CreateIncomeDto) => o.type === 'oneOff')
  @IsISO8601({ strict: true }, { message: 'Informe a data no formato AAAA-MM-DD.' })
  date?: string;
}

export class UpdateIncomeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(99_999_999)
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  date?: string;
}
