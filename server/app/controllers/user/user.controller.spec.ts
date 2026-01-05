import { HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";
import { UserController } from "./user.controller";
import { User } from "@app/model/schema/user.schema";

describe("UserController", () => {
  let userController: UserController;
  let userService: UserService;

  const mockUsers: User[] = [
    { uid: "4954", username: "user1", avatarUrl: "avatar1" },
    { uid: "5449", username: "user2", avatarUrl: "avatar1" },
  ];

  const mockUserService = {
    createNewUserAccount: jest.fn().mockResolvedValue(mockUsers),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  it("should be defined", () => {
    expect(userController).toBeDefined();
  });
});
