enum ItemType {
  Trident(1),
  Armor(2),
  Sandal(3),
  Lightning(4),
  Xiphos(5),
  Kunee(6),
  Random(7),
  Spawn(8),
  // Hestia = 9,
  // Zeus = 10,
  // Hera = 11,
  // Poseidon = 12,
  // Artemis = 13,
  // Demeter = 14,
  // Hermes = 15,
  // Athena = 16,
  // Hephaestus = 17,
  // Apollo = 18,
  // Ares = 19,
  // Aphrodite = 20,
  Flag(21);

  final int value;
  const ItemType(this.value);
}
