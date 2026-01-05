import { ItemSwap } from '@common/interfaces/item-swap';

export interface DialogData {
    title: string;
    messages: string[];
    options: string[];
    confirm: boolean;
    itemSwap?: ItemSwap;
    isInput?: boolean;
    image?: string;
}
