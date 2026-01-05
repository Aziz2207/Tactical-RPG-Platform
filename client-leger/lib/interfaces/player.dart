import 'package:client_leger/interfaces/attributes.dart';
import 'package:client_leger/interfaces/position.dart';
import 'package:client_leger/models/challenge.dart';

class Player {
  String id;
  String? uid;
  Attributes attributes;
  dynamic avatar;
  bool isActive;
  String name;
  dynamic status;
  dynamic postGameStats;
  List<dynamic> inventory;
  Position position;
  List<dynamic> positionHistory;
  List<dynamic> collectedItems;
  Position spawnPosition;
  dynamic behavior;
  Challenge? assignedChallenge;

  Player({
    required this.id,
    this.uid,
    required this.attributes,
    this.avatar,
    required this.isActive,
    required this.name,
    this.status,
    this.postGameStats,
    required this.inventory,
    required this.position,
    required this.positionHistory,
    required this.collectedItems,
    required this.spawnPosition,
    this.behavior,
    this.assignedChallenge
  });

  factory Player.fromJson(Map<String, dynamic> json) {
    return Player(
      id: json['id'] ?? '',
      uid: json['uid'],
      attributes: Attributes.fromJson(
        Map<String, dynamic>.from(json['attributes']),
      ),
      avatar: json['avatar'] ?? {},
      isActive: json['isActive'] ?? false,
      name: json['name'] ?? '',
      status: json['status'] ?? '',
      postGameStats: json['postGameStats'] ?? {},
      inventory: json['inventory'] ?? [],
      position: Position.fromJson(json['position']),
      positionHistory: json['positionHistory'] ?? [],
      collectedItems: json['collectedItems'] ?? [],
      spawnPosition: Position.fromJson(json['spawnPosition']),
      behavior: json['behavior'] ?? '',
            assignedChallenge: json['assignedChallenge'] != null 
          ? Challenge.fromJson(json['assignedChallenge'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'uid': uid,
      'attributes': attributes.toJson(),
      'avatar': avatar,
      'isActive': isActive,
      'name': name,
      'status': status,
      'postGameStats': postGameStats,
      'inventory': inventory,
      'position': position.toJson(),
      'positionHistory': positionHistory,
      'collectedItems': collectedItems,
      'spawnPosition': spawnPosition.toJson(),
      'behavior': behavior,
      'assignedChallenge': assignedChallenge?.toJson(),
    };
  }
}
