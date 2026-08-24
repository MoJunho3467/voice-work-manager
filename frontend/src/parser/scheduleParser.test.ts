import { describe, expect, it } from "vitest";
import { parseKoreanSchedule } from "./scheduleParser";

const now = new Date(2026, 7, 11, 12);

describe("한국어 일정 파서", () => {
  it("상대 날짜와 오후 시간", () =>
    expect(
      parseKoreanSchedule("내일 오후 7시에 거래처에 연락", now),
    ).toMatchObject({
      date: "2026-08-12",
      hour: 19,
      minute: 0,
      title: "거래처 연락",
      ambiguousMeridiem: false,
    }));
  it("모레 오전", () =>
    expect(
      parseKoreanSchedule("모레 오전 10시 견적서 보내기", now),
    ).toMatchObject({ date: "2026-08-13", hour: 10, title: "견적서 보내기" }));
  it("다음 주 요일", () =>
    expect(
      parseKoreanSchedule("다음 주 화요일 3시 거래처 전화", now),
    ).toMatchObject({
      date: "2026-08-18",
      hour: 3,
      ambiguousMeridiem: true,
      title: "거래처 전화",
    }));
  it("다음 주 월요일은 다음 달력 주", () =>
    expect(parseKoreanSchedule("다음 주 월요일 9시 보고", now)).toMatchObject({
      date: "2026-08-17",
    }));
  it("이번 주 월요일은 현재 달력 주", () =>
    expect(parseKoreanSchedule("이번 주 월요일 9시 보고", now)).toMatchObject({
      date: "2026-08-10",
    }));
  it("절대 날짜", () =>
    expect(
      parseKoreanSchedule("2026년 9월 1일 오후 5시 세금계산서 확인", now),
    ).toMatchObject({
      date: "2026-09-01",
      hour: 17,
      title: "세금계산서 확인",
    }));
  it("반 표현", () =>
    expect(
      parseKoreanSchedule("8월 15일 오후 2시 반 서류 제출", now),
    ).toMatchObject({ date: "2026-08-15", hour: 14, minute: 30 }));
  it("ISO와 24시간", () =>
    expect(parseKoreanSchedule("2026-08-15 14시 30분 회의", now)).toMatchObject(
      { date: "2026-08-15", hour: 14, minute: 30, title: "회의" },
    ));
  it("누락을 허용", () =>
    expect(parseKoreanSchedule("거래처 확인", now).missing).toEqual([
      "date",
      "time",
    ]));
});
