import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InteractionModule } from './components/interaction/interaction.module';
import { ConfigModule } from '@nestjs/config';
import { VALIDATION_SCHEMA } from './core/env.validation';
import { DataInjectModule } from './components/data-inject/data-inject.module';

@Module({
  imports: [
    InteractionModule,
    DataInjectModule,
    ConfigModule.forRoot({
      isGlobal: true, // disponible en todos los módulos
      envFilePath: '.env', // puedes usar múltiples archivos si quieres
      validationSchema: VALIDATION_SCHEMA
    }),

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
