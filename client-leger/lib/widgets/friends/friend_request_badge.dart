import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:flutter/material.dart';

class FriendRequestBadge extends StatelessWidget {
  const FriendRequestBadge({super.key, required this.count, this.size = 22});

  final int? count; // null -> loading spinner
  final double size;

  @override
  Widget build(BuildContext context) {
    if (count == null) {
      return SizedBox(
        width: size,
        height: size,
        child: const CircularProgressIndicator(
          strokeWidth: 2.5,
          color: Colors.red,
        ),
      );
    }
    if ((count ?? 0) <= 0) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.red,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(color: Colors.black54, blurRadius: 4, offset: Offset(0, 2)),
        ],
      ),
      child: Text(
        '${count ?? 0}',
        style: const TextStyle(
          color: Colors.white,
          fontFamily: FontFamily.PAPYRUS,
          fontWeight: FontWeight.bold,
          fontSize: 16,
        ),
      ),
    );
  }
}
