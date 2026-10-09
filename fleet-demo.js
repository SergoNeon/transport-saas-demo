// Browser-only transport operations demonstration; never accesses production APIs.
// All records are fictional and reset on page reload.
export function createFleetDemo({t,render,toast}) {
  let nextDriver=209,nextVehicle=109;
  const drivers=[
    {id:'DR-201',name:'Omer Levi',phone:'050-100-2020',status:'on_trip'},
    {id:'DR-202',name:'Gal Azulay',phone:'050-100-2030',status:'on_trip'},
    {id:'DR-203',name:'Ronen Shalev',phone:'050-100-2040',status:'available'},
    {id:'DR-204',name:'Dana Amir',phone:'050-100-2050',status:'available'},
    {id:'DR-205',name:'Lior Segal',phone:'050-100-2060',status:'offline'}
  ];
  const vehicles=[
    {id:'VH-101',name:'Mercedes E-Class',plate:'123-45-678',capacity:4,status:'in_service'},
    {id:'VH-102',name:'Toyota Camry',plate:'445-88-991',capacity:4,status:'available'},
    {id:'VH-103',name:'Mercedes V-Class',plate:'298-67-882',capacity:7,status:'available'},
    {id:'VH-104',name:'Skoda Superb',plate:'900-22-551',capacity:4,status:'in_service'},
    {id:'VH-105',name:'VW Caddy',plate:'454-90-101',capacity:6,status:'maintenance'}
  ];
  const lang={
    ru:{driverTitle:'Реестр водителей',vehicleTitle:'Транспорт компании',dispatchTitle:'Управление заказами',
      addDriver:'Добавить водителя',addVehicle:'Добавить автомобиль',name:'Имя',phone:'Телефон',
      plate:'Номер автомобиля',capacity:'Мест',driver:'Водитель',vehicle:'Автомобиль',status:'Состояние',
      available:'Свободен',on_trip:'В поездке',offline:'Вне смены',maintenance:'На обслуживании',in_service:'Занят',
      action:'Действие',enable:'На линию',disable:'Снять с линии',service:'На ТО',back:'Вернуть в строй',
      save:'Сохранить',cancel:'Отмена',assign:'Назначить',noDriver:'Выберите водителя',
      noVehicle:'Выберите транспорт',pending:'Ждёт назначения',assigned:'Назначен',en_route:'Выехал',arrived:'На месте',
      in_progress:'В поездке',completed:'Завершён',canceled:'Отменён',no_show:'Неявка',
      next:'Следующий этап',freeDrivers:'Свободные водители',freeVehicles:'Доступный транспорт',
      inProgress:'В работе',registered:'Всего зарегистрировано',wrongCapacity:'Недостаточно пассажирских мест',
      busy:'Ресурс занят — выберите другой',driverSaved:'Водитель добавлен в демоверсию',
      vehicleSaved:'Автомобиль добавлен в демоверсию',assignedToast:'Водитель и автомобиль назначены',
      updated:'Статус обновлён',demoNote:'Демонстрационные данные · изменения действуют только в этой вкладке',
      booking:'Заявка',route:'Маршрут',noPending:'Нет заказов, ожидающих назначения',
      validPhone:'Укажите имя и телефон',validVehicle:'Укажите название, госномер и вместимость',
      noVehicles:'Нет подходящих свободных автомобилей',noDrivers:'Нет свободных водителей',seat:'мест'},
    en:{driverTitle:'Driver roster',vehicleTitle:'Fleet registry',dispatchTitle:'Dispatch operations',
      addDriver:'Add driver',addVehicle:'Add vehicle',name:'Name',phone:'Phone',
      plate:'Registration',capacity:'Seats',driver:'Driver',vehicle:'Vehicle',status:'Status',
      available:'Available',on_trip:'On trip',offline:'Off shift',maintenance:'Maintenance',in_service:'Assigned',
      action:'Action',enable:'Start shift',disable:'End shift',service:'Maintenance',back:'Return to service',
      save:'Save',cancel:'Cancel',assign:'Assign',noDriver:'Choose driver',
      noVehicle:'Choose vehicle',pending:'Unassigned',assigned:'Assigned',en_route:'On the way',arrived:'Arrived',
      in_progress:'On trip',completed:'Completed',canceled:'Canceled',no_show:'No-show',
      next:'Next stage',freeDrivers:'Available drivers',freeVehicles:'Available vehicles',
      inProgress:'Active rides',registered:'Total registered',wrongCapacity:'Vehicle has insufficient seats',
      busy:'Resource already booked',driverSaved:'Driver added to demo',
      vehicleSaved:'Vehicle added to demo',assignedToast:'Driver and vehicle assigned',
      updated:'Status updated',demoNote:'Illustrative records · changes are local to this browser tab',
      booking:'Booking',route:'Route',noPending:'No bookings waiting for assignment',
      validPhone:'Enter a name and phone number',validVehicle:'Enter the vehicle, plate and capacity',
      noVehicles:'No suitable available vehicles',noDrivers:'No available drivers',seat:'seats'},
    he:{driverTitle:'רשימת נהגים',vehicleTitle:'רשימת כלי רכב',dispatchTitle:'ניהול הזמנות',
      addDriver:'הוספת נהג',addVehicle:'הוספת רכב',name:'שם',phone:'טלפון',
      plate:'מספר רישוי',capacity:'מושבים',driver:'נהג',vehicle:'רכב',status:'סטטוס',
      available:'זמין',on_trip:'בנסיעה',offline:'לא במשמרת',maintenance:'בטיפול',in_service:'משובץ',
      action:'פעולה',enable:'תחילת משמרת',disable:'סיום משמרת',service:'טיפול',back:'חזרה לשירות',
      save:'שמירה',cancel:'ביטול',assign:'שיבוץ',noDriver:'בחירת נהג',
      noVehicle:'בחירת רכב',pending:'ממתין לשיבוץ',assigned:'שובץ',en_route:'בדרך',arrived:'הגיע',
      in_progress:'בנסיעה',completed:'הושלם',canceled:'בוטל',no_show:'לא הגיע',
      next:'שלב הבא',freeDrivers:'נהגים זמינים',freeVehicles:'רכבים זמינים',
      inProgress:'נסיעות פעילות',registered:'סה"כ רשומים',wrongCapacity:'אין מספיק מקומות ברכב',
      busy:'הנהג או הרכב כבר משובצים',driverSaved:'נהג נוסף להדגמה',
      vehicleSaved:'רכב נוסף להדגמה',assignedToast:'נהג ורכב שובצו בהצלחה',
      updated:'הסטטוס עודכן',demoNote:'נתונים להמחשה בלבד · השינויים מקומיים ללשונית זו',
      booking:'הזמנה',route:'מסלול',noPending:'אין הזמנות הממתינות לשיבוץ',
      validPhone:'הזינו שם ומספר טלפון',validVehicle:'הזינו סוג רכב, מספר ומספר מושבים',
      noVehicles:'אין רכבים זמינים מתאימים',noDrivers:'אין נהגים זמינים',seat:'מקומות'}
  };
  const tr=(key)=>lang[t()]?.[key]??lang.ru[key]??key;
  function element(tag,cls,text) {
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(text!==undefined)e.textContent=String(text);
    return e;
  }
  const button=(text,cb,primary=false)=>{
    const b=element('button',primary?'primary-btn':'outline-btn',text);
    b.type='button';b.addEventListener('click',cb);return b;
  };
  function summary(root,items){
    const grid=element('div','ops-summary');
    for(const [value,label]of items){
      const card=element('div','ops-kpi');
      card.append(element('strong',null,value),element('small',null,label));
      grid.append(card);
    }
    root.append(grid);
  }
  function dialog(title,fields,onSave){
    const modal=element('dialog','fleet-dialog');
    const form=element('form','fleet-form');form.noValidate=true;
    form.append(element('h2',null,title));
    const controls={};
    for(const field of fields){
      const label=element('label',null,tr(field.label));
      const input=element('input');
      input.name=field.key;
      input.required=true;
      input.maxLength=field.max||60;
      if(field.type)input.type=field.type;
      if(field.min)input.min=field.min;
      input.placeholder=tr(field.label);
      label.append(input);form.append(label);
      controls[field.key]=input;
    }
    const footer=element('div','ops-dialog-actions');
    footer.append(button(tr('cancel'),()=>modal.close()),button(tr('save'),()=>form.requestSubmit(),true));
    form.append(footer);
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const values=Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,v.value.trim()]));
      if(onSave(values)!==false)modal.close();
    });
    modal.append(form);document.body.append(modal);
    modal.addEventListener('close',()=>modal.remove(),{once:true});
    modal.showModal();
  }
  function driverForm(){
    dialog(tr('addDriver'),[{key:'name',label:'name'},{key:'phone',label:'phone',type:'tel',max:32}],values=>{
      if(values.name.length<2||values.phone.length<3){toast(tr('validPhone'));return false;}
      drivers.push({id:'DR-'+(++nextDriver),name:values.name,phone:values.phone,status:'available'});
      toast(tr('driverSaved'));render();
    });
  }
  function vehicleForm(){
    dialog(tr('addVehicle'),[{key:'name',label:'vehicle'},{key:'plate',label:'plate',max:22},{key:'capacity',label:'capacity',type:'number',min:'1'}],values=>{
      const cap=Number(values.capacity);
      if(values.name.length<2||values.plate.length<3||!Number.isInteger(cap)||cap<1||cap>80){toast(tr('validVehicle'));return false;}
      vehicles.push({id:'VH-'+(++nextVehicle),name:values.name,plate:values.plate.toUpperCase(),capacity:cap,status:'available'});
      toast(tr('vehicleSaved'));render();
    });
  }
  function actionRow(item,type){
    const wrap=element('div','ops-entry');
    const id=element('div','ops-entry-identity');
    id.append(element('strong',null,item.name),element('small',null,type==='driver'?item.phone:item.plate+' · '+item.capacity+' '+tr('seat')));
    const meta=element('div','ops-entry-status');
    const state=element('span','ops-state '+item.status,tr(item.status));meta.append(state);
    const actions=element('div','ops-entry-actions');
    if(type==='driver'&&item.status!=='on_trip'){
      actions.append(button(item.status==='offline'?tr('enable'):tr('disable'),()=>{
        item.status=item.status==='offline'?'available':'offline';render();toast(tr('updated'));
      }));
    }
    if(type==='vehicle'&&item.status!=='in_service'){
      actions.append(button(item.status==='maintenance'?tr('back'):tr('service'),()=>{
        item.status=item.status==='maintenance'?'available':'maintenance';render();toast(tr('updated'));
      }));
    }
    wrap.append(id,meta,actions);
    return wrap;
  }
  function fleet(container,section){
    const isDrivers=section==='drivers',items=isDrivers?drivers:vehicles;
    const heading=element('div','ops-heading');
    const left=element('div');
    left.append(element('h3',null,isDrivers?tr('driverTitle'):tr('vehicleTitle')),element('p',null,tr('demoNote')));
    heading.append(left,button(isDrivers?tr('addDriver'):tr('addVehicle'),isDrivers?driverForm:vehicleForm,true));
    container.append(heading);
    summary(container,[[items.length,tr('registered')],[items.filter(i=>i.status==='available').length,isDrivers?tr('freeDrivers'):tr('freeVehicles')],[items.filter(i=>i.status==='on_trip'||i.status==='in_service').length,tr('inProgress')]]);
    const list=element('div','ops-list');
    items.forEach(i=>list.append(actionRow(i,isDrivers?'driver':'vehicle')));
    container.append(list);
  }
  function statusNext(item){
    const steps=['assigned','en_route','arrived','in_progress','completed'];
    const idx=steps.indexOf(item.status);
    return idx>=0&&idx<steps.length-1?steps[idx+1]:null;
  }
  function reserve(b,driverId,vehicleId){
    const d=drivers.find(x=>x.id===driverId),v=vehicles.find(x=>x.id===vehicleId);
    if(!d||!v||d.status!=='available'||v.status!=='available'){toast(tr('busy'));return;}
    if(v.capacity<(b.passengers||1)){toast(tr('wrongCapacity'));return;}
    d.status='on_trip';v.status='in_service';b.status='assigned';b.driver=d.name;b.demoDriverId=d.id;b.demoVehicleId=v.id;
    toast(tr('assignedToast'));render();
  }
  function advance(b,next){
    if(!next)return;
    b.status=next;
    if(next==='completed'){
      const d=drivers.find(x=>x.id===b.demoDriverId),v=vehicles.find(x=>x.id===b.demoVehicleId);
      if(d)d.status='available';
      if(v)v.status='available';
    }
    toast(tr('updated'));render();
  }
  function dispatch(container,bookings){
    const heading=element('div','ops-heading');
    const left=element('div');
    left.append(element('h3',null,tr('dispatchTitle')),element('p',null,tr('demoNote')));
    heading.append(left);container.append(heading);
    summary(container,[[bookings.filter(b=>b.status==='pending').length,tr('pending')],[drivers.filter(x=>x.status==='available').length,tr('freeDrivers')],[vehicles.filter(x=>x.status==='available').length,tr('freeVehicles')]]);
    const list=element('div','ops-list');
    const orders=bookings.filter(b=>b.status!=='completed');
    if(orders.length===0)list.append(element('p','ops-empty',tr('noPending')));
    for(const b of orders){
      const row=element('div','ops-booking');
      const intro=element('div','ops-booking-title');
      intro.append(element('strong',null,'#'+b.id+' · '+b.customer),element('p',null,b.pickup+' → '+b.dropoff));
      const state=element('span','ops-state '+b.status,tr(b.status));
      const controls=element('div','ops-dispatch-controls');
      if(b.status==='pending'){
        const driver=element('select','ops-select'),vehicle=element('select','ops-select');
        driver.append(element('option',null,tr('noDriver')));
        vehicle.append(element('option',null,tr('noVehicle')));
        driver.firstChild.value='';
        vehicle.firstChild.value='';
        for(const d of drivers.filter(x=>x.status==='available')){
          const option=element('option',null,d.name);option.value=d.id;driver.append(option);
        }
        for(const v of vehicles.filter(x=>x.status==='available'&&x.capacity>=(b.passengers||1))){
          const option=element('option',null,v.name+' · '+v.capacity+' '+tr('seat'));option.value=v.id;vehicle.append(option);
        }
        controls.append(driver,vehicle,button(tr('assign'),()=>{
          if(!driver.value||!vehicle.value){toast(tr('busy'));return;}
          reserve(b,driver.value,vehicle.value);
        },true));
      }else{
        controls.append(element('div','ops-assigned',b.driver||tr('assigned')));
        const next=statusNext(b);
        if(next)controls.append(button(tr('next')+': '+tr(next),()=>advance(b,next),true));
      }
      row.append(intro,state,controls);list.append(row);
    }
    container.append(list);
  }
  return {renderFleet:fleet,renderDispatch:dispatch,drivers,vehicles};
}
