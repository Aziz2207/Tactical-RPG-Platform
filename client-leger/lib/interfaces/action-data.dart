import 'package:client_leger/interfaces/player.dart';
import 'package:client_leger/interfaces/position.dart';

class ActionData {
  final Position clickedPosition;
  final Player player;

  ActionData({required this.clickedPosition, required this.player});

  factory ActionData.fromJson(Map<String, dynamic> json) {
    return ActionData(
      clickedPosition: Position.fromJson(json["clickedPosition"]),
      player: Player.fromJson(json["player"]),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      "clickedPosition": clickedPosition.toJson(),
      "player": player.toJson(),
    };
  }
}
