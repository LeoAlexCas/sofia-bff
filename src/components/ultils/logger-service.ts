import { Injectable } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggerService {
    private moduleName: string
    private readonly logger = pino({
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        },
        level: 'debug',
    });

    name(name: string): void {
        this.moduleName = name;
    };

    info(message: string, payload?: any): void {
        this.logger.info(payload ?? {}, `${this.moduleName || '[No module name assigned]'} ${message}`);
    }

    debug(message: string, payload?: any): void {
        this.logger.debug(payload ?? {}, `${this.moduleName || '[No module name assigned]'} ${message}`);
    }

    warn(message: string, payload?: any): void {
        this.logger.warn(payload ?? {}, `${this.moduleName || '[No module name assigned]'} ${message}`);
    }

    error(message: string, payload?: any): void {
        this.logger.error(payload ?? {}, `${this.moduleName || '[No module name assigned]'} ${message}`);
    }
}
