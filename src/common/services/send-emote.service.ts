// src/ai-companion/ai-companion.service.ts
import { Injectable } from '@nestjs/common';
import { VtsApiService } from './vts-api.service';
import { LoggerService } from 'src/components/ultils/logger-service';

@Injectable()
export class AiCompanionService {
  // Inyección del servicio VTube Studio
  constructor(
    private readonly vtsApi: VtsApiService,
    private readonly _loggerService: LoggerService
    ) {}

  public async processLlmResponse(llmResponse: any) {
    // 1. Proceso RAG (asumimos que ya obtuviste la intención)
    const { text, avatar_intent } = llmResponse;
    this._loggerService.info(`Intención detectada: ${avatar_intent}`);

    // 2. Lógica de Mapeo:
    if (avatar_intent === 'happy') {
      // Mapear intención 'happy' a la inyección de un parámetro
      this.vtsApi.injectParameterData('MouthSmile', 1.0); // Valor máximo
      this.vtsApi.injectParameterData('EyeOpen', 0.8);   // Ojos más abiertos
    } else if (avatar_intent === 'sad') {
      // Mapear intención 'sad' a otro parámetro
      this.vtsApi.injectParameterData('MouthSmile', 0.0);
      this.vtsApi.injectParameterData('ParamTear', 1.0); // Parámetro custom para lágrima
    }

    // 3. Devolver la respuesta textual al cliente
    return { text: text };
  }
}