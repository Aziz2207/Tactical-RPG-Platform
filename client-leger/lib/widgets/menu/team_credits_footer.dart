import 'package:client_leger/utils/constants/fonts/fonts-family.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class TeamCreditsFooter extends StatelessWidget {
  const TeamCreditsFooter({super.key, required this.teamMembers});

  final List<String> teamMembers;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        children: [
          Text(
            'FOOTER.TEAM'.tr(),
            style: TextStyle(
              fontFamily: FontFamily.PAPYRUS,
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4.0),
            child: Wrap(
              alignment: WrapAlignment.center,
              children: [
                for (int i = 0; i < teamMembers.length; i++) ...[
                  Text(
                    teamMembers[i] + (i < teamMembers.length - 1 ? ', ' : ''),
                    style: const TextStyle(
                      fontFamily: FontFamily.PAPYRUS,
                      color: Colors.white,
                      fontSize: 17.02,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
