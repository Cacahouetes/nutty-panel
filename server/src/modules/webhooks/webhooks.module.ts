import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EventsModule } from '../events/events.module'
import { API_RATE_LIMIT_OPTIONS } from './api-rate-limiter'
import { WEBHOOK_DEFINITION_STORE } from './webhook-definition.store'
import { InMemoryWebhookDefinitionStore } from './in-memory.webhook-definition.store'
import { HmacWebhookSignature, WEBHOOK_SIGNATURE } from './webhook-signature'
import { JsonWebhookFormatter, WEBHOOK_FORMATTER } from './webhook-formatter'
import { HttpWebhookClient, WEBHOOK_HTTP_CLIENT } from './webhook-http-client'
import {
  createWebhookDispatcher,
  WEBHOOK_DISPATCHER,
  type WebhookDispatcher,
} from './webhook-dispatcher'
import { createWebhooksService, WEBHOOKS_SERVICE, type WebhooksService } from './webhooks.service'
import { WebhooksController } from './webhooks.controller'
import { WebhooksExceptionFilter } from './webhooks.exception-filter'
import { WebhookRetryTicker } from './webhook-retry.ticker'
import { WebhookEventSubscription } from './webhook-event-subscription'

@Module({
  imports: [EventsModule, AuthModule],
  controllers: [WebhooksController],
  providers: [
    { provide: WEBHOOK_DEFINITION_STORE, useClass: InMemoryWebhookDefinitionStore },
    { provide: WEBHOOK_SIGNATURE, useClass: HmacWebhookSignature },
    { provide: WEBHOOK_FORMATTER, useClass: JsonWebhookFormatter },
    { provide: WEBHOOK_HTTP_CLIENT, useValue: new HttpWebhookClient() },
    {
      provide: WEBHOOK_DISPATCHER,
      useFactory: (
        httpClient: HttpWebhookClient,
        formatter: JsonWebhookFormatter,
        signature: HmacWebhookSignature,
      ): WebhookDispatcher => createWebhookDispatcher({ httpClient, formatter, signature }),
      inject: [WEBHOOK_HTTP_CLIENT, WEBHOOK_FORMATTER, WEBHOOK_SIGNATURE],
    },
    {
      provide: WEBHOOKS_SERVICE,
      useFactory: (
        store: InMemoryWebhookDefinitionStore,
        signature: HmacWebhookSignature,
      ): WebhooksService => createWebhooksService({ store, signature }),
      inject: [WEBHOOK_DEFINITION_STORE, WEBHOOK_SIGNATURE],
    },
    {
      provide: API_RATE_LIMIT_OPTIONS,
      useValue: {
        limit: Number(process.env.WEBHOOK_RATE_LIMIT ?? 60),
        windowMs: 60_000,
      },
    },
    WebhooksExceptionFilter,
    WebhookRetryTicker,
    WebhookEventSubscription,
  ],
})
export class WebhooksModule {}
