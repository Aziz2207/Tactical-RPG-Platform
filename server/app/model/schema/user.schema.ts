import { Theme } from "@common/interfaces/theme";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";

@Schema()
export class User {
  @ApiProperty({ type: String, required: false })
  uid: string;

  @ApiProperty({ type: String, required: true })
  username: string;

  @Prop({ type: String, required: true })
  avatarURL: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @ApiProperty({ type: String, required: false })
  friends: string[];

  @ApiProperty({ type: String, required: false })
  friendsRequests: string[];

  @ApiProperty({ type: String, required: false })
  blockedUsers: string[];

  @ApiProperty({ type: Number, required: false })
  @Prop({ type: Number, default: 0 })
  balance: number;

  @ApiProperty({ type: Number, required: false })
  @Prop({ type: Number, default: 0 })
  lifetimeEarnings: number;

  @ApiProperty({ type: String, required: false })
  @Prop({ type: String, default: ["./assets/images/backgrounds/title_page_bgd16.jpg"] })
  ownedBackgrounds: string[];

  @ApiProperty({ type: String, required: false })
  @Prop({ type: String, default: "./assets/images/backgrounds/title_page_bgd16.jpg" })
  selectedBackground: string;

  @ApiProperty({ type: String, required: false })
  @Prop({ type: String, default: [] })
  ownedPurchasableAvatars: string[];

  @ApiProperty({ type: String, required: false })
  @Prop({ type: String, default: [Theme.Gold] })
  ownedThemes: string[];

  @ApiProperty({ type: String, required: false })
  @Prop({ type: String, default: Theme.Gold})
  selectedTheme: string;

  @ApiProperty({ type: String, required: false })
  @Prop({ type: String, default: 'en'})
  selectedLanguage: string;
}

export const userSchema = SchemaFactory.createForClass(User);
