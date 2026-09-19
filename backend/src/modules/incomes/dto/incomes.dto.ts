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
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { INCOME_TYPES, MONTH_REGEX, type IncomeType } from '@shared/domain';

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

  /** The month it starts counting from — defaults to the current month if omitted. */
  @ValidateIf((o: CreateIncomeDto) => o.type === 'recurring' && o.since !== undefined)
  @Matches(MONTH_REGEX, { message: 'Informe o mês no formato AAAA-MM.' })
  since?: string;

  /** The last month it counts for — omitted means open-ended (keeps repeating). */
  @ValidateIf((o: CreateIncomeDto) => o.type === 'recurring' && o.until !== undefined)
  @Matches(MONTH_REGEX, { message: 'Informe o mês no formato AAAA-MM.' })
  until?: string;

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

  /** `null` explicitly reopens it (clears a previously set since/until) — distinct from omitting the field. */
  @IsOptional()
  @Matches(MONTH_REGEX, { message: 'Informe o mês no formato AAAA-MM.' })
  since?: string | null;

  /** Setting this ends the recurrence after that month, without touching earlier months; `null` reopens it. */
  @IsOptional()
  @Matches(MONTH_REGEX, { message: 'Informe o mês no formato AAAA-MM.' })
  until?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  date?: string;
}
