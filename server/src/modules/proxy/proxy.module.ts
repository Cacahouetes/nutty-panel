import { Inject, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { SERVERS_SERVICE, type ServersService } from '../servers/servers.service'
import { ServersModule } from '../servers/servers.module'
import { PROXY_ROUTE_STORE, type ProxyRouteStore } from './proxy-route.store'
import { InMemoryProxyRouteStore } from './in-memory.proxy-route.store'
import {
  SERVER_STATUS_PROBE,
  TcpServerStatusProbe,
  type ServerStatusProbe,
} from './server-status-probe'
import { SMART_PROXY, createSmartProxy, type SmartProxy } from './smart-proxy'
import {
  PROXY_SERVICE,
  createSmartProxyService,
  type SmartProxyService,
} from './smart-proxy.service'
import { ProxyController } from './proxy.controller'

@Injectable()
class ProxyModuleInit implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(PROXY_SERVICE) private readonly service: SmartProxyService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.service.start()
    } catch (err) {
      Logger.warn(
        `Smart Proxy could not start (${(err as Error).message}) — the panel continues without it.`,
        ProxyModuleInit.name,
      )
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.service.stop()
    } catch {
      Logger.debug('Smart Proxy already stopped.', ProxyModuleInit.name)
    }
  }
}

@Module({
  imports: [AuthModule, ServersModule],
  controllers: [ProxyController],
  providers: [
    { provide: PROXY_ROUTE_STORE, useClass: InMemoryProxyRouteStore },
    { provide: SERVER_STATUS_PROBE, useClass: TcpServerStatusProbe },
    { provide: SMART_PROXY, useFactory: () => createSmartProxy() },
    {
      provide: PROXY_SERVICE,
      useFactory: (
        store: ProxyRouteStore,
        servers: ServersService,
        probe: ServerStatusProbe,
        proxy: SmartProxy,
      ): SmartProxyService =>
        createSmartProxyService({
          store,
          servers,
          probe,
          proxy,
          config: {
            publicPort: Number(process.env.PROXY_PUBLIC_PORT ?? 25565),
            proxyDomain: process.env.PROXY_DOMAIN ?? 'play.local',
            defaultServerId: process.env.PROXY_DEFAULT_SERVER_ID,
            host: process.env.PROXY_HOST ?? '0.0.0.0',
          },
        }),
      inject: [PROXY_ROUTE_STORE, SERVERS_SERVICE, SERVER_STATUS_PROBE, SMART_PROXY],
    },
    ProxyModuleInit,
  ],
})
export class ProxyModule {}
