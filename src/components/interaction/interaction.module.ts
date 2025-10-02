import { Module } from '@nestjs/common';
import { InteractionService } from './interaction.service';
import { InteractionController } from './interaction.controller';
import { InteractionHandler } from './interaction.handler';
import { LoggerService } from '../ultils/logger-service';
import { SendEmoteService } from 'src/common/services/send-emote.service';
import { VtsApiService } from 'src/common/services/vts-api.service';

@Module({
  providers: [
    InteractionService,
    InteractionHandler,
    LoggerService,
    SendEmoteService,
    VtsApiService
  ],
  controllers: [InteractionController]
})
export class InteractionModule {}
