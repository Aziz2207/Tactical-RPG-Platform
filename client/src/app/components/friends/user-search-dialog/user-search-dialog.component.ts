import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { UserListComponent } from "../user-list/user-list.component";
import { UserListType } from "../friends-bar/friends-bar.component";
import { LucideAngularModule, Search } from "lucide-angular";
import { UserAccount } from "../../../../../../common/interfaces/user-account";
import { TranslateModule } from "@ngx-translate/core";

@Component({
    selector: "app-user-search-dialog",
    standalone: true,
    imports: [CommonModule, UserListComponent, LucideAngularModule, FormsModule, TranslateModule],
    templateUrl: "./user-search-dialog.component.html",
    styleUrl: "./user-search-dialog.component.scss",
})
export class UserSearchDialogComponent {
    @Input() userListType: UserListType;
    @Input() displayedUsers: UserAccount[] = [];
    @Output() close = new EventEmitter<void>();
    @Output() searchUsers = new EventEmitter<string>();

    searchTerm = '';

    readonly UserListType = UserListType;
    readonly Search = Search;

    onClose() {
        this.close.emit();
    }

    onSearchInput(event: Event) {
        const target = event.target as HTMLInputElement;
        this.searchTerm = target.value;
        
        this.searchUsers.emit(this.searchTerm);
    }

    onSearchInputKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.searchUsers.emit(this.searchTerm);
        }
    }
}