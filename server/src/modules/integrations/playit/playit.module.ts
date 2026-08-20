import { Module } from '@nestjs/common'
import { AuthModule } from '../../auth/auth.module'
import { SERVERS_SERVICE, type ServersService } from '../../servers/servers.service'
import { ServersModule } from '../../servers/servers.module'
import { HttpPlayitApi, PLAYIT_API, type PlayitApi } from './playit-api'
import { PLAYIT_AGENT_RUNNER, ChildProcessPlayitAgentRunner } from './playit-agent-runner'
import { PLAYIT_TUNNEL_STORE, type PlayitTunnelStore } from './playit-tunnel-store'
import { InMemoryPlayitTunnelStore } from './in-memory-playit-tunnel-store'
import { PLAYIT_SERVICE, createPlayitService, type PlayitService } from './playit.service'
import { PlayitController } from './playit.controller'
import { PlayitExceptionFilter } from './playit.exception-filter'

@Module({
  imports: [AuthModule, ServersModule],
  controllers: [PlayitController],
  providers: [
    {
      provide: PLAYIT_API,
      useFactory: (): PlayitApi =>
        new HttpPlayitApi({
          baseUrl: process.env.PLAYIT_API_BASE ?? 'https://api.playit.gg',
          apiKey: process.env.PLAYIT_API_KEY,
        }),
    },
    {
      provide: PLAYIT_AGENT_RUNNER,
      useFactory: (): ChildProcessPlayitAgentRunner =>
        new ChildProcessPlayitAgentRunner({
          bin: process.env.PLAYIT_AGENT_BIN,
          secret: process.env.PLAYIT_AGENT_SECRET,
        }),
    },
    { provide: PLAYIT_TUNNEL_STORE, useClass: InMemoryPlayitTunnelStore },
    {
      provide: PLAYIT_SERVICE,
      useFactory: (
        api: PlayitApi,
        runner: ChildProcessPlayitAgentRunner,
        store: PlayitTunnelStore,
        servers: ServersService,
      ): PlayitService => createPlayitService({ api, runner, store, servers }),
      inject: [PLAYIT_API, PLAYIT_AGENT_RUNNER, PLAYIT_TUNNEL_STORE, SERVERS_SERVICE],
    },
    PlayitExceptionFilter,
  ],
})
export class PlayitModule {}
