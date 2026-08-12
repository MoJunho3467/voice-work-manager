import type { ParsedSchedule } from '../types';
import { localDateKey, pad } from '../utils/date';
import { expandReminderRules, uniqueReminderDrafts } from '../utils/reminders';

const WEEKDAYS:Record<string,number>={일:0,월:1,화:2,수:3,목:4,금:5,토:6};
const dateKey=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const valid=(y:number,m:number,d:number)=>{const x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d};

export function parseKoreanSchedule(original:string, now=new Date()):ParsedSchedule {
  let text=original.trim().replace(/\s+/g,' '); let date:string|null=null; let hour:number|null=null; let minute:number|null=null; let ambiguousMeridiem=false; let match:RegExpMatchArray|null;
  const warnings:string[]=[];
  const notificationsDisabled=/(알림\s*없이|알려\s*주지\s*마|알리지\s*마)/.test(text);
  const notificationMode=/(강하게|강한\s*알람|알람처럼|꼭\s*깨워)/.test(text)?'alarm':/(말로|음성으로|읽어\s*줘)/.test(text)?'voice':'normal';
  const reminderLanguage=/(알림|알려|전부터|전하고|전과|전이랑|정각|분마다|시간마다|간격|완료할 때까지)/.test(text);
  const numberWords:Record<string,number>={한:1,두:2,세:3,네:4,다섯:5,여섯:6,일곱:7,여덟:8,아홉:9,열:10};
  const duration=(value:string,unit:string)=>{const n=numberWords[value]??Number(value);return unit==='일'?n*1440:unit==='시간'?n*60:n};
  const offsets:number[]=[];
  const offsetPattern=/(하루|한\s*시간|\d+\s*(?:일|시간|분))\s*전/g;
  for(const found of text.matchAll(offsetPattern)){const raw=found[1].replace(/\s/g,'');if(raw==='하루')offsets.push(1440);else if(raw==='한시간')offsets.push(60);else{const part=raw.match(/(\d+)(일|시간|분)/);if(part)offsets.push(duration(part[1],part[2]))}}
  const startMatch=text.match(/(하루|한\s*시간|\d+\s*(?:일|시간|분))\s*전부터/);
  const intervalMatch=text.match(/(\d+|한|두|세|네)\s*(분|시간)(?:마다|\s*간격)/);
  const countMatch=text.match(/(\d+|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*(?:번|회)/);
  const untilCompleted=/완료할\s*때까지/.test(text);
  const includeDueTime=/정각(?:에|에도)?/.test(text);
  let repeat=null;
  if(startMatch&&intervalMatch){const raw=startMatch[1].replace(/\s/g,'');const start=raw==='하루'?1440:raw==='한시간'?60:(()=>{const p=raw.match(/(\d+)(일|시간|분)/);return p?duration(p[1],p[2]):10})();const interval=duration(intervalMatch[1],intervalMatch[2]);const repeatCount=countMatch?(numberWords[countMatch[1]]??Number(countMatch[1])):untilCompleted?null:Math.floor(start/interval)+1;repeat={startOffsetMinutes:start,intervalMinutes:interval,repeatCount,untilCompleted,includeDueTime};if(!countMatch&&!untilCompleted)warnings.push('반복 종료 조건이 없어 일정 정각까지로 해석했습니다.');}
  if((match=text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/))){const y=+match[1],m=+match[2],d=+match[3];if(valid(y,m,d))date=`${y}-${pad(m)}-${pad(d)}`;text=text.replace(match[0],' ')}
  else if((match=text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))){const y=+match[1],m=+match[2],d=+match[3];if(valid(y,m,d))date=`${y}-${pad(m)}-${pad(d)}`;text=text.replace(match[0],' ')}
  else if((match=text.match(/(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일/))){const y=match[1]?+match[1]:now.getFullYear(),m=+match[2],d=+match[3];if(valid(y,m,d))date=`${y}-${pad(m)}-${pad(d)}`;text=text.replace(match[0],' ')}
  else if((match=text.match(/(?:(\d{4})[/.])?(\d{1,2})[/.](\d{1,2})/))){const y=match[1]?+match[1]:now.getFullYear(),m=+match[2],d=+match[3];if(valid(y,m,d))date=`${y}-${pad(m)}-${pad(d)}`;text=text.replace(match[0],' ')}
  if(!date){if(/모레/.test(text)){date=dateKey(addDays(now,2));text=text.replace('모레',' ')}else if(/내일/.test(text)){date=dateKey(addDays(now,1));text=text.replace('내일',' ')}else if(/오늘/.test(text)){date=localDateKey(now);text=text.replace('오늘',' ')}}
  if(!date&&(match=text.match(/(?:(이번|다음)\s*주\s*)?([월화수목금토일])요일/))){const target=WEEKDAYS[match[2]];const targetFromMonday=(target+6)%7;const todayFromMonday=(now.getDay()+6)%7;let delta:number;if(match[1]==='이번')delta=targetFromMonday-todayFromMonday;else if(match[1]==='다음')delta=(7-todayFromMonday)+targetFromMonday;else delta=(target-now.getDay()+7)%7;date=dateKey(addDays(now,delta));text=text.replace(match[0],' ')}
  if((match=text.match(/(오전|오후|아침|저녁|밤)?\s*(\d{1,2})시(?:\s*(\d{1,2})분|\s*(반))?/))){const mer=match[1],raw=+match[2];minute=match[4]?30:+(match[3]??0);hour=raw;if(mer==='오후'||mer==='저녁'||mer==='밤'){if(hour<12)hour+=12}else if(mer==='오전'||mer==='아침'){if(hour===12)hour=0}else ambiguousMeridiem=raw>=1&&raw<=12;if(hour>23||minute>59){hour=null;minute=null;ambiguousMeridiem=false}text=text.replace(match[0],' ')}
  text=text.replace(/(하루|한\s*시간|\d+\s*(?:일|시간|분))\s*전(?:부터)?/g,' ').replace(/(\d+|한|두|세|네)\s*(분|시간)(?:마다|\s*간격)/g,' ').replace(/(\d+|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*(?:번|회)/g,' ').replace(/(일반\s*알림으로|강한\s*알람으로|음성으로|말로|알람처럼|강하게|꼭\s*깨워줘|완료할\s*때까지|정각에도?|알림\s*없이|알려\s*주지\s*마|알리지\s*마|한\s*번만|알려\s*줘)/g,' ');
  let title=text.replace(/\s*(까지|에|에는|해야\s*해(?:요)?|해야함|하기)\s*/g,' ').replace(/\s+/g,' ').trim().replace(/[,.]+$/,'');
  const missing:ParsedSchedule['missing']=[];if(!date)missing.push('date');if(hour===null)missing.push('time');if(!title)missing.push('title');
  let reminders=notificationsDisabled?[]:repeat?expandReminderRules(notificationMode,repeat):uniqueReminderDrafts(offsets.map(offsetMinutes=>({offsetMinutes,mode:notificationMode})));
  if(!notificationsDisabled&&includeDueTime&&!reminders.some(r=>r.offsetMinutes===0))reminders.push({offsetMinutes:0,mode:notificationMode});
  if(!notificationsDisabled&&reminderLanguage&&reminders.length===0)reminders=[{offsetMinutes:10,mode:notificationMode}];
  return {original,title,date,hour,minute,ambiguousMeridiem,missing,reminders,repeat,notificationMode,notificationsDisabled,hasExplicitReminder:notificationsDisabled||reminderLanguage,warnings};
}
