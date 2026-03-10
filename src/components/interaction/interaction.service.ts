import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../ultils/logger-service';
import { ChromaClient } from 'chromadb';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { MODEL_COLLECTION_DICTIONARY } from '../../constants/model-collection.dictionary';
import { ConfigService } from '@nestjs/config';
import { IChromaData } from './models/choma-data.interface';
import { SendEmoteService } from 'src/common/services/send-emote.service';

@Injectable()
export class InteractionService {
    private chroma = new ChromaClient();
    private collectionName = '';

    constructor(
        private readonly _loggerService: LoggerService,
        private readonly _configService: ConfigService,
        private readonly _sendEmoteService: SendEmoteService
    ) {
        this._loggerService.name('InteractionService');
    }

    public async postInteraction(userId: string, userMessage: string, model: string): Promise<string> {
        this._loggerService.info(`[postInteraction] - Init - UserId: ${userId}`);
        await this.ensureCollection(model);

        // 1. Obtener respuesta de Alicia (incluye búsqueda en RAG)
        const response = await this.sendToOllama(userId, userMessage, model);

        // 2. Procesar Memoria en segundo plano (No bloquea la respuesta al usuario)
        this.processAndSaveMemory(userId, userMessage, response, model).catch(err => 
            this._loggerService.error(`[MemoryProcess] - Error saving memory: ${err.message}`)
        );

        return response;
    }

    /**
     * Lógica del Secretario (Qwen 2.5) y persistencia en ChromaDB
     */
    private async processAndSaveMemory(userId: string, userMsg: string, aiRes: string, model: string): Promise<void> {
        // A. Pedir resumen a Qwen
        const summary = await this.getSummaryFromSecretary(userMsg, aiRes);
        
        // B. Generar Embedding del resumen (Nomic)
        const embedding = await this.getEmbedding(summary);
        
        // C. Guardar en Chroma
        const collection = await this.chroma.getCollection({ name: this.collectionName });
        await collection.upsert({
            embeddings: [embedding],
            documents: [summary],
            metadatas: [{
                userId,
                timestamp: new Date().toISOString(),
                type: 'conversation_summary'
            }],
            ids: [uuidv4()],
        });
        this._loggerService.info(`[MemoryProcess] - Summary saved: ${summary.slice(0, 30)}...`);
    }

    private async getSummaryFromSecretary(userMsg: string, aiRes: string): Promise<string> {
    const inputForSecretary = `Alex: "${userMsg}"\nAlicia: "${aiRes}"`;

    const { data } = await axios.post(this._configService.get<string>('URL_LLM_MODEL'), {
        model: 'qwen_ram:latest', 
        prompt: inputForSecretary,
        stream: false,
    });

    const response = data.response.trim();

    // LISTA NEGRA: Palabras típicas de censura en modelos
    const blacklist = [
        'lo siento', 'no puedo', 'asistente de ia', 
        'contenido inapropiado', 'normas de la comunidad',
        'ética', 'políticas de seguridad'
    ];

    const isCensored = blacklist.some(word => response.toLowerCase().includes(word));

    if (isCensored) {
        this._loggerService.warn(`[Secretary] - Censura detectada. Generando resumen genérico.`);
        // Retornamos un resumen neutro basado en el contexto si Qwen se asusta
        return "Alex y Alicia compartieron una conversación privada y personal.";
    }

    return response;
}

    private formatRelativeDate(isoDate: string): string {
        const date = new Date(isoDate);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        if (diffDays < 30) return `Hace unas semanas`;
        return `Hace ${Math.floor(diffDays / 30)} meses`;
    }

