import { Module } from '@nestjs/common'
import { SERVERS_SERVICE, type ServersService } from '../servers/servers.service'
import { ServersModule } from '../servers/servers.module'
import { AUTO_START_POLICY_STORE, type AutoStartPolicyStore } from './auto-start-policy.store'
import { AutoLifecycleController } from './auto-lifecycle.controller'
import { AUTO_LIFECYCLE_SERVICE, createAutoLifecycleService } from './auto-lifecycle.service'
import { AutoLifecycleTicker } from './auto-lifecycle.ticker'
import { CONNECTION_PROBE, type ConnectionProbe } from './connection.probe'
import { TcpConnectionProbe } from './connection.probe'
import { InMemoryAutoStartPolicyStore } from './in-memory.auto-start-policy.store'

@Module({
  imports: [ServersModule],
  controllers: [AutoLifecycleController],
  providers: [
    { provide: AUTO_START_POLICY_STORE, useClass: InMemoryAutoStartPolicyStore },
    { provide: CONNECTION_PROBE, useClass: TcpConnectionProbe },
    {
      provide: AUTO_LIFECYCLE_SERVICE,
      useFactory: (
        policies: AutoStartPolicyStore,
        servers: ServersService,
        probe: ConnectionProbe,
      ) => createAutoLifecycleService({ policies, servers, probe }),
      inject: [AUTO_START_POLICY_STORE, SERVERS_SERVICE, CONNECTION_PROBE],
    },
    AutoLifecycleTicker,
  ],
})
export class ServerLifecycleModule {}
