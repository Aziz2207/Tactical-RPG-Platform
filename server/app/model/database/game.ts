import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';
import { Map, mapSchema } from './map';

export type GameDocument = Game & Document;

@Schema()
export class Game {
    @ApiProperty()
    @Prop({ required: true })
    title: string;

    @ApiProperty({ type: Map })
    @Prop({ type: mapSchema, required: true })
    map: Map;

    @ApiProperty()
    @Prop({ required: true })
    lastMod: string;

    @ApiProperty()
    @Prop({ required: true })
    size: number;

    @ApiProperty()
    @Prop({ required: true })
    description: string;

    @ApiProperty()
    @Prop({ required: true })
    isVisible: boolean;

    @ApiProperty()
    @Prop({ required: false })
    prevImg: string;

    @ApiProperty()
    _id?: string;
}

export const gameSchema = SchemaFactory.createForClass(Game);
