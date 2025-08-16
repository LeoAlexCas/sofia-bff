import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InteractionModule } from './components/interaction/interaction.module';
import { ConfigModule } from '@nestjs/config';
import { VALIDATION_SCHEMA } from './components/core/env.validation';

@Module({
  imports: [
    InteractionModule,
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
