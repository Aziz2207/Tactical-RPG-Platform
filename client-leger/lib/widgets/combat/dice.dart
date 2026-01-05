import 'package:flutter/material.dart';
// import 'dart:math' as math;

class DiceWidget extends StatefulWidget {
  final int value;

  const DiceWidget({Key? key, required this.value}) : super(key: key);

  @override
  State<DiceWidget> createState() => _DiceWidgetState();
}

class _DiceWidgetState extends State<DiceWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _rollController;
  // late Animation<double> _rotationX;
  // late Animation<double> _rotationY;
  // late Animation<double> _rotationZ;
  bool isRolling = false;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
  }

  void _initializeAnimations() {
    _rollController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    // Multiple rotations for rolling effect
    // _rotationX = Tween<double>(
    //   begin: 0,
    //   end: math.pi * 4,
    // ).animate(_rollController);
    // _rotationY = Tween<double>(
    //   begin: 0,
    //   end: math.pi * 4,
    // ).animate(_rollController);
    // _rotationZ = Tween<double>(
    //   begin: 0,
    //   end: math.pi * 4,
    // ).animate(_rollController);

    _isInitialized = true;
  }

  @override
  void dispose() {
    if (_isInitialized) {
      _rollController.dispose();
    }
    super.dispose();
  }

  void rollDice() {
    if (!_isInitialized || isRolling) return;
    setState(() {
      isRolling = true;
    });

    _rollController.forward(from: 0).then((_) {
      if (mounted) {
        setState(() {
          isRolling = false;
        });
      }
    });
  }

  // Map<String, double> _getRotationForValue(int value) {
  //   switch (value) {
  //     case 1:
  //       return {'x': 0, 'y': 0, 'z': 0};
  //     case 2:
  //       return {'x': math.pi / 2, 'y': 0, 'z': 0}; // -90 degrees X
  //     case 3:
  //       return {'x': 0, 'y': -math.pi / 2, 'z': 0}; // 90 degrees Y
  //     case 4:
  //       return {'x': 0, 'y': -math.pi / 2, 'z': 0}; // -90 degrees Y
  //     case 5:
  //       return {'x': math.pi / 2, 'y': 0, 'z': 0}; // 90 degrees X
  //     case 6:
  //       return {'x': math.pi, 'y': 0, 'z': 0}; // 180 degrees X
  //     default:
  //       return {'x': 0, 'y': 0, 'z': 0};
  //   }
  // }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized) {
      return const SizedBox(
        width: 100,
        height: 100,
        child: Center(child: CircularProgressIndicator()),
      );
    }

    return GestureDetector(
      onTap: rollDice,
      child: SizedBox(
        width: 150,
        height: 150,
        child: AnimatedBuilder(
          animation: _rollController,
          builder: (context, child) {
            // final rotation = isRolling ? _rotationZ.value : 0.0;

            //         final rotation = isRolling
            // ? {'x': _rotationX.value, 'y': _rotationY.value, 'z': _rotationZ.value}
            // : _getRotationForValue(widget.value);

            return Transform(
              alignment: Alignment.center,
              transform: Matrix4.identity()
                ..setEntry(3, 2, 0.001), // perspective
              // ..rotateX(rotation['x']!)
              // ..rotateY(rotation['y']!)
              // ..rotateZ(rotation['z']!),
              child: _build3DDice(),
            );
          },
        ),
      ),
    );
  }

  Widget _build3DDice() {
    const double size = 100;
    // const double halfSize = size / 2;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          // Face 1 (Front)
          Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity(),
            // ..setEntry(3, 2, 0.001)
            // ..translate(0.0, 0.0, halfSize),
            child: _buildFace(1, size),
          ),
          // Face 2 (Top)
          Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity(),
            // ..setEntry(3, 2, 0.001)
            // ..rotateX(math.pi / 2),
            // ..rotateX(-math.pi)
            // ..rotateY(0)
            // ..rotateZ(0),
            // ..translate(0.0, 0.0, halfSize),
            child: _buildFace(2, size),
          ),
          // Face 3 (Right)
          Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity(),
            // ..setEntry(3, 2, 0.001)
            // ..rotateY(-math.pi / 2),
            // ..rotateX(0)
            // ..rotateY(math.pi / 2)
            // ..rotateZ(0),
            // ..translate(0.0, 0.0, halfSize),
            child: _buildFace(3, size),
          ),
          // Face 4 (Left)
          Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity(),
            // ..setEntry(3, 2, 0.001)
            // ..rotateY(math.pi / 2)
            // ..translate(0.0, 0.0, halfSize),
            child: _buildFace(4, size),
          ),
          // Face 5 (Bottom)
          Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity(),
            // ..setEntry(3, 2, 0.001)
            // ..rotateX(-math.pi / 2)
            // ..translate(0.0, 0.0, halfSize),
            child: _buildFace(5, size),
          ),
          // Face 6 (Back)
          Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity(),
            // ..setEntry(3, 2, 0.001)
            // ..rotateY(math.pi)
            // ..translate(0.0, 0.0, halfSize),
            child: _buildFace(6, size),
          ),
        ],
      ),
    );
  }

  Widget _buildFace(int faceValue, double size) {
    String imagePath = 'assets/images/dice/dice${widget.value}.png';

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.black, width: 2),
        color: Colors.white,
        image: DecorationImage(image: AssetImage(imagePath), fit: BoxFit.cover),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
    );
  }
}
