import 'package:client_leger/services/game/game-room-service.dart';
import 'package:client_leger/utils/theme/theme_config.dart';
import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:math' as math;

class CircularTimerWidget extends StatefulWidget {
  final int totalTimeInSeconds;
  final int warningTimeInSeconds;
  final VoidCallback? onTimerComplete;
  final VoidCallback? onTimerStart;
  final VoidCallback? onTimerPause;
  final GameRoomService gameRoomService;

  const CircularTimerWidget({
    Key? key,
    required this.totalTimeInSeconds,
    required this.gameRoomService,
    this.warningTimeInSeconds = 5,
    this.onTimerComplete,
    this.onTimerStart,
    this.onTimerPause,
  }) : super(key: key);

  @override
  State<CircularTimerWidget> createState() => _TimerState();
}

class _TimerState extends State<CircularTimerWidget>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  Timer? _timer;
  int _timeRemaining = 0;
  bool _isTimerRunning = false;
  int turnTime = 30;

  StreamSubscription? _timerSub;

  @override
  void initState() {
    super.initState();
    _bindToGameRoomService();
    _timeRemaining = widget.totalTimeInSeconds;
    _animationController = AnimationController(
      duration: Duration(seconds: widget.totalTimeInSeconds),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    _timerSub?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  void _bindToGameRoomService() {
    _timerSub = widget.gameRoomService.time$.listen((timer) {
      if (mounted) setState(() => turnTime = timer);
    });
  }

  void startTimer() {
    if (!_isTimerRunning && _timeRemaining > 0) {
      setState(() {
        _isTimerRunning = true;
      });

      _animationController.forward();
      widget.onTimerStart?.call();

      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        setState(() {
          _timeRemaining--;
        });

        if (_timeRemaining <= 0) {
          _stopTimer();
          widget.onTimerComplete?.call();
        }
      });
    }
  }

  void pauseTimer() {
    if (_isTimerRunning) {
      setState(() {
        _isTimerRunning = false;
      });
      _animationController.stop();
      _timer?.cancel();
      widget.onTimerPause?.call();
    }
  }

  void resetTimer() {
    _timer?.cancel();
    _animationController.reset();
    setState(() {
      _isTimerRunning = false;
      _timeRemaining = widget.totalTimeInSeconds;
    });
  }

  void _stopTimer() {
    _timer?.cancel();
    setState(() {
      _isTimerRunning = false;
      _timeRemaining = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final palette = ThemeConfig.palette.value;
    final bool isWarning = turnTime < widget.warningTimeInSeconds;
    double timerSize = 120;

    double computedProgress = (turnTime / widget.totalTimeInSeconds).clamp(
      0.0,
      1.0,
    );
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: timerSize,
          height: timerSize,
          child: Stack(
            alignment: Alignment.center,
            children: [
              SizedBox(
                width: timerSize,
                height: timerSize,
                child: AnimatedBuilder(
                  animation: _animationController,
                  builder: (context, child) {
                    return CustomPaint(
                      painter: CircularTimerPainter(
                        progress: computedProgress,
                        isWarning: isWarning,
                        primaryColor: palette.primary,
                      ),
                    );
                  },
                ),
              ),
              Text(
                turnTime.toString(),
                style: TextStyle(
                  fontSize: 32,
                  fontFamily: 'verdana',
                  fontWeight: FontWeight.bold,
                  color: isWarning ? const Color(0xFFf95e4d) : Colors.white,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 30),
      ],
    );
  }
}

class CircularTimerPainter extends CustomPainter {
  final double progress;
  final bool isWarning;
  final Color primaryColor;

  CircularTimerPainter({
    required this.progress,
    required this.isWarning,
    required this.primaryColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 10;

    final backgroundPaint = Paint()
      ..color = const Color(0xFF645959)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8;

    canvas.drawCircle(center, radius, backgroundPaint);

    final foregroundPaint = Paint()
      ..color = isWarning ? const Color(0xFFf95e4d) : primaryColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    const startAngle = -math.pi / 2;
    final sweepAngle = 2 * math.pi * progress;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      foregroundPaint,
    );
  }

  @override
  bool shouldRepaint(CircularTimerPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.isWarning != isWarning ||
        oldDelegate.primaryColor != primaryColor;
  }
}