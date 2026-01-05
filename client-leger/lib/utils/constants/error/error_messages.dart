class ErrorMessages {
  String lengthEmailError = '';
  String lengthPasswordError = '';
  String lengthPseudoError = '';
  String spaceEmailError = '';
  String spacePasswordError = '';
  String spacePseudoError = '';
  String authenticationError = '';

  void clearSpaceErrors() {
    spaceEmailError = '';
    spacePasswordError = '';
    spacePseudoError = '';
  }

  void clearLengthErrors() {
    lengthEmailError = '';
    lengthPasswordError = '';
    lengthPseudoError = '';
  }
}
