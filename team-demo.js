// Static employee access-control walkthrough. Fictional data only.
export function createTeamDemo({locale,render,toast}){
 const team=[
  {id:'ST-100',name:'System Control',email:'owner@northline.example',role:'owner',active:true},
  {id:'ST-101',name:'Alex Morgan',email:'alex@northline.example',role:'manager',active:true},
  {id:'ST-102',name:'Maya Shahar',email:'maya@northline.example',role:'dispatcher',active:true},
  {id:'ST-103',name:'Daniel Gold',email:'daniel@northline.example',role:'finance',active:true},
  {id:'ST-104',name:'Yossi Bar',email:'yossi@northline.example',role:'driver',active:true}
 ];
 const pending=[];
 const translations={
  ru:{title:'Сотрудники и разрешения',desc:'Рабочие доступы, приглашения и ответственность сотрудников.',invite:'Пригласить сотрудника',employees:'Сотрудники',
    active:'Активен',blocked:'Отключён',role:'Роль',email:'Почта',name:'Сотрудник',actions:'Действия',disable:'Отключить',enable:'Восстановить',
    invited:'Ожидает приглашения',rolesTitle:'Матрица доступа',owner:'Владелец',manager:'Руководитель',dispatcher:'Диспетчер',finance:'Бухгалтерия',driver:'Водитель',corporate:'Корпоративный клиент',
    change:'Роль изменена',updated:'Доступ обновлён',sent:'Демонстрационное приглашение добавлено',titleInvite:'Приглашение сотрудника',
    emailPlaceholder:'email@example.com',chooseRole:'Выберите роль',cancel:'Отмена',add:'Добавить в список',invalid:'Введите корректный адрес и роль',
    note:'Демо: приглашения и изменения ролей не отправляются на сервер. Данные действуют только на этой странице.',
    permission:'Действия по роли',bookings:'Заказы',team:'Сотрудники',billing:'Финансы',operation:'Автопарк'},
  en:{title:'Team and permissions',desc:'Staff responsibilities, invitations and access control.',invite:'Invite employee',employees:'Employees',
    active:'Active',blocked:'Disabled',role:'Role',email:'Email',name:'Employee',actions:'Actions',disable:'Disable',enable:'Restore',
    invited:'Invitation pending',rolesTitle:'Access matrix',owner:'Owner',manager:'Manager',dispatcher:'Dispatcher',finance:'Finance',driver:'Driver',corporate:'Corporate customer',
    change:'Role updated',updated:'Access updated',sent:'Demo invitation added',titleInvite:'Invite an employee',
    emailPlaceholder:'email@example.com',chooseRole:'Choose a role',cancel:'Cancel',add:'Add to preview',invalid:'Enter a valid email and role',
    note:'Demo: no real invitations are sent. Changes exist only in this page.',
    permission:'Permissions by role',bookings:'Bookings',team:'Staff',billing:'Finance',operation:'Fleet'},
  he:{title:'צוות והרשאות',desc:'תפקידים, הזמנות וניהול גישה לעובדים.',invite:'הזמנת עובד',employees:'עובדים',
    active:'פעיל',blocked:'מושבת',role:'תפקיד',email:'דוא״ל',name:'עובד',actions:'פעולות',disable:'השבתה',enable:'הפעלה',
    invited:'ממתין להזמנה',rolesTitle:'טבלת הרשאות',owner:'בעלים',manager:'מנהל',dispatcher:'סדרן',finance:'כספים',driver:'נהג',corporate:'לקוח עסקי',
    change:'התפקיד עודכן',updated:'הגישה עודכנה',sent:'נוספה הזמנת הדגמה',titleInvite:'הזמנת עובד',
    emailPlaceholder:'email@example.com',chooseRole:'בחירת תפקיד',cancel:'ביטול',add:'הוספה להדגמה',invalid:'יש להזין דוא״ל ותפקיד תקינים',
    note:'הדגמה בלבד: הזמנות והרשאות אינן נשלחות לשרת. השינויים נשמרים בדף זה בלבד.',
    permission:'הרשאות לפי תפקיד',bookings:'הזמנות',team:'צוות',billing:'כספים',operation:'צי רכב'}
 };
 const t=(k)=>translations[locale()]?.[k]||translations.ru[k]||k;
 let sequence=105;
 function el(tag,cls,value){const x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=String(value);return x;}
 function action(title,click,primary=false){const b=el('button',primary?'primary-btn':'outline-btn',title);b.type='button';b.addEventListener('click',click);return b;}
 function inviteForm(){
  const dialog=el('dialog','fleet-dialog'),form=el('form','fleet-form');
  form.append(el('h2',null,t('titleInvite')));
  const label=el('label',null,t('email')),email=el('input');
  email.type='email';email.maxLength=254;email.placeholder=t('emailPlaceholder');label.append(email);form.append(label);
  const rl=el('label',null,t('role')),select=el('select','ops-select');
  const start=el('option',null,t('chooseRole'));start.value='';select.append(start);
  for(const r of ['manager','dispatcher','finance','driver','corporate']){
   const o=el('option',null,t(r));o.value=r;select.append(o);
  }
  rl.append(select);form.append(rl);
  const controls=el('div','ops-dialog-actions');
  controls.append(action(t('cancel'),()=>dialog.close()),action(t('add'),()=>form.requestSubmit(),true));
  form.append(controls);dialog.append(form);document.body.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  form.addEventListener('submit',event=>{
   event.preventDefault();
   const address=email.value.trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)||!select.value||team.some(m=>m.email===address)||pending.some(m=>m.email===address)){toast(t('invalid'));return;}
   pending.push({id:'ST-'+sequence++,email:address,role:select.value});
   dialog.close();toast(t('sent'));render();
  });
  dialog.showModal();
 }
 function renderTeam(root){
  const heading=el('div','ops-heading');
  const text=el('div');text.append(el('h3',null,t('title')),el('p',null,t('desc')));
  heading.append(text,action(t('invite'),inviteForm,true));root.append(heading);
  const note=el('div','ops-note',t('note'));root.append(note);
  const list=el('div','ops-list');
  for(const user of team){
   const row=el('div','ops-entry team-entry');
   const identity=el('div','ops-entry-identity');identity.append(el('strong',null,user.name),el('small',null,user.email));
   const status=el('div','ops-entry-status');status.append(el('span','ops-state '+(user.active?'available':'offline'),user.active?t('active'):t('blocked')));
   const controls=el('div','team-row-actions');
   const select=el('select','ops-select');
   select.setAttribute('aria-label',t('role')+' '+user.name);
   for(const r of ['owner','manager','dispatcher','finance','driver','corporate']){
    if(r==='owner'&&user.role!=='owner')continue;
    const o=el('option',null,t(r));o.value=r;o.selected=r===user.role;select.append(o);
   }
   select.disabled=user.role==='owner';
   select.addEventListener('change',()=>{user.role=select.value;toast(t('change'));render();});
   controls.append(select);
   if(user.role!=='owner')controls.append(action(user.active?t('disable'):t('enable'),()=>{user.active=!user.active;toast(t('updated'));render();}));
   else controls.append(el('span','ops-owner-lock',t('owner')));
   row.append(identity,status,controls);list.append(row);
  }
  for(const req of pending){
   const row=el('div','ops-entry team-entry');
   const identity=el('div','ops-entry-identity');identity.append(el('strong',null,req.email),el('small',null,t(req.role)));
   row.append(identity,el('span','ops-state pending',t('invited')));
   row.append(action(t('cancel'),()=>{pending.splice(pending.indexOf(req),1);render();}));
   list.append(row);
  }
  root.append(list);
  const matrix=el('section','ops-permission-matrix');
  matrix.append(el('h3',null,t('rolesTitle')));
  const table=el('div','team-grid');
  const headings=['role','bookings','operation','billing','team'];
  headings.forEach(label=>table.append(el('span','team-grid-heading',t(label))));
  const perms={owner:[1,1,1,1],manager:[1,1,0,0],dispatcher:[1,1,0,0],finance:[0,0,1,0],driver:[0,0,0,0],corporate:[0,0,0,0]};
  for(const [role,values] of Object.entries(perms)){
   table.append(el('strong',null,t(role)));
   values.forEach(v=>table.append(el('span',v?'team-permitted':'team-denied',v?'✓':'—')));
  }
  matrix.append(table);root.append(matrix);
 }
 return {renderTeam,team,pending};
}
