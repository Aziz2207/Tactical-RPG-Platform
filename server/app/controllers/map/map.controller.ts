import { SocketGateway } from "@app/gateways/socket/socket.gateway";
import { Map } from "@app/model/schema/map.schema";
import { MapService } from "@app/services/map/map.service";
import { SavingService } from "@app/services/saving/saving.service";
import { UserService } from "@app/services/user/user.service";
import { ServerToClientEvent } from "@common/socket.events";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Res,
  Headers,
  Logger,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from "@nestjs/swagger";
import { Response } from "express";

@Controller("maps")
export class MapController {
  constructor(
    private readonly mapService: MapService,
    private savingService: SavingService,
    private logger: Logger,
    private userService: UserService,
    private socketGateway: SocketGateway
  ) {}

  @ApiOkResponse({
    description: "Returns all maps",
    type: Map,
    isArray: true,
  })
  @ApiNotFoundResponse({
    description: "Return NOT_FOUND http status when no maps are found",
  })
  @Get("/")
  async allMaps(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await this.userService.verifyUser(idToken);
      const maps = await this.mapService.getUserEditableMaps(decodedToken.uid);
      response.status(HttpStatus.OK).json(maps);
    } catch (error) {
      response.status(HttpStatus.NOT_FOUND).send(error.message);
    }
  }

  @ApiOkResponse({
    description: "Returns all visible maps",
    type: Map,
    isArray: true,
  })
  @ApiNotFoundResponse({
    description: "Return NOT_FOUND http status when no visible maps are found",
  })
  @Get("/visible")
  async visibleMaps(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await this.userService.verifyUser(idToken);
      const visibleMaps = await this.mapService.getUserPlayableMaps(
        decodedToken.uid
      );
      this.logger.log("Fetch visible maps successfully completed");
      response.status(HttpStatus.OK).json(visibleMaps);
    } catch (error) {
      response.status(HttpStatus.NOT_FOUND).send(error.message);
    }
  }

  @Patch("/:id")
  @ApiOkResponse({
    description: "Updates a specific map",
    type: Map,
  })
  @ApiNotFoundResponse({
    description: "Return NOT_FOUND http status when the map is not found",
  })
  async updateMap(
    @Headers("Authorization") authHeader: string,
    @Param("id") id: string,
    @Body() updateData: Partial<Map>,
    @Res() response: Response
  ) {
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      await this.userService.verifyUser(idToken);
      const updatedMap = await this.mapService.updateMap(id, updateData);
      if (updatedMap) {
        response.status(HttpStatus.OK).json(updatedMap);
        this.socketGateway.emit(ServerToClientEvent.MapsListUpdated);
      } else {
        response.status(HttpStatus.NOT_FOUND).send("Map not found");
      }
    } catch (error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error.message);
    }
  }

  @Delete("/:id")
  @ApiNotFoundResponse({
    description: "Return NOT_FOUND http status when the map is not found",
  })
  async deleteMap(
    @Headers("Authorization") authHeader: string,
    @Param("id") id: string,
    @Res() response: Response
  ) {
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      await this.userService.verifyUser(idToken);
      const deleted = await this.mapService.deleteMap(id);
      if (deleted) {
        response.status(HttpStatus.NO_CONTENT).send();
        this.socketGateway.emit(ServerToClientEvent.MapsListUpdated);

      } else {
        response.status(HttpStatus.NOT_FOUND).send("Map not found");
      }
    } catch (error) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error.message);
    }
  }

  @ApiCreatedResponse({
    description: "Map successfully created",
    type: Map,
  })
  @ApiBadRequestResponse({
    description: "Map was not created",
  })
  @Post("/")
  async addMap(
    @Headers("Authorization") authHeader: string,
    @Body() newMap: Partial<Map>,
    @Res() response: Response
  ) {
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }
    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await this.userService.verifyUser(idToken);
      const userAccount = await this.userService.getUserAccount(
        decodedToken.uid
      );
      const hasBeenCreated = await this.savingService.addMapToDb({
        ...newMap,
        creatorId: userAccount.uid,
        creatorUsername:userAccount.username

      });
      if (hasBeenCreated !== null) {
        response.status(HttpStatus.CREATED).json(hasBeenCreated);
        this.socketGateway.emit(ServerToClientEvent.MapsUpdated);
      }
    } catch (error) {
      response.status(HttpStatus.BAD_REQUEST).send(error.message);
    }
  }

  @ApiCreatedResponse({
    description: "Map succesfully replaced in the databse",
    type: Map,
  })
  @ApiBadRequestResponse({
    description: "Map was not replaced correctly",
  })
  @Put("/")
  async replaceMap(
    @Headers("Authorization") authHeader: string,
    @Body() mapToReplace: Partial<Map>,
    @Res() response: Response
  ) {
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      await this.userService.verifyUser(idToken);
      const hasBeenCreated = await this.savingService.replaceMapInDb(
        mapToReplace
      );
      if (hasBeenCreated !== null) {
        response.status(HttpStatus.CREATED).json(hasBeenCreated);
        this.socketGateway.emit(ServerToClientEvent.MapsListUpdated);
      }
    } catch (error) {
      response.status(HttpStatus.BAD_REQUEST).send(error.message);
    }
  }

  @Post("/duplicate/:id")
  @ApiOkResponse({
    description: "Duplicate a specific map",
    type: Map,
  })
  @ApiNotFoundResponse({
    description: "Return NOT_FOUND http status when the map is not found",
  })
  async duplicateMap(
    @Headers("Authorization") authHeader: string,
    @Param("id") id: string,
    @Res() response: Response
  ) {
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await this.userService.verifyUser(idToken);
      const userAccount = await this.userService.getUserAccount(decodedToken.uid);
      const duplicatedMap = await this.mapService.duplicateMap(
        decodedToken.uid,
        userAccount.username,
        id
      );
      if (duplicatedMap) {
        response.status(HttpStatus.OK).json(duplicatedMap);
        this.socketGateway.emit(ServerToClientEvent.MapsListUpdated);
      } else {
        response.status(HttpStatus.NOT_FOUND).send("Map not duplicated");
      }
    } catch (error) {
      response.status(HttpStatus.BAD_REQUEST).send(error.message);
    }
  }
}
