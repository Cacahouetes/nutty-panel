import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { BACKUP_SCHEDULER, type BackupScheduler } from './backup.scheduler'

const TICK_MS = 60_000

@Injectable()
export class BackupTicker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout

  constructor(@Inject(BACKUP_SCHEDULER) private readonly scheduler: BackupScheduler) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.scheduler.runDueBackups().catch((err) => {
        console.error('[backups] scheduled run failed:', err)
      })
    }, TICK_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }
}
