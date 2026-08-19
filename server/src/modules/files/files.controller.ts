import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { Readable } from 'node:stream'
import { FILES_SERVICE, type FilesService } from './files.service'
import { FilesExceptionFilter } from './files.exception-filter'

@Controller('api/servers/:serverId/files')
@UseFilters(FilesExceptionFilter)
export class FilesController {
  constructor(@Inject(FILES_SERVICE) private readonly files: FilesService) {}

  @Get()
  list(@Param('serverId') serverId: string, @Query('path') path = '') {
    return this.files.list(serverId, path)
  }

  @Get('content')
  readText(@Param('serverId') serverId: string, @Query('path') path: string) {
    return this.files.readText(serverId, path)
  }

  @Put('content')
  writeText(
    @Param('serverId') serverId: string,
    @Query('path') path: string,
    @Body() body: { content: string },
  ) {
    return this.files.writeText(serverId, path, body.content)
  }

  @Post('directories')
  createDirectory(@Param('serverId') serverId: string, @Body() body: { path: string }) {
    return this.files.createDirectory(serverId, body.path)
  }

  @Patch()
  rename(@Param('serverId') serverId: string, @Body() body: { from: string; to: string }) {
    return this.files.rename(serverId, body.from, body.to)
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('serverId') serverId: string, @Query('path') path: string) {
    await this.files.remove(serverId, path)
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('serverId') serverId: string,
    @Query('path') path: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.files.upload(serverId, path, Readable.from(file.buffer))
  }

  @Get('download')
  async download(
    @Param('serverId') serverId: string,
    @Query('path') path: string,
    @Res() res: Response,
  ) {
    const stream = await this.files.download(serverId, path)
    stream.pipe(res)
  }
}
