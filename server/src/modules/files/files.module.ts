import { Module } from '@nestjs/common'
import { DockerModule } from '../docker/docker.module'
import { DOCKER_SERVICE } from '../docker/docker.service'
import { DockerServerFileAccess } from './docker-server-file-access'
import { FILES_SERVICE, createFilesService } from './files.service'
import { FilesController } from './files.controller'
import {
  SERVER_EXEC,
  SERVER_FILE_ACCESS,
  type ServerExec,
  type ServerFileAccess,
} from './server-file-access'

@Module({
  imports: [DockerModule],
  controllers: [FilesController],
  providers: [
    { provide: SERVER_EXEC, useExisting: DOCKER_SERVICE },
    {
      provide: SERVER_FILE_ACCESS,
      useFactory: (exec: ServerExec) => new DockerServerFileAccess({ exec }),
      inject: [SERVER_EXEC],
    },
    {
      provide: FILES_SERVICE,
      useFactory: (access: ServerFileAccess) => createFilesService({ access }),
      inject: [SERVER_FILE_ACCESS],
    },
  ],
})
export class FilesModule {}
