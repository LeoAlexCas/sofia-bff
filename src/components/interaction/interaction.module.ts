import { Module } from '@nestjs/common';
import { InteractionService } from './interaction.service';
import { InteractionController } from './interaction.controller';
import { InteractionHandler } from './interaction.handler';
import { LoggerService } from '../ultils/logger-service';

@Module({
  providers: [
    InteractionService,
    InteractionHandler,
    LoggerService
  ],
  controllers: [InteractionController]
})
export class InteractionModule {}
