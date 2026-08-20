import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import type { AppEvent } from '../events/event'
import { EVENT_BUS, type EventBus } from '../events/event-bus'
import { WEBHOOK_DEFINITION_STORE, type WebhookDefinitionStore } from './webhook-definition.store'
import { WEBHOOK_DISPATCHER, type WebhookDispatcher } from './webhook-dispatcher'

@Injectable()
export class WebhookEventSubscription implements OnModuleInit, OnModuleDestroy {
  private unsubscribe?: () => void

  constructor(
    @Inject(EVENT_BUS) private readonly bus: EventBus,
    @Inject(WEBHOOK_DEFINITION_STORE) private readonly store: WebhookDefinitionStore,
    @Inject(WEBHOOK_DISPATCHER) private readonly dispatcher: WebhookDispatcher,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.bus.subscribe((event) => this.handle(event))
  }

  onModuleDestroy(): void {
    this.unsubscribe?.()
  }

  private async handle(event: AppEvent): Promise<void> {
    const webhooks = await this.store.findAll()
    for (const webhook of webhooks) {
      if (webhook.enabled && webhook.events.includes(event.type)) {
        await this.dispatcher.dispatch(webhook, event)
      }
    }
  }
}
