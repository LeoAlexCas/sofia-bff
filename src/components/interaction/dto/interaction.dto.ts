import { IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class InteractionDto {
  @Transform(({ value }) => value.trim())
  @IsString({ message: 'El campo userInput debe ser un string' })
  @MinLength(1, { message: 'El campo userInput no puede estar vacío' })
  userInput: string;

  @IsString({ message: 'El campo userId debe ser un string' })
  @MinLength(1, { message: 'El campo userId no puede estar vacío' })
  userId: string;
}
