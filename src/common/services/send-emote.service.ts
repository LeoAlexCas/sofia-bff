// src/ai-companion/ai-companion.service.ts
import { Injectable } from '@nestjs/common';
import { VtsApiService } from './vts-api.service';
import { LoggerService } from 'src/components/ultils/logger-service';

@Injectable()
export class SendEmoteService {
  // Inyección del servicio VTube Studio
  constructor(
    private readonly vtsApi: VtsApiService,
    private readonly _loggerService: LoggerService
    ) {}

  public async processLlmResponse(llmResponse: string) {
    // 1. Proceso RAG (asumimos que ya obtuviste la intención)
    const avatar_intent = llmResponse[0] == "[" ? llmResponse.slice(1, llmResponse.indexOf("]")) : 'neutral';
    const text = llmResponse.slice(llmResponse.indexOf("]") + 1, llmResponse.length);
    //const { text, avatar_intent } = llmResponse;
    this._loggerService.info(`Intención detectada: ${avatar_intent}`);
    // 2. Lógica de Mapeo:
    switch (avatar_intent) {
        case 'happy':
            // Alegría General
            this.vtsApi.injectParameterData('MouthSmile', 1.0);
            this.vtsApi.injectParameterData('EyeOpen', 0.8);
            this.vtsApi.injectParameterData('EyeOpenR', 0.8);
            this.vtsApi.injectParameterData('EyeOpenL', 0.8);
            break;

        case 'sad':
            // Tristeza
            this.vtsApi.injectParameterData('MouthSmile', 0.0);
            this.vtsApi.injectParameterData('MouthOpen', 0.1); // Boca ligeramente caída
            this.vtsApi.injectParameterData('ParamTear', 1.0); // Parámetro custom/común para lágrima
            this.vtsApi.injectParameterData('BrowSad', 1.0);   // Cejas hacia abajo
            break;

        case 'surprised':
            // Sorpresa 😲
            this.vtsApi.injectParameterData('MouthOpen', 1.0); // Boca bien abierta (forma de 'O')
            this.vtsApi.injectParameterData('EyeOpen', 1.2);   // Ojos muy abiertos (a veces valores > 1 para max)
            this.vtsApi.injectParameterData('BrowUp', 1.0);    // Cejas levantadas
            this.vtsApi.injectParameterData('BodyAngleZ', 5.0); // Movimiento sutil hacia atrás (opcional)
            break;

        case 'angry':
            // Enojo/Frustración 😠
            this.vtsApi.injectParameterData('BrowAngry', 1.0);  // Cejas fruncidas
            this.vtsApi.injectParameterData('EyeOpen', 0.7);    // Ojos ligeramente entrecerrados
            this.vtsApi.injectParameterData('MouthOpen', 0.0);  // Boca cerrada o apretada
            this.vtsApi.injectParameterData('BodyAngleX', 8.0); // Inclinación brusca (opcional: movimiento de "rabia")
            break;

        case 'laughing':
            // Risa / Alegría intensa 😂
            this.vtsApi.injectParameterData('MouthOpen', 0.8);  // Boca abierta (para reír)
            this.vtsApi.injectParameterData('MouthSmile', 1.0); // Forma de sonrisa máxima
            this.vtsApi.injectParameterData('EyeSquint', 1.0);  // Ojos entrecerrados por la risa (o 'ParamEyeClose' si lo tienes)
            break;

        case 'neutral':
        default:
            // Estado por defecto: Limpiar inyecciones y volver a neutral
            this.vtsApi.injectParameterData('MouthSmile', 0.0);
            this.vtsApi.injectParameterData('MouthOpen', 0.0);
            this.vtsApi.injectParameterData('BrowAngry', 0.0);
            this.vtsApi.injectParameterData('BrowUp', 0.0);
            this.vtsApi.injectParameterData('EyeOpen', 1.0);
            this.vtsApi.injectParameterData('BodyAngleX', 0.0);
            this.vtsApi.injectParameterData('BodyAngleZ', 0.0);
            break;
    }
    // 3. Devolver la respuesta textual al cliente
    return { text: text.trim() };
  }
}