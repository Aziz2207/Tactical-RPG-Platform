import { ItemEnum } from '@common/item-enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsString } from 'class-validator';

export class ItemDto {
    @ApiProperty({ enum: ItemEnum })
    @IsEnum(ItemEnum)
    itemType: ItemEnum;

    @ApiProperty()
    @IsString()
    imgSrc: string;

    @ApiProperty()
    @IsBoolean()
    isRandom: boolean;

    @ApiProperty()
    @IsNumber()
    id: number;

    @ApiProperty()
    @IsBoolean()
    isOnGrid: boolean;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsBoolean()
    hasEffect: boolean;
}
