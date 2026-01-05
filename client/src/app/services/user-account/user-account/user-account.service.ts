import {  HttpClient, HttpHeaders  } from "@angular/common/http";
import {  Injectable, signal, effect  } from "@angular/core";
import {  FireAuthService  } from "@app/services/user-account/fire-auth/fire-auth.service";
import {  SocketCommunicationService  } from "@app/services/sockets/socket-communication/socket-communication.service";
import {  environment  } from "src/environments/environment";
import {  UserAccount  } from "@common/interfaces/user-account";
import {
  
  ClientToServerEvent,
  ServerToClientEvent,
} from "@common/socket.events";
import {  BehaviorSubject, Subject, firstValueFrom  } from "rxjs";
import {  FireStorageService  } from "../fire-storage/fire-storage.service";

@Injectable({
  providedIn: "root",
})
export class UserAccountService {
  readonly accountDetails: any = signal(null);
  private userURL: string = `${environment.serverUrl}/user`;
  private listenersInitialized = false;
  private friendStatuses = new Map<string, boolean>();

  private friendsSource = new BehaviorSubject<UserAccount[]>([]);
  private friendRequestsSource = new BehaviorSubject<UserAccount[]>([]);
  private onlineFriendsSource = new BehaviorSubject<UserAccount[]>([]);
  private searchResultsSource = new BehaviorSubject<UserAccount[]>([]);
  private allUsersSource = new BehaviorSubject<UserAccount[]>([]);
  private blockedUsersSource = new BehaviorSubject<UserAccount[]>([]);
  private everyUserSource = new BehaviorSubject<UserAccount[]>([]);

  friends$ = this.friendsSource.asObservable();
  friendRequests$ = this.friendRequestsSource.asObservable();
  onlineFriends$ = this.onlineFriendsSource.asObservable();
  searchResults$ = this.searchResultsSource.asObservable();
  allUsers$ = this.allUsersSource.asObservable();
  blockedUsers$ = this.blockedUsersSource.asObservable();
  everyUser$ = this.everyUserSource.asObservable();

  private friendRequestReceivedSource = new Subject<{
    senderUid: string;
    senderInfo: UserAccount;
  }>();
  private friendRequestAcceptedSource = new Subject<{
    accepterUid: string;
    accepterInfo: UserAccount;
  }>();
  private friendRemovedSource = new Subject<{
    removedByUid: string;
    removedByInfo: UserAccount;
  }>();
  private friendStatusChangedSource = new Subject<{
    friendUid: string;
    isOnline: boolean;
  }>();

  private friendRequestSentSource = new Subject<{
    receiverUid: string;
    result: any;
  }>();
  private friendRequestRejectedSource = new Subject<{
    requesterUid: string;
    result: any;
  }>();
  private friendRequestRejectedByUserSource = new Subject<{
    rejecterUid: string;
  }>();

  private balanceUpdatedSource = new Subject<{ balance: number }>();
  private userBlockedSource = new Subject<{
    blockedUid: string;
    result: any;
  }>();
  private userUnblockedSource = new Subject<{
    blockedUid: string;
    result: any;
  }>();
  private blockedByUserSource = new Subject<{ blockerUid: string }>();

  friendRequestReceived$ = this.friendRequestReceivedSource.asObservable();
  friendRequestAccepted$ = this.friendRequestAcceptedSource.asObservable();
  friendRemoved$ = this.friendRemovedSource.asObservable();
  friendStatusChanged$ = this.friendStatusChangedSource.asObservable();
  friendRequestSent$ = this.friendRequestSentSource.asObservable();
  friendRequestRejected$ = this.friendRequestRejectedSource.asObservable();
  friendRequestRejectedByUser$ =
    this.friendRequestRejectedByUserSource.asObservable();
  balanceUpdated$ = this.balanceUpdatedSource.asObservable();
  userBlocked$ = this.userBlockedSource.asObservable();
  userUnblocked$ = this.userUnblockedSource.asObservable();
  blockedByUser$ = this.blockedByUserSource.asObservable();

  get friends(): UserAccount[] {
    return this.friendsSource.value;
  }

  get friendRequests(): UserAccount[] {
    return this.friendRequestsSource.value;
  }

  get onlineFriends(): UserAccount[] {
    return this.onlineFriendsSource.value;
  }

  get allUsers(): UserAccount[] {
    return this.allUsersSource.value;
  }

  get everyUser(): UserAccount[] {
    return this.everyUserSource.value;
  }

  get blockedUsers(): UserAccount[] {
    return this.blockedUsersSource.value;
  }

  private blockedByUsersSource = new BehaviorSubject<UserAccount[]>([]);
  get blockedByUsers(): UserAccount[] {
    return this.blockedByUsersSource.value;
  }

  private updateFriendListOnlineStatus(uid: string, isOnline: boolean) {
    const updatedFriends = this.friends.map(f =>
      f.uid === uid ? { ...f, isOnline } : f
    );
    this.friendsSource.next(updatedFriends);

    const updatedEveryUser = this.everyUser.map(u =>
      u.uid === uid ? { ...u, isOnline } : u
    );
    this.everyUserSource.next(updatedEveryUser);

    this.friendStatusChangedSource.next({
      friendUid: uid,
      isOnline
    });
  }



  constructor(
    private authService: FireAuthService,
    private http: HttpClient,
    private socketService: SocketCommunicationService,
    private fireStorageService: FireStorageService
  ) {
    effect(() => {
      const user = this.authService.currentUserSignal();
      if (user) {
        this.fetchAccountDetails();
        this.connectAndInitialize();
      } else {
        this.socketService.disconnect();
        this.accountDetails.set(null);
        this.removeSocketListeners();
      }
    });
  }

  private async connectAndInitialize() {
    try {
      await this.socketService.connect();
      this.initSocketListeners();
      this.loadInitialData();
    } catch (error) {
      console.error("Failed to connect socket:", error);
    }
  }

  private isSocketConnected(): boolean {
    return this.socketService.isSocketAlive?.() || false;
  }

  private _searchResults: UserAccount[] = [];

  setSearchResults(results: UserAccount[]): void {
    this._searchResults = results;
  }

  clearSearchResults(): void {
    this._searchResults = [];
  }

  isUserOnline(uidOrUser: string | UserAccount): boolean {
    const uid = typeof uidOrUser === 'string' ? uidOrUser : uidOrUser.uid;
    const raw = this.friendStatuses.get(uid);
    return raw === true;
  }

  get searchResults(): UserAccount[] {
    return this._searchResults;
  }

  initSocketListeners() {
    if (this.listenersInitialized) {
      // console.log('Socket listeners already initialized, skipping...');
      return;
    }

    // console.log('Initializing socket listeners...');

    this.socketService.on(
      ServerToClientEvent.AllUsers,
      (users: UserAccount[]) => {
        // console.log('Received all users response:', users);
        this.allUsersSource.next(users);
      }
    );

    this.socketService.on(
      ServerToClientEvent.EveryUser,
      (users: UserAccount[]) => {
        // console.log('Received all users response:', users);
        this.everyUserSource.next(users);
      }
    );

    this.socketService.on(
      ServerToClientEvent.Friends,
      (friends: UserAccount[]) => {
        // console.log('Received friends response:', friends);
        this.friendsSource.next(friends);
      }
    );

      this.socketService.on(
        ServerToClientEvent.FriendsUpdated,
        (friends: UserAccount[]) => {
          // console.log('Received friends response:', friends);
          this.friendsSource.next(friends);
        }
      );


    this.socketService.on(
      ServerToClientEvent.FriendRequests,
      (friendRequests: UserAccount[]) => {
        // console.log('Received friend requests response:', friendRequests);
        this.friendRequestsSource.next(friendRequests);
      }
    );

    this.socketService.on(
      ServerToClientEvent.OnlineFriends,
      (data: Record<string, boolean>) => {

        Object.entries(data).forEach(([uid, isOnline]) => {
          this.friendStatuses.set(uid, isOnline);
        });

        this.refreshOnlineFriends();
      }
    );

    this.socketService.on(
      ServerToClientEvent.UserSearchResults,
      (data: { message: string; users: UserAccount[] }) => {
        // console.log('Received search results:', data.users);
        this.searchResultsSource.next(data.users);
      }
    );

    this.socketService.on(
      ServerToClientEvent.FriendRequestReceived,
      (data: { senderUid: string; senderInfo: UserAccount }) => {
        this.friendRequestReceivedSource.next(data);
        this.getFriendRequests();
      }
    );

    this.socketService.on(
      ServerToClientEvent.FriendRequestAcceptedByUser,
      (data: { accepterUid: string; accepterInfo: UserAccount }) => {
        this.friendRequestAcceptedSource.next(data);
        this.getFriends();
      }
    );

    this.socketService.on(
      ServerToClientEvent.RemovedAsFriend,
      (data: { removedByUid: string; removedByInfo: UserAccount }) => {
        this.friendRemovedSource.next(data);
        this.getFriends();
      }
    );

    this.socketService.on(
      ServerToClientEvent.FriendStatusChanged,
      (data: { friendUid: string; isOnline: boolean }) => {
        this.friendStatusChangedSource.next(data);
      }
    );

  this.socketService.on(
    ServerToClientEvent.FriendRequestSent,
    (data: {receiverUid: string; result: any}) => {
      // console.log('Friend request sent successfully:', data);
      this.friendRequestSentSource.next(data); // ✅ Now emits to subscribers
    }
  );

  this.socketService.on(
    ServerToClientEvent.FriendRequestAccepted,
    (data: {requesterUid: string; result: any}) => {
      // console.log('Friend request accepted:', data);
      this.getFriends();
      this.getFriendRequests();
    }
  );

  this.socketService.on(
    ServerToClientEvent.FriendRequestRejected,
    (data: {requesterUid: string; result: any}) => {
      console.log('Friend request rejected:', data);
      this.friendRequestRejectedSource.next(data); // ✅ Now emits to subscribers
      this.getFriendRequests();
    }
  );

  this.socketService.on(
    ServerToClientEvent.FriendRequestRejectedByUser,
    (data: {rejecterUid: string}) => {
      console.log("Friend request rejected:", data);
      this.friendRequestRejectedByUserSource.next(data); // ✅ Now emits to subscribers
      this.getAllUsers();
    }
  );

    this.socketService.on(
      ServerToClientEvent.FriendRemoved,
      (data: { friendUid: string; result: any }) => {
        // console.log('Friend removed:', data);
        this.getFriends();
      }
    );

    this.socketService.on(
      ServerToClientEvent.BalanceUpdated,
      (data: { balance: number }) => {
        console.log("Balance updated:", data.balance);
        const currentDetails = this.accountDetails();
        if (currentDetails) {
          this.accountDetails.set({
            ...currentDetails,
            balance: data.balance,
          });
        }
        this.balanceUpdatedSource.next(data);
      }
    );

    this.socketService.on(
      ServerToClientEvent.ErrorMessage,
      (errorMessage: string) => {
        console.error("User service socket error:", errorMessage);
      }
    );

    this.socketService.on(
      ServerToClientEvent.BlockedUsers,
      (users: UserAccount[]) => {
        console.log("Received blocked users response:", users);
        this.blockedUsersSource.next(users);
      }
    );

    this.socketService.on(
      ServerToClientEvent.UserBlocked,
      (data: { blockedUid: string; result: any }) => {
        console.log("User blocked:", data);
        this.userBlockedSource.next(data);
        this.getBlockedUsers();
        this.getAllUsers();
      }
    );

    this.socketService.on(
      ServerToClientEvent.UserUnblocked,
      (data: { blockedUid: string; result: any }) => {
        console.log("User unblocked:", data);
        this.userUnblockedSource.next(data);
        this.getBlockedUsers();
        this.getAllUsers();
      }
    );

    this.socketService.on(
      ServerToClientEvent.BlockedByUser,
      (data: { blockerUid: string }) => {
        console.log("Blocked by user:", data);
        this.blockedByUserSource.next(data);
        this.getAllUsers();
      }
    );

    this.socketService.on(
      ServerToClientEvent.UserConnected,
      (data: { uid: string }) => {
        console.log(
          "%c[SOCKET] UserConnected RECEIVED",
          "color:#00FF00; font-weight:bold",
          data
        );
        this.friendStatuses.set(data.uid, true);
        console.log(
          "%c[Map after UserConnected]",
          "color:#22ff88",
          [...this.friendStatuses.entries()]
        );
        this.updateFriendListOnlineStatus(data.uid, true);
      }
    );

    this.socketService.on(
      ServerToClientEvent.UserDisconnected,
      (data: { uid: string }) => {
        console.log(
          "%c[SOCKET] UserDisconnected RECEIVED",
          "color:#FF3333; font-weight:bold",
          data
        );
        this.friendStatuses.set(data.uid, false);
        console.log(
          "%c[Map after UserDisconnected]",
          "color:#ff6666",
          [...this.friendStatuses.entries()]
        );
        this.updateFriendListOnlineStatus(data.uid, false);
      }
    );


    this.socketService.on(
      ServerToClientEvent.ModifiedUserAccount,
      async (modificationInfos: {
        uid: string;
        newAvatarUrl: string | null;
      }) => {
        if (modificationInfos.newAvatarUrl) {
          await this.fireStorageService.loadAvatar(
            modificationInfos.newAvatarUrl
          );
        }
        const uid = modificationInfos.uid;
        if (uid === this.accountDetails.uid) return;
        if (this.friends.find((friend) => friend.uid === uid))
          this.getFriends();
        if (this.friendRequests.find((friend) => friend.uid === uid))
          this.getFriendRequests();
        if (this.onlineFriends.find((friend) => friend.uid === uid))
          this.getOnlineFriends();
        if (this.allUsers.find((friend) => friend.uid === uid))
          this.getAllUsers();
        if (this.everyUser.find((friend) => friend.uid === uid))
          this.getEveryUser();
      }
    );
    this.socketService.on(ServerToClientEvent.UserDeleted, (uid: string) => {
      console.log("A user was deleted:", uid);
      if (uid === this.accountDetails.uid) return;
      if (this.friends.find((friend) => friend.uid === uid)) this.getFriends();
      if (this.friendRequests.find((friend) => friend.uid === uid))
        this.getFriendRequests();
      if (this.onlineFriends.find((friend) => friend.uid === uid))
        this.getOnlineFriends();
      if (this.allUsers.find((friend) => friend.uid === uid))
        this.getAllUsers();
      if (this.blockedUsers.find((friend) => friend.uid === uid))
        this.getBlockedUsers();
      if (this.everyUser.find((friend) => friend.uid === uid))
        this.getEveryUser();
    });

    this.socketService.on(ServerToClientEvent.NewUserCreated, () => {
      console.log("New user created");
      this.getAllUsers();
    });

    this.listenersInitialized = true;
    // console.log('Socket listeners initialized successfully');
  }

  removeSocketListeners() {
    if (!this.listenersInitialized) {
      return;
    }

    this.socketService.off(ServerToClientEvent.AllUsers);
    this.socketService.off(ServerToClientEvent.Friends);
    this.socketService.off(ServerToClientEvent.FriendsUpdated);
    this.socketService.off(ServerToClientEvent.FriendRequests);
    this.socketService.off(ServerToClientEvent.OnlineFriends);
    this.socketService.off(ServerToClientEvent.UserSearchResults);
    this.socketService.off(ServerToClientEvent.FriendRequestReceived);
    this.socketService.off(ServerToClientEvent.FriendRequestAcceptedByUser);
    this.socketService.off(ServerToClientEvent.RemovedAsFriend);
    this.socketService.off(ServerToClientEvent.FriendStatusChanged);
    this.socketService.off(ServerToClientEvent.FriendRequestSent);
    this.socketService.off(ServerToClientEvent.FriendRequestAccepted);
    this.socketService.off(ServerToClientEvent.FriendRequestRejected);
    this.socketService.off(ServerToClientEvent.FriendRemoved);
    this.socketService.off(ServerToClientEvent.BalanceUpdated);
    this.socketService.off(ServerToClientEvent.ErrorMessage);
    this.socketService.off(ServerToClientEvent.BlockedUsers);
    this.socketService.off(ServerToClientEvent.UserBlocked);
    this.socketService.off(ServerToClientEvent.UserUnblocked);
    this.socketService.off(ServerToClientEvent.BlockedByUser);
    this.socketService.off(ServerToClientEvent.ModifiedUserAccount);
    this.socketService.off(ServerToClientEvent.UserDeleted);
    this.socketService.off(ServerToClientEvent.NewUserCreated);
    this.socketService.off(ServerToClientEvent.EveryUser);
    this.socketService.off(ServerToClientEvent.UserConnected);
    this.socketService.off(ServerToClientEvent.UserDisconnected);
    this.listenersInitialized = false;
  }

  // DOES NOT INCLUDE SELF AND BLOCKED USERS
  getAllUsers() {
    // console.log('Requesting all users via socket...');
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot request all users");
      return;
    }
    this.socketService.send(ClientToServerEvent.GetAllUsers);
  }

  // INCLUDES EVERY USER, EVEN BLOCKED AND SELF
  getEveryUser() {
    // console.log('Requesting all users via socket...');
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot request all users");
      return;
    }
    this.socketService.send(ClientToServerEvent.GetEveryUser);
  }

  sendFriendRequest(receiverUid: string) {
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot send friend request");
      return;
    }
    this.socketService.send(ClientToServerEvent.SendFriendRequest, {
      receiverUid,
    });
  }

  acceptFriendRequest(requesterUid: string) {
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot accept friend request");
      return;
    }
    this.socketService.send(ClientToServerEvent.AcceptFriendRequest, {
      requesterUid,
    });
  }

  rejectFriendRequest(requesterUid: string) {
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot reject friend request");
      return;
    }
    this.socketService.send(ClientToServerEvent.RejectFriendRequest, {
      requesterUid,
    });
  }

  getFriendRequests() {
    // console.log('Requesting friend requests via socket...');
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot get friend requests");
      return;
    }
    this.socketService.send(ClientToServerEvent.GetFriendRequests);
  }

  getFriends() {
    // console.log('Requesting friends via socket...');
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot get friends");
      return;
    }
    this.socketService.send(ClientToServerEvent.GetFriends);
  }

  removeFriend(friendUid: string) {
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot remove friend");
      return;
    }
    this.socketService.send(ClientToServerEvent.RemoveFriend, { friendUid });
  }

  searchUsers(username: string) {
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot search users");
      return;
    }
    this.socketService.send(ClientToServerEvent.SearchUsers, { username });
  }

  getOnlineFriends() {
    // console.log('Requesting online friends via socket...');
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot get online friends");
      return;
    }
    this.socketService.send(ClientToServerEvent.GetOnlineFriends);
  }

  getFriendByUid(uid: string): UserAccount | undefined {
    return this.friends.find((friend) => friend.uid === uid);
  }

  loadInitialData() {
    // console.log('Loading initial data...');

    if (!this.isSocketConnected()) {
      console.warn("Socket not connected, retrying in 1 second...");
      setTimeout(() => this.loadInitialData(), 1000);
      return;
    }

    // console.log('Socket connected, requesting initial data...');
    this.getAllUsers();
    this.getFriends();
    setTimeout(() => {
      const friends = this.friendsSource.value;
      friends.forEach(f => {
        const isOnline = this.friendStatuses.get(f.uid) === true;
        this.updateFriendListOnlineStatus(f.uid, isOnline);
      });
    }, 300);
    this.getFriendRequests();
    this.getOnlineFriends();
    this.getBlockedUsers();
  }

  initializeAndLoadData() {
    console.log("Initializing UserAccountService...");

    this.initSocketListeners();

    setTimeout(() => {
      this.loadInitialData();
    }, 300);
  }

  async getAccountDetails() {
    return this.accountDetails;
  }

  async isUserConnected() {
    return this.authService.isUserConnected();
  }

  async fetchAccountDetails() {
    const token = await this.authService.getToken();
    const response: any = await firstValueFrom(
      this.http.get(`${this.userURL}/signin`, {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`,
        }),
      })
    );
    // console.log("signin successful!");
    this.accountDetails.set(response.user);
  }

  async fetchAccountDetailsAfterAuth() {
    const token = await this.authService.getToken();
    const response: any = await firstValueFrom(
      this.http.get(`${this.userURL}/infos`, {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`,
        }),
      })
    );
    // console.log("fetch account details successful!");
    this.accountDetails.set(response.user);
  }

  async signOut(): Promise<void> {
    try {
      const token = await this.authService.getToken();
      await firstValueFrom(
        this.http.post(`${this.userURL}/signout`, null, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`,
          }),
        })
      );
      // console.log("signout successful!");
      await this.authService.signOut();
      this.socketService.disconnect();
      this.accountDetails.set(null);
    } catch (error) {
      console.error("Sign-out failed:", error);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.authService.signInWithEmailAndPassword(email, password);
    await this.fetchAccountDetails();
  }

  async signInWithUsernameAndPassword(
    username: string,
    password: string
  ): Promise<void> {
    await this.authService.signInWithUsernameAndPassword(username, password);
    await this.fetchAccountDetails();
  }

  async signUp(
    email: string,
    password: string,
    username: string,
    avatarURL: string
  ): Promise<void> {
    const response: any = await firstValueFrom(
      this.http.post(`${this.userURL}/signup`, {
        email,
        password,
        username,
        avatarURL,
      })
    );
    // console.log("signup successful!");
    await this.authService.signInWithCustomToken(response.token);
    this.accountDetails.set(response.user);
  }

  async deleteUserAccount(): Promise<void> {
    const token = await this.authService.getToken();
    await firstValueFrom(
      this.http.delete(this.userURL, {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`,
        }),
      })
    );
    // console.log("delete successful!");
    await this.authService.signOut();
    this.socketService.disconnect();
    this.accountDetails.set(null);
  }

  updateBalance(amount: number, addToLifetimeEarnings: boolean = false) {
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot update balance");
      return;
    }
    this.socketService.send(ClientToServerEvent.UpdateUserBalance, {amount, addToLifetimeEarnings});
  }

  adjustBalance(delta: number, addToLifetimeEarnings: boolean = false) {
    const currentBalance = this.accountDetails()?.balance ?? 0;
    const newBalance = currentBalance + delta;
    this.updateBalance(newBalance, addToLifetimeEarnings);
  }

  blockUser(blockedUid: string) {
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot block user");
      return;
    }
    this.socketService.send(ClientToServerEvent.BlockUser, { blockedUid });
  }

  unblockUser(blockedUid: string) {
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot unblock user");
      return;
    }
    this.socketService.send(ClientToServerEvent.UnblockUser, { blockedUid });
  }

  getBlockedUsers() {
    console.log("Requesting blocked users via socket...");
    if (!this.isSocketConnected()) {
      console.error("Socket not connected, cannot get blocked users");
      return;
    }
    this.socketService.send(ClientToServerEvent.GetBlockedUsers);
  }

  isUserBlocked(userId: string): boolean {
    return this.blockedUsers.some((user) => user.uid === userId);
  }

  hasBlockedMe(userId: string): boolean {
    return this.blockedByUsers.some((user) => user.uid === userId);
  }

  async updateAccountDetails(
    email: string,
    username: string,
    avatarURL: string
  ): Promise<void> {
    const token = await this.authService.getToken();

    const response: any = await firstValueFrom(
      this.http.patch(
        `${this.userURL}`,
        {
          email,
          username,
          avatarURL,
        },
        {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`,
          }),
        }
      )
    );
    if (response.token) {
      await this.authService.signOut();
      await this.authService.signInWithCustomToken(response.token);
    }
    this.accountDetails.set(response.user);
    console.log("Account details updated successfully");
  }

  getUserByUid(uid: string) {
    return this.everyUser.find(u => u.uid === uid) ?? null;
  }

  refreshOnlineFriends() {
    console.log(
      "%c[refreshOnlineFriends] TRIGGERED",
      "color:#00e0ff; font-size:14px; font-weight:bold"
    );

    console.log(
      "%cFriends BEFORE:",
      "color:orange",
      this.friends
    );

    console.log(
      "%cfriendStatuses map:",
      "color:#ff8800",
      [...this.friendStatuses.entries()]
    );

    const updated = this.friends.map(f => ({
      ...f,
      online: this.friendStatuses.get(f.uid) ?? false
    }));

    console.log(
      "%cFriends AFTER:",
      "color:#33ff33",
      updated
    );

    this.friendsSource.next(updated);

    const onlyOnline = updated.filter(f => f.online === true);

    console.log(
      "%cOnline friends computed:",
      "color:#00ff99",
      onlyOnline
    );

    this.onlineFriendsSource.next(onlyOnline);
  }


}
