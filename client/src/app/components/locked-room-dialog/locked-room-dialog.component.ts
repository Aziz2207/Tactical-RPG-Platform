import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RoomManagerService } from '@app/services/room-manager/room-manager.service';

@Component({
    selector: 'app-locked-room-dialog',
    standalone: true,
    imports: [],
    templateUrl: './locked-room-dialog.component.html',
    styleUrl: './locked-room-dialog.component.scss',
})
export class LockedRoomDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<LockedRoomDialogComponent>,
        private router: Router,
        private roomManagerService: RoomManagerService,
    ) {}
    onYesClick(): void {
        this.dialogRef.close();
        this.roomManagerService.leaveRoom();
        this.router.navigate(['/home']);
    }

    onNoClick(): void {
        this.dialogRef.close();
    }
}
