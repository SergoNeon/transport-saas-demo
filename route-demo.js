// Fictional route manifest and stop-event demonstration. No GPS or legal signatures.
const cargo=new Set(['freight','parcel','moving','refrigerated','heavy_haul']);
const labels={
 ru:{title:'Маршруты и документы',intro:'Несколько точек, контроль прибытия, задержки и отметки вручения.',
  choose:'Выберите перевозку',status:'Состояние',preview:'Учебные данные: это не GPS и не подписанная товарно-транспортная накладная.',
  route:'Маршрут',pending:'Ожидает',arrived:'Прибыл',departed:'Выполнено',arrive:'Отметить прибытие',
  depart:'Отметить выезд',delay:'Указать задержку',estimated:'Ожидаемое прибытие (ввод диспетчера)',
  minutes:'Задержка, минут',reason:'Причина задержки',save:'Сохранить',cancel:'Отмена',
  proof:'Отметка вручения',recipient:'Получатель',reference:'Номер накладной / квитанции',
  receipt:'Вручение отмечено сотрудником; подпись получателя не проверялась.',
  print:'Печать маршрутного листа',printHint:'Маршрутный лист — информационная копия, не юридический документ.',
  start:'Для отметок маршрута сначала назначьте экипаж и начните перевозку в разделе «Все перевозки».',
  next:'Завершите предыдущую остановку',blocked:'Нельзя закрыть грузовой маршрут без записи вручения.',
  update:'Маршрут обновлён',done:'Запись сохранена',bad:'Проверьте указанные данные',
  eta:'ETA вручную',from:'ОТПРАВЛЕНИЕ',to:'НАЗНАЧЕНИЕ',note:'Без GPS / без цифровой подписи'},
 en:{title:'Routes & documents',intro:'Multi-stop progress, manually logged delays and delivery acknowledgements.',
  choose:'Choose transport job',status:'Status',preview:'Fictional data: no GPS tracking and no legally signed consignment note.',
  route:'Route',pending:'Pending',arrived:'Arrived',departed:'Completed',arrive:'Mark arrived',
  depart:'Mark departed',delay:'Record delay',estimated:'Estimated arrival (manual dispatch entry)',
  minutes:'Delay, minutes',reason:'Delay reason',save:'Save',cancel:'Cancel',
  proof:'Delivery acknowledgement',recipient:'Recipient',reference:'Delivery note / receipt number',
  receipt:'Recorded by an operator; recipient signature not verified.',
  print:'Print route sheet',printHint:'Route sheet is informational, not an official transport document.',
  start:'To update stop progress, first assign and start the job in All transport.',
  next:'Complete the previous stop first',blocked:'Cargo delivery requires an operator receipt record.',
  update:'Route updated',done:'Record saved',bad:'Review the entered details',
  eta:'Manual ETA',from:'DEPARTURE',to:'DESTINATION',note:'No GPS / no digital signature'},
 he:{title:'מסלולים ומסמכים',intro:'מעקב עצירות, דיווח עיכובים ואישור מסירה ידני.',
  choose:'בחירת הובלה',status:'מצב',preview:'נתונים להדגמה: ללא GPS וללא תעודת משלוח חתומה.',
  route:'מסלול',pending:'ממתין',arrived:'הגיע',departed:'הושלם',arrive:'סימון הגעה',
  depart:'סימון יציאה',delay:'דיווח עיכוב',estimated:'שעת הגעה צפויה (עדכון ידני)',
  minutes:'עיכוב בדקות',reason:'סיבת העיכוב',save:'שמירה',cancel:'ביטול',
  proof:'רישום מסירה',recipient:'מקבל',reference:'מספר תעודת משלוח',
  receipt:'רישום על ידי עובד; חתימת מקבל לא אומתה.',
  print:'הדפסת דף מסלול',printHint:'דף מידע בלבד, אינו מסמך הובלה משפטי.',
  start:'יש לשבץ ולהתחיל את ההובלה במסך כל ההובלות לפני דיווח עצירות.',
  next:'יש להשלים את העצירה הקודמת',blocked:'יש להזין אישור מסירה לפני סיום המסלול.',
  update:'המסלול עודכן',done:'הרישום נשמר',bad:'יש לבדוק את הפרטים',
  eta:'ETA ידני',from:'מוצא',to:'יעד',note:'ללא GPS / ללא חתימה דיגיטלית'}
};
export function createRouteDemo({jobs,locale,notify,rerender}){
 let selected='TX-4903';
 const records=new Map();
 const t=key=>labels[locale()]?.[key]??labels.ru[key]??key;
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
 const button=(label,callback,primary=false)=>{const b=el('button',primary?'primary-btn':'outline-btn',label);b.type='button';b.addEventListener('click',callback);return b;};
 function stopsFor(job){
  if(!records.has(job.id)){
   let addresses=[job.from,job.to];
   if(job.id==='TX-4903')addresses=['Haifa Port','Hadera Logistics Hub','Ashdod Logistics'];
   if(job.id==='TX-4906')addresses=['Netanya Cold Storage','Herzliya Distribution','Tel Aviv Market'];
   if(job.id==='TX-4902')addresses=['Jerusalem','Ein Gedi','Dead Sea'];
   records.set(job.id,addresses.map((address,i)=>({index:i+1,address,status:'pending',delayMinutes:0,reason:'',eta:null,recipient:null,reference:null})));
  }
  return records.get(job.id);
 }
 function canComplete(job){
  const route=records.get(job.id);
  if(!route||!route.some(s=>s.status!=='pending'||s.eta))return true;
  return route.every(s=>s.status==='departed')&&(!cargo.has(job.type)||Boolean(route.at(-1).reference));
 }
 function dialog(title,fields,done){
  const modal=el('dialog','fleet-dialog route-dialog'),form=el('form','fleet-form');form.noValidate=true;
  form.append(el('h2',null,title));
  const controls={};
  fields.forEach(f=>{
   const label=el('label',null,t(f.key)),input=el('input');
   input.name=f.key;input.type=f.type||'text';input.value=f.initial||'';input.required=true;
   if(input.type==='number'){input.min='1';input.max='1440';}
   input.maxLength=f.max||160;label.append(input);form.append(label);controls[f.key]=input;
  });
  const footer=el('div','ops-dialog-actions');
  footer.append(button(t('cancel'),()=>modal.close()),button(t('save'),()=>form.requestSubmit(),true));
  form.append(footer);modal.append(form);document.body.append(modal);
  modal.addEventListener('close',()=>modal.remove(),{once:true});
  form.addEventListener('submit',e=>{
   e.preventDefault();const values=Object.fromEntries(Object.entries(controls).map(([k,input])=>[k,input.value.trim()]));
   if(done(values)!==false){modal.close();rerender();}
  });
  modal.showModal();
 }
 function delay(stop){
  const base=new Date(Date.now()+60*60000);
  const local=new Date(base.getTime()-base.getTimezoneOffset()*60000).toISOString().slice(0,16);
  dialog(t('delay'),[{key:'minutes',type:'number',initial:'30'},{key:'reason',initial:'Loading queue'},{key:'estimated',type:'datetime-local',initial:local}],values=>{
   const minutes=Number(values.minutes),eta=new Date(values.estimated);
   if(!Number.isInteger(minutes)||minutes<1||minutes>1440||values.reason.length<5||!Number.isFinite(eta.getTime())){notify(t('bad'));return false;}
   stop.delayMinutes=minutes;stop.reason=values.reason;stop.eta=eta.toISOString();notify(t('done'));
  });
 }
 function proof(stop){
  dialog(t('proof'),[{key:'recipient'},{key:'reference'}],values=>{
   if(values.recipient.length<2||values.reference.length<4){notify(t('bad'));return false;}
   stop.recipient=values.recipient;stop.reference=values.reference;notify(t('done'));
  });
 }
 function arrive(job,index){
  const route=stopsFor(job),s=route[index];
  if(job.status!=='in_progress'||s.status!=='pending'||index>0&&route[index-1].status!=='departed')return false;
  s.status='arrived';notify(t('update'));rerender();return true;
 }
 function depart(job,index){
  const route=stopsFor(job),s=route[index];
  if(job.status!=='in_progress'||s.status!=='arrived')return false;
  if(index===route.length-1&&cargo.has(job.type)&&!s.reference){notify(t('blocked'));return false;}
  s.status='departed';notify(t('update'));rerender();return true;
 }
 function printRoute(){
  if(typeof window!=='undefined'&&typeof window.print==='function')window.print();
 }
 function renderRoutes(root){
  const title=el('div','ops-heading'),head=el('div');
  head.append(el('h3',null,t('title')),el('p',null,t('intro')));
  title.append(head,button(t('print'),printRoute));
  root.append(title,el('p','ops-note',t('preview')));
  const label=el('label','route-selector-label',t('choose')),selector=el('select','ops-select route-job-select');
  for(const job of jobs){
   if(!records.has(job.id))stopsFor(job);
   const option=el('option',null,job.id+' · '+job.client+' · '+job.type);option.value=job.id;
   selector.append(option);
  }
  if(!jobs.some(j=>j.id===selected))selected=jobs[0]?.id||'';
  selector.value=selected;selector.addEventListener('change',()=>{selected=selector.value;rerender();});
  label.append(selector);root.append(label);
  const job=jobs.find(j=>j.id===selected);
  if(!job)return;
  const route=stopsFor(job);
  const summary=el('div','route-manifest-head');
  summary.append(el('strong',null,job.client),el('small',null,job.id+' · '+job.type+' · '+job.status),el('small',null,job.from+' → '+job.to));
  root.append(summary);
  if(job.status!=='in_progress')root.append(el('p','ops-note',t('start')));
  const timeline=el('div','route-stops');
  for(let i=0;i<route.length;i++){
   const stop=route[i],line=el('article','route-stop');
   const number=el('span','route-stop-number',String(i+1).padStart(2,'0'));
   const text=el('div','route-stop-main');
   text.append(el('strong',null,stop.address),el('small',null,t(stop.status)));
   if(stop.eta)text.append(el('small','route-eta',t('eta')+': '+new Date(stop.eta).toLocaleString()+' · +'+stop.delayMinutes+'m · '+stop.reason));
   if(stop.reference)text.append(el('small','route-proof',t('reference')+': '+stop.reference+' · '+stop.recipient));
   const actions=el('div','route-stop-actions');
   if(stop.status==='pending'&&job.status==='in_progress'){
    const eligible=i===0||route[i-1].status==='departed';
    const btn=button(t('arrive'),()=>arrive(job,i),true);btn.disabled=!eligible;actions.append(btn);
   }
   if(stop.status==='arrived'&&job.status==='in_progress'){
    if(i===route.length-1&&cargo.has(job.type)&&!stop.reference)actions.append(button(t('proof'),()=>proof(stop),true));
    const btn=button(t('depart'),()=>depart(job,i));btn.disabled=i===route.length-1&&cargo.has(job.type)&&!stop.reference;actions.append(btn);
   }
   if(stop.status!=='departed'&&job.status!=='completed'&&job.status!=='canceled')actions.append(button(t('delay'),()=>delay(stop)));
   line.append(number,text,actions);timeline.append(line);
  }
  root.append(timeline,el('p','route-print-hint',t('printHint')));
  if(route.at(-1)?.reference)root.append(el('p','ops-note',t('receipt')));
 }
 return {renderRoutes,stopsFor,arrive,depart,canComplete,records,selectJob:id=>{selected=id;}};
}
