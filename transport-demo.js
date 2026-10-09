import {matchVehicle} from './dispatch-rules.js';
// Unified transport-sector showcase — fictional, client-side only.
const categories=['private_transfer','group_transport','freight','parcel','moving','refrigerated','heavy_haul','vehicle_recovery'];
const cargo=new Set(['freight','parcel','moving','refrigerated','heavy_haul']);
const passenger=new Set(['private_transfer','group_transport']);
const icons={private_transfer:'↗',group_transport:'◎',freight:'▰',parcel:'▣',moving:'▥',refrigerated:'❄',heavy_haul:'◈',vehicle_recovery:'⌁'};
const dictionary={
ru:{
 title:'Любые перевозки. Одна диспетчерская.',intro:'Управляйте пассажирскими рейсами, грузами, доставкой и специальным транспортом из единого кабинета.',
 newOrder:'Оформить перевозку',category:'Направление',all:'Все',passenger:'Пассажиры',cargo:'Грузы',special:'Спецперевозки',
 choose:'Выберите услугу',client:'Заказчик',departure:'Адрес отправления',arrival:'Адрес назначения',schedule:'Дата и время',price:'Стоимость, ₪',
 passengers:'Пассажиров',luggage:'Мест багажа',weight:'Вес груза, кг',volume:'Объём, м³',pallets:'Паллет',loading:'Помощь при погрузке',
 minTemp:'Температура от, °C',maxTemp:'Температура до, °C',floor:'Этаж погрузки',elevator:'Есть лифт',
 oversize:'Негабаритный груз',vehicleType:'Транспортное средство',condition:'Состояние',rolls:'На ходу',immobile:'Не на ходу',unknown:'Неизвестно',
 save:'Создать демо-заказ',cancel:'Отмена',jobs:'Единый журнал перевозок',status:'Статус',route:'Маршрут',requirements:'Параметры',
 demo:'Демонстрация — заявки не отправляются перевозчикам. Допуски и разрешения требуют проверки.',
 created:'Заказ добавлен в демонстрационный журнал',validation:'Заполните необходимые поля',detail:'Специализированная форма заказа и единый диспетчерский журнал.',
 waiting:'Новый',assigned:'Назначен',completed:'Выполнен',canceled:'Отменён',next:'Продолжить',none:'Нет заказов по выбранному направлению',
 private_transfer:'Трансферы',group_transport:'Автобусы и группы',freight:'Грузоперевозки',parcel:'Доставка и курьеры',moving:'Переезды',
 refrigerated:'Рефрижераторы',heavy_haul:'Негабарит',vehicle_recovery:'Эвакуаторы',
 desc_private_transfer:'Аэропорты, такси, VIP',desc_group_transport:'Автобусы, шаттлы, экскурсии',desc_freight:'Фуры, паллеты, склады',desc_parcel:'Посылки, последняя миля',desc_moving:'Квартиры, офисы, грузчики',
 desc_refrigerated:'Холодовая цепь, продукты',desc_heavy_haul:'Тяжёлые и крупные грузы',desc_vehicle_recovery:'Эвакуация авто и техники',
 totalJobs:'Заказов в системе',sectors:'Направлений',activeJobs:'В работе',kg:'кг',persons:'чел.',palletUnit:'паллет',
 permit:'Негабаритные грузы: разрешения и маршрут проверяются отдельно',booked:'В календаре',calendarPlan:'В календарь →',chooseDriver:'Выберите водителя',chooseVehicle:'Выберите транспорт',assignFleet:'Назначить экипаж',in_progress:'Выполняется',startService:'Начать перевозку',completeService:'Завершить перевозку',cancelService:'Отменить',noCompatible:'Нет подходящих свободных машин или водителей',lockedPermit:'Для негабаритного груза требуется независимая проверка разрешения',assignmentDone:'Машина и водитель назначены',resourceBlocked:'Транспорт или водитель недоступны',serviceDone:'Перевозка завершена, экипаж свободен'
},
en:{
 title:'All transport. One dispatch platform.',intro:'Manage passenger rides, freight, courier delivery and specialist logistics in a single workspace.',
 newOrder:'New transport order',category:'Service',all:'All',passenger:'Passenger',cargo:'Freight',special:'Specialist',
 choose:'Select service',client:'Customer',departure:'Pickup / loading address',arrival:'Destination',schedule:'Date and time',price:'Price, ₪',
 passengers:'Passengers',luggage:'Luggage pieces',weight:'Cargo weight, kg',volume:'Volume, m³',pallets:'Pallets',loading:'Loading assistance',
 minTemp:'Minimum temperature, °C',maxTemp:'Maximum temperature, °C',floor:'Loading floor',elevator:'Elevator available',
 oversize:'Oversize cargo',vehicleType:'Vehicle to recover',condition:'Vehicle condition',rolls:'Movable',immobile:'Immobile',unknown:'Unknown',
 save:'Create demo order',cancel:'Cancel',jobs:'Unified transport orders',status:'Status',route:'Route',requirements:'Details',
 demo:'Demonstration only — no bookings are sent to carriers. Permits and legal compliance require independent checks.',
 created:'Sample transport order added',validation:'Complete all required fields',detail:'Category-specific forms and a unified transport operations log.',
 waiting:'New',assigned:'Assigned',completed:'Completed',canceled:'Canceled',next:'Advance',none:'No matching transport orders',
 private_transfer:'Private transfer',group_transport:'Buses & groups',freight:'Freight transport',parcel:'Courier & delivery',moving:'House & office moves',
 refrigerated:'Refrigerated',heavy_haul:'Heavy haulage',vehicle_recovery:'Vehicle recovery',
 desc_private_transfer:'Airport, executive, on demand',desc_group_transport:'Coaches, shuttles, tours',desc_freight:'Trucks, pallets, distribution',desc_parcel:'Packages, last mile',desc_moving:'Homes, offices, crews',
 desc_refrigerated:'Cold chain and perishables',desc_heavy_haul:'Oversized and heavy loads',desc_vehicle_recovery:'Tow trucks and recovery',
 totalJobs:'All jobs',sectors:'Service categories',activeJobs:'In progress',kg:'kg',persons:'pax',palletUnit:'pallets',
 permit:'Oversize shipments need separate permit and route review',booked:'Scheduled',calendarPlan:'Add to calendar →',chooseDriver:'Select driver',chooseVehicle:'Select vehicle',assignFleet:'Assign crew',in_progress:'In transit',startService:'Start service',completeService:'Complete service',cancelService:'Cancel',noCompatible:'No matching free vehicles or drivers',lockedPermit:'Heavy haul requires independently verified permit clearance',assignmentDone:'Driver and vehicle assigned',resourceBlocked:'Crew or vehicle unavailable',serviceDone:'Transport job completed; resources released'
},
he:{
 title:'כל סוגי ההובלה. מערכת אחת.',intro:'ניהול הסעות נוסעים, הובלת מטענים, משלוחים ושירותי הובלה מיוחדים באותו ממשק.',
 newOrder:'הזמנת הובלה',category:'סוג שירות',all:'הכול',passenger:'נוסעים',cargo:'מטען',special:'שירותים מיוחדים',
 choose:'בחירת שירות',client:'לקוח',departure:'כתובת העמסה או איסוף',arrival:'כתובת יעד',schedule:'תאריך ושעה',price:'מחיר, ₪',
 passengers:'מספר נוסעים',luggage:'פריטי מטען',weight:'משקל, ק״ג',volume:'נפח, מ״ק',pallets:'משטחים',loading:'עזרה בהעמסה',
 minTemp:'טמפרטורה מינימלית, °C',maxTemp:'טמפרטורה מרבית, °C',floor:'קומת העמסה',elevator:'יש מעלית',
 oversize:'מטען חורג',vehicleType:'סוג הרכב',condition:'מצב הרכב',rolls:'נוסע',immobile:'מושבת',unknown:'לא ידוע',
 save:'יצירת הזמנת הדגמה',cancel:'ביטול',jobs:'יומן הובלות אחוד',status:'סטטוס',route:'מסלול',requirements:'פרטים',
 demo:'הדגמה בלבד — לא נשלחות הזמנות אמיתיות. היתרים ודרישות חוקיות מחייבים בדיקה נפרדת.',
 created:'נוספה הזמנת הדגמה',validation:'יש למלא את כל השדות הנדרשים',detail:'טפסים לפי סוג ההובלה ויומן תפעולי אחד.',
 waiting:'חדש',assigned:'שובץ',completed:'הושלם',canceled:'בוטל',next:'המשך',none:'אין הזמנות בסוג זה',
 private_transfer:'הסעות פרטיות',group_transport:'אוטובוסים וקבוצות',freight:'הובלות מטען',parcel:'שליחויות',moving:'הובלת דירות ומשרדים',
 refrigerated:'הובלה בקירור',heavy_haul:'מטען חורג',vehicle_recovery:'גרירה וחילוץ',
 desc_private_transfer:'שדה תעופה ושירות אישי',desc_group_transport:'אוטובוסים ושאטלים',desc_freight:'משאיות ומשטחים',desc_parcel:'חבילות ומשלוח עד הבית',desc_moving:'דירות, משרדים וסבלים',
 desc_refrigerated:'מזון וקירור',desc_heavy_haul:'ציוד גדול וכבד',desc_vehicle_recovery:'גרר וחילוץ רכבים',
 totalJobs:'הזמנות',sectors:'סוגי שירות',activeJobs:'בטיפול',kg:'ק״ג',persons:'נוסעים',palletUnit:'משטחים',
 permit:'מטען חורג דורש בדיקת היתר ומסלול בנפרד',booked:'בלוח השנה',calendarPlan:'הוספה ליומן ←',chooseDriver:'בחירת נהג',chooseVehicle:'בחירת רכב',assignFleet:'שיבוץ צוות',in_progress:'בביצוע',startService:'התחלת הובלה',completeService:'סיום הובלה',cancelService:'ביטול',noCompatible:'אין רכבים או נהגים מתאימים וזמינים',lockedPermit:'מטען חורג מחייב אישור היתר בלתי תלוי',assignmentDone:'הנהג והרכב שובצו',resourceBlocked:'נהג או רכב אינם זמינים',serviceDone:'ההובלה הושלמה, הצוות התפנה'
}
};
const initial=[
 {id:'TX-4901',type:'private_transfer',client:'Northline Executive',from:'Ben Gurion T3',to:'Tel Aviv',summary:{passengers:3},status:'assigned',amount:320},
 {id:'TX-4902',type:'group_transport',client:'Blue Coast Tours',from:'Jerusalem',to:'Dead Sea',summary:{passengers:42},status:'waiting',amount:2300},
 {id:'TX-4903',type:'freight',client:'Galil Distribution',from:'Haifa Port',to:'Ashdod Logistics',summary:{weightKg:12000,pallets:16},status:'assigned',amount:3750},
 {id:'TX-4904',type:'parcel',client:'Parcel Service',from:'Rishon LeZion',to:'Holon',summary:{weightKg:18},status:'waiting',amount:140},
 {id:'TX-4905',type:'moving',client:'Urban Moves',from:'Ramat Gan',to:'Herzliya',summary:{weightKg:1800,volumeM3:27},status:'waiting',amount:2100},
 {id:'TX-4906',type:'refrigerated',client:'Fresh Market',from:'Netanya',to:'Tel Aviv Market',summary:{weightKg:4000,minTemperatureC:2,maxTemperatureC:6},status:'assigned',amount:1850},
 {id:'TX-4907',type:'heavy_haul',client:'Atlas Engineering',from:'Ashkelon',to:'Beersheba',summary:{weightKg:38000},status:'waiting',amount:8900},
 {id:'TX-4908',type:'vehicle_recovery',client:'Road Assistance',from:'Highway 4',to:'Petah Tikva',summary:{vehicleType:'Light van'},status:'completed',amount:680}
];
export function createTransportDemo({locale,notify,rerender,fleet={drivers:[],vehicles:[],shifts:[]},getCalendar=()=>null}){
 const jobs=structuredClone(initial).map((j,i)=>({...j,status:j.status==='completed'?'completed':'waiting',scheduledAt:new Date(Date.now()+(i+1)*86400000).toISOString()}));
 let selected='all',nextId=4908;
 const t=k=>dictionary[locale()]?.[k]||dictionary.ru[k]||k;
 const el=(name,cls,txt)=>{const e=document.createElement(name);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e;};
 const btn=(name,fn,primary=false)=>{const b=el('button',primary?'primary-btn':'outline-btn',name);b.type='button';b.addEventListener('click',fn);return b;};
 const span=(type)=>el('span','transport-sector-tag',t(type));
 const availableDrivers=()=>fleet.drivers.filter(d=>d.status==='available'&&fleet.shifts.some(shift=>shift.name===d.name&&shift.ended===null));
 const suitableVehicles=job=>fleet.vehicles.filter(v=>matchVehicle({type:job.type,summary:job.summary,clearanceVerified:false},v).allowed);
 function release(job){
  if(job.driverId){const d=fleet.drivers.find(d=>d.id===job.driverId);if(d)d.status='available';}
  if(job.vehicleId){const v=fleet.vehicles.find(v=>v.id===job.vehicleId);if(v)v.status='available';}
 }
 function assign(job,driverId,vehicleId){
  const driver=fleet.drivers.find(x=>x.id===driverId),vehicle=fleet.vehicles.find(x=>x.id===vehicleId);
  if(job.status!=='waiting'||getCalendar()?.hasPlan(job.id)||!driver||!vehicle||driver.status!=='available'||
    !fleet.shifts.some(shift=>shift.name===driver.name&&shift.ended===null)||
    !matchVehicle({type:job.type,summary:job.summary,clearanceVerified:false},vehicle).allowed){notify(t('resourceBlocked'));return;}
  driver.status='on_trip';vehicle.status='in_service';job.driverId=driver.id;job.vehicleId=vehicle.id;
  job.driverName=driver.name;job.vehicleName=vehicle.name;job.status='assigned';notify(t('assignmentDone'));rerender();
 }
 function step(job,next){
  if(next==='completed'||next==='canceled'){release(job);getCalendar()?.release(job);}
  job.status=next;notify(next==='completed'?t('serviceDone'):t('assignmentDone'));rerender();
 }

 function requirements(job){
  const r=job.summary||{};
  if(passenger.has(job.type))return String(r.passengers||1)+' '+t('persons');
  if(r.weightKg)return String(r.weightKg)+' '+t('kg')+(r.pallets?' · '+r.pallets+' '+t('palletUnit'):'');
  return r.vehicleType||t('vehicle_recovery');
 }
 function sectorCard(type,onPick){
  const card=el('button','sector-card');card.type='button';card.dataset.transportType=type;
  const top=el('div','sector-card-top');
  top.append(el('span','sector-glyph',icons[type]),el('span','sector-arrow','↗'));
  card.append(top,el('strong',null,t(type)),el('small',null,t('desc_'+type)));
  card.addEventListener('click',onPick);
  return card;
 }
 function overview(root,openSection){
  const wrap=el('section','transport-overview');
  const header=el('div','transport-overview-head');
  const text=el('div');text.append(el('h2',null,t('title')),el('p',null,t('intro')));
  header.append(text,btn(t('newOrder'),()=>openForm('freight'),true));
  wrap.append(header);
  const sectors=el('div','sector-grid');
  categories.forEach(type=>sectors.append(sectorCard(type,()=>{selected=type;openSection();})));
  wrap.append(sectors);root.append(wrap);
 }
 function renderHub(root){
  const title=el('div','ops-heading');
  const heading=el('div');heading.append(el('h3',null,t('title')),el('p',null,t('intro')));
  title.append(heading,btn(t('newOrder'),()=>openForm(selected==='all'?'freight':selected),true));
  root.append(title);
  const cards=el('div','transport-sector-summary');
  for(const [v,label]of [[jobs.length,'totalJobs'],[categories.length,'sectors'],[jobs.filter(j=>j.status==='assigned'||j.status==='in_progress').length,'activeJobs']]){
   const card=el('div','ops-kpi');card.append(el('strong',null,v),el('small',null,t(label)));cards.append(card);
  }
  root.append(cards);
  const chipRow=el('div','transport-filters');
  for(const key of ['all',...categories]){
   const filter=btn(t(key),()=>{selected=key;rerender();});
   filter.className='transport-filter '+(selected===key?'active':'');
   chipRow.append(filter);
  }
  root.append(chipRow);
  const list=el('div','transport-job-list');
  const displayed=selected==='all'?jobs:jobs.filter(j=>j.type===selected);
  if(!displayed.length)list.append(el('p','ops-empty',t('none')));
  for(const item of displayed){
   const row=el('div','transport-job');
   const description=el('div','transport-job-primary');
   description.append(span(item.type),el('strong',null,item.client),el('small',null,item.from+' → '+item.to));
   const req=el('div','transport-job-req');req.append(el('small',null,t('requirements')),el('strong',null,requirements(item)));
   const amt=el('div','transport-job-amt');amt.append(el('small',null,t('price')),el('strong',null,'₪'+item.amount.toLocaleString('en-US')));
   const actions=el('div','transport-job-actions');
   actions.append(el('span','ops-state '+(item.status==='completed'?'completed':'assigned'),t(item.status)));
   if(item.status==='waiting'&&getCalendar()?.hasPlan(item.id)){
    actions.append(el('span','ops-state available',t('booked')));
   }else if(item.status==='waiting'){
    const selectDriver=el('select','ops-select transport-driver-select'),selectVehicle=el('select','ops-select transport-vehicle-select');
    const dPlaceholder=el('option',null,t('chooseDriver'));dPlaceholder.value='';selectDriver.append(dPlaceholder);
    const vPlaceholder=el('option',null,t('chooseVehicle'));vPlaceholder.value='';selectVehicle.append(vPlaceholder);
    const drivers=availableDrivers(),vehicles=suitableVehicles(item);
    drivers.forEach(d=>{const option=el('option',null,d.name);option.value=d.id;selectDriver.append(option);});
    vehicles.forEach(v=>{const option=el('option',null,v.name+(v.payloadCapacityKg?' · '+v.payloadCapacityKg+' kg':''));option.value=v.id;selectVehicle.append(option);});
    if(drivers.length&&vehicles.length){
     actions.append(selectDriver,selectVehicle,btn(t('assignFleet'),()=>assign(item,selectDriver.value,selectVehicle.value),true));
    }else actions.append(el('span','transport-no-vehicle',item.type==='heavy_haul'?t('lockedPermit'):t('noCompatible')));
    if(getCalendar())actions.append(btn(t('calendarPlan'),()=>getCalendar().openPlan(item)));
    actions.append(btn(t('cancelService'),()=>step(item,'canceled')));
   }else if(item.status==='assigned'){
    actions.append(el('small','transport-assignment',item.driverName+' · '+item.vehicleName));
    actions.append(btn(t('startService'),()=>step(item,'in_progress'),true));
    actions.append(btn(t('cancelService'),()=>step(item,'canceled')));
   }else if(item.status==='in_progress'){
    actions.append(el('small','transport-assignment',item.driverName+' · '+item.vehicleName));
    actions.append(btn(t('completeService'),()=>step(item,'completed'),true));
   }
   row.append(description,req,amt,actions);list.append(row);
  }
  root.append(el('div','ops-note',t('demo')),list);
 }
 function openForm(type='freight'){
  const dlg=el('dialog','fleet-dialog transport-dialog');
  const form=el('form','fleet-form transport-form');form.noValidate=true;
  form.append(el('h2',null,t('newOrder')));
  const controls={};
  function field(key,kind='text',defaultValue='',required=true){
   const lab=el('label',null,t(key));
   const input=el('input');
   input.type=kind;input.value=defaultValue;input.required=required;input.name=key;input.maxLength=250;
   if(kind==='number'){input.step='any';input.min='0';}
   lab.append(input);form.append(lab);controls[key]=input;return input;
  }
  const label=el('label',null,t('category')),choice=el('select','ops-select');
  choice.name='service';for(const key of categories){const option=el('option',null,t(key));option.value=key;choice.append(option);}
  choice.value=categories.includes(type)?type:'freight';label.append(choice);form.append(label);
  field('client');field('departure');field('arrival');
  const tomorrow=new Date(Date.now()+86400000);
  const localTime=new Date(tomorrow.getTime()-tomorrow.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const date=field('schedule','datetime-local',localTime);
  const dynamic=el('div','transport-fields');form.append(dynamic);
  function conditional(){
   dynamic.replaceChildren();
   const kind=choice.value;
   const add=(key,inputType='number',initial='')=>{
    const lab=el('label',null,t(key)),control=el('input');
    control.name=key;control.type=inputType;control.value=initial;control.required=true;
    if(inputType==='number'){control.step='any';control.min='0';}
    lab.append(control);dynamic.append(lab);return control;
   };
   if(passenger.has(kind)){add('passengers','number','2');add('luggage','number','1');}
   else if(cargo.has(kind)){
    add('weight','number','1200');add('volume','number','8');add('pallets','number','2');
    if(kind==='refrigerated'){add('minTemp','number','2');add('maxTemp','number','6');}
    if(kind==='moving'){add('floor','number','2');}
    if(kind==='heavy_haul')dynamic.append(el('p','ops-note',t('permit')));
   }else add('vehicleType','text','Passenger van');
  }
  choice.addEventListener('change',conditional);conditional();
  field('price','number','350');
  const bar=el('div','ops-dialog-actions');
  bar.append(btn(t('cancel'),()=>dlg.close()),btn(t('save'),()=>form.requestSubmit(),true));
  form.append(bar);dlg.append(form);document.body.append(dlg);
  dlg.addEventListener('close',()=>dlg.remove(),{once:true});
  form.addEventListener('submit',event=>{
   event.preventDefault();
   const values=Object.fromEntries([...form.querySelectorAll('input')].map(x=>[x.name,x.value.trim()]));
   const kind=choice.value;
   const positive=passenger.has(kind)?Number(values.passengers)>0:cargo.has(kind)?Number(values.weight)>0:values.vehicleType.length>=2;
   if(!positive||!values.client||!values.departure||!values.arrival||!Number.isFinite(Number(values.price))||Number(values.price)<0||!date.value){notify(t('validation'));return;}
   if(kind==='refrigerated'&&Number(values.minTemp)>Number(values.maxTemp)){notify(t('validation'));return;}
   const summary=passenger.has(kind)?{passengers:Number(values.passengers),luggagePieces:Number(values.luggage)}:cargo.has(kind)?{weightKg:Number(values.weight),volumeM3:Number(values.volume),pallets:Number(values.pallets),...(kind==='refrigerated'?{minTemperatureC:Number(values.minTemp),maxTemperatureC:Number(values.maxTemp)}:{})}:{vehicleType:values.vehicleType};
   jobs.unshift({id:'TX-'+(++nextId),type:kind,client:values.client,from:values.departure,to:values.arrival,summary,status:'waiting',amount:Number(values.price),scheduledAt:new Date(date.value).toISOString()});
   selected='all';dlg.close();notify(t('created'));rerender();
  });
  dlg.showModal();
 }
 return {overview,renderHub,openForm,jobs,categoryKeys:categories};
}
