import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './modules/auth/auth.module'
import { DockerModule } from './modules/docker/docker.module'
import { ServersModule } from './modules/servers/servers.module'

@Module({
  imports: [AuthModule, DockerModule, ServersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
