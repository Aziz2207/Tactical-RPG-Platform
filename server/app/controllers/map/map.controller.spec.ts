import { Map } from '@app/model/schema/map.schema';
import { MapService } from '@app/services/map/map.service';
import { SavingService } from '@app/services/saving/saving.service';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { createStubInstance, SinonStubbedInstance } from 'sinon';
import { MapController } from './map.controller';

describe('MapController', () => {
    let controller: MapController;
    let mapService: SinonStubbedInstance<MapService>;
    let savingService: SinonStubbedInstance<SavingService>;

    beforeEach(async () => {
        mapService = createStubInstance(MapService);
        savingService = createStubInstance(SavingService);
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MapController],
            providers: [
                {
                    provide: MapService,
                    useValue: mapService,
                },
                { provide: SavingService, useValue: savingService },
            ],
        }).compile();

        controller = module.get<MapController>(MapController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('allMaps should return all maps', async () => {
        const fakeMaps: Map[] = [new Map(), new Map()];
        mapService.getAllMaps.resolves(fakeMaps);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.json = (maps) => {
            expect(maps).toEqual(fakeMaps);
            return res;
        };

        await controller.allMaps(res);
    });

    it('allMaps should return NOT_FOUND when service unable to fetch maps', async () => {
        mapService.getAllMaps.rejects();

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = () => res;

        await controller.allMaps(res);
    });

    it('allVisibleMaps should return only visible maps', async () => {
        const fakeMaps: Map[] = [{ visible: true } as Map, { visible: true } as Map];

        mapService.getVisibleMaps.resolves(fakeMaps);

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.json = (maps) => {
            expect(maps).toEqual(fakeMaps);
            return res;
        };

        await controller.visibleMaps(res);
    });

    it('visibleMaps should return NOT_FOUND when service unable to fetch visible maps', async () => {
        mapService.getVisibleMaps.rejects();

        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = () => res;

        await controller.visibleMaps(res);
    });

    it('should return 200 OK and the updated map when update is successful ', async () => {
        const testMap = new Map();
        mapService.updateMap.resolves(testMap);
        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.OK);
            return res;
        };
        res.json = (map) => {
            expect(map).toEqual(testMap);
            return res;
        };
        await controller.updateMap('id', {}, res);
    });

    it('should return 404 NOT FOUND when the map does not exist', async () => {
        mapService.updateMap.resolves(null);
        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = () => res;
        await controller.updateMap('id', {}, res);
    });

    it('should return 500 INTERNAL SERVER ERROR when an exception occurs during update ', async () => {
        mapService.updateMap.rejects();
        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
            return res;
        };
        res.send = () => res;
        await controller.updateMap('id', {}, res);
    });

    it('should return 204 NO CONTENT when delete is successful', async () => {
        mapService.deleteMap.resolves(true);
        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NO_CONTENT);
            return res;
        };
        res.send = () => res;
        await controller.deleteMap('id', res);
    });

    it('should return 404 NOT FOUND when the map does not exist', async () => {
        mapService.deleteMap.resolves(false);
        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.NOT_FOUND);
            return res;
        };
        res.send = () => res;
        await controller.deleteMap('id', res);
    });

    it('should return 500 INTERNAL SERVER ERROR when an exception occurs during delete', async () => {
        mapService.deleteMap.rejects();
        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
            return res;
        };
        res.send = () => res;
        await controller.deleteMap('id', res);
    });

    it('should return 201 CREATED when adding a map', async () => {
        const testMap = new Map();
        savingService.addMapToDb.resolves(testMap);
        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.CREATED);
            return res;
        };
        res.json = (map) => {
            expect(map).toEqual(testMap);
            return res;
        };
        await controller.addMap(testMap, res);
    });

    it('should return 201 CREATED when replacing an existing map', async () => {
        const testMap = new Map();
        savingService.replaceMapInDb.resolves(testMap);
        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.CREATED);
            return res;
        };
        res.json = (map) => {
            expect(map).toEqual(testMap);
            return res;
        };
        await controller.replaceMap(testMap, res);
    });

    it('should return 400 BAD REQUEST when an attribute is missing in addNewMap', async () => {
        const testMap = new Map();
        testMap.name = undefined;
        savingService.addMapToDb.rejects();
        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.BAD_REQUEST);
            return res;
        };
        res.send = () => res;
        await controller.addMap(testMap, res);
    });

    it('should return 400 BAD_REQUEST when the _id is missing in replaceMapInDb', async () => {
        const testMap = new Map();
        testMap._id = undefined;
        savingService.replaceMapInDb.rejects();
        const res = {} as unknown as Response;
        res.status = (code) => {
            expect(code).toEqual(HttpStatus.BAD_REQUEST);
            return res;
        };
        res.send = () => res;
        await controller.replaceMap(testMap, res);
    });
});
