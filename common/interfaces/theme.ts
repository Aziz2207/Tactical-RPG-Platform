export enum Theme {
  Gold = 'gold',
  Blue = 'blue',
  Emerald = 'emerald',
  Ruby = 'ruby',
  Amethyst = 'amethyst',
  Obsidian = 'obsidian',
  Copper = 'copper',
  Cyberpunk = 'cyberpunk',
  
  Aqua = 'aqua',
  McDonalds = 'mcdonalds',
  Magenta = 'magenta',
  Sapphire = 'sapphire',
  SapphireCrimson = 'crimson-sapphire',
  VerdantAmethyst = 'verdant-amethyst',

  DarkFlat = 'dark-flat',
  GoldFlat = 'gold-flat',
  NavyFlat = 'navy-flat',
  GreenFlat = 'green-flat',
  RedFlat = 'red-flat',

  TotalDark = 'total-dark',
  Silver = 'silver',
  Crimson = 'crimson',
  Pink = 'pink',
  GreenBlue = 'green-blue',
  BlackOrange = 'black-orange',
 
  MyEyesBleed = 'my-eyes-bleed',
  Arctic = 'arctic',
}

export interface ThemeOption {
  id: number;
  value: Theme;
  label: string;
  colorClass: string;
  price: number;
  owned: boolean;
}