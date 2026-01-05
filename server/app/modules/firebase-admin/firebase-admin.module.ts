// firebase.module.ts
import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

const firebaseAdminProvider = {
  provide: "FIREBASE_ADMIN",
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const credentialsString = configService.get<string>("FIREBASE_CREDENTIALS");

    if (!credentialsString) {
      throw new Error("FIREBASE_CREDENTIALS environment variable is not set.");
    }
    const serviceAccount = JSON.parse(credentialsString);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin;
  },
};

@Global()
@Module({
  providers: [firebaseAdminProvider],
  exports: [firebaseAdminProvider],
})
export class FirebaseAdminModule {}
