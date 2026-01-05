import 'package:client_leger/services/feedback/feedback_service.dart';
import 'package:client_leger/services/forms/form-validators.dart';
import 'package:client_leger/utils/constants/assets/assets.dart';
import 'package:client_leger/widgets/theme/app_primary_button.dart';
import 'package:client_leger/widgets/statistics/player-creation-stats.dart';
import 'package:client_leger/widgets/statistics/stat_action_button.dart';
import 'package:client_leger/widgets/forms/character-grid.dart';
import 'package:client_leger/widgets/theme/themed_background.dart';
import 'package:flutter/material.dart';
import 'package:client_leger/services/singleton/service-locator.dart';
import 'package:client_leger/services/authentification/auth.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:client_leger/widgets/dialogs/app_dialogs.dart';
import 'package:easy_localization/easy_localization.dart';

class CharacterForms extends StatefulWidget {
  const CharacterForms({
    super.key,
    this.onSelectAvatar,
    this.onConfirm,
    this.disabledAvatarNames = const {},
    this.showAvailability = false,
    this.initialAvailability = 'public',
    this.entryFee,
  });

  final void Function(String avatarPath)? onSelectAvatar;
  final void Function({
    required String name,
    required String avatarPath,
    required Map<String, int> stats,
  })?
  onConfirm;
  final Set<String> disabledAvatarNames;
  final bool showAvailability;
  final String initialAvailability; // 'public' | 'friends'
  final int? entryFee;
  @override
  State<CharacterForms> createState() => _CharacterFormsState();
}

class _CharacterFormsState extends State<CharacterForms> {
  List<String> _characters = List<String>.from(AppAssets.characters);
  final List<String> leaves = AppAssets.leaves;
  final TextEditingController _nameController = TextEditingController();
  final GlobalKey<PlayerCreationStatisticState> playerStatsKey = GlobalKey();

  int selectedIndex = 0;
  int leftLeafIndex = 0;
  int rightLeafIndex = 1;
  String _availability = 'public';
  String _userName = 'Player';
  int _entryFee = 0; // Slider-selected entry fee (creation only)
  int _balance = 0; // User currency balance
  bool _quickElimination = false;

  @override
  void initState() {
    super.initState();
    _availability = widget.initialAvailability;
    _loadOwnedAvatarsAndMerge();
    _loadUserName();
    _maybeLoadBalance();
  }

  Future<void> _loadUserName() async {
    try {
      final profile = await AuthService().getCurrentUserProfile();
      final firebaseUser = FirebaseAuth.instance.currentUser;
      final username = profile?.username ?? firebaseUser?.email ?? 'Player';
      if (mounted) {
        setState(() => _userName = username);
      }
    } catch (_) {}
  }

  Future<void> _maybeLoadBalance() async {
    if (!widget.showAvailability) return;
    try {
      final b = await ServiceLocator.userAccount.getBalance();
      if (mounted) setState(() => _balance = b);
    } catch (_) {}
  }

  String _assetForAvatarUrl(String url) {
    try {
      final uri = Uri.parse(url);
      final filename = uri.pathSegments.isNotEmpty
          ? uri.pathSegments.last
          : url.split('/').last;
      final clean = filename.trim();
      return 'assets/images/characters/' + clean;
    } catch (_) {
      final fallback = url.split('/').last.trim();
      return 'assets/images/characters/' + fallback;
    }
  }

  Future<void> _loadOwnedAvatarsAndMerge() async {
    try {
      final ownedUrls = await ServiceLocator.shop.getOwnedAvatarUrls();
      final ownedAssets = ownedUrls
          .map((u) => u.trim())
          .where((u) => u.isNotEmpty)
          .map(_assetForAvatarUrl)
          .toSet();

      if (ownedAssets.isEmpty) return;

      final currentSelection =
          (selectedIndex >= 0 && selectedIndex < _characters.length)
          ? _characters[selectedIndex]
          : null;

      final base = List<String>.from(AppAssets.characters);
      final baseSet = base.toSet();
      final extras = ownedAssets.where((a) => !baseSet.contains(a)).toList()
        ..sort();
      final merged = <String>[...base, ...extras];

      if (!mounted) return;
      setState(() {
        _characters = merged;
        if (currentSelection != null) {
          final newIdx = _characters.indexOf(currentSelection);
          selectedIndex = newIdx >= 0 ? newIdx : 0;
        } else {
          selectedIndex = 0;
        }
      });
    } catch (_) {}
  }

