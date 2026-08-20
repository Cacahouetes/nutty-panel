import { Module } from '@nestjs/common'
import { EVENT_BUS, InMemoryEventBus } from './event-bus'

@Module({
  providers: [{ provide: EVENT_BUS, useClass: InMemoryEventBus }],
  exports: [EVENT_BUS],
})
export class EventsModule {}
