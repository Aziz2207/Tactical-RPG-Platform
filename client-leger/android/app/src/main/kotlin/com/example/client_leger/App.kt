package com.example.client_leger

import android.app.Application
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.FlutterEngineCache
import io.flutter.embedding.engine.dart.DartExecutor

class App : Application() {

    override fun onCreate() {
        super.onCreate()

        // Create persistent engine
        val engine = FlutterEngine(this)
        engine.dartExecutor.executeDartEntrypoint(
            DartExecutor.DartEntrypoint.createDefault()
        )

        // Cache engine for MainActivity
        FlutterEngineCache
            .getInstance()
            .put("persistent_engine", engine)
    }
}
