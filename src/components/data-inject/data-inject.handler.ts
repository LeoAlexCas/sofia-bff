import { Injectable } from "@nestjs/common";
import { DataInjectService } from "./data-inject.service";

@Injectable()
export class DataInjectHandler {
    constructor(
        private readonly _dataInjectService: DataInjectService
    ) {};

    public async InjectData(model: string) {
        return await this._dataInjectService.injectData(model);
    };
}