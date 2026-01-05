export interface UserAccount {
  uid: string;
  email?: string;
  password?: string;
  username?: string;
  avatarURL: string;
  friends?: string[];
  blockedUsers?: string[];
  blockers?: string[];
  createdAt?: Date;
  balance?: number;
  lifetimeEarnings?: number;
  ownedBackgrounds?: string[];
  selectedBackground?: string;
  ownedPurchasableAvatars?: string[];
  ownedThemes?: string[];
  selectedTheme?: string;

  selectedLanguage?: string;
}
