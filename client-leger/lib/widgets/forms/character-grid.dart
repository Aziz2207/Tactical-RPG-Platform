import 'package:flutter/material.dart';
import 'package:client_leger/utils/theme/theme_config.dart';

class CharacterGrid extends StatelessWidget {
  final List<String> characters;
  final int selectedIndex;
  final int crossAxisCount;
  final double crossAxisSpacing;
  final double mainAxisSpacing;
  final Function(int) onSelect;
  final Set<String> disabledNames;

  const CharacterGrid({
    super.key,
    required this.characters,
    required this.selectedIndex,
    required this.onSelect,
    required this.crossAxisSpacing,
    required this.mainAxisSpacing,
    required this.crossAxisCount,
    this.disabledNames = const {},
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: crossAxisSpacing,
        mainAxisSpacing: mainAxisSpacing,
      ),
      itemCount: characters.length,
      itemBuilder: (context, index) {
        final isSelected = index == selectedIndex;
        final name = _nameFromPath(characters[index]);
        final isDisabled = disabledNames.contains(name.toLowerCase());
        return GestureDetector(
          onTap: () {
            if (isDisabled) return;
            onSelect(index);
          },
          child: ValueListenableBuilder<ThemePalette>(
            valueListenable: ThemeConfig.palette,
            builder: (context, palette, _) => Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border(
                  bottom: BorderSide(
                    color: isSelected ? palette.primary : Colors.black,
                    width: 10,
                  ),
                  right: BorderSide(
                    color: isSelected ? palette.primary : Colors.black,
                    width: 10,
                  ),
                ),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: palette.primaryBoxShadow,
                          blurRadius: 15,
                        ),
                      ]
                    : [],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.asset(characters[index], fit: BoxFit.cover),
                    Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomRight,
                          end: Alignment.topLeft,
                          colors: [Colors.black54, Colors.transparent],
                          stops: [0.0, 0.7],
                        ),
                      ),
                    ),
                    if (isDisabled)
                      Container(
                        color: Colors.black.withOpacity(0.55),
                        child: const Center(
                          child: Icon(
                            Icons.lock,
                            color: Colors.white70,
                            size: 48,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  String _nameFromPath(String pathOrName) {
    if (!pathOrName.contains('/')) {
      final regex = RegExp(r'\.(png|jpg|jpeg|webp)$', caseSensitive: false);
      return pathOrName.replaceAll(regex, '');
    }
    final last = pathOrName.split('/').last;
    return last.split('.').first;
  }
}
