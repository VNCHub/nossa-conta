import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MONTH_REGEX, RULE_TYPES, type RuleType } from '@shared/domain';

export class CreateRuleDto {
  @IsString()
  @IsNotEmpty({ message: 'Dê um nome à regra.' })
  @MaxLength(60)
  name!: string;

  @IsIn(RULE_TYPES as unknown as string[])
  type!: RuleType;

  @ValidateIf((o: CreateRuleDto) => o.type === 'meter')
  @IsString()
  @IsNotEmpty({ message: 'Informe a unidade medida (km, dias, litros…).' })
  @MaxLength(20)
  unit?: string;
}

export class WeightItemDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percent!: number;
}

export class SetWeightsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => WeightItemDto)
  weights!: WeightItemDto[];
}

export class MeasurementItemDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9_999_999)
  amount!: number;
}

export class SetMeasurementsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MeasurementItemDto)
  measurements!: MeasurementItemDto[];
}

export class RuleMonthQuery {
  @IsOptional()
  @Matches(MONTH_REGEX, { message: 'Informe o mês no formato AAAA-MM.' })
  mes?: string;
}
