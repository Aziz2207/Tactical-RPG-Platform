import { Injectable } from '@angular/core';
import { HttpClient, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SocketCommunicationService } from '../socket-communication/socket-communication.service';
import { ClientToServerEvent, ServerToClientEvent } from '@common/socket.events';
import { UserAccountService } from '@app/services/user-account/user-account/user-account.service';

export interface PrivateRoom { 
  roomId: string; 
  name: string;
  ownerId: string; 
  members: PrivateRoomMember[];
  isActive: boolean; 
  lastActivity: Date;
  type?: "global" | "room" | "private";
}

export interface PrivateRoomMember { 
  userId: string; 
  username: string; 
  role: 'owner' | 'member';
  joinedAt: Date;
}

export interface LeaveRoomResponse { 
  message: string;
  room: PrivateRoom;
  deleted: boolean;
}

export interface DeleteRoomResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrivateRoomService {
  private baseUrl = `${environment.serverUrl}/private-rooms`;

  constructor(
    private http: HttpClient,
    private socketService: SocketCommunicationService,
    private userAccountService: UserAccountService
  ) { }

  createRoom(name: string, ownerId: string, ownerUsername: string): Observable<PrivateRoom> {
    return this.http.post<PrivateRoom>(this.baseUrl, {name, ownerId, ownerUsername});
  }

  joinRoom(roomId: string, userId: string, username: string): Observable<PrivateRoom> {
    return this.http.post<PrivateRoom>(`${this.baseUrl}/${roomId}/join`, {userId, username})
  }

  leaveRoom(roomId: string, userId: string): Observable<LeaveRoomResponse> {
    return this.http.post<LeaveRoomResponse>(`${this.baseUrl}/${roomId}/leave`, {userId});
  }

  deleteRoom(roomId: string, userId: string): Observable<DeleteRoomResponse> {
    const params = new HttpParams().set('userId', userId); 
    return this.http.delete<DeleteRoomResponse>(`${this.baseUrl}/${roomId}`, {params});
  }

  getRoom(roomId: string): Observable<PrivateRoom> {
    return this.http.get<PrivateRoom>(`${this.baseUrl}/${roomId}`)
  }

  getUserRooms(userId: string): Observable<PrivateRoom[]> {
    return this.http.get<PrivateRoom[]>(`${this.baseUrl}/user/${userId}`);
  }

  getAllAvailableRooms(userId: string): Observable<PrivateRoom[]> {
    return new Observable<PrivateRoom[]>((observer) => {
      const listener = (rooms: PrivateRoom[]) => {
        observer.next(rooms);
        observer.complete();
      };

      this.socketService.socket.once(ServerToClientEvent.AllPrivateRooms, listener);

      this.socketService.socket.emit(ClientToServerEvent.GetAllPrivateRooms, {userId});

      return () => {
        this.socketService.socket.off(ServerToClientEvent.AllPrivateRooms, listener);
      };
    });
  }

  onNewOwnerAssigned(callback: (data: any) => void): void {
    const uid = this.getMyUid();
    if (!uid) return;
    this.socketService.socket.off('NewOwnerAssigned', callback);
    this.socketService.socket.on('NewOwnerAssigned', callback);
  }

  offNewOwnerAssigned(callback: (data: any) => void): void {
    const uid = this.getMyUid();
    if (!uid) return;
    this.socketService.socket.off('NewOwnerAssigned', callback);
  }

  private getMyUid(): string | null {
    const acc = this.userAccountService.accountDetails() as any;
    return acc?.uid ?? acc?.id ?? acc?._id ?? null;
  }

  onRoomCreated(callback: (room: PrivateRoom) => void): void {
    this.socketService.socket.off('privateRoomCreated', callback);
    this.socketService.socket.on('privateRoomCreated', callback);
  }

  offRoomCreated(callback: (room: PrivateRoom) => void): void {
    this.socketService.socket.off('privateRoomCreated', callback);
  }

  onRoomDeleted(callback: (data: { roomId: string; roomName?: string; deletedBy?: string }) => void): void {
    this.socketService.socket.off('privateRoomDeleted', callback);
    this.socketService.socket.on('privateRoomDeleted', callback);
  }

  offRoomDeleted(callback: (data: { roomId: string; roomName?: string; deletedBy?: string }) => void): void {
    this.socketService.socket.off('privateRoomDeleted', callback);
  }
}
