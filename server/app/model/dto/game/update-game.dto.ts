import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { GAME_TITLE_MAX_LENGTH } from './game.dto.constants';

export class UpdateGameDto {
    @ApiProperty({ maxLength: GAME_TITLE_MAX_LENGTH, required: false })
    @IsOptional()
    @IsString()
    @MaxLength(GAME_TITLE_MAX_LENGTH)
    title?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    // map?: Map;
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    mode?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isVisible?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    size?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;
}
