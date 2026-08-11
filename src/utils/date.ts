export const pad=(n:number)=>String(n).padStart(2,'0');
export const localDateKey=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const toLocalIso=(date:string,hour:number,minute:number)=>new Date(`${date}T${pad(hour)}:${pad(minute)}:00`).toISOString();
export const formatDateTime=(iso:string)=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Seoul'}).format(new Date(iso));
export const taskDateKey=(iso:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date(iso));
export const timeText=(iso:string)=>new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Seoul'}).format(new Date(iso));
export const uuid=()=>`${Date.now()}-${Math.random().toString(36).slice(2,11)}`;
