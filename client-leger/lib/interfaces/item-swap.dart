import 'package:client_leger/interfaces/game-objects.dart';
import 'package:client_leger/interfaces/player.dart';

class ItemSwapEvent {
  final Player activePlayer;
  final GameObject foundItem;

  ItemSwapEvent({required this.activePlayer, required this.foundItem});
}
