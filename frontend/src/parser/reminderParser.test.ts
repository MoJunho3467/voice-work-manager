import{describe,expect,it}from'vitest';import{parseKoreanSchedule}from'./scheduleParser';
const now=new Date(2026,7,12,12,0);
describe('한국어 자유 알림 규칙',()=>{
 it('10분 전 한 번',()=>{const p=parseKoreanSchedule('내일 5시 거래처 연락, 10분 전에 한 번만 알려줘',now);expect(p.reminders).toEqual([{offsetMinutes:10,mode:'normal'}]);expect(p.ambiguousMeridiem).toBe(true)});
 it('30분 전부터 10분마다 세 번',()=>{const p=parseKoreanSchedule('내일 오후 5시 거래처 연락, 30분 전부터 10분마다 세 번 일반 알림으로 알려줘',now);expect(p.reminders.map(x=>x.offsetMinutes)).toEqual([30,20,10]);expect(p.reminders.every(x=>x.mode==='normal')).toBe(true)});
 it('한 시간 전과 정각 음성',()=>{const p=parseKoreanSchedule('모레 오후 2시 현장 방문, 한 시간 전과 정각에 음성으로 알려줘',now);expect(p.reminders).toEqual([{offsetMinutes:60,mode:'voice'},{offsetMinutes:0,mode:'voice'}])});
 it('완료까지 강한 알람은 안전하게 12회',()=>{const p=parseKoreanSchedule('오늘 오후 6시 보고서 제출, 30분 전부터 완료할 때까지 10분마다 강한 알람으로 알려줘',now);expect(p.repeat?.untilCompleted).toBe(true);expect(p.reminders).toHaveLength(12);expect(p.reminders[0].mode).toBe('alarm')});
 it('알림 없음',()=>{const p=parseKoreanSchedule('내일 오후 1시 점심 약속, 알림 없이 등록해줘',now);expect(p.notificationsDisabled).toBe(true);expect(p.reminders).toEqual([])});
});
