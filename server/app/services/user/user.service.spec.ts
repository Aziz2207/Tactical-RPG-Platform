import { User, userSchema } from '@app/model/schema/user.schema';
import { Logger } from '@nestjs/common';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection, Model } from 'mongoose';
import { UserService } from "./user.service";

describe("UserService", () => {
  let service: UserService;
  let userModel: Model<User>;
  let mongoServer: MongoMemoryServer;
  let connection: Connection;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          useFactory: () => ({
            uri,
          }),
        }),
        MongooseModule.forFeature([{ name: User.name, schema: userSchema }]),
      ],
      providers: [UserService, Logger],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get<Model<User>>(getModelToken(User.name));
    connection = await module.get(getConnectionToken());
  });

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await connection.close();
    await mongoServer.stop({ doCleanup: true });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
    expect(userModel).toBeDefined();
  });

});
