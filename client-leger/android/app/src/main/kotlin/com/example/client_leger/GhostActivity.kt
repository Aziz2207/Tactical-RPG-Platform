package com.example.client_leger

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class GhostActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
