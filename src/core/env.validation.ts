import * as Joi from 'joi'

export const VALIDATION_SCHEMA = Joi.object({
    URL_EMBEDING_MODEL: Joi.string().required(),
    URL_LLM_MODEL: Joi.string().required()
})