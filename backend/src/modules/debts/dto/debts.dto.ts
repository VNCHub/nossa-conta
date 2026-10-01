import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { PAYMENT_METHODS, type PaymentMethod } from '@shared/domain';

export class CreateDebtDto {
  /** who owes (and will pay) */
  @IsString()
  @IsNotEmpty()
  fromUserId!: string;

  /** who is owed */
  @IsString()
  @IsNotEmpty()
  toUserId!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Informe um valor válido.' })
  @IsPositive({ message: 'O valor precisa ser maior que zero.' })
  @Max(99_999_999)
  amount!: number;

  @IsString()
  @IsNotEmpty({ message: 'Escreva uma descrição para lembrar do que é a dívida.' })
  @MaxLength(120)
  description!: string;

  @IsISO8601({ strict: true }, { message: 'Informe a data no formato AAAA-MM-DD.' })
  date!: string;
}

export class PayDebtDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Informe um valor válido.' })
  @IsPositive({ message: 'O valor precisa ser maior que zero.' })
  @Max(99_999_999)
  amount!: number;

  /** The payment lands as an expense (and the receiver's income) in this date's month. */
  @IsISO8601({ strict: true }, { message: 'Informe a data no formato AAAA-MM-DD.' })
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  description?: string;

  @IsOptional()
  @IsIn(PAYMENT_METHODS as unknown as string[])
  paymentMethod?: PaymentMethod;
}
