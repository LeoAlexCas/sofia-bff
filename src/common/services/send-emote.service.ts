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
    ) { }

    public async processLlmResponse(llmResponse: string) {
        // 1. Proceso RAG (asumimos que ya obtuviste la intención)
        const avatar_intent = llmResponse[0] == "[" ? llmResponse.slice(1, llmResponse.indexOf("]")) : 'neutral';
        const text = llmResponse.slice(llmResponse.indexOf("]") + 1, llmResponse.length);
        //const { text, avatar_intent } = llmResponse;
        this._loggerService.info(`Intención detectada: ${avatar_intent}`);
        // 2. Lógica de Mapeo:
        switch (avatar_intent) {
            case 'happy':
                // Alegría General (Boca sonriente, Ojos abiertos)
                this.vtsApi.injectParameterData('MouthSmile', 1.0); // Sonrisa máxima
                this.vtsApi.injectParameterData('EyeOpen', 1.0);    // Ojos completamente abiertos
                this.vtsApi.injectParameterData('FaceAngleY', 0.0); // Resetear cualquier giro de cabeza
                break;

            case 'sad':
                // Tristeza (Boca caída, Ojos entrecerrados ligeramente)
                this.vtsApi.injectParameterData('MouthSmile', 0.0); // No sonreír
                this.vtsApi.injectParameterData('MouthOpen', 0.1);  // Boca ligeramente abierta/caída
                this.vtsApi.injectParameterData('EyeOpen', 0.8);    // Ojos menos abiertos (como pena)
                this.vtsApi.injectParameterData('FaceAngleX', 5.0); // Cabeza ladeada (expresión de pena sutil)
                break;

            case 'surprised':
                // Sorpresa 😲 (Boca abierta, Ojos muy abiertos, Cabeza hacia atrás)
                this.vtsApi.injectParameterData('MouthOpen', 1.0);  // Boca muy abierta
                this.vtsApi.injectParameterData('MouthSmile', 0.0); // Boca redonda, no sonriente
                this.vtsApi.injectParameterData('EyeOpen', 1.2);    // Ojos súper abiertos (usando valor > 1.0 para exagerar)
                this.vtsApi.injectParameterData('FaceAngleX', 0.0); // Resetear ladear
                this.vtsApi.injectParameterData('FaceAngleZ', 8.0); // Cabeza ligeramente inclinada hacia atrás
                break;

            case 'angry':
                // Enojo/Frustración 😠 (Boca cerrada, Ojos entrecerrados)
                this.vtsApi.injectParameterData('MouthOpen', 0.0);   // Boca cerrada
                this.vtsApi.injectParameterData('MouthSmile', 0.0);  // No sonreír
                this.vtsApi.injectParameterData('EyeOpen', 0.7);     // Ojos apretados (entrecejo)
                this.vtsApi.injectParameterData('FaceAngleX', -8.0); // Sacudida/inclinación de cabeza (expresando enfado)
                break;

            case 'laughing':
                // Risa intensa 😂 (Combinación de boca abierta y forma de sonrisa)
                this.vtsApi.injectParameterData('MouthOpen', 0.8);   // Boca abierta para el sonido
                this.vtsApi.injectParameterData('MouthSmile', 1.0);  // Forma de risa
                this.vtsApi.injectParameterData('EyeOpen', 0.8);     // Ojos entrecerrados por la risa
                break;

            case 'neutral':
            default:
                // Estado de Reposo: Limpiar todas las inyecciones
                this.vtsApi.injectParameterData('MouthSmile', 0.0);
                this.vtsApi.injectParameterData('MouthOpen', 0.0);
                this.vtsApi.injectParameterData('EyeOpen', 1.0);
                this.vtsApi.injectParameterData('FaceAngleX', 0.0);
                this.vtsApi.injectParameterData('FaceAngleY', 0.0);
                this.vtsApi.injectParameterData('FaceAngleZ', 0.0);
                break;
        }
        // 3. Devolver la respuesta textual al cliente
        return { text: text.trim() };
    }
}