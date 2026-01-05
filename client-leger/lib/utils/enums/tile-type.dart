enum TileType {
  Ground(1),
  Ice(2),
  Water(3),
  Wall(4),
  ClosedDoor(5),
  OpenDoor(6);

  final int value;
  const TileType(this.value);
}
