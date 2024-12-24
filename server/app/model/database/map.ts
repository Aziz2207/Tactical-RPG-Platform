import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';
import { Item } from './item';
import { Tile, TILESCHEMA } from './tile';

export type MapDocument = Map & Document;

@Schema()
export class Map {
    @ApiProperty({ type: [[Tile]] })
    @Prop({ type: [[TILESCHEMA]], required: true })
    _tiles: Tile[][];

    @ApiProperty()
    @Prop({ required: false })
    _size: string;

    @ApiProperty()
    @Prop({ required: false })
    _items: Item[];

    @ApiProperty()
    @Prop({ required: false })
    mode: string;
}

export const mapSchema = SchemaFactory.createForClass(Map);
