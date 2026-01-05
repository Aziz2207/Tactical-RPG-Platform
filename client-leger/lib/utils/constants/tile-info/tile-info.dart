import 'package:client_leger/interfaces/game-tile.dart';
import 'package:client_leger/utils/enums/tile-type.dart';

List<GameTile> gameTiles = [
  GameTile(
    id: TileType.Ground.value,
    name: 'Gazon',
    image: 'assets/images/tiles/grass.jpg',
    descriptions: [
      "Tuile par défaut du jeu (tuile de terrain)",
      "Les joueurs et les objects peuvent y être posés dessus', 'coût: 1",
    ],
  ),

  GameTile(
    id: TileType.Ice.value,
    name: 'Glace',
    image: 'assets/images/tiles/ice.jpg',
    descriptions: [
      'Un joueur qui y marche dessus à 10% de chance de perdre pied et tomber, terminant instantanément le tour du joueur',
      'tant que le joueur se trouve sur de la glace, ses attributs « attaque » et « défense » souffrent d’un malus de 2.',
      'coût: 0',
    ],
  ),

  GameTile(
    id: TileType.Water.value,
    name: 'Eau',
    image: 'assets/images/tiles/water.jpg',
    descriptions: ['Tuile de terrain', 'Coût: 2'],
  ),
  GameTile(
    id: TileType.Wall.value,
    name: 'Mur',
    image: 'assets/images/tiles/wall.jpg',
    descriptions: [
      'Obstacle infranchissable à moins d’avoir un item spécial',
      'Aucun objet ne peut y être placé',
      'Pas considérée comme une tuile de terrain',
    ],
  ),
  GameTile(
    id: TileType.ClosedDoor.value,
    name: 'Porte fermée',
    image: 'assets/images/tiles/closed-door.jpg',
    descriptions: [
      "Une porte fermée doit être ouverte par le joueur avec le bouton 'Porte'.",
      "Sinon elle agit comme un mur infranchissable à moins d’avoir un item spécial",
    ],
  ),
  GameTile(
    id: TileType.OpenDoor.value,
    name: 'Porte ouverte',
    image: 'assets/images/tiles/open-door.jpg',
    descriptions: [
      "Une porte ouverte laisse passer le joueur.",
      "Sinon elle agit comme un mur infranchissable à moins d’avoir un item spécial",
    ],
  ),
];
