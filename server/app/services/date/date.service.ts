import { Injectable } from '@nestjs/common';

@Injectable()
export class DateService {
    currentTime(): string {
        const date = new Date();
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    }
}
