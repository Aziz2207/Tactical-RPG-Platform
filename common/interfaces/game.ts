import { Map } from './map';

export interface Game {
    title?: string;
    map: Map;
    lastMod?: string;
    size: number;
    description?: string;
    isVisible?: boolean;
    prevImg?: string;
    _id?: string;
}
