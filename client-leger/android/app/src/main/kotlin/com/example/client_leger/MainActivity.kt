package com.example.client_leger

import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.content.Context
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.embedding.engine.FlutterEngineCache
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    private val CHANNEL = "dynamic_icon"

    private val DEFAULT_ALIAS = "com.example.client_leger.MainActivityDefault"
    private val ALT_ALIAS = "com.example.client_leger.MainActivityAlt"
    private val ALT_ALIAS_2 = "com.example.client_leger.MainActivityAlt2"

    override fun provideFlutterEngine(context: Context): FlutterEngine? {
        return FlutterEngineCache.getInstance().get("persistent_engine")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val engine = FlutterEngineCache.getInstance().get("persistent_engine")!!

        MethodChannel(
            engine.dartExecutor.binaryMessenger,
            CHANNEL
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "changeIcon" -> {
                    val iconName = call.argument<String>("iconName")
                    if (iconName != null) {
                        changeAppIcon(iconName)
                        result.success(null)
                    } else {
                        result.error("INVALID_ARGUMENT", "iconName required", null)
                    }
                }

                "getCurrentIcon" -> {
                    result.success(getCurrentIcon())
                }

                else -> result.notImplemented()
            }
        }
    }

    private fun changeAppIcon(iconName: String) {
    val pm = packageManager

    val enableAlias = when (iconName) {
        "default" -> DEFAULT_ALIAS
        "alt"     -> ALT_ALIAS
        "alt2"    -> ALT_ALIAS_2
        else      -> DEFAULT_ALIAS
    }

    val disableAliases = when (iconName) {
        "default" -> listOf(ALT_ALIAS, ALT_ALIAS_2)
        "alt"     -> listOf(DEFAULT_ALIAS, ALT_ALIAS_2)
        "alt2"    -> listOf(DEFAULT_ALIAS, ALT_ALIAS)
        else      -> listOf(ALT_ALIAS, ALT_ALIAS_2)
    }

    // Disable all others
    disableAliases.forEach { alias ->
        pm.setComponentEnabledSetting(
            ComponentName(this, alias),
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP
        )
    }

    // Enable the selected one
    pm.setComponentEnabledSetting(
        ComponentName(this, enableAlias),
        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
        PackageManager.DONT_KILL_APP
    )

    startActivity(Intent(this, GhostActivity::class.java))
}

    private fun getCurrentIcon(): String {
    val pm = packageManager

    return when {
        pm.getComponentEnabledSetting(
            ComponentName(this, ALT_ALIAS_2)
        ) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> "alt2"

        pm.getComponentEnabledSetting(
            ComponentName(this, ALT_ALIAS)
        ) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> "alt"

        else -> "default"
    }
}

}
