import 'package:client_leger/interfaces/game-objects.dart';
import 'package:client_leger/utils/enums/item-type.dart';
import 'package:easy_localization/easy_localization.dart';

List<GameObject> gameItems = [
  GameObject(
    id: ItemType.Trident.value,
    name: 'ITEMS.TRIDENT.NAME'.tr(),
    image: './assets/images/objects/poseidon-trident.jpg',
    description: 'ITEMS.TRIDENT.DESCRIPTION'.tr(),
  ),
  GameObject(
    id: ItemType.Armor.value,
    name: 'ITEMS.ARMOR.NAME'.tr(),
    image: './assets/images/objects/armor-of-achilles.jpg',
    description: 'ITEMS.ARMOR.DESCRIPTION'.tr(),
  ),
  GameObject(
    id: ItemType.Sandal.value,
    name: 'ITEMS.SANDAL.NAME'.tr(),
    image: './assets/images/objects/winged-sandals.jpg',
    description: 'ITEMS.SANDAL.DESCRIPTION'.tr(),
  ),
  GameObject(
    id: ItemType.Lightning.value,
    name: 'ITEMS.LIGHTNING.NAME'.tr(),
    image: './assets/images/objects/zeus-lightning.jpg',
    description: 'ITEMS.LIGHTNING.DESCRIPTION'.tr(),
  ),
  GameObject(
    id: ItemType.Xiphos.value,
    name: 'ITEMS.XIPHOS.NAME'.tr(),
    image: './assets/images/objects/xiphos.jpg',
    description: 'ITEMS.XIPHOS.DESCRIPTION'.tr(),
  ),
  GameObject(
    id: ItemType.Kunee.value,
    name: 'ITEMS.KUNEE.NAME'.tr(),
    image: './assets/images/objects/helm-of-darkness.jpg',
    description: 'ITEMS.KUNEE.DESCRIPTION'.tr(),
  ),
  GameObject(
    id: ItemType.Random.value,
    name: 'ITEMS.RANDOM.NAME'.tr(),
    image: './assets/images/objects/dice.jpg',
    description: 'ITEMS.RANDOM.DESCRIPTION'.tr(),
  ),
  GameObject(
    id: ItemType.Spawn.value,
    name: 'ITEMS.SPAWN.NAME'.tr(),
    image: './assets/images/objects/tree.jpg',
    description: 'ITEMS.SPAWN.DESCRIPTION'.tr(),
  ),
  GameObject(
    id: ItemType.Flag.value,
    name: 'ITEMS.FLAG.NAME'.tr(),
    image: './assets/images/objects/flag.jpg',
    description: 'ITEMS.FLAG.DESCRIPTION'.tr(),
  ),
];
