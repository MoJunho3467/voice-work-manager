package expo.modules.androidalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.PowerManager
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale

internal object AlarmRuntime {
  const val ALARM_CHANNEL = "native-task-alarm-v3"
  const val VOICE_CHANNEL = "native-task-voice-v2"

  fun stop(context: Context, requestCode: Int) {
    (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(requestCode)
    AlarmActivity.stopActive()
  }
}

class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val requestCode = intent.getIntExtra(AlarmScheduler.EXTRA_REQUEST_CODE, 0)
    val title = intent.getStringExtra(AlarmScheduler.EXTRA_TITLE) ?: "업무 알림"
    val message = intent.getStringExtra(AlarmScheduler.EXTRA_MESSAGE) ?: "업무 시간입니다."
    val mode = intent.getStringExtra(AlarmScheduler.EXTRA_MODE) ?: "voice"

    when (intent.action) {
      AlarmScheduler.ACTION_STOP -> {
        AlarmScheduler.cancel(context, requestCode, true)
        return
      }
      AlarmScheduler.ACTION_SNOOZE -> {
        AlarmRuntime.stop(context, requestCode)
        AlarmScheduler.schedule(
          context,
          requestCode,
          System.currentTimeMillis() + 10 * 60_000L,
          title,
          "10분 미룬 알림입니다. $message",
          mode,
          true,
        )
        return
      }
    }

    createChannels(context)
    if (mode == "alarm") {
      showNotification(context, requestCode, title, message, mode)
    } else {
      showNotification(context, requestCode, title, message, mode)
      speak(context, requestCode, message)
    }
  }

  private fun actionIntent(
    context: Context,
    action: String,
    requestCode: Int,
    title: String,
    message: String,
    mode: String,
  ): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(action)
      .putExtra(AlarmScheduler.EXTRA_REQUEST_CODE, requestCode)
      .putExtra(AlarmScheduler.EXTRA_TITLE, title)
      .putExtra(AlarmScheduler.EXTRA_MESSAGE, message)
      .putExtra(AlarmScheduler.EXTRA_MODE, mode)
    val actionCode = if (action == AlarmScheduler.ACTION_STOP) requestCode xor 0x51a7 else requestCode xor 0x72b9
    return PendingIntent.getBroadcast(
      context,
      actionCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun showNotification(
    context: Context,
    requestCode: Int,
    title: String,
    message: String,
    mode: String,
  ) {
    val stop = actionIntent(context, AlarmScheduler.ACTION_STOP, requestCode, title, message, mode)
    val snooze = actionIntent(context, AlarmScheduler.ACTION_SNOOZE, requestCode, title, message, mode)
    val openIntent = AlarmActivity.intent(
      context,
      AlarmRecord(requestCode, System.currentTimeMillis(), title, message, mode),
    )
    val open = PendingIntent.getActivity(
      context,
      requestCode xor 0x35a91,
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val channelId = if (mode == "alarm") AlarmRuntime.ALARM_CHANNEL else AlarmRuntime.VOICE_CHANNEL
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, channelId)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context)
    }
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(if (mode == "alarm") "⏰ $title" else title)
      .setContentText(message)
      .setStyle(Notification.BigTextStyle().bigText(message))
      .setPriority(Notification.PRIORITY_MAX)
      .setCategory(if (mode == "alarm") Notification.CATEGORY_ALARM else Notification.CATEGORY_REMINDER)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setAutoCancel(mode != "alarm")
      .setOngoing(mode == "alarm")
      .setContentIntent(open)
      .addAction(Notification.Action.Builder(null, "끄기", stop).build())
      .addAction(Notification.Action.Builder(null, "10분 미루기", snooze).build())

    if (mode == "alarm") builder.setFullScreenIntent(open, true)

    val notification = builder.build()
    if (mode == "alarm") {
      notification.flags = notification.flags or Notification.FLAG_INSISTENT or Notification.FLAG_NO_CLEAR
    }
    (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
      .notify(requestCode, notification)
  }

  private fun createChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    val alarm = NotificationChannel(
      AlarmRuntime.ALARM_CHANNEL,
      "강한 업무 알람",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "전체 화면과 반복 소리로 울리는 업무 알람"
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 700, 300, 700, 300, 700)
      setSound(null, null)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    val voice = NotificationChannel(
      AlarmRuntime.VOICE_CHANNEL,
      "음성 업무 안내",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "앱이 닫혀 있어도 일정 내용을 한국어로 읽는 알림"
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 250, 250, 250)
      setSound(null, null)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(alarm)
    manager.createNotificationChannel(voice)
  }

  private fun speak(context: Context, requestCode: Int, message: String) {
    val pendingResult = goAsync()
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "voicework:tts")
    wakeLock.acquire(30_000L)
    var engine: TextToSpeech? = null

    fun finish() {
      try { engine?.shutdown() } catch (_: Exception) {}
      if (wakeLock.isHeld) wakeLock.release()
      pendingResult.finish()
    }

    engine = TextToSpeech(context.applicationContext) { status ->
      if (status == TextToSpeech.SUCCESS) {
        engine?.language = Locale.KOREAN
        engine?.setSpeechRate(0.9f)
        engine?.setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build(),
        )
        engine?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
          override fun onStart(utteranceId: String?) = Unit
          override fun onDone(utteranceId: String?) = finish()
          @Deprecated("Deprecated in Java")
          override fun onError(utteranceId: String?) = finish()
        })
        engine?.speak(message, TextToSpeech.QUEUE_FLUSH, null, "voice-work-$requestCode")
      } else {
        finish()
      }
    }
  }
}

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val now = System.currentTimeMillis()
    AlarmStore.all(context).forEach { record ->
      if (record.atMillis > now) {
        AlarmScheduler.schedule(
          context,
          record.requestCode,
          record.atMillis,
          record.title,
          record.message,
          record.mode,
          false,
        )
      } else {
        AlarmStore.remove(context, record.requestCode)
      }
    }
  }
}