    private async sendToOllama(userId: string, prompt: string, model: string): Promise<string> {
        const contextDocs = await this.getContext(userId, prompt);
        
        // Formatear el bloque de memoria según el estilo del dataset
        const contextBlock = contextDocs.length > 0 
            ? contextDocs.map(doc => `- (${this.formatRelativeDate(doc.timestamp as string)}) ${doc.text}`).join('\n')
            : 'No hay recuerdos previos sobre este tema.';

        // Estructura de "Input" para Alicia 8B
        const fullPrompt = `CONTEXT MEMORY:
${contextBlock}

USER:
*${userId}*: ${prompt.trim()}`;

        this._loggerService.info(`[sendToOllama] - Inyectando contexto RAG`);
        this._loggerService.info(`[sendToOllama] - Full prompt: ${fullPrompt}`)

        const { data } = await axios.post(this._configService.get<string>('URL_LLM_MODEL'), {
            model: model,
            prompt: fullPrompt,
            stream: false,
        });

        return data.response;
    }

    // --- MÉTODOS DE APOYO (REFACTORIZADOS) ---

    private async getContext(userId: string, query: string): Promise<any[]> {
        const embedding = await this.getEmbedding(query);
        const collection = await this.chroma.getCollection({ name: this.collectionName });

        const results = await collection.query({
            queryEmbeddings: [embedding],
            nResults: 3, // Reducimos a 3 para no saturar el contexto de Alicia
            where: { userId },
        });

        const docs = results?.documents?.[0] || [];
        const metas = results?.metadatas?.[0] || [];

        return docs.map((doc, i) => ({
            text: doc,
            timestamp: metas[i]?.timestamp || new Date().toISOString()
        }));
    }

    private async getEmbedding(text: string): Promise<number[]> {
        const { data } = await axios.post(this._configService.get<string>('URL_EMBEDING_MODEL'), {
            model: 'nomic_ram:latest',
            prompt: text,
        });
        return data.embedding;
    }

    private async ensureCollection(model: string): Promise<void> {
        const name = MODEL_COLLECTION_DICTIONARY[model] || 'alicia_memories';
        this.collectionName = name;
        const collections = await this.chroma.listCollections();
        if (!collections.some((el) => el.name === this.collectionName)) {
            await this.chroma.createCollection({ name: this.collectionName });
        }
    }
}


// @Injectable()
// export class InteractionService {
//     private chroma = new ChromaClient();
//     private collectionName = '';

//     constructor(
//         private readonly _loggerService: LoggerService,
//         private readonly _configService: ConfigService,
//         private readonly _sendEmoteService: SendEmoteService
//     ) {
//         this._loggerService.name('InteractionService')
//     }

//     public async postInteraction(userId: string, userMessage: string, model: string): Promise<string> {
//         this._loggerService.info(`[postInteraction] - Init post interaction - UserId: ${userId} - UserMessage: ${userMessage.slice(0, 10)}...`)
//         this._loggerService.info((`[postInteraction] - Init time: ${new Date().toISOString()}`));
//         await this.ensureCollection(model);
//         const response = await this.sendToOllama(userId, userMessage, model);
//         const fullTurn = `User: ${userMessage}\nAlicia: ${response}`;
//         const embedding = await this.getEmbedding(fullTurn);
//         const collection = await this.chroma.getCollection({ name: this.collectionName });

//         await collection.upsert({
//             embeddings: [embedding],
//             documents: [fullTurn],
//             metadatas: [{
//                 userId,
//                 model,
//                 roles: 'user|ai',
//                 timestamp: new Date().toISOString(),
//             }],
//             ids: [uuidv4()],
//         });

//         this._loggerService.info((`[postInteraction] - Finish time: ${new Date().toISOString()}`));
//         //const finalText = await this._sendEmoteService.processLlmResponse(response);
//         // const { text, avatar_intent } = finalText;

//         // this._loggerService.info(`[postInteraction] - Filtered text and avatar_intent. AVATAR_INTENT is: ${avatar_intent}`)
//         // return text;
//         return response;
//     }

//     private setCollectionName(model: string): void {
//         const name = MODEL_COLLECTION_DICTIONARY[model];
//         this.collectionName = name;
//         this._loggerService.info(`[setCollectionName] - collection name ${this.collectionName || 'undefined'}`);
//     };

