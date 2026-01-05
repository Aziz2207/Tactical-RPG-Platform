import 'package:flutter/material.dart';

class ShopCard extends StatelessWidget {
  final String imageUrl;
  final String title;
  final String subtitle; // e.g., price text
  final bool useAsset;
  final BoxFit imageFit;
  final double cornerRadius;
  final double? imageAspectRatio; // width / height for image area when provided
  final double imageScale; // visual zoom (1.0 = no zoom)
  final int imageFlex; // relative height of image area in the card column
  final int detailsFlex; // relative height of text area in the card column
  final Widget?
  action; // optional action widget shown inside the card (e.g., buy button)
  final bool dimmed; // if true, visually dim the whole card (owned state)
  final String? badgeText; // optional top-left badge text (e.g., "Possédé")
  final Color badgeColor;
  final Color badgeTextColor;
  final bool centerAction; // center the action horizontally
  final bool actionFullWidth; // make action take full width

  const ShopCard({
    super.key,
    required this.imageUrl,
    required this.title,
    required this.subtitle,
    this.useAsset = false,
    this.imageFit = BoxFit.contain,
    this.cornerRadius = 48,
    this.imageAspectRatio,
    this.imageScale = 1.0,
    this.imageFlex = 3,
    this.detailsFlex = 2,
    this.action,
    this.dimmed = false,
    this.badgeText,
    this.badgeColor = const Color(0xFF2E7D32),
    this.badgeTextColor = Colors.white,
    this.centerAction = false,
    this.actionFullWidth = false,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeInOut,
      opacity: dimmed ? 0.6 : 1.0,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.6),
          borderRadius: BorderRadius.circular(cornerRadius),
          border: Border.all(color: Colors.white24),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Make image area smaller and avoid cropping
            Flexible(
              flex: imageFlex,
              child: ClipRRect(
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(cornerRadius),
                  topRight: Radius.circular(cornerRadius),
                ),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Container(
                      color: Colors.black45,
                      alignment: Alignment.center,
                      child: imageAspectRatio != null
                          ? AspectRatio(
                              aspectRatio: imageAspectRatio!,
                              child: Transform.scale(
                                scale: imageScale,
                                alignment: Alignment.center,
                                child: useAsset
                                    ? Image.asset(
                                        imageUrl,
                                        fit: imageFit,
                                        errorBuilder: (context, error, stack) =>
                                            const Icon(
                                              Icons.image_not_supported,
                                              color: Colors.white54,
                                            ),
                                      )
                                    : Image.network(
                                        imageUrl,
                                        fit: imageFit,
                                        errorBuilder: (context, error, stack) =>
                                            const Icon(
                                              Icons.image_not_supported,
                                              color: Colors.white54,
                                            ),
                                      ),
                              ),
                            )
                          : Transform.scale(
                              scale: imageScale,
                              alignment: Alignment.center,
                              child: useAsset
                                  ? Image.asset(
                                      imageUrl,
                                      fit: imageFit,
                                      errorBuilder: (context, error, stack) =>
                                          const Icon(
                                            Icons.image_not_supported,
                                            color: Colors.white54,
                                          ),
                                    )
                                  : Image.network(
                                      imageUrl,
                                      fit: imageFit,
                                      errorBuilder: (context, error, stack) =>
                                          const Icon(
                                            Icons.image_not_supported,
                                            color: Colors.white54,
                                          ),
                                    ),
                            ),
                    ),
                    if (badgeText != null && badgeText!.isNotEmpty)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: badgeColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            badgeText!,
                            style: TextStyle(
                              color: badgeTextColor,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Flexible(
              flex: detailsFlex,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 24,
                        fontFamily: 'Papyrus',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'Papyrus',
                      ),
                    ),
                    if (action != null) ...[
                      const SizedBox(height: 8),
                      if (actionFullWidth)
                        SizedBox(width: double.infinity, child: action!)
                      else if (centerAction)
                        Center(child: action!)
                      else
                        Align(alignment: Alignment.centerRight, child: action!),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
