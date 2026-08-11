import type { ParsedSchedule } from '../types';
import { localDateKey, pad } from '../utils/date';

const WEEKDAYS:Record<string,number>={일:0,월:1,화:2,수:3,목:4,금:5,토:6};
const dateKey=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const valid=(y:number,m:number,d:number)=>{const x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d};

export function parseKoreanSchedule(original:string, now=new Date()):ParsedSchedule {
  let text=original.trim().replace(/\s+/g,' '); let date:string|null=null; let hour:number|null=null; let minute:number|null=null; let ambiguousMeridiem=false; let match:RegExpMatchArray|null;
  if((match=text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/))){const y=+match[1],m=+match[2],d=+match[3];if(valid(y,m,d))date=`${y}-${pad(m)}-${pad(d)}`;text=text.replace(match[0],' ')}
  else if((match=text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))){const y=+match[1],m=+match[2],d=+match[3];if(valid(y,m,d))date=`${y}-${pad(m)}-${pad(d)}`;text=text.replace(match[0],' ')}
  else if((match=text.match(/(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일/))){const y=match[1]?+match[1]:now.getFullYear(),m=+match[2],d=+match[3];if(valid(y,m,d))date=`${y}-${pad(m)}-${pad(d)}`;text=text.replace(match[0],' ')}
  else if((match=text.match(/(?:(\d{4})[/.])?(\d{1,2})[/.](\d{1,2})/))){const y=match[1]?+match[1]:now.getFullYear(),m=+match[2],d=+match[3];if(valid(y,m,d))date=`${y}-${pad(m)}-${pad(d)}`;text=text.replace(match[0],' ')}
  if(!date){if(/모레/.test(text)){date=dateKey(addDays(now,2));text=text.replace('모레',' ')}else if(/내일/.test(text)){date=dateKey(addDays(now,1));text=text.replace('내일',' ')}else if(/오늘/.test(text)){date=localDateKey(now);text=text.replace('오늘',' ')}}
  if(!date&&(match=text.match(/(?:(이번|다음)\s*주\s*)?([월화수목금토일])요일/))){const target=WEEKDAYS[match[2]];const targetFromMonday=(target+6)%7;const todayFromMonday=(now.getDay()+6)%7;let delta:number;if(match[1]==='이번')delta=targetFromMonday-todayFromMonday;else if(match[1]==='다음')delta=(7-todayFromMonday)+targetFromMonday;else delta=(target-now.getDay()+7)%7;date=dateKey(addDays(now,delta));text=text.replace(match[0],' ')}
  if((match=text.match(/(오전|오후|아침|저녁|밤)?\s*(\d{1,2})시(?:\s*(\d{1,2})분|\s*(반))?/))){const mer=match[1],raw=+match[2];minute=match[4]?30:+(match[3]??0);hour=raw;if(mer==='오후'||mer==='저녁'||mer==='밤'){if(hour<12)hour+=12}else if(mer==='오전'||mer==='아침'){if(hour===12)hour=0}else ambiguousMeridiem=raw>=1&&raw<=12;if(hour>23||minute>59){hour=null;minute=null;ambiguousMeridiem=false}text=text.replace(match[0],' ')}
  let title=text.replace(/\s*(까지|에|에는|해야\s*해(?:요)?|해야함|하기)\s*/g,' ').replace(/\s+/g,' ').trim();
  const missing:ParsedSchedule['missing']=[];if(!date)missing.push('date');if(hour===null)missing.push('time');if(!title)missing.push('title');
  return {original,title,date,hour,minute,ambiguousMeridiem,missing};
}
