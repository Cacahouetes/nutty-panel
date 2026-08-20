import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { AUTO_LIFECYCLE_SERVICE, type AutoLifecycleService } from './auto-lifecycle.service'

const TICK_MS = 60_000

@Injectable()
export class AutoLifecycleTicker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout

  constructor(@Inject(AUTO_LIFECYCLE_SERVICE) private readonly lifecycle: AutoLifecycleService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.lifecycle.runDue().catch((err) => {
        console.error('[server-lifecycle] scheduled run failed:', err)
      })
    }, TICK_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }
}
