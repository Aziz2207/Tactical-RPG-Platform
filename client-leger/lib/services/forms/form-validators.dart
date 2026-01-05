import 'package:easy_localization/easy_localization.dart';

typedef Validator = String? Function();

class FormValidators {
  static String? validateAvatarSelected(bool selected) {
    return !selected ? "ERROR.MISSING_AVATAR".tr() : null;
  }

  static String? runAll(List<Validator> validators) {
    for (final validator in validators) {
      final error = validator();
      if (error != null) return error;
    }
    return null;
  }

  static String? validateStats({
    required bool isSpeedOrLifeSelected,
    required bool isAttackOrDefenseSelected,
  }) {
    if (!isSpeedOrLifeSelected || !isAttackOrDefenseSelected) {
      return "ERROR.MISSING_ATTRIBUTES".tr();
    }
    return null;
  }
}
