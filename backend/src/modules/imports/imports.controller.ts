import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImportsService } from './imports.service';
import { ImportFilesDto } from './dto/imports.dto';
import { FamilyGuard } from '../../common/guards/family.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

// Decorator arguments are evaluated once, at module load, so they read
// straight from the environment instead of the DI'd ConfigService.
const MAX_FILE_SIZE_MB = Number(process.env.IMPORT_MAX_FILE_SIZE_MB ?? 5);
const MAX_FILES_PER_REQUEST = Number(process.env.IMPORT_MAX_FILES_PER_REQUEST ?? 10);

const uploadInterceptor = () =>
  FilesInterceptor('files', MAX_FILES_PER_REQUEST, {
    storage: memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  });

@Controller('gastos/importacoes')
@UseGuards(FamilyGuard)
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.imports.list(user.familyId!);
  }

  /** Reads the files and proposes decisions; saves nothing. */
  @Post('analise')
  @UseInterceptors(uploadInterceptor())
  analyze(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportFilesDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.imports.analyze(user.familyId!, user.id, user.roles, dto.bank, files ?? []);
  }

  @Post()
  @UseInterceptors(uploadInterceptor())
  importFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportFilesDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.imports.importFiles(user.familyId!, user.id, user.roles, dto.bank, files ?? [], dto.decisions);
  }
}
