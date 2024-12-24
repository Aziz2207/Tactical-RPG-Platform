import { TileEnum } from '@common/tile-enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ItemDto } from './item.dto';

export class TileDto {
    @ApiProperty({ enum: TileEnum })
    @IsEnum(TileEnum)
    _tileType: TileEnum;

    @ApiProperty({ required: false })
    @IsOptional()
    item?: ItemDto;

    @ApiProperty()
    @IsBoolean()
    traversable: boolean;

    @ApiProperty()
    @IsString()
    imageSrc: string;
}
