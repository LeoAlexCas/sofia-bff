import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../ultils/logger-service';
import { ChromaClient } from 'chromadb';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { MODEL_COLLECTION_DICTIONARY } from '../constants/model-collection.dictionary';
import { ConfigService } from '@nestjs/config';
import { IChromaData } from './models/choma-data.interface';

@Injectable()
export class InteractionService {
    private chroma = new ChromaClient();
    private collectionName = '';

    // async onModuleInit() {
    //     await this.ensureCollection();
    // }

    constructor(
        private readonly _loggerService: LoggerService,
        private readonly _configService: ConfigService
    ) {
        this._loggerService.name('InteractionService')
    }

    public async postInteraction(userId: string, userMessage: string, model: string): Promise<string> {
        this._loggerService.info(`[postInteraction] - Init post interaction - UserId: ${userId} - UserMessage: ${userMessage.slice(0, 10)}...`)
        this._loggerService.info((`[postInteraction] - Init time: ${new Date().toISOString()}`));
        await this.ensureCollection(model);
        const response = await this.sendToOllama(userId, userMessage, model);
        const fullTurn = `User: ${userMessage}\nSofia: ${response}`;
        const embedding = await this.getEmbedding(fullTurn);
        const collection = await this.chroma.getCollection({ name: this.collectionName });

        await collection.upsert({
            embeddings: [embedding],
            documents: [fullTurn],
            metadatas: [{
                userId,
                model,
                roles: 'user|ai',
                timestamp: new Date().toISOString(),
            }],
            ids: [uuidv4()],
        });

        this._loggerService.info((`[postInteraction] - Finish time: ${new Date().toISOString()}`));
        return response;
    }

    private setCollectionName(model: string): void {
        const name = MODEL_COLLECTION_DICTIONARY[model];
        this.collectionName = name;
        this._loggerService.info(`[setCollectionName] - collection name ${this.collectionName || 'undefined'}`);
    };

    private async ensureCollection(model: string): Promise<void> {
        await this.setCollectionName(model);
        const collections = await this.chroma.listCollections();
        if (!collections.some((el) => el.name === this.collectionName)) {
            await this.chroma.createCollection({ name: this.collectionName, embeddingFunction: null });
        }
    }

    private async getEmbedding(text: string): Promise<number[]> {
        const { data } = await axios.post(this._configService.get<string>('URL_EMBEDING_MODEL'), {
            model: 'nomic-embed-text',
            prompt: text,
        });

        return data.embedding;
    }

    // private async getContext(userId: string, query: string): Promise<string[]> {
    //     this._loggerService.info(`[getContext] - userId: ${userId} - query: ${query.slice(0, 10)}...`)
    //     const embedding = await this.getEmbedding(query);
    //     if (!Array.isArray(embedding) || embedding.length < 10) {
    //         this._loggerService.warn(`[getContext] - Embeding invalido`)
    //     };
    //     this._loggerService.info(`[getContext] - embeding succesful`);

    //     const collection = await this.chroma.getCollection({ name: this.collectionName });
    //     this._loggerService.info(`[getContext] - chromaCollection ${collection}`);

    //     const results = await collection.query({
    //         queryEmbeddings: [embedding],
    //         nResults: 5,
    //         where: { userId },
    //     });

    //     const docs = results?.documents?.[0] || [];
    //     const metas = results?.metadatas?.[0] || [];

    //     console.log(docs.map((doc, i) => ({
    //         text: doc,
    //         timestamp: metas[i]?.createdAt || metas[i]?.timestamp || 'unknown',
    //       })))


    //     return results?.documents?.[0] || [];
    // }

    private async getContext(userId: string, query: string): Promise<IChromaData[]> {
        this._loggerService.info(`[getContext] - userId: ${userId} - query: ${query.slice(0, 10)}...`)
        const embedding = await this.getEmbedding(query);
        if (!Array.isArray(embedding) || embedding.length < 10) {
            this._loggerService.warn(`[getContext] - Embeding invalido`)
        };
        this._loggerService.info(`[getContext] - embeding succesful`);

        const collection = await this.chroma.getCollection({ name: this.collectionName });
        this._loggerService.info(`[getContext] - chromaCollection ${collection}`);

        const results = await collection.query({
            queryEmbeddings: [embedding],
            nResults: 5,
            where: { userId },
        });

        const docs = results?.documents?.[0] || [];
        const metas = results?.metadatas?.[0] || [];

        console.log(docs.map((doc, i) => ({
            text: doc,
            timestamp: metas[i]?.createdAt || metas[i]?.timestamp || 'unknown',
        })))


        return docs.map((doc, i) => ({
            text: doc,
            timestamp: metas[i]?.createdAt || metas[i]?.timestamp || 'unknown',
        })) || [];
    }

    private async sendToOllama(userId: string, prompt: string, model: string): Promise<string> {
        this._loggerService.info(`[sendToOllama] - Init post interaction - UserId: ${userId} - UserMessage: ${prompt.slice(0, 10)}... - Model: ${model}`)
        const contextDocs = await this.getContext(userId, prompt);
        const contextBlock = contextDocs.map(({ text, timestamp }) =>
            `- (${timestamp}) ${text}`
        ).join('\n');


        const fullPrompt = `
        Reminder: MEMORY CONTEXT is for reference only. Respond only to USER.

MEMORY CONTEXT:
${contextBlock}

USER:
${prompt}
`;

        this._loggerService.info(`[sendToOllama] - full prompt is ${fullPrompt}`)

        const { data } = await axios.post(this._configService.get<string>('URL_LLM_MODEL'), {
            model: model,
            prompt: fullPrompt,
            stream: false,
        });

        this._loggerService.info(`[sendToOllama] - AI model response is ${data.response}`)

        return data.response;
    }
}