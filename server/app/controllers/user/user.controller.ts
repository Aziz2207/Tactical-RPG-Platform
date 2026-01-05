import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Post,
  Res,
  Headers,
  Query,
  Param,
  Logger,
  Patch,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiOkResponse,
} from "@nestjs/swagger";
import * as admin from "firebase-admin";
import { UserAccount } from "@common/interfaces/user-account";
import { Response } from "express";
import { User } from "@app/model/schema/user.schema";
import { UserService } from "@app/services/user/user.service";
import { SocketGateway } from "@app/gateways/socket/socket.gateway";
import { ServerToClientEvent } from "@common/socket.events";
import { MapService } from "@app/services/map/map.service";
import { UserStatisticsService } from "@app/services/user-statistics/user-statistics.service";
import { FriendService } from "@app/services/friend/friend.service";

@Controller("user")
export class UserController {
  constructor(
    private userService: UserService,
    private userStatisticsService: UserStatisticsService,
    private friendService: FriendService,
    private logger: Logger,
    private socketGateway: SocketGateway,
    private readonly mapService: MapService
  ) {}

  @ApiCreatedResponse({
    description: "User account successfully created",
    type: User,
  })
  @ApiBadRequestResponse({
    description: "User account was not created",
  })
  @Post("/signup")
  async createNewUserAccount(
    @Body() newUserAccount: Partial<UserAccount>,
    @Res() response: Response
  ) {
    this.logger.log("Signup started");
    this.logger.log(newUserAccount);
    try {
      const { user, token } = await this.userService.createNewUserAccount(
        newUserAccount
      );

      response.status(HttpStatus.CREATED).json({
        message: "Compte créé avec succèş",
        user,
        token,
      });
      this.logger.log("Signup successfully completed");
      this.socketGateway.emit(ServerToClientEvent.NewUserCreated);
    } catch (error) {
      this.logger.log("Signup error");
      this.logger.log(error.message);
      response.status(HttpStatus.BAD_REQUEST).send(error.message);
    }
  }

