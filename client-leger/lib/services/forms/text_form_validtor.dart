class TextFormValidator {
  static String? validateInput(
    String? value,
    int nMinCharacter,
    int nMaxCharacter,
    String typeOfInput,
  ) {
    if (value == null || value.isEmpty) {
      return 'Le $typeOfInput est requis';
    }
    if (value.contains(' ')) {
      return 'Le $typeOfInput ne doit pas contenir d\'espaces';
    }
    if (value.length < nMinCharacter) {
      return 'Le $typeOfInput doit contenir au moins $nMinCharacter caractères';
    }

    if (value.length > nMaxCharacter) {
      return 'Le $typeOfInput ne doit pas dépasser $nMaxCharacter caractères';
    }

    return null;
  }

  static String validateLengthInput(int maxLength) {
    return 'Limite de $maxLength caractères atteinte';
  }

  static void handleMaxLengthInput(
    String inputValue,
    void Function(String) setError,
    int maxLength,
  ) {
    if (inputValue.length >= maxLength) {
      setError(validateLengthInput(maxLength));
    } else {
      setError('');
    }
  }
}
