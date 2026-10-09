// Browser-only dispatch calendar. Uses the server's matching policy, but no API.
import {matchVehicle} from './dispatch-rules.js';
const words={
 ru:{title:'Календарь перевозок',intro:'Распределяйте будущие рейсы по экипажам без пересечений времени.',
  plan:'Запланировать',reserve:'Забронировать слот',release:'Снять бронь',start:'Смоделировать старт',booked:'Забронировано',
  active:'На линии',date:'Дата и время',duration:'Продолжительность',driver:'Водитель',vehicle:'Транспорт',
  client:'Заказчик',route:'Маршрут',finish:'Окончание',kind:'Направление',empty:'Пока нет запланированных рейсов',
  conflicts:'Выбранный экипаж уже занят на это время',noFleet:'Нет доступного экипажа подходящей категории',
  choose:'Выберите экипаж и транспорт',past:'Выберите время не раньше чем через 15 минут',done:'Рейс записан в календарь',
  canceled:'Бронирование отменено',preview:'Это демонстрационный календарь. Действия и время старта моделируются только в браузере.',
  cancel:'Закрыть',confirm:'Подтвердить',days:'Следующие рейсы',same:'Экипаж уже занят другой заявкой',
  duration1:'1 час',duration2:'2 часа',duration4:'4 часа',duration8:'8 часов',slot:'Слот',
  activeInfo:'Имитация запуска перевозит этот заказ в статус «Назначен»; завершение — через раздел «Все перевозки»'},
 en:{title:'Transport schedule',intro:'Reserve drivers and vehicles for future jobs without overlapping time slots.',
  plan:'Schedule',reserve:'Reserve slot',release:'Release slot',start:'Simulate departure',booked:'Reserved',
  active:'On shift',date:'Date and time',duration:'Duration',driver:'Driver',vehicle:'Vehicle',
  client:'Customer',route:'Route',finish:'Ends',kind:'Service',empty:'No scheduled jobs yet',
  conflicts:'The crew or vehicle already has a booking at this time',noFleet:'No compatible available crew or vehicle',
  choose:'Select an eligible driver and vehicle',past:'Choose a time at least 15 minutes from now',done:'Job added to calendar',
  canceled:'Reservation released',preview:'Demo calendar only. Actions and departure times are simulated in this browser.',
  cancel:'Close',confirm:'Confirm',days:'Upcoming jobs',same:'Crew already committed to another booking',
  duration1:'1 hour',duration2:'2 hours',duration4:'4 hours',duration8:'8 hours',slot:'Slot',
  activeInfo:'Simulated dispatch changes the job to Assigned; complete the trip in All transport'},
 he:{title:'יומן הובלות',intro:'שיבוץ נהגים ורכבים לנסיעות עתידיות ללא חפיפות בלוח הזמנים.',
  plan:'לתזמן',reserve:'שמירת משבצת',release:'ביטול שיבוץ',start:'הדמיית יציאה',booked:'משוריין',
  active:'יצא לדרך',date:'תאריך ושעה',duration:'משך',driver:'נהג',vehicle:'רכב',
  client:'לקוח',route:'מסלול',finish:'סיום',kind:'שירות',empty:'אין נסיעות מתוכננות',
  conflicts:'הנהג או הרכב כבר משובצים בזמן זה',noFleet:'אין צוות או רכב מתאים',
  choose:'בחרו נהג ורכב מתאים',past:'יש לבחור תאריך בעוד לפחות 15 דקות',done:'השיבוץ נוסף ליומן',
  canceled:'השיבוץ בוטל',preview:'יומן הדגמה בלבד. פעולות ושעת יציאה מדומות בדפדפן.',
  cancel:'סגירה',confirm:'אישור',days:'נסיעות עתידיות',same:'הצוות כבר משובץ',
  duration1:'שעה',duration2:'שעתיים',duration4:'4 שעות',duration8:'8 שעות',slot:'משבצת',
  activeInfo:'הפעלת ההדגמה משנה את ההזמנה לשובצה. את הנסיעה משלימים במסך כל ההובלות'}
};
export function createCalendarDemo({fleet,jobs,locale,notify,rerender}){
 const reservations=[];
 const t=key=>words[locale()]?.[key]||words.ru[key]||key;
 const node=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e;};
 const button=(name,handler,primary=false)=>{const e=node('button',primary?'primary-btn':'outline-btn',name);e.type='button';e.addEventListener('click',handler);return e;};
 const dateText=value=>new Intl.DateTimeFormat(locale()==='he'?'he-IL':locale()==='en'?'en-GB':'ru-RU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
 const shiftOk=d=>fleet.shifts.some(s=>s.name===d.name&&s.ended===null);
 const overlaps=(aStart,aEnd,bStart,bEnd)=>aStart<bEnd&&bStart<aEnd;
 const conflict=(driverId,vehicleId,from,to)=>{
  return reservations.some(r=>r.state!=='released'&&(r.driverId===driverId||r.vehicleId===vehicleId)&&overlaps(from,to,r.from,r.to));
 };
 const lookup=id=>reservations.find(r=>r.jobId===id&&r.state!=='released');
 function plan(job,driverId,vehicleId,hours=2){
  const from=new Date(job.scheduledAt).getTime(),to=from+hours*3600000;
  if(!Number.isFinite(from)||from<Date.now()+15*60000){notify(t('past'));return false;}
  if(lookup(job.id)||!Number.isInteger(hours)||hours<1||hours>8){notify(t('same'));return false;}
  const d=fleet.drivers.find(x=>x.id===driverId),v=fleet.vehicles.find(x=>x.id===vehicleId);
  if(!d||!v||d.status!=='available'||!shiftOk(d)||!matchVehicle({type:job.type,summary:job.summary,clearanceVerified:false},v).allowed){notify(t('noFleet'));return false;}
  if(conflict(driverId,vehicleId,from,to)){notify(t('conflicts'));return false;}
  reservations.push({jobId:job.id,driverId,vehicleId,from,to,state:'reserved'});
  notify(t('done'));rerender();return true;
 }
 function openPlan(job){
  const modal=node('dialog','fleet-dialog schedule-dialog');
  const form=node('form','fleet-form');form.noValidate=true;
  form.append(node('h2',null,t('plan')+' · '+job.client),node('p','schedule-subtitle',job.from+' → '+job.to));
  const starts=new Date(job.scheduledAt);
  const when=node('p','ops-note',t('date')+' · '+dateText(starts));
  form.append(when);
  const durationLabel=node('label',null,t('duration'));
  const duration=node('select','ops-select');duration.name='duration';
  for(const h of [1,2,4,8]){const option=node('option',null,t('duration'+h));option.value=String(h);option.selected=h===2;duration.append(option);}
  durationLabel.append(duration);form.append(durationLabel);
  const driverLabel=node('label',null,t('driver')),driver=node('select','ops-select');
  const vehicleLabel=node('label',null,t('vehicle')),vehicle=node('select','ops-select');
  driver.name='driver';vehicle.name='vehicle';
  function update(){
   driver.replaceChildren();vehicle.replaceChildren();
   const da=node('option',null,t('driver'));da.value='';driver.append(da);
   const va=node('option',null,t('vehicle'));va.value='';vehicle.append(va);
   const from=starts.getTime(),to=from+Number(duration.value)*3600000;
   for(const d of fleet.drivers.filter(d=>d.status==='available'&&shiftOk(d)&&!reservations.some(r=>r.state!=='released'&&r.driverId===d.id&&overlaps(from,to,r.from,r.to)))){
    const opt=node('option',null,d.name);opt.value=d.id;driver.append(opt);
   }
   for(const v of fleet.vehicles.filter(v=>matchVehicle({type:job.type,summary:job.summary,clearanceVerified:false},v).allowed&&!reservations.some(r=>r.state!=='released'&&r.vehicleId===v.id&&overlaps(from,to,r.from,r.to)))){
    const opt=node('option',null,v.name);opt.value=v.id;vehicle.append(opt);
   }
  }
  duration.addEventListener('change',update);update();
  driverLabel.append(driver);vehicleLabel.append(vehicle);form.append(driverLabel,vehicleLabel);
  const actions=node('div','ops-dialog-actions');
  actions.append(button(t('cancel'),()=>modal.close()),button(t('reserve'),()=>form.requestSubmit(),true));
  form.append(actions);modal.append(form);document.body.append(modal);
  modal.addEventListener('close',()=>modal.remove(),{once:true});
  form.addEventListener('submit',e=>{e.preventDefault();if(plan(job,driver.value,vehicle.value,Number(duration.value)))modal.close();});
  modal.showModal();
 }
 function unplan(job){
  const r=lookup(job.id);
  if(!r||r.state!=='reserved')return;
  r.state='released';notify(t('canceled'));rerender();
 }
 function simulateStart(job){
  const r=lookup(job.id);
  if(!r||r.state!=='reserved')return false;
  const d=fleet.drivers.find(d=>d.id===r.driverId),v=fleet.vehicles.find(v=>v.id===r.vehicleId);
  if(!d||!v||d.status!=='available'||v.status!=='available')return false;
  d.status='on_trip';v.status='in_service';
  job.driverId=d.id;job.vehicleId=v.id;job.driverName=d.name;job.vehicleName=v.name;job.status='assigned';
  r.state='active';notify(t('activeInfo'));rerender();return true;
 }
 function release(job){
  const r=lookup(job.id);
  if(r)r.state='released';
 }
 function renderCalendar(root){
  const head=node('div','ops-heading'),left=node('div');
  left.append(node('h3',null,t('title')),node('p',null,t('intro')));
  head.append(left);root.append(head,node('div','ops-note',t('preview')));
  const planned=reservations.filter(r=>r.state!=='released').sort((a,b)=>a.from-b.from);
  const list=node('div','schedule-timeline');
  if(planned.length===0)list.append(node('p','ops-empty',t('empty')));
  for(const r of planned){
   const job=jobs.find(j=>j.id===r.jobId);
   if(!job)continue;
   const driver=fleet.drivers.find(d=>d.id===r.driverId),vehicle=fleet.vehicles.find(v=>v.id===r.vehicleId);
   const row=node('article','schedule-entry');
   const time=node('div','schedule-time');time.append(node('strong',null,dateText(r.from)),node('small',null,t('finish')+' · '+dateText(r.to)));
   const info=node('div','schedule-info');info.append(node('strong',null,job.client),node('small',null,job.from+' → '+job.to),node('small',null,(driver?.name||'')+' · '+(vehicle?.name||'')));
   const actions=node('div','schedule-actions');actions.append(node('span','ops-state '+(r.state==='active'?'on_trip':'available'),r.state==='active'?t('active'):t('booked')));
   if(r.state==='reserved')actions.append(button(t('start'),()=>simulateStart(job),true),button(t('release'),()=>unplan(job)));
   row.append(time,info,actions);list.append(row);
  }
  root.append(list);
 }
 return {renderCalendar,openPlan,plan,hasPlan:id=>Boolean(reservations.find(r=>r.jobId===id&&r.state==='reserved')),simulateStart,release,reservations};
}
