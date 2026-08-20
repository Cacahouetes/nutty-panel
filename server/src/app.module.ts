import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './modules/auth/auth.module'
import { BackupsModule } from './modules/backups/backups.module'
import { DockerModule } from './modules/docker/docker.module'
import { FilesModule } from './modules/files/files.module'
import { IntegrationsModule } from './modules/integrations/integrations.module'
import { MetricsModule } from './modules/metrics/metrics.module'
import { ServerLifecycleModule } from './modules/server-lifecycle/server-lifecycle.module'
import { ServersModule } from './modules/servers/servers.module'

@Module({
  imports: [
    AuthModule,
    DockerModule,
    ServersModule,
    BackupsModule,
    FilesModule,
    IntegrationsModule,
    MetricsModule,
    ServerLifecycleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
