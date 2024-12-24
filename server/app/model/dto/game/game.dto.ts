import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { MapDto } from './map.dto';

export class GameDto {
    @ApiProperty({ required: false })
    @IsString()
    title: string;

    @ApiProperty({ type: MapDto })
    map: MapDto;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    lastMod?: string;

    @ApiProperty({ required: true }) // Need to remove this from game
    @IsNumber()
    size: number;

    @ApiProperty({ required: true })
    @IsString()
    description: string;

    @ApiProperty({ required: true })
    @IsBoolean()
    isVisible: boolean;

    @ApiProperty({ required: false })
    @IsString()
    prevImg?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    _id?: string;
}
