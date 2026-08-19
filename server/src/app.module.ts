import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './modules/auth/auth.module'
import { BackupsModule } from './modules/backups/backups.module'
import { DockerModule } from './modules/docker/docker.module'
import { ServersModule } from './modules/servers/servers.module'

@Module({
  imports: [AuthModule, DockerModule, ServersModule, BackupsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
