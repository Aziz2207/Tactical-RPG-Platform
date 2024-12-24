import { RoomService } from '@app/services/rooms/rooms.service';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { createStubInstance, SinonStubbedInstance } from 'sinon';
import { RoomController } from './room.controller';

describe('RoomController', () => {
    let controller: RoomController;
    let roomService: SinonStubbedInstance<RoomService>;

    beforeEach(async () => {
        roomService = createStubInstance(RoomService);
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RoomController],
            providers: [
                {
                    provide: RoomService,
                    useValue: roomService,
                },
            ],
        }).compile();

        controller = module.get<RoomController>(RoomController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('getNewRoomId() should return a new room ID', async () => {
        const fakeRoomId = '12345';
        roomService.generateRoomId.returns(fakeRoomId);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.json = (data) => {
            expect(data.roomId).toEqual(fakeRoomId);
            return res;
        };

        await controller.getNewRoomId(res);
    });

    it('getNewRoomId() should return INTERNAL_SERVER_ERROR on failure', async () => {
        roomService.generateRoomId.throws(new Error('Test error'));

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
            return res;
        };
        res.send = (message) => {
            expect(message).toEqual('Test error');
            return res;
        };

        await controller.getNewRoomId(res);
    });

    it('checkRoomExists() should return OK when room exists', async () => {
        roomService.checkRoomExists.returns(true);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.send = () => res;

        await controller.checkRoomExists('12345', res);
    });

    it('checkRoomExists() should return NOT_FOUND when room does not exist', async () => {
        roomService.checkRoomExists.returns(false);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = (data) => {
            expect(data.message).toEqual('Undefined room');
            return res;
        };

        await controller.checkRoomExists('12345', res);
    });
});
