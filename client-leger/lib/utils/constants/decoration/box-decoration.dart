import 'package:flutter/material.dart';

const kBoxDecoration = BoxDecoration(
  borderRadius: BorderRadius.all(Radius.circular(20)),
  gradient: LinearGradient(
    begin: Alignment.bottomCenter,
    end: Alignment.topCenter,
    colors: [Color(0xFF121211), Color(0xFF2C2C2C), Color(0xFFB8A97A)],
    stops: [0.0, 0.5, 1.0],
  ),
);

const kAuthenticateDecoration = BoxDecoration(
  gradient: LinearGradient(
    begin: Alignment.centerRight,
    end: Alignment.centerLeft,
    colors: [Color.fromRGBO(51, 48, 39, 1), Color.fromRGBO(39, 39, 39, 1)],
  ),
);

// final kButtonDecoration = BoxDecoration(
//   gradient: LinearGradient(
//     colors: [Color.fromRGBO(89, 78, 50, 1), Color.fromARGB(255, 97, 84, 48)],
//     begin: Alignment.centerLeft,
//     end: Alignment.centerRight,
//   ),
//   borderRadius: BorderRadius.circular(8),
// );

final kButtonDecoration = BoxDecoration(
  gradient: LinearGradient(
    colors: [
      Color.fromARGB(255, 245, 230, 152),
      Color.fromARGB(255, 237, 210, 92)
    ],
    stops: [0.0, 1.0],
    begin: Alignment(-0.5, -1.0),
    end: Alignment(0.5, 1.0),
  ),
  borderRadius: BorderRadius.circular(100),
  border: Border.all(color: Color.fromARGB(255, 255, 245, 195), width: 2.0),
  boxShadow: [
    // Magical glow
    BoxShadow(
      color: Color.fromRGBO(255, 243, 177, 0.6),
      blurRadius: 10,
      spreadRadius: 3,
      offset: Offset(0, 0),
    ),
    // Deep shadow
    BoxShadow(
      color: Color(0xFF4A4A4A).withOpacity(0.8),
      blurRadius: 12,
      spreadRadius: 1,
      offset: Offset(0, 6),
    ),
    // Inner highlight
    BoxShadow(
      color: Color(0xFFFFFFF0).withOpacity(0.9),
      blurRadius: 4,
      spreadRadius: -4,
      offset: Offset(0, -3),
    ),
    // Side accent
    BoxShadow(
      color: Color(0xFFFF6347).withOpacity(0.3),
      blurRadius: 8,
      spreadRadius: -1,
      offset: Offset(-3, 0),
    ),
  ],
);

const kChatBackgroundGradient = BoxDecoration(
  gradient: LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color.fromRGBO(35, 33, 33, 1),
      Color.fromRGBO(34, 30, 30, 0.929),
      Color.fromRGBO(44, 39, 39, 0.859),
      Color.fromRGBO(58, 55, 55, 0.788),
    ],
    stops: [0.0, 0.33, 0.67, 1.0],
  ),
);

