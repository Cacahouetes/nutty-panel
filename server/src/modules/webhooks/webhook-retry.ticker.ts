import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { WEBHOOK_DISPATCHER, type WebhookDispatcher } from './webhook-dispatcher'

const RETRY_TICK_MS = 30_000

@Injectable()
export class WebhookRetryTicker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout

  constructor(@Inject(WEBHOOK_DISPATCHER) private readonly dispatcher: WebhookDispatcher) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.dispatcher.retryDue(new Date()).catch((err) => {
        console.error('[webhooks] retry run failed:', err)
      })
    }, RETRY_TICK_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }
}
