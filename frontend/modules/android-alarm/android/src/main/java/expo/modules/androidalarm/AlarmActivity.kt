package expo.modules.androidalarm

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AlarmActivity : Activity() {
  private var requestCode = 0
  private var title = "업무 알람"
  private var message = "업무 시간입니다."
  private var mode = "alarm"
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    showOverLockScreen()
    readExtras(intent)
    setContentView(buildContent())
    active = this
    startAlarm()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    readExtras(intent)
    setContentView(buildContent())
    startAlarm()
  }

  private fun readExtras(intent: Intent) {
    requestCode = intent.getIntExtra(AlarmScheduler.EXTRA_REQUEST_CODE, 0)
    title = intent.getStringExtra(AlarmScheduler.EXTRA_TITLE) ?: "업무 알람"
    message = intent.getStringExtra(AlarmScheduler.EXTRA_MESSAGE) ?: "업무 시간입니다."
    mode = intent.getStringExtra(AlarmScheduler.EXTRA_MODE) ?: "alarm"
  }

  private fun showOverLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    window.statusBarColor = Color.rgb(36, 20, 71)
    window.navigationBarColor = Color.rgb(59, 33, 109)
  }

  private fun rounded(color: Int, radius: Float, strokeColor: Int? = null): GradientDrawable =
    GradientDrawable().apply {
      setColor(color)
      cornerRadius = radius
      if (strokeColor != null) setStroke(dp(1), strokeColor)
    }

  private fun label(textValue: String, size: Float, color: Int, bold: Boolean = false) =
    TextView(this).apply {
      text = textValue
      textSize = size
      setTextColor(color)
      gravity = Gravity.CENTER
      includeFontPadding = false
      if (bold) setTypeface(typeface, Typeface.BOLD)
    }

  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

  private fun reminderLabel(): String {
    if (message.contains("미룬 알람")) return "다시 울림"
    val minutes = Regex("(\\d+)\\s*분\\s*전").find(message)?.groupValues?.getOrNull(1)
    return if (minutes != null) "${minutes}분 전 알림" else "예약된 알림"
  }

  private fun buildContent(): LinearLayout {
    val white = Color.WHITE
    val lavender = Color.rgb(218, 207, 255)
    val deepPurple = Color.rgb(55, 29, 116)
    val rootBackground = GradientDrawable(
      GradientDrawable.Orientation.TOP_BOTTOM,
      intArrayOf(Color.rgb(36, 20, 71), Color.rgb(59, 33, 109)),
    )

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(28), dp(34), dp(28), dp(28))
      background = rootBackground

      addView(label("강한 알람", 17f, lavender, true))
      addView(
        label(SimpleDateFormat("a h:mm", Locale.KOREAN).format(Date()), 54f, white, true),
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(88)).apply { topMargin = dp(20) },
      )
      addView(
        label(SimpleDateFormat("M월 d일 EEEE", Locale.KOREAN).format(Date()), 18f, lavender),
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(40)),
      )

      addView(View(context), LinearLayout.LayoutParams(1, 0, 0.8f))

      addView(label(title, 29f, white, true))
      addView(
        label(reminderLabel(), 17f, lavender),
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(42)).apply { topMargin = dp(8) },
      )

      addView(View(context), LinearLayout.LayoutParams(1, 0, 1.2f))

      addView(LinearLayout(context).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER
        addView(label("10분 미루기", 17f, white, true).apply {
          background = rounded(Color.TRANSPARENT, dp(20).toFloat(), Color.rgb(203, 190, 240))
          setOnClickListener { snooze() }
        }, LinearLayout.LayoutParams(0, dp(68), 1f).apply { marginEnd = dp(7) })
        addView(label("알람 끄기", 17f, deepPurple, true).apply {
          background = rounded(white, dp(20).toFloat())
          setOnClickListener { dismissAlarm() }
        }, LinearLayout.LayoutParams(0, dp(68), 1f).apply { marginStart = dp(7) })
      }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(68)))
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      root.setOnApplyWindowInsetsListener { view, insets ->
        val bars = insets.getInsets(WindowInsets.Type.systemBars())
        view.setPadding(dp(28), dp(24) + bars.top, dp(28), dp(20) + bars.bottom)
        insets
      }
    }
    return root
  }

  private fun dismissAlarm() {
    stopAlarm()
    AlarmScheduler.cancel(this, requestCode, true)
    finishAndRemoveTask()
  }

  private fun snooze() {
    stopAlarm()
    AlarmRuntime.stop(this, requestCode)
    AlarmScheduler.schedule(this, requestCode, System.currentTimeMillis() + 10 * 60_000L, title, "10분 미룬 알람입니다.", mode, true)
    finishAndRemoveTask()
  }

  private fun startAlarm() {
    if (mode != "alarm" || player?.isPlaying == true) return
    wakeLock = (getSystemService(POWER_SERVICE) as PowerManager).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "voicework:alarm-activity").apply { acquire(30 * 60_000L) }
    val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM) ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    try {
      player = MediaPlayer().apply {
        setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
        setDataSource(this@AlarmActivity, uri)
        isLooping = true
        prepare()
        start()
      }
    } catch (_: Exception) { player?.release(); player = null }
    vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      getSystemService(VIBRATOR_SERVICE) as Vibrator
    }
    val pattern = longArrayOf(0, 800, 350, 800, 350)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
    else {
      @Suppress("DEPRECATION")
      vibrator?.vibrate(pattern, 0)
    }
  }

  private fun stopAlarm() {
    player?.run { try { stop() } catch (_: Exception) {}; release() }
    player = null
    vibrator?.cancel()
    vibrator = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    (getSystemService(NOTIFICATION_SERVICE) as android.app.NotificationManager).cancel(requestCode)
  }

  override fun onDestroy() {
    stopAlarm()
    if (active === this) active = null
    super.onDestroy()
  }

  companion object {
    private var active: AlarmActivity? = null
    internal fun stopActive() {
      active?.runOnUiThread { active?.stopAlarm(); active?.finishAndRemoveTask() }
    }
    internal fun intent(context: Context, record: AlarmRecord) =
      Intent(context, AlarmActivity::class.java)
        .putExtra(AlarmScheduler.EXTRA_REQUEST_CODE, record.requestCode)
        .putExtra(AlarmScheduler.EXTRA_TITLE, record.title)
        .putExtra(AlarmScheduler.EXTRA_MESSAGE, record.message)
        .putExtra(AlarmScheduler.EXTRA_MODE, record.mode)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
  }
}