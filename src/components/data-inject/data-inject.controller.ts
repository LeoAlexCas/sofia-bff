import { Controller, Get, HttpCode, Req } from "@nestjs/common";
import { DataInjectHandler } from "./data-inject.handler";

@Controller('data-inject')
export class DataInjectController {
    constructor(
        private readonly _dataInjectHandler: DataInjectHandler
    ) {};
    
    @Get()
    @HttpCode(200)
    async dataInject(
        @Req() req: Request
    ) {
        const model = (req.headers as any).model;
        return await this._dataInjectHandler.InjectData(model);
    };
};