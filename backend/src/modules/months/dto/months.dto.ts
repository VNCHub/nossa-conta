import { Matches } from 'class-validator';
import { MONTH_REGEX } from '@shared/domain';

export class MonthParam {
  @Matches(MONTH_REGEX, { message: 'Informe o mês no formato AAAA-MM.' })
  mes!: string;
}
