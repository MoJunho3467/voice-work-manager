import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import type {NotificationMode,Task} from '../types';
import {getTask,setReminderNotificationId,updateTask} from './database';
import {reminderDate} from '../utils/reminders';

export const COMPLETE_ACTION='COMPLETE_TASK';
export const SNOOZE_ACTION='SNOOZE_10';
export type ScheduleResult={scheduled:number;skipped:number;permissionDenied:boolean};

Notifications.setNotificationHandler({
  handleNotification:async notification=>{
    const mode=notification.request.content.data?.mode;
    if(mode==='voice'){
      const body=notification.request.content.body;
      Speech.speak(typeof body==='string'?body:(notification.request.content.title??'업무 시간입니다.'),{language:'ko-KR',rate:0.9});
    }
    return{shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false};
  },
});

export async function configureNotifications(){if(Platform.OS==='android'){await Notifications.setNotificationChannelAsync('task-normal',{name:'일반 업무 알림',importance:Notifications.AndroidImportance.HIGH,sound:'default',vibrationPattern:[0,250,250,250]});await Notifications.setNotificationChannelAsync('task-voice',{name:'음성 업무 안내',description:'앱 실행 중에는 일정 내용을 음성으로 읽습니다.',importance:Notifications.AndroidImportance.HIGH,sound:'default',vibrationPattern:[0,250,250,250]});await Notifications.setNotificationChannelAsync('task-alarm',{name:'강한 업무 알람',importance:Notifications.AndroidImportance.MAX,sound:'default',vibrationPattern:[0,500,250,500,250,500],bypassDnd:false,lockscreenVisibility:Notifications.AndroidNotificationVisibility.PUBLIC})}await Notifications.setNotificationCategoryAsync('TASK_ACTIONS',[{identifier:COMPLETE_ACTION,buttonTitle:'완료',options:{opensAppToForeground:false}},{identifier:SNOOZE_ACTION,buttonTitle:'10분 미루기',options:{opensAppToForeground:false}}])}
async function ensurePermission(){const current=await Notifications.getPermissionsAsync();if(current.status==='granted')return true;if(current.status==='undetermined')return(await Notifications.requestPermissionsAsync()).status==='granted';return false}
const channel=(mode:NotificationMode)=>mode==='alarm'?'task-alarm':mode==='voice'?'task-voice':'task-normal';
export async function cancelTaskNotifications(task:Pick<Task,'reminders'>){for(const rule of task.reminders)if(rule.notificationId){try{await Notifications.cancelScheduledNotificationAsync(rule.notificationId)}catch{console.warn('예약 알림 취소 실패',rule.id)}await setReminderNotificationId(rule.id,null)}}
export async function scheduleTaskNotifications(task:Task):Promise<ScheduleResult>{await cancelTaskNotifications(task);if(task.status==='COMPLETED'||task.reminders.length===0)return{scheduled:0,skipped:task.reminders.length,permissionDenied:false};if(!await ensurePermission())return{scheduled:0,skipped:task.reminders.length,permissionDenied:true};let scheduled=0,skipped=0;for(const rule of task.reminders){const at=reminderDate(task.scheduledAt,rule.offsetMinutes);if(at.getTime()<=Date.now()){skipped+=1;continue}const body=rule.mode==='voice'?`${new Date(task.scheduledAt).toLocaleTimeString('ko-KR',{hour:'numeric',minute:'2-digit'})}, ${task.title} 할 시간입니다.`:rule.offsetMinutes===0?'업무 시간입니다.':`${rule.offsetMinutes}분 뒤 예정된 업무입니다.`;const id=await Notifications.scheduleNotificationAsync({content:{title:rule.mode==='alarm'?`⏰ ${task.title}`:task.title,body,sound:'default',categoryIdentifier:'TASK_ACTIONS',sticky:rule.mode==='alarm',autoDismiss:rule.mode!=='alarm',priority:rule.mode==='alarm'?Notifications.AndroidNotificationPriority.MAX:Notifications.AndroidNotificationPriority.HIGH,data:{taskId:task.id,ruleId:rule.id,mode:rule.mode}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:at,channelId:channel(rule.mode)}});await setReminderNotificationId(rule.id,id);scheduled+=1}return{scheduled,skipped,permissionDenied:false}}
export async function handleNotificationAction(response:Notifications.NotificationResponse){const taskId=response.notification.request.content.data?.taskId;if(typeof taskId!=='string')return null;const task=await getTask(taskId);if(!task)return null;if(response.actionIdentifier===COMPLETE_ACTION){await cancelTaskNotifications(task);await updateTask(task.id,{title:task.title,description:task.description,scheduledAt:task.scheduledAt,status:'COMPLETED',category:task.category,reminderMinutes:task.reminderMinutes,reminders:task.reminders.map(r=>({offsetMinutes:r.offsetMinutes,mode:r.mode})),repeat:task.repeat});return'completed' as const}if(response.actionIdentifier===SNOOZE_ACTION){const mode=response.notification.request.content.data?.mode;const safeMode:NotificationMode=mode==='voice'||mode==='alarm'?mode:'normal';await Notifications.scheduleNotificationAsync({content:{title:task.title,body:'10분 미룬 업무입니다.',sound:'default',categoryIdentifier:'TASK_ACTIONS',sticky:safeMode==='alarm',autoDismiss:safeMode!=='alarm',data:{taskId:task.id,mode:safeMode}},trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:600,channelId:channel(safeMode)}});return'snoozed' as const}return null}
export async function restorePendingNotifications(){const tasks=(await import('./database')).listTasks;for(const task of await tasks())if(task.status!=='COMPLETED')await scheduleTaskNotifications(task)}
