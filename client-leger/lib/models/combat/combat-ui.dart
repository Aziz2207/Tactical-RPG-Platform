class CombatUIEvent {
  final String? title;
  final String? message;
  final int durationMs;
  final bool showOkButton;
  final bool closeModal;

  CombatUIEvent({
    this.title,
    this.message,
    this.durationMs = 2500,
    this.showOkButton = true,
    this.closeModal = false,
  });
}
