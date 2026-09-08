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
  CATEGORY_IDS,
  MONTH_REGEX,
  PAYMENT_METHODS,
  EXPENSE_TYPES,
  type CategoryId,
  type PaymentMethod,
  type ExpenseType,
} from '@shared/domain';

export class CreateExpenseDto {
  @IsISO8601({ strict: true }, { message: 'Informe a data no formato AAAA-MM-DD.' })
  date!: string;

  @IsIn(PAYMENT_METHODS as unknown as string[])
  paymentMethod!: PaymentMethod;

  @IsIn(CATEGORY_IDS)
  category!: CategoryId;

  @IsIn(EXPENSE_TYPES as unknown as string[])
  expenseType!: ExpenseType;

  @IsString()
  @IsNotEmpty({ message: 'Descreva o gasto.' })
  @MaxLength(120)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Informe um valor válido.' })
  @IsPositive({ message: 'O valor precisa ser maior que zero.' })
  @Max(99_999_999)
  amount!: number;

  @IsBoolean()
  shared!: boolean;

  @ValidateIf((o: CreateExpenseDto) => o.shared)
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  participants!: string[];

  @ValidateIf((o: CreateExpenseDto) => o.shared)
  @IsString()
  @IsNotEmpty({ message: 'Escolha a regra de rateio.' })
  ruleId!: string;
}

export class UpdateExpenseDto extends CreateExpenseDto {}

export class ListExpensesQuery {
  @IsOptional()
  @Matches(MONTH_REGEX, { message: 'Informe o mês no formato AAAA-MM.' })
  mes?: string;

  /** 'meus' restricts to the user's own entries. */
  @IsOptional()
  @IsIn(['todos', 'meus'])
  escopo?: 'todos' | 'meus';
}

export class MonthQuery {
  @Type(() => String)
  @Matches(MONTH_REGEX, { message: 'Informe o mês no formato AAAA-MM.' })
  mes!: string;
}
