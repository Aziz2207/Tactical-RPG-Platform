import 'package:flutter/material.dart';
import 'package:client_leger/utils/constants/fonts/fonts-family.dart';

class LobbyPlayerCard extends StatelessWidget {
  final String name;
  final String status; // 'admin' | 'bot' | 'regular-player'
  final String behavior; // 'aggressive' | 'defensive' | 'sentient'
  final String avatarPath; // asset path if available; fallback handled
  final bool isKickVisible;
  final VoidCallback? onKick;

  const LobbyPlayerCard({
    super.key,
    required this.name,
    required this.status,
    required this.behavior,
    required this.avatarPath,
    this.isKickVisible = false,
    this.onKick,
  });

  @override
  Widget build(BuildContext context) {
    final isAdmin = status.toLowerCase().contains('admin');
    final isBot = status.toLowerCase().contains('bot');

    final borderColor = behavior == 'aggressive'
        ? const Color.fromARGB(255, 159, 0, 0)
        : (behavior == 'defensive'
              ? const Color.fromARGB(255, 0, 17, 169)
              : Colors.black);

    return LayoutBuilder(
      builder: (context, constraints) {
        // Scale elements based on available width per card
        final w = constraints.maxWidth;
        final h = constraints.maxHeight;
        final cardHeight = h.isFinite ? h * 0.85 : 250.0;
        final nameFontSize = (w * 0.07).clamp(14.0, 22.0);
        final iconSize = (w * 0.18).clamp(14.0, 20.0);
        final avatarSize = (w * 0.9).clamp(90.0, 210.0);
        final borderWidth = (w * 0.008).clamp(2.0, 3.0);
        final motifHeight = (cardHeight * 0.16).clamp(20.0, 30.0);
        final topLineHeight = cardHeight * 0.012;

        return Stack(
          clipBehavior: Clip.none,
          children: [
            // Top decorative line (::before pseudo-element)
            Positioned(
              top: -(topLineHeight * 3),
              left: 0,
              right: 0,
              height: topLineHeight,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isAdmin
                        ? [
                            Colors.transparent,
                            const Color(0xFFFFE45E),
                            const Color(0xCCFFE45E),
                            Colors.transparent,
                          ]
                        : isBot
                        ? [
                            Colors.transparent,
                            Colors.white,
                            const Color(0xCCFFFFFF),
                            Colors.transparent,
                          ]
                        : [
                            Colors.transparent,
                            Colors.black,
                            const Color(0xCC161616),
                            Colors.transparent,
                          ],
                    stops: const [0, 0.1, 0.9, 1],
                  ),
                ),
              ),
            ),
            // Main card
            Container(
              height: cardHeight,
              decoration: BoxDecoration(
                border: const Border(
                  top: BorderSide(
                    color: Color(0xFF8D854B),
                    width: 1.5,
                  ),
                ),
              ),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Container(
                      decoration: _bgDecoration(isAdmin: isAdmin, isBot: isBot),
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(height: cardHeight * 0.04),
                      // Top motif image
                      _motif(
                        isAdmin: isAdmin,
                        isBot: isBot,
                        height: motifHeight,
                      ),
                      SizedBox(height: cardHeight * 0.04),
                      // Name bar - positioned to overflow slightly
                      Transform.translate(
                        offset: const Offset(0, 4),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: isAdmin
                                  ? const [
                                      Color(0xFF878252),
                                      Color(0xFFFFEB89),
                                      Color(0xFFFFEA82),
                                      Color(0xFF756C42),
                                    ]
                                  : isBot
                                  ? const [
                                      Color(0xFF7B7B7B),
                                      Color(0xFFCCCCCC),
                                      Color(0xFFE3E3E3),
                                      Color(0xFF848484),
                                    ]
                                  : const [
                                      Color(0xFF0C0C0C),
                                      Color(0xFF242424),
                                      Color(0xFF303030),
                                      Color(0xFF0C0C0C),
                                    ],
                              begin: Alignment.centerLeft,
                              end: Alignment.centerRight,
                            ),
                            border: const Border(
                              right: BorderSide(color: Colors.black, width: 2),
                              bottom: BorderSide(color: Colors.black, width: 2),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              if (isKickVisible && !isAdmin)
                                GestureDetector(
                                  onTap: onKick,
                                  child: Container(
                                    width: iconSize * 1.2,
                                    height: iconSize * 1.2,
                                    margin: const EdgeInsets.only(right: 8),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isBot 
                                          ? Colors.black.withOpacity(0.1)
                                          : Colors.white.withOpacity(0.1),
                                    ),
                                    child: Icon(
                                      Icons.close,
                                      size: iconSize,
                                      color: isBot ? Colors.black : Colors.white,
                                    ),
                                  ),
                                ),
                              Flexible(
                                child: Text(
                                  name,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontFamily: FontFamily.PAPYRUS,
                                    fontWeight: FontWeight.w900,
                                    color: isAdmin || isBot ? Colors.black : Colors.white,
                                    fontSize: nameFontSize,
                                  ),
                                ),
                              ),
                              if (isBot)
                                Padding(
                                  padding: const EdgeInsets.only(left: 8.0),
                                  child: Icon(
                                    Icons.android,
                                    size: iconSize,
                                    color: behavior == 'aggressive'
                                        ? const Color(0xFF9F0000)
                                        : const Color(0xFF1111AA),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      // Avatar
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.symmetric(
                            vertical: cardHeight * 0.08,
                          ),
                          child: Center(
                            child: Container(
                              width: avatarSize,
                              height: avatarSize,
                              decoration: BoxDecoration(
                                border: Border.all(
                                  color: borderColor,
                                  width: borderWidth,
                                ),
                                borderRadius: BorderRadius.circular(32),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(32),
                                child: _avatar(avatarPath),
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Bottom motif image
                      _motif(
                        isAdmin: isAdmin,
                        isBot: isBot,
                        height: motifHeight,
                      ),
                      SizedBox(height: cardHeight * 0.08),
                    ],
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _avatar(String path) {
    if (path.isEmpty) {
      return const ColoredBox(color: Colors.black12);
    }
    final name = _avatarNameFromPath(path);
    final asset =
        'assets/images/characters/${name[0].toUpperCase()}${name.substring(1)}.webp';
    return Image.asset(
      asset,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) {
        return const ColoredBox(color: Colors.black12);
      },
    );
  }

  String _avatarNameFromPath(String s) {
    final last = s.split('/').last;
    final base = last.split('.').first;
    return base.toLowerCase();
  }

  BoxDecoration _bgDecoration({required bool isAdmin, required bool isBot}) {
    if (isAdmin) {
      return const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF490E0E),
            Color(0xFF8E1313),
            Color(0x40811A1A),
            Colors.transparent,
          ],
          stops: [0, 0.33, 0.67, 1],
        ),
      );
    }
    if (isBot) {
      return const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF0F3147),
            Color(0xFF247398),
            Color(0x994B98B9),
            Colors.transparent,
          ],
          stops: [0, 0.33, 0.67, 1],
        ),
      );
    }
    return const BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          Color(0xFFA5A5A5),
          Color(0xF2F2F2F2),
          Color(0x99E2E2E2),
          Colors.transparent,
        ],
        stops: [0, 0.33, 0.67, 1],
      ),
    );
  }

  Widget _motif({
    required bool isAdmin,
    required bool isBot,
    required double height,
  }) {
    // Use actual motif images like Angular
    final motifPath = isAdmin
        ? 'assets/images/motifs/squared-motif-gold.png'
        : isBot
        ? 'assets/images/motifs/squared-motif-white.png'
        : 'assets/images/motifs/squared-motif-black.png';

    return SizedBox(
      height: height,
      width: double.infinity,
      child: Image.asset(
        motifPath,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) {
          // Fallback to gradient if image not found
          final color = isAdmin
              ? const Color(0xFFFFE45E)
              : (isBot ? Colors.white : Colors.black);
          return Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  color.withOpacity(0),
                  color.withOpacity(1),
                  color.withOpacity(0.8),
                  color.withOpacity(0),
                ],
                stops: const [0, 0.1, 0.9, 1],
              ),
            ),
          );
        },
      ),
    );
  }
}