import { Module } from '@nestjs/common';
import { LoggerService } from '../ultils/logger-service';
import { DataInjectService } from './data-inject.service';
import { DataInjectHandler } from './data-inject.handler';
import { DataInjectController } from './data-inject.controller';

@Module({
  providers: [
    DataInjectService,
    DataInjectHandler,
    LoggerService
  ],
  controllers: [DataInjectController]
})
export class DataInjectModule {}
