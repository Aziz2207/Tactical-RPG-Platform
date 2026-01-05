import 'package:flutter/material.dart';

final textInputDecoration = InputDecoration(
  fillColor: Color.fromRGBO(255, 255, 255, 0.05),
  filled: false,
  enabledBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(100),
    borderSide: BorderSide(color: Color.fromARGB(255, 255, 230, 161), width: 1.5),
  ),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(100),
    borderSide: BorderSide(color: Color.fromARGB(255, 255, 230, 161), width: 1.5),
  ),
);
