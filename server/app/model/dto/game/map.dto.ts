import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { ItemDto } from './item.dto';
import { TileDto } from './tile.dto';

export class MapDto {
    @ApiProperty({ type: [TileDto] })
    _tiles: TileDto[][];

    @ApiProperty()
    @IsNumber()
    _size: number;

    @ApiProperty({ type: [ItemDto] })
    _items: ItemDto[];

    @ApiProperty()
    @IsString()
    mode: string;
}
