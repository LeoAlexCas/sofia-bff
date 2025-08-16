import { Injectable } from "@nestjs/common";
import { InteractionService } from "./interaction.service";
import { InteractionDto } from "./dto/interaction.dto";

@Injectable()
export class InteractionHandler {
    constructor(
        private readonly _interactionService: InteractionService
    ) {}

    public async postInteraction(headers: Record<any, any>, body: InteractionDto) {
        return await this._interactionService.postInteraction(body.userId, body.userInput, headers.model);
    };
}