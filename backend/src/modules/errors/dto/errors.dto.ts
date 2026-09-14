import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReportErrorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  stack!: string;
}