//     private async ensureCollection(model: string): Promise<void> {
//         await this.setCollectionName(model);
//         const collections = await this.chroma.listCollections();
//         if (!collections.some((el) => el.name === this.collectionName)) {
//             await this.chroma.createCollection({ name: this.collectionName, embeddingFunction: null });
//         }
//     }

//     private async getEmbedding(text: string): Promise<number[]> {
//         const { data } = await axios.post(this._configService.get<string>('URL_EMBEDING_MODEL'), {
//             model: 'nomic-embed-text',
//             prompt: text,
//         });

//         return data.embedding;
//     }

//     private async getContext(userId: string, query: string): Promise<IChromaData[]> {
//         this._loggerService.info(`[getContext] - userId: ${userId} - query: ${query.slice(0, 10)}...`)
//         const embedding = await this.getEmbedding(query);
//         if (!Array.isArray(embedding) || embedding.length < 10) {
//             this._loggerService.warn(`[getContext] - Embeding invalido`)
//         };
//         this._loggerService.info(`[getContext] - embeding succesful`);

//         const collection = await this.chroma.getCollection({ name: this.collectionName });
//         this._loggerService.info(`[getContext] - chromaCollection ${collection}`);

//         const results = await collection.query({
//             queryEmbeddings: [embedding],
//             nResults: 5,
//             where: { userId },
//         });

//         const docs = results?.documents?.[0] || [];
//         const metas = results?.metadatas?.[0] || [];

//         console.log(docs.map((doc, i) => ({
//             text: doc,
//             timestamp: metas[i]?.createdAt || metas[i]?.timestamp || 'unknown',
//         })))


//         return docs.map((doc, i) => {
//             // Obtenemos el valor bruto
//             const rawTimestamp = metas[i]?.createdAt || metas[i]?.timestamp || 'unknown';

//             return {
//                 text: doc as string, // Aseguramos que el doc sea string
//                 // Forzamos a string si es un objeto complejo o usamos el valor si es primitivo
//                 timestamp: typeof rawTimestamp === 'object'
//                     ? JSON.stringify(rawTimestamp)
//                     : (rawTimestamp as string | number | boolean),
//             };
//         }) || [];
//     }

//     private async sendToOllama(userId: string, prompt: string, model: string): Promise<string> {
//         this._loggerService.info(`[sendToOllama] - Init post interaction - UserId: ${userId} - UserMessage: ${prompt.slice(0, 10)}... - Model: ${model}`)
//         const contextDocs = await this.getContext(userId, prompt);
//         const cleanPrompt = prompt
//             .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
//             // 2. Normalizar comillas tipográficas (las que causan el ÔÇ£)
//             .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // Comillas dobles
//             .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // Comillas simples
//             // 3. Normalizar guiones y elipsis
//             .replace(/[\u2013\u2014]/g, '-')
//             .replace(/\u2026/g, '...')
//             // 4. Eliminar caracteres de control (ASCII 0-31) que suelen venir en copias de web
//             .replace(/[\x00-\x1F\x7F]/g, '')
//             // 5. El toque final: Eliminar cualquier carácter "huérfano" que no sea UTF-8 válido
//             .normalize('NFC')
//             .trim();
//         const contextBlock = contextDocs.map(({ text, timestamp }) =>
//             `- (${timestamp}) ${text}`
//         ).join('\n');


//         const fullPrompt = `
//         Reminder: MEMORY CONTEXT is for reference only. Respond only to USER.

// MEMORY CONTEXT:
// ${contextBlock}

// USER:
// *${userId}*: ${cleanPrompt}
// `;

//         this._loggerService.info(`[sendToOllama] - full prompt is ${fullPrompt}`)

//         const { data } = await axios.post(this._configService.get<string>('URL_LLM_MODEL'), {
//             model: model,
//             prompt: fullPrompt,
//             stream: false,
//         });

//         this._loggerService.info(`[sendToOllama] - AI model response is ${data.response}`)

//         return data.response;
//     }
// }