package expo.modules.androidalarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AndroidAlarmModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidAlarm")

    AsyncFunction("schedule") { requestCode: Int, atMillis: Double, title: String, message: String, mode: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Android context is unavailable")
      AlarmScheduler.schedule(context, requestCode, atMillis.toLong(), title, message, mode, true)
      "native:$requestCode"
    }

    AsyncFunction("cancel") { requestCode: Int ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("Android context is unavailable")
      AlarmScheduler.cancel(context, requestCode, true)
    }

    AsyncFunction("canScheduleExactAlarms") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("Android context is unavailable")
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) true
      else (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms()
    }

    AsyncFunction("openExactAlarmSettings") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("Android context is unavailable")
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val intent = Intent(
          Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
          Uri.parse("package:${context.packageName}"),
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }

    AsyncFunction("canUseFullScreenIntent") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("Android context is unavailable")
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) true
      else (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()
    }

    AsyncFunction("openFullScreenIntentSettings") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("Android context is unavailable")
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        val intent = Intent(
          Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
          Uri.parse("package:${context.packageName}"),
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }
  }
}
