import 'package:client_leger/services/singleton/service-locator.dart';
import 'package:client_leger/services/socket/socket_service.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';

class BalancePill extends StatefulWidget {
  const BalancePill({super.key});

  @override
  State<BalancePill> createState() => _BalancePillState();
}

class _BalancePillState extends State<BalancePill> {
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetch();
    // Listen to server balance updates to keep UI fresh
    SocketService.I.on('balanceUpdated', (data) {
      try {
        final b = (data is Map && data['balance'] is num)
            ? (data['balance'] as num).toInt()
            : null;
        if (b != null) {
          final current = ServiceLocator.userAccount.accountDetails.value;
          if (current != null) {
            ServiceLocator.userAccount.accountDetails.value = {
              ...current,
              'balance': b,
            };
          }
        }
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    SocketService.I.off('balanceUpdated');
    super.dispose();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ServiceLocator.userAccount.getBalance();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemePalette>(
      valueListenable: ThemeConfig.palette,
      builder: (context, palette, __) {
        return ValueListenableBuilder<Map<String, dynamic>?>(
          valueListenable: ServiceLocator.userAccount.accountDetails,
          builder: (context, details, _) {
            final balance = (details?['balance'] as num?)?.toInt();

            final Color baseDark = palette.secondaryVeryDark.withOpacity(0.72);
            final Color themeTint = palette.primary.withOpacity(0.7);
            final Color bgColor = Color.alphaBlend(themeTint, baseDark);
            final Color borderColor = Color.lerp(
              palette.primary,
              Colors.white,
              0.7,
            )!.withOpacity(0.38);
            final textStyle = TextStyle(
              color: palette.mainTextColor,
              fontWeight: FontWeight.bold,
              fontFamily: 'Papyrus',
              fontSize: 24,
            );

            Widget content;
            if (_loading && balance == null) {
              content = SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: palette.mainTextColor,
                ),
              );
            } else if (_error != null && balance == null) {
              content = Text('-- \$', style: textStyle);
            } else {
              content = Text('${balance ?? 0} \$', style: textStyle);
            }

            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: borderColor, width: 1),
                boxShadow: [
                  BoxShadow(
                    color: palette.primaryBoxShadow.withOpacity(0.28),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: content,
            );
          },
        );
      },
    );
  }
}
