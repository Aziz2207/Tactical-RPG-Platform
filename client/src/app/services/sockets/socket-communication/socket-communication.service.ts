import { Injectable } from "@angular/core";
import { Socket, io } from "socket.io-client";
import { environment } from "src/environments/environment";
import { FireAuthService } from "@app/services/user-account/fire-auth/fire-auth.service";

@Injectable({
  providedIn: "root",
})
export class SocketCommunicationService {
  socket: Socket;

  constructor(private fireAuthService: FireAuthService) {}

  isSocketAlive() {
    return this.socket && this.socket.connected;
  }

  async connect() {
    if (this.isSocketAlive()) {
      return;
    }

    try {
      const token = await this.fireAuthService.getToken();
      
      this.socket = io(environment.socketUrl, {
        auth: {
          token: token
        }
      });
    } catch (error) {
      console.warn('Utilisateur non authentifié, connexion socket sans token:', error);
      this.socket = io(environment.socketUrl);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  on<T>(event: string, action: (data: T) => void): void {
    this.socket.on(event, action);
  }

  send<T>(event: string, data?: T, callback?: (args: any) => void): void {
    this.socket.emit(event, ...[data, callback].filter((x) => x));
  }

  once<T>(event: string, action: (data: T) => void): void {
    this.socket.once(event, action);
  }

  off(event: string) {
    this.socket.off(event);
  }
}
