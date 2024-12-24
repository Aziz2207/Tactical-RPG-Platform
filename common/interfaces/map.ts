import { ClientItem } from "../../client/src/app/classes/item";
import { ModeEnum } from "../mode-enum";
import { Tile } from "./tile";

export interface Map {
    _tiles : Tile[][];
    _size : number;
    _items : ClientItem[];
    mode: ModeEnum;
}

export enum SizeEnum {
    x10 = 10,
    x15 = 15,
    x20 = 20,
}
