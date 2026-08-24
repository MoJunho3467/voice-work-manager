import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Field, colors, s } from "./UI";
import { pad } from "../utils/date";

export type DateTimeValue = {
  date: string;
  hour: number;
  minute: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const parseDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T12:00:00`).getTime());

export function DateTimeFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DateTimeValue;
  onChange: (next: DateTimeValue) => void;
}) {
  const isPm = value.hour >= 12;
  const hour12 = value.hour % 12 || 12;

  // 숫자 state와 별도로 입력 중인 문자열을 보관한다.
  // 따라서 사용자가 입력값을 전부 지워도 바로 0이 들어오지 않는다.
  const [hourText, setHourText] = useState(String(hour12));
  const [minuteText, setMinuteText] = useState(pad(value.minute));

  // 부모에서 시간이 실제로 변경된 경우 입력창에도 반영한다.
  useEffect(() => {
    setHourText(String(hour12));
  }, [value.hour]);

  useEffect(() => {
    setMinuteText(pad(value.minute));
  }, [value.minute]);

  const setMeridiem = (pm: boolean) => {
    onChange({
      ...value,
      hour: (hour12 % 12) + (pm ? 12 : 0),
    });
  };

  const changeHourText = (raw: string) => {
    // 숫자만 허용하고 최대 두 자리까지만 입력
    const cleaned = raw.replace(/[^0-9]/g, "").slice(0, 2);
    setHourText(cleaned);
  };

  const changeMinuteText = (raw: string) => {
    // 숫자만 허용하고 최대 두 자리까지만 입력
    const cleaned = raw.replace(/[^0-9]/g, "").slice(0, 2);
    setMinuteText(cleaned);
  };

  const commitHour = () => {
    // 빈칸이면 기존 시간으로 복구
    if (hourText === "") {
      setHourText(String(hour12));
      return;
    }

    const nextHour12 = clamp(Number(hourText), 1, 12);
    const nextHour24 = (nextHour12 % 12) + (isPm ? 12 : 0);

    setHourText(String(nextHour12));

    if (nextHour24 !== value.hour) {
      onChange({
        ...value,
        hour: nextHour24,
      });
    }
  };

  const commitMinute = () => {
    // 빈칸이면 기존 분으로 복구
    if (minuteText === "") {
      setMinuteText(pad(value.minute));
      return;
    }

    const nextMinute = clamp(Number(minuteText), 0, 59);

    setMinuteText(pad(nextMinute));

    if (nextMinute !== value.minute) {
      onChange({
        ...value,
        minute: nextMinute,
      });
    }
  };

  return (
    <Field label={label}>
      <View style={[s.card, { gap: 10 }]}>
        <Text style={s.label}>날짜</Text>

        <TextInput
          style={s.input}
          value={value.date}
          onChangeText={(date) => onChange({ ...value, date })}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />

        {!parseDate(value.date) && (
          <Text style={{ color: colors.danger }}>
            날짜를 YYYY-MM-DD 형식으로 입력해주세요.
          </Text>
        )}

        <Text style={s.label}>시간</Text>

        <View style={s.row}>
          <Pressable
            onPress={() => setMeridiem(false)}
            style={[s.choice, !isPm && s.choiceActive]}
          >
            <Text style={!isPm ? s.choiceTextActive : s.choiceText}>오전</Text>
          </Pressable>

          <Pressable
            onPress={() => setMeridiem(true)}
            style={[s.choice, isPm && s.choiceActive]}
          >
            <Text style={isPm ? s.choiceTextActive : s.choiceText}>오후</Text>
          </Pressable>
        </View>

        <View style={s.row}>
          <TextInput
            style={[s.input, { flex: 1, textAlign: "center" }]}
            keyboardType="number-pad"
            value={hourText}
            onChangeText={changeHourText}
            onBlur={commitHour}
            maxLength={2}
            selectTextOnFocus
          />

          <Text style={s.h2}>시</Text>

          <TextInput
            style={[s.input, { flex: 1, textAlign: "center" }]}
            keyboardType="number-pad"
            value={minuteText}
            onChangeText={changeMinuteText}
            onBlur={commitMinute}
            maxLength={2}
            selectTextOnFocus
          />

          <Text style={s.h2}>분</Text>
        </View>
      </View>
    </Field>
  );
}

export function isValidDateTime(value: DateTimeValue) {
  return (
    parseDate(value.date) &&
    value.hour >= 0 &&
    value.hour <= 23 &&
    value.minute >= 0 &&
    value.minute <= 59
  );
}
