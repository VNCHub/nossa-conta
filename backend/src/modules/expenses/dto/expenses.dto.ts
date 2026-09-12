import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
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

/**
 * Every field but `shared` is optional: an expense can be logged incomplete
 * and completed later from the edit modal (see ExpensesService.isComplete).
 */
export class CreateExpenseDto {
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Informe a data no formato AAAA-MM-DD.' })
  date?: string;

  @IsOptional()
  @IsIn(PAYMENT_METHODS as unknown as string[])
  paymentMethod?: PaymentMethod | null;

  @IsOptional()
  @IsIn(CATEGORY_IDS)
  category?: CategoryId | null;

  @IsOptional()
  @IsIn(EXPENSE_TYPES as unknown as string[])
  expenseType?: ExpenseType | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Informe um valor válido.' })
  @IsPositive({ message: 'O valor precisa ser maior que zero.' })
  @Max(99_999_999)
  amount?: number | null;

  @IsOptional()
  @IsBoolean()
  shared?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  participants?: string[];

  @IsOptional()
  @IsString()
  ruleId?: string | null;
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
