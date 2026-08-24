package expo.modules.androidalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONObject

internal data class AlarmRecord(
  val requestCode: Int,
  val atMillis: Long,
  val title: String,
  val message: String,
  val mode: String,
)

internal object AlarmStore {
  private const val PREFS = "voice_work_native_alarms"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun put(context: Context, record: AlarmRecord) {
    val json = JSONObject()
      .put("requestCode", record.requestCode)
      .put("atMillis", record.atMillis)
      .put("title", record.title)
      .put("message", record.message)
      .put("mode", record.mode)
    prefs(context).edit().putString(record.requestCode.toString(), json.toString()).apply()
  }

  fun remove(context: Context, requestCode: Int) {
    prefs(context).edit().remove(requestCode.toString()).apply()
  }

  fun all(context: Context): List<AlarmRecord> = prefs(context).all.values.mapNotNull { raw ->
    try {
      val json = JSONObject(raw as String)
      AlarmRecord(
        json.getInt("requestCode"),
        json.getLong("atMillis"),
        json.getString("title"),
        json.getString("message"),
        json.getString("mode"),
      )
    } catch (_: Exception) {
      null
    }
  }
}

internal object AlarmScheduler {
  const val ACTION_FIRE = "expo.modules.androidalarm.FIRE"
  const val ACTION_STOP = "expo.modules.androidalarm.STOP"
  const val ACTION_SNOOZE = "expo.modules.androidalarm.SNOOZE"
  const val EXTRA_REQUEST_CODE = "requestCode"
  const val EXTRA_TITLE = "title"
  const val EXTRA_MESSAGE = "message"
  const val EXTRA_MODE = "mode"

  private fun pendingIntent(context: Context, record: AlarmRecord, flags: Int): PendingIntent? {
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(ACTION_FIRE)
      .putExtra(EXTRA_REQUEST_CODE, record.requestCode)
      .putExtra(EXTRA_TITLE, record.title)
      .putExtra(EXTRA_MESSAGE, record.message)
      .putExtra(EXTRA_MODE, record.mode)
    return PendingIntent.getBroadcast(
      context,
      record.requestCode,
      intent,
      flags or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  fun schedule(
    context: Context,
    requestCode: Int,
    atMillis: Long,
    title: String,
    message: String,
    mode: String,
    persist: Boolean,
  ) {
    val record = AlarmRecord(requestCode, atMillis, title, message, mode)
    val pending = pendingIntent(context, record, PendingIntent.FLAG_UPDATE_CURRENT) ?: return
    val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms()

    if (exactAllowed && mode == "alarm") {
      val showIntent = PendingIntent.getActivity(
        context,
        requestCode xor 0x35a91,
        AlarmActivity.intent(context, record),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      manager.setAlarmClock(AlarmManager.AlarmClockInfo(atMillis, showIntent), pending)
    } else if (exactAllowed) {
      manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pending)
    } else {
      manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pending)
    }

    if (persist) AlarmStore.put(context, record)
  }

  fun cancel(context: Context, requestCode: Int, removeStored: Boolean) {
    val record = AlarmRecord(requestCode, 0, "", "", "voice")
    val pending = pendingIntent(context, record, PendingIntent.FLAG_NO_CREATE)
    if (pending != null) {
      (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pending)
      pending.cancel()
    }
    AlarmRuntime.stop(context, requestCode)
    if (removeStored) AlarmStore.remove(context, requestCode)
  }
}
