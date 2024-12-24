import { ItemEnum } from '@common/item-enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

export type ItemDocument = Item & Document;

@Schema()
export class Item {
    @ApiProperty({ enum: ItemEnum })
    @Prop({ required: true })
    itemType: ItemEnum;

    @ApiProperty()
    @Prop({ required: true })
    imgSrc: string;

    @ApiProperty()
    @Prop({ required: true })
    isRandom: boolean;

    @ApiProperty()
    @Prop({ required: true })
    id: number;

    @ApiProperty()
    @Prop({ required: true })
    isOnGrid: boolean;

    @ApiProperty()
    @Prop({ required: true })
    description: string;

    @ApiProperty()
    @Prop({ required: true })
    hasEffect: boolean;
}

export const ITEMSCHEMA = SchemaFactory.createForClass(Item);
