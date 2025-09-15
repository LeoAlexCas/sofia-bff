import { Injectable } from "@nestjs/common";
import { LoggerService } from "../ultils/logger-service";
import { ConfigService } from "@nestjs/config";
import { ChromaClient, Metadata } from "chromadb";
import { MODEL_COLLECTION_DICTIONARY } from "../constants/model-collection.dictionary";
import * as fs from 'fs';
import * as path from 'path';
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DataInjectService {
  private chroma = new ChromaClient();
  private collectionName = '';
  private chunkSize: number = 250;
  private overlap: number = 50;
  private filePath = '../../assents/data1.txt'

  constructor(
    private readonly _loggerService: LoggerService,
    private readonly _configService: ConfigService
  ) {
    this._loggerService.name('DataInjectService')
  };

  public async injectData(model: string): Promise<string> {
    this._loggerService.info(`[postInteraction] - Init injectData - model: ${model} - filepath: ${this.filePath}`);
    this._loggerService.info((`[postInteraction] - Init time: ${new Date().toISOString()}`));
    await this.ensureCollection(model);
    const fileContent = fs.readFileSync(this.filePath, 'utf-8');
    const chunks = this.chunkText(fileContent);
    const filename = path.basename(this.filePath);
    const collection = await this.chroma.getCollection({ name: this.collectionName });

    const embeddings: number[][] = [];
    const documents: string[] = [];
    const metadatas: Metadata[] = [];
    const ids: string[] = [];

    for (const chunk of chunks) {
      const embedding = await this.getEmbedding(chunk);
      embeddings.push(embedding);
      documents.push(chunk);
      metadatas.push({
        source: filename,
        timestamp: new Date().toISOString(),
        // Puedes añadir más metadatos, como el autor, tipo de documento, etc.
      });
      ids.push(uuidv4());
    }

    await collection.upsert({
      embeddings,
      documents,
      metadatas,
      ids,
    });

    return 'OK';

  };

  private setCollectionName(model: string): void {
    const name = MODEL_COLLECTION_DICTIONARY[model];
    this.collectionName = name;
    this._loggerService.info(`[setCollectionName] - collection name ${this.collectionName || 'undefined'}`);
  };

  private async ensureCollection(model: string): Promise<void> {
    this.setCollectionName(model);
    const collections = await this.chroma.listCollections();
    if (!collections.some((el) => el.name === this.collectionName)) {
      await this.chroma.createCollection({ name: this.collectionName, embeddingFunction: null });
    };
  };

  private async getEmbedding(text: string): Promise<number[]> {
    const { data } = await axios.post(this._configService.get<string>('URL_EMBEDING_MODEL'), {
        model: 'nomic-embed-text',
        prompt: text,
    });
  
    return data.embedding;
  }

  //////////////////////////
  /**
 * Divide un texto largo en fragmentos más pequeños
 * @param {string} text - El texto a fragmentar
 * @returns {string[]}
 */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      const chunkEnd = Math.min(i + this.chunkSize, text.length);
      let chunk = text.substring(i, chunkEnd);

      // Si no es el último fragmento, intenta encontrar un espacio para evitar cortar palabras
      if (chunkEnd < text.length) {
        let lastSpace = chunk.lastIndexOf(' ');
        if (lastSpace !== -1 && lastSpace > this.chunkSize * 0.8) {
          chunk = chunk.substring(0, lastSpace);
          i += chunk.length;
        } else {
          i += this.chunkSize;
        }
      } else {
        i += this.chunkSize;
      }
      chunks.push(chunk.trim());
      i -= this.overlap;
    }
    return chunks;
  };
};