import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerService } from "src/components/ultils/logger-service";
import * as WebSocket from 'ws';

@Injectable()
export class VtsApiService {
    private ws: WebSocket;
    private isAuthenticated = false;
    private messageCounter = 1;
    private authToken: string | null = "0d10c26084309f3e3d2a82b6038cc85088c46d3a9b56249a74940774b9bfa639";

    constructor(
        private readonly _loggerService: LoggerService,
        private readonly _configService: ConfigService,
    ) {
        this._loggerService.name('VtsApiService');
        //this.connect();
    };

    // --- 1. Conexión y Autenticación ---

    private connect() {
        const url = this._configService.get<string>("URL_WS");
        const port = this._configService.get<string>("PORT_WS");
        this.authToken = ""

        const websocketUrl = `${url}:${port}`;
        this.ws = new WebSocket(websocketUrl);

        this.ws.on('open', () => {
            this._loggerService.info(`Conectado a VTube Studio en ${websocketUrl}. Iniciando autenticación...`);
            this.authenticate();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
            this.handleMessage(data.toString());
        });

        this.ws.on('close', (code: number, reason: string) => {
            this._loggerService.warn(`Conexión cerrada. Código: ${code}. Razón: ${reason}`);
            this.isAuthenticated = false;
            // Intenta reconectar después de un tiempo
            setTimeout(() => this.connect(), 5000);
        });

        this.ws.on('error', (error) => {
            this._loggerService.error('Error de WebSocket:', error.message);
        });
    }

    private authenticate() {
        const authRequest = {
            apiName: 'VTubeStudioPublicAPI',
            apiVersion: '1.0',
            requestID: `AuthReq-${this.messageCounter++}`,
            messageType: 'AuthenticationTokenRequest',
            data: {
                pluginName: 'Sofia-bff',
                pluginDeveloper: 'Alex AI',
                //authenticationToken: this.authToken ? this.authToken : "", // Se usa null si es la primera vez
            },
        };
        console.log("000000000000")
        console.log(JSON.stringify(authRequest, null, 2))
        this.send(authRequest);
    }

    private handleMessage(jsonString: string) {
        const response = JSON.parse(jsonString);
        this._loggerService.info(`Mensaje: ${JSON.stringify(response, null, 2)}`);
        this._loggerService.debug(`Recibido: ${response.messageType}`);

        // Manejar la respuesta de autenticación
        if (response.messageType === 'AuthenticationResponse') {
            if (response.data.authenticated) {
                this.isAuthenticated = true;
                this.authToken = response.data.authenticationToken; // Guardar el token para futuras conexiones
                this._loggerService.info('¡Autenticación exitosa! El token ha sido guardado.');

                // Opcional: Solicitar permisos la primera vez que se conecta un plugin
                this.requestAPIState();
            } else {
                this._loggerService.error(`Autenticación fallida: ${response.data.reason}`);
                // Limpiar el token si falló la autenticación
                this.authToken = null;
            }
        }

        // Aquí puedes añadir lógica para manejar otras respuestas (p. ej., ArtMeshListResponse, HotkeyTriggerResponse, etc.)
    }

    // --- 2. Métodos de Comunicación ---

    private send(payload: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        } else {
            this._loggerService.warn('No se puede enviar el mensaje: WebSocket no está abierto.');
        }
    }

    // Método para verificar la conexión
    private requestAPIState() {
        const stateRequest = {
            apiName: 'VTubeStudioPublicAPI',
            apiVersion: '1.0',
            requestID: `StateReq-${this.messageCounter++}`,
            messageType: 'ApiStateRequest',
            data: {},
        };
        this.send(stateRequest);
    }

    // --- 3. Implementación de Acciones (Ej. Inyección de Parámetros) ---

    public injectParameterData(parameterName: string, value: number, weight: number = 1) {
        if (!this.isAuthenticated) {
            this._loggerService.warn('No autenticado. No se puede inyectar datos.');
            return;
        }

        const injectRequest = {
            apiName: 'VTubeStudioPublicAPI',
            apiVersion: '1.0',
            requestID: `InjectReq-${this.messageCounter++}`,
            messageType: 'InjectParameterDataRequest',
            data: {
                parameters: [
                    {
                        id: parameterName, // Ej: FaceAngleX, MouthOpen, o un custom parameter
                        value: value,
                        weight: weight,
                    },
                ],
            },
        };

        this.send(injectRequest);
        this._loggerService.info(`Inyectando ${parameterName}: ${value}`);
    };

    // 1. Verificar Live2D Parameters del modelo (los que controlan el arte)
    public getModelLive2DParameters() {
        const request = {
            apiName: 'VTubeStudioPublicAPI',
            apiVersion: '1.0',
            requestID: `Live2DReq-${this.messageCounter++}`,
            messageType: 'Live2DParameterListRequest',
            data: {},
        };
        this.send(request);
        // VTS responderá con Live2DParameterListResponse, que debes manejar en handleMessage
    }

    // 2. Verificar Input Parameters (los que puedes inyectar)
    public getInputParameters() {
        const request = {
            apiName: 'VTubeStudioPublicAPI',
            apiVersion: '1.0',
            requestID: `InputReq-${this.messageCounter++}`,
            messageType: 'InputParameterListRequest',
            data: {},
        };
        this.send(request);
        // VTS responderá con InputParameterListResponse
    }

};