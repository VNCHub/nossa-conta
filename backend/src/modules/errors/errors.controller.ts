import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ErrorsService } from './errors.service';
import { ReportErrorDto } from './dto/errors.dto';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('erros')
export class ErrorsController {
  constructor(private readonly errors: ErrorsService) {}

  /**
   * Anyone can report — a crash can happen before the user is even logged in.
   * `source` is never taken from the body: nothing but this backend itself can
   * claim to be a backend-sourced error.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  report(@Body() dto: ReportErrorDto) {
    return this.errors.report({ source: 'frontend', title: dto.title, stack: dto.stack });
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get()
  list(@Query() q: PaginationQuery) {
    return this.errors.listIssues(q.page, q.pageSize);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get(':id')
  detail(@Param('id') id: string, @Query() q: PaginationQuery) {
    return this.errors.getIssueDetail(id, q.page, q.pageSize);
  }
}
