import { EXISTING_MAP, MAP_TO_PUT, NEW_MAP_NO_ID } from '@app/mocks/map-mocks';
import { MapDocument, mapSchema } from '@app/model/schema/map.schema';
import { Logger } from '@nestjs/common';
import { getConnectionToken, getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import { SavingService } from './saving.service';

describe('Saving service', () => {
    let savingService: SavingService;
    let mapModel: Model<MapDocument>;
    let mongoServer: MongoMemoryServer;
    let connection: Connection;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        const testingModule: TestingModule = await Test.createTestingModule({
            imports: [
                MongooseModule.forRootAsync({ useFactory: () => ({ uri }) }),
                MongooseModule.forFeature([{ name: Map.name, schema: mapSchema }]),
            ],
            providers: [SavingService, Logger],
        }).compile();

        savingService = testingModule.get<SavingService>(SavingService);
        mapModel = testingModule.get<Model<MapDocument>>(getModelToken(Map.name));
        connection = await testingModule.get(getConnectionToken());
    });

    afterEach(async () => {
        await mapModel.deleteMany({});
    });

    afterAll(async () => {
        await connection.close();
        await mongoServer.stop({ doCleanup: true });
    });

    it('should be defined', () => {
        expect(savingService).toBeDefined();
        expect(mapModel).toBeDefined();
    });

    it('should create a new map', async () => {
        const result = await savingService.addMapToDb(NEW_MAP_NO_ID);
        expect(result).not.toBeNull();
    });

    it('should replace an existing map', async () => {
        await mapModel.create(EXISTING_MAP);
        const result = await savingService.replaceMapInDb(MAP_TO_PUT);
        expect(result).not.toBeNull();
    });

    it('addNewMap should return null if there is already a map with the same name', async () => {
        await mapModel.create(NEW_MAP_NO_ID);
        const result = await savingService.addMapToDb(NEW_MAP_NO_ID);
        expect(result).toBeNull();
    });
});
