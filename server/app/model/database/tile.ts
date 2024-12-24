import { TileEnum } from '@common/tile-enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';
import { Item } from './item';

export type TileDocument = Tile & Document;

@Schema()
export class Tile {
    @ApiProperty({ enum: TileEnum })
    @Prop({ required: true })
    _tileType: TileEnum;

    @ApiProperty({ required: false })
    @Prop({ required: false })
    item?: Item;

    @ApiProperty()
    @Prop({ required: true })
    traversable: boolean;

    @ApiProperty()
    @Prop({ required: true })
    imageSrc: string;

    @ApiProperty()
    @Prop({ required: true })
    terrain: boolean;
}

export const TILESCHEMA = SchemaFactory.createForClass(Tile);
