import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Document } from "mongoose";

export type MapDocument = Map & Document;

@Schema()
export class Map {
  @ApiProperty()
  _id?: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  name: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  description: string;

  @ApiProperty()
  @Prop({ type: Boolean, required: true })
  visible: boolean;

  @ApiProperty()
  @Prop({ type: String, required: true })
  mode: string;

  @ApiProperty()
  @Prop({ type: Number, required: true })
  nbPlayers: number;

  @ApiProperty()
  @Prop({ type: String, required: true })
  image: string;

  @ApiProperty()
  @Prop({ type: [[Number]], required: true })
  tiles: number[][];

  @ApiProperty()
  @Prop({ type: Number, required: true })
  dimension: number;

  @ApiProperty()
  @Prop({ type: [[Number]], required: true })
  itemPlacement: number[][];

  @ApiProperty()
  @Prop({ type: Boolean, required: false })
  isSelected: boolean;

  @ApiProperty()
  @Prop({ type: Date, required: true })
  lastModification: Date;

  @ApiProperty()
  @Prop({ type: String, required: true })
  creatorId: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  creatorUsername: string;

  @ApiProperty()
  @Prop({ type: String, required: true })
  state: string;
}

export const mapSchema = SchemaFactory.createForClass(Map);
