import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { InteractionHandler } from './interaction.handler';
import { InteractionDto } from './dto/interaction.dto';

@Controller('interaction')
export class InteractionController {
    constructor(
        private readonly _interactionHandler: InteractionHandler
    ){}

    @Post()
    @HttpCode(200)
    async postInteraction(
        @Req() req: Request,
        @Body() body: InteractionDto
    ) {
        return await this._interactionHandler.postInteraction(req.headers, body)
    }
}