  Map<String, int> _currentStats(PlayerCreationStatisticState s) {
    // Map attack/defense to simple ints based on chosen die, fallback 4
    final attack = s.attackValue.contains('(1-6)') ? 6 : 4;
    final defense = s.defenseValue.contains('(1-6)') ? 6 : 4;
    return {
      'life': s.lifeValue,
      'speed': s.speedValue,
      'attack': attack,
      'defense': defense,
    };
  }

  final gameConfig = {
    "_id": "flutter-mock-001",
    "name": "Game depuis Flutter",
    "description": "Créé via mobile",
    "visible": true,
    "mode": "classic",
    "nbPlayers": 2,
    "image": "default.png",
    // Une grille simple (10x10 de 0)
    "tiles": List.generate(10, (_) => List.filled(10, 0)),
    "dimension": 10,
    "itemPlacement": List.generate(10, (_) => List.filled(10, 0)),
    "isSelected": true,
    // ISO string suffit pour un Date côté TS
    "lastModification": DateTime.now().toIso8601String(),
  };

  void validateAll(BuildContext context) {
    final error = FormValidators.runAll([
      () => FormValidators.validateStats(
        isSpeedOrLifeSelected:
            playerStatsKey.currentState?.isSpeedOrLifeSelected ?? false,
        isAttackOrDefenseSelected:
            playerStatsKey.currentState?.isAttackOrDefenseSelected ?? false,
      ),
    ]);

    if (error != null) {
      FeedbackService.show(context, error);
      return;
    }

    if (widget.showAvailability && _entryFee > _balance) {
      AppDialogs.showInfo(
        context: context,
        title: 'JOIN_PAGE.ERRORS.INSUFFICIENT_FUNDS'.tr(),
        message: 'GAME_CREATION.INSUFFICIENT_FUNDS'.tr(),
        barrierDismissible: false,
      );
      return;
    }
    final stats = _currentStats(playerStatsKey.currentState!);
    final name = _nameController.text.trim();
    final avatarPath = _characters[selectedIndex];
    widget.onConfirm?.call(name: name, avatarPath: avatarPath, stats: stats);
    Navigator.pop(context, {
      'name': name,
      'avatarPath': avatarPath,
      'stats': stats,
      if (widget.showAvailability) 'availability': _availability,
      if (widget.showAvailability) 'entryFee': _entryFee,
      'quickElimination': _quickElimination,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(20),
      backgroundColor: Colors.transparent,
      child: SizedBox(
        width: MediaQuery.of(context).size.width * 0.8,
        height: MediaQuery.of(context).size.height * 0.85,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: ThemedBackground(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Column(
                      children: [
                        Align(
                          alignment: Alignment.topLeft,
                          child: IconButton(
                            icon: const Icon(
                              Icons.arrow_back,
                              color: Colors.white,
                              size: 32,
                            ),
                            onPressed: () {
                              Navigator.pop(context);
                            },
                          ),
                        ),
                        const SizedBox(height: 8),
                        Expanded(
                          child: LayoutBuilder(
                            builder: (context, constraints) {
                              int columns = 3;
                              if (_characters.length > 12) {
                                columns = 4;
                              }

                              final spacing = _characters.length > 12
                                  ? 10.0
                                  : 12.0;

                              return CharacterGrid(
                                crossAxisCount: columns,
                                crossAxisSpacing: spacing,
                                mainAxisSpacing: spacing,
                                characters: _characters,
                                selectedIndex: selectedIndex,
                                disabledNames: widget.disabledAvatarNames,
                                onSelect: (index) {
                                  setState(() {
                                    selectedIndex = index;
                                  });
                                  widget.onSelectAvatar?.call(
                                    _characters[index],
                                  );
                                },
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 20),

                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          flex: 4,
                          child: Padding(
                            padding: const EdgeInsets.only(top: 0),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(top: 5),
                                  child: Text(
                                    _userName,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 18,
                                      fontFamily: 'Papyrus',
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.only(top: 16),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      SizedBox(
                                        width: 78,
                                        child: Image.asset(
                                          AppAssets.leaves[leftLeafIndex],
                                          fit: BoxFit.contain,
                                        ),
                                      ),
                                      SizedBox(
                                        width: 120,
                                        child: Container(
                                          decoration: BoxDecoration(
                                            borderRadius: BorderRadius.circular(
                                              20,
                                            ),
                                          ),
                                          clipBehavior: Clip.hardEdge,
                                          child: Image.asset(
                                            _characters[selectedIndex],
                                            fit: BoxFit.contain,
                                          ),
                                        ),
                                      ),
                                      SizedBox(
                                        width: 78,
                                        child: Image.asset(
                                          AppAssets.leaves[rightLeafIndex],
                                          fit: BoxFit.contain,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                // Prix d'entrée (si applicable)
                                if ((widget.entryFee ?? 0) > 0) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    "${'GAME_CREATION.ENTRY_FEE'.tr()} : ${widget.entryFee}\$",
                                    style: const TextStyle(
                                      color: Colors.red,
                                      fontSize: 38,
                                      fontFamily: 'Papyrus',
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],

                                if (widget.showAvailability) ...[
                                  const SizedBox(height: 8),
                                  Center(
                                    child: Text(
                                      'GAME_CREATION.AVAILABILITY'.tr(),
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 15,
                                        fontFamily: 'Papyrus',
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 5),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      SizedBox(
                                        width: 200,
                                        height: 32,
                                        child: StatActionButton(
                                          buttonText: 'GAME_CREATION.EVERYONE'
                                              .tr(),
                                          minHeight: 32,
                                          selected: _availability == 'public',
                                          onPressed: () => setState(
                                            () => _availability = 'public',
                                          ),
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      SizedBox(
                                        width: 200,
                                        height: 32,
                                        child: StatActionButton(
                                          buttonText:
                                              'GAME_CREATION.FRIENDS_ONLY'.tr(),
                                          minHeight: 32,
                                          selected: _availability == 'friends',
                                          onPressed: () => setState(
                                            () => _availability = 'friends',
                                          ),
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.center,
                                    children: [
                                      SizedBox(
                                        width: 320,
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8.0,
                                            vertical: 0.0,
                                          ),
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                'GAME_CREATION.ENTRY_FEE'.tr(),
                                                style: const TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 15,
                                                  fontFamily: 'Papyrus',
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                              Text(
                                                '$_entryFee\$',
                                                style: const TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 15,
                                                  fontFamily: 'Papyrus',
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      SizedBox(
                                        width: 500,
                                        child:
                                            ValueListenableBuilder<
                                              ThemePalette
                                            >(
                                              valueListenable:
                                                  ThemeConfig.palette,
                                              builder: (context, palette, _) {
                                                return SliderTheme(
                                                  data: SliderTheme.of(context)
                                                      .copyWith(
                                                        activeTrackColor:
                                                            palette.primary,
                                                        inactiveTrackColor:
                                                            palette.primary
                                                                .withValues(
                                                                  alpha: 0.3,
                                                                ),
                                                        thumbColor:
                                                            palette.primary,
                                                        overlayColor: palette
                                                            .primary
                                                            .withValues(
                                                              alpha: 0.2,
                                                            ),
                                                        valueIndicatorColor:
                                                            palette.primaryDark,
                                                      ),
                                                  child: Slider(
                                                    value: _entryFee.toDouble(),
                                                    min: 0,
                                                    max: 200,
                                                    divisions: 40,
                                                    label: _entryFee.toString(),
                                                    onChanged: (v) => setState(
                                                      () =>
                                                          _entryFee = v.round(),
                                                    ),
                                                  ),
                                                );
                                              },
                                            ),
                                      ),
                                      if (_entryFee > _balance)
                                        Padding(
                                          padding: const EdgeInsets.only(
                                            top: 4,
                                          ),
                                          child: Text(
                                            'GAME_CREATION.INSUFFICIENT_FUNDS'
                                                .tr(),
                                            textAlign: TextAlign.center,
                                            style: const TextStyle(
                                              color: Colors.red,
                                              fontSize: 15,
                                              fontFamily: 'Papyrus',
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ),

                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            "GAME_CREATION.QUICK_ELIMINATION"
                                                .tr(),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 16,
                                              fontFamily: 'Papyrus',
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Switch(
                                            value: _quickElimination,
                                            onChanged: (v) => setState(
                                              () => _quickElimination = v,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],

                                PlayerCreationStatistic(key: playerStatsKey),
                                const SizedBox(height: 4),

                                Padding(
                                  padding: const EdgeInsets.only(right: 25),
                                  child: AppPrimaryButton(
                                    label: 'FOOTER.CONFIRM'.tr(),
                                    onPressed: () {
                                      validateAll(context);
                                    },
                                    width: 240,
                                    height: 40,
                                    fontSize: 20,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