  @Get("/signin")
  async signIn(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    this.logger.log("Signin started");
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Signin Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await this.userService.verifyUser(idToken);
      if (this.userService.hasUserSignedIn(decodedToken.uid)) {
        throw new Error(
          "Compte déjà connecté, veuillez vous déconnecter avant de vous reconnecter"
        );
      }
      const user = await this.userService.getUserAccount(decodedToken.uid);
      this.userService.addActiveUser(decodedToken.uid);
      response.status(HttpStatus.OK).json({
        message: "Compte connecté",
        user,
      });
      this.logger.log("Signin successfully completed");
    } catch (error) {
      this.logger.log("Signin error");
      this.logger.log(error.message);
      response.status(HttpStatus.BAD_REQUEST).send(error.message);
    }
  }

  @Get("/friends/status")
  async getFriendsStatus(@Headers("Authorization") auth, @Res() res) {
    const decoded = await this.userService.verifyUser(auth.split(" ")[1]);
    const friends = await this.userService.getFriends(decoded.uid);
    const map = this.userService.getOnlineStatus(friends.map(f => f.uid));

    const result = friends.map(f => ({ ...f, isOnline: map[f.uid] }));

    res.status(200).json(result);
  }

  @Get("/infos")
  async getInfos(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    this.logger.log("FetchInfos started");
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Fetch Infos Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await this.userService.verifyUser(idToken);
      const user = await this.userService.getUserAccount(decodedToken.uid);
      this.userService.addActiveUser(decodedToken.uid);
      response.status(HttpStatus.OK).json({
        message: "Compte connecté",
        user,
      });
      this.logger.log("Fetch Infos successfully completed");
    } catch (error) {
      this.logger.log("Fetch Infos error");
      this.logger.log(error.message);
      response.status(HttpStatus.BAD_REQUEST).send(error.message);
    }
  }

  @Post("/signout")
  async signOut(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    this.logger.log("Signout started");
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Signout Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await this.userService.verifyUser(idToken);

      await this.userService.signUserOut(decodedToken.uid);
      this.userService.removeActiveUser(decodedToken.uid);
      response.status(HttpStatus.NO_CONTENT).send();
      this.logger.log("Signout successfully completed");
    } catch (error) {
      this.logger.log("Signout error, sign out failed");
      response.status(HttpStatus.UNAUTHORIZED).send("Sign-out failed");
    }
  }

  @Delete()
  async deleteUserAccount(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    this.logger.log("Delete account started");
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Delete account Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await this.userService.verifyUser(idToken);
      const haveMaps =
        (await this.mapService.getMapsOwnedByUser(decodedToken.uid)).length > 0;
      const deleted = await this.userService.deleteUserAccount(
        decodedToken.uid
      );

      if (deleted) {
        this.logger.log("Delete account successfully completed");
        this.userService.removeActiveUser(decodedToken.uid);
        response.status(HttpStatus.NO_CONTENT).send();
        this.socketGateway.emit(
          ServerToClientEvent.UserDeleted,
          decodedToken.uid
        );
        if (haveMaps) {
          this.socketGateway.emit(ServerToClientEvent.MapsListUpdated);
        }
      } else {
        this.logger.log("Delete account error, account not found");
        response.status(HttpStatus.NOT_FOUND).send("Compte non trouvé");
      }
    } catch (error) {
      this.logger.log("Delete account error");
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error.message);
    }
  }

  @ApiOkResponse({
    description: "User account successfully modified",
    type: User,
  })
  @ApiBadRequestResponse({
    description: "User account was not modified",
  })
  @ApiUnauthorizedResponse({
    description: "Invalid or missing authorization token",
  })
  @Patch()
  async modifyUserAccount(
    @Headers("Authorization") authHeader: string,
    @Body()
    modifiedUserDetails: {
      username: string;
      email: string;
      avatarURL: string;
    },
    @Res() response: Response
  ) {
    this.logger.log("Modify account started");

    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log("Modify account Auth error");
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await this.userService.verifyUser(idToken);
      const oldInfo = await this.userService.getUserAccount(decodedToken.uid);

      const maybeToken = await this.userService.modifyUserAccount(
        decodedToken.uid,
        modifiedUserDetails
      );

      this.logger.log("Modified account successfully completed");
      const haveMaps =
        (await this.mapService.getMapsOwnedByUser(decodedToken.uid)).length > 0;
      if (oldInfo.username !== modifiedUserDetails.username && haveMaps) {
        this.mapService.updateCreatorUsername(
          decodedToken.uid,
          modifiedUserDetails.username
        );
        this.socketGateway.emit(ServerToClientEvent.MapsListUpdated);
      }
      if (
        oldInfo.avatarURL !== modifiedUserDetails.avatarURL ||
        oldInfo.username !== modifiedUserDetails.username
      ) {
        // Notify all connected WebSocket clients about the change
        this.logger.log("Notifying User account modified to all users");
        this.socketGateway.emit(ServerToClientEvent.ModifiedUserAccount, {
          uid: decodedToken.uid,
          newAvatarURL:
            oldInfo.avatarURL !== modifiedUserDetails.avatarURL
              ? modifiedUserDetails.avatarURL
              : null,
        });
      }
      // Update the socket client data if the user is connected
      this.socketGateway.modifyClientData(
        decodedToken.uid,
        modifiedUserDetails
      );

      const user = await this.userService.getUserAccount(decodedToken.uid);
      response.status(HttpStatus.OK).send({ user, token: maybeToken });
    } catch (error) {
      this.logger.log("Modified account error");
      response.status(HttpStatus.BAD_REQUEST).send(error.message);
    }
  }

  @Get("/backgrounds/owned")
  @ApiOperation({ summary: "Get user's owned backgrounds" })
  async getOwnedBackgrounds(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Get owned backgrounds",
      async (uid) => {
        const ownedBackgrounds = await this.userService.getOwnedBackgrounds(
          uid
        );
        return { ownedBackgrounds };
      }
    );
  }

  @Get("/backgrounds/selected")
  @ApiOperation({ summary: "Get user's selected background" })
  async getSelectedBackground(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Get selected background",
      async (uid) => {
        const selectedBackground = await this.userService.getSelectedBackground(
          uid
        );
        return { selectedBackground };
      }
    );
  }

  @Post("/backgrounds/select")
  @ApiOperation({ summary: "Select a background from owned backgrounds" })
  async selectBackground(
    @Headers("Authorization") authHeader: string,
    @Body("backgroundURL") backgroundURL: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Select background",
      async (uid) => {
        await this.userService.selectBackground(uid, backgroundURL);
        return {
          message: "Arrière-plan sélectionné avec succès",
          selectedBackground: backgroundURL,
        };
      }
    );
  }

  @Post("/backgrounds/purchase")
  @ApiOperation({ summary: "Purchase a new background" })
  async purchaseBackground(
    @Headers("Authorization") authHeader: string,
    @Body("backgroundURL") backgroundURL: string,
    @Body("price") price: number,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Purchase background",
      async (uid) => {
        const result = await this.userService.purchaseBackground(
          uid,
          backgroundURL,
          price
        );
        return {
          message: "Arrière-plan acheté avec succès",
          newBalance: result.newBalance,
          ownedBackgrounds: result.ownedBackgrounds,
        };
      }
    );
  }

  @Get("/backgrounds/available")
  @ApiOperation({ summary: "Get all available backgrounds for purchase" })
  async getAvailableBackgrounds(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Get available backgrounds",
      async (uid) => {
        const backgrounds = await this.userService.getAvailableBackgrounds(uid);
        return { availableBackgrounds: backgrounds };
      }
    );
  }

  // ========== AVATAR ENDPOINTS ==========

  @Get("/avatars/owned")
  @ApiOperation({ summary: "Get user's owned purchasable avatars" })
  async getOwnedAvatars(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Get owned avatars",
      async (uid) => {
        const ownedPurchasableAvatars = await this.userService.getOwnedAvatars(
          uid
        );
        return { ownedPurchasableAvatars };
      }
    );
  }

  @Post("/avatars/purchase")
  @ApiOperation({ summary: "Purchase a new avatar" })
  async purchaseAvatar(
    @Headers("Authorization") authHeader: string,
    @Body("avatarURL") avatarURL: string,
    @Body("price") price: number,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Purchase avatar",
      async (uid) => {
        const result = await this.userService.purchaseAvatar(
          uid,
          avatarURL,
          price
        );
        return {
          message: "Avatar acheté avec succès",
          newBalance: result.newBalance,
          ownedPurchasableAvatars: result.ownedPurchasableAvatars,
        };
      }
    );
  }

  @Get("/avatars/available")
  @ApiOperation({ summary: "Get all available avatars for purchase" })
  async getAvailableAvatars(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Get available avatars",
      async (uid) => {
        const avatars = await this.userService.getAvailableAvatars(uid);
        return { availableAvatars: avatars };
      }
    );
  }

  // ========== THEME ENDPOINTS ==========

  @Get("/themes/owned")
  @ApiOperation({ summary: "Get user's owned themes" })
  async getOwnedThemes(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Get owned themes",
      async (uid) => {
        const ownedThemes = await this.userService.getOwnedThemes(uid);
        return { ownedThemes };
      }
    );
  }

  @Get("/themes/selected")
  @ApiOperation({ summary: "Get user's selected theme" })
  async getSelectedTheme(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Get selected theme",
      async (uid) => {
        const selectedTheme = await this.userService.getSelectedTheme(uid);
        return { selectedTheme };
      }
    );
  }

  @Post("/themes/select")
  @ApiOperation({ summary: "Select a theme from owned themes" })
  async selectTheme(
    @Headers("Authorization") authHeader: string,
    @Body("theme") theme: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Select theme",
      async (uid) => {
        await this.userService.selectTheme(uid, theme);
        return {
          message: "Thème sélectionné avec succès",
          selectedTheme: theme,
        };
      }
    );
  }

  @Post("/themes/purchase")
  @ApiOperation({ summary: "Purchase a new theme" })
  async purchaseTheme(
    @Headers("Authorization") authHeader: string,
    @Body("theme") theme: string,
    @Body("price") price: number,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Purchase theme",
      async (uid) => {
        const result = await this.userService.purchaseTheme(uid, theme, price);
        return {
          message: "Thème acheté avec succès",
          newBalance: result.newBalance,
          ownedThemes: result.ownedThemes,
        };
      }
    );
  }

  @Get("/themes/available")
  @ApiOperation({ summary: "Get all available themes for purchase" })
  async getAvailableThemes(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Get available themes",
      async (uid) => {
        const themes = await this.userService.getAvailableThemes(uid);
        return { availableThemes: themes };
      }
    );
  }

  // ========== BALANCE ENDPOINTS ==========

  @Get("/balance")
  @ApiOperation({ summary: "Get user's current balance" })
  async getBalance(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Get balance",
      async (uid) => {
        const balance = await this.userService.getBalance(uid);
        return { balance };
      }
    );
  }

  // ========== LANGUAGE ENDPOINTS ==========

  @Get("/language/selected")
  @ApiOperation({ summary: "Get user's selected language" })
  async getSelectedLanguage(
    @Headers("Authorization") authHeader: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Get selected language",
      async (uid) => {
        const selectedLanguage = await this.userService.getSelectedLanguage(
          uid
        );
        return { selectedLanguage };
      }
    );
  }

  @Post("/language/select")
  @ApiOperation({ summary: "Set user's preferred language" })
  async setSelectedLanguage(
    @Headers("Authorization") authHeader: string,
    @Body("language") language: string,
    @Res() response: Response
  ) {
    return this.handleAuthenticatedRequest(
      authHeader,
      response,
      "Set selected language",
      async (uid) => {
        await this.userService.setSelectedLanguage(uid, language);
        return {
          message: "Langue sélectionnée avec succès",
          selectedLanguage: language,
        };
      }
    );
  }

  // ========== HELPER METHOD ==========

  private async handleAuthenticatedRequest(
    authHeader: string,
    response: Response,
    operationName: string,
    handler: (uid: string) => Promise<any>
  ) {
    this.logger.log(`${operationName} started`);

    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.log(`${operationName} Auth error`);
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .send("Permission manquante");
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await this.userService.verifyUser(idToken);
      const result = await handler(decodedToken.uid);

      response.status(HttpStatus.OK).json(result);
      this.logger.log(`${operationName} successfully completed`);
    } catch (error) {
      this.logger.log(`${operationName} error`);
      this.logger.log(error.message);
      response.status(HttpStatus.BAD_REQUEST).send(error.message);
    }
  }
}
