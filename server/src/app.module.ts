import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './modules/auth/auth.module'
import { BackupsModule } from './modules/backups/backups.module'
import { DockerModule } from './modules/docker/docker.module'
import { EventsModule } from './modules/events/events.module'
import { FilesModule } from './modules/files/files.module'
import { IntegrationsModule } from './modules/integrations/integrations.module'
import { PlayitModule } from './modules/integrations/playit/playit.module'
import { MetricsModule } from './modules/metrics/metrics.module'
import { ServerLifecycleModule } from './modules/server-lifecycle/server-lifecycle.module'
import { ServersModule } from './modules/servers/servers.module'
import { WebhooksModule } from './modules/webhooks/webhooks.module'

@Module({
  imports: [
    AuthModule,
    DockerModule,
    EventsModule,
    ServersModule,
    BackupsModule,
    FilesModule,
    IntegrationsModule,
    PlayitModule,
    MetricsModule,
    ServerLifecycleModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
