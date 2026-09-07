import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  CATEGORIA_IDS,
  MES_REGEX,
  PAGAMENTOS,
  TIPOS_GASTO,
  type CategoriaId,
  type Pagamento,
  type TipoGasto,
} from '@shared/dominio';

export class CriarGastoDto {
  @IsISO8601({ strict: true }, { message: 'Informe a data no formato AAAA-MM-DD.' })
  data!: string;

  @IsIn(PAGAMENTOS as unknown as string[])
  pagamento!: Pagamento;

  @IsIn(CATEGORIA_IDS)
  categoria!: CategoriaId;

  @IsIn(TIPOS_GASTO as unknown as string[])
  tipoGasto!: TipoGasto;

  @IsString()
  @IsNotEmpty({ message: 'Descreva o gasto.' })
  @MaxLength(120)
  descricao!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Informe um valor válido.' })
  @IsPositive({ message: 'O valor precisa ser maior que zero.' })
  @Max(99_999_999)
  valor!: number;

  @IsBoolean()
  dividir!: boolean;

  @ValidateIf((o: CriarGastoDto) => o.dividir)
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  participantes!: string[];

  @ValidateIf((o: CriarGastoDto) => o.dividir)
  @IsString()
  @IsNotEmpty({ message: 'Escolha a regra de rateio.' })
  regraId!: string;
}

export class AtualizarGastoDto extends CriarGastoDto {}

export class ListarGastosQuery {
  @IsOptional()
  @Matches(MES_REGEX, { message: 'Informe o mês no formato AAAA-MM.' })
  mes?: string;

  /** 'meus' restringe aos lançamentos do próprio usuário. */
  @IsOptional()
  @IsIn(['todos', 'meus'])
  escopo?: 'todos' | 'meus';
}

export class MesQuery {
  @Type(() => String)
  @Matches(MES_REGEX, { message: 'Informe o mês no formato AAAA-MM.' })
  mes!: string;
}
