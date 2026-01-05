import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WaitingRoom }from '@common/interfaces/waiting-room'

@Injectable({
  providedIn: 'root'
})
export class WaitingRoomsService {
  private readonly apiUrl = `${environment.serverUrl}/waiting-rooms`;

  constructor(private http: HttpClient) {}

  getWaitingRooms(): Observable<WaitingRoom[]> {
    return this.http.get<WaitingRoom[]>(this.apiUrl);
  }
}