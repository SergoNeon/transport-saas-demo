import {createFleetDemo} from './fleet-demo.js';
import {createTeamDemo} from './team-demo.js';
import {createTransportDemo} from './transport-demo.js';
import {createCalendarDemo} from './calendar-demo.js';
// Interactive UI demonstrator — FICTIONAL DATA ONLY.
// Not connected to backend, maps, payment provider or passenger database.
const translations = {
  ru: {
    workspace:"Демонстрационная компания",workspaceTitle:"РАБОЧАЯ ОБЛАСТЬ",settingsTitle:"СИСТЕМА",
    dashboard:"Панель управления",transport:"Все перевозки",transportDetail:"Грузы, пассажиры, доставка, переезды и специализированная логистика.",calendar:"Календарь рейсов",calendarDetail:"Распределение будущих перевозок по времени и экипажам.",bookings:"Заказы",dispatch:"Диспетчерская",drivers:"Водители",fleet:"Автопарк",shifts:"Смены",team:"Команда",customers:"Клиенты и CRM",
    finance:"Финансы",analytics:"Аналитика",settings:"Настройки",trial:"ПРОБНЫЙ ПЕРИОД",trialTime:"30 дней бесплатно",
    demoOnboard:"Создать демо-компанию →",
    trialHint:"Без банковской карты. Автоматических списаний нет.",plans:"Посмотреть тарифы ↗",admin:"Владелец компании · DEMO",
    operations:"Операции",live:"DEMO · ОПЕРАЦИОННЫЙ ЦЕНТР",title:"Все перевозки. Одна система.",
    subtitle:"Пассажиры, грузы, доставка и спецтранспорт в одной диспетчерской.",newBooking:"Новый заказ",demoTag:"ИНТЕРАКТИВНОЕ ДЕМО",
    demoDesc:"Все данные вымышлены. Заказы на этом экране не отправляются реальным водителям.",todayRides:"Заказов за сегодня",availableDrivers:"Водителей на линии",
    completed:"Выполнено поездок",revenue:"Выручка перевозчика",vsYesterday:"к предыдущему дню",activeShift:"Активная смена",
    sampleMoney:"Демонстрационные суммы",operationsMap:"Операционная карта",mapHint:"Демонстрация расположения транспорта",
    available:"Свободен",onRide:"В поездке",dispatchQueue:"Очередь диспетчера",queueHint:"Заказы, требующие внимания",
    allBookings:"Посмотреть все заказы →",recentBookings:"Последние заказы",recentHint:"Операции транспортной компании",
    viewAll:"Все заказы →",bookingNum:"ЗАКАЗ",route:"МАРШРУТ",client:"КЛИЕНТ",driver:"ВОДИТЕЛЬ",amount:"СУММА",status:"СТАТУС",
    newOrderEyebrow:"DISPATCH / BOOKING",createBooking:"Создать заказ",pickup:"Откуда",dropoff:"Куда",
    passengers:"Пассажиры",price:"Стоимость, ₪",cancel:"Отмена",saveBooking:"Сохранить заказ",
    pending:"Ожидает",assigned:"Назначен",finished:"Завершён",assign:"Назначить",finish:"Завершить",
    unassigned:"Не назначен",newSaved:"Демонстрационный заказ добавлен",driverAssigned:"Водитель назначен",rideFinished:"Демонстрационная поездка завершена",
    demoDetail:"Интерактивный прототип модуля. Реальные данные и функции подключения будут добавлены после разработки защищённого API.",
    demoNote:"ДЕМО-ПОКАЗАТЕЛИ · не реальные операции",plansTitle:"Тарифы",viewDashboard:"К панели управления",
    planText:"30 дней бесплатного использования без карты. После пробного периода оплачивается выбранный план.",
    settingDetail:"Права доступа, компания, язык, тарифы и безопасность.",
    bookingDetail:"Заказы, маршруты, назначения и история поездок.",
    dispatchDetail:"Список активных заявок и распределение заказов.",
    driversDetail:"Смены, документы, доступность и водительские аккаунты.",
    fleetDetail:"Транспорт, вместимость, техническое обслуживание.",
    customersDetail:"Контакты, корпоративные договоры и история поездок.",
    financeDetail:"Расчёты, счета и бухгалтерские отчёты перевозчика.",
    analyticsDetail:"Производительность диспетчеров, заказы, загрузка автомобилей.",
    bookingsMetric:"Демонстрационных заказов",fleetMetric:"Автомобилей в базе",driverMetric:"Активных смен",
    companiesMetric:"Корпоративных клиентов",pricePerMonth:"в месяц, без НДС"
  },
  en: {
    workspace:"Demo transport company",workspaceTitle:"WORKSPACE",settingsTitle:"SYSTEM",
    dashboard:"Overview",transport:"All transport",transportDetail:"Cargo, passenger trips, deliveries, moves and specialist logistics.",calendar:"Dispatch calendar",calendarDetail:"Upcoming jobs, crews and availability by time slot.",bookings:"Bookings",dispatch:"Dispatch center",drivers:"Drivers",fleet:"Fleet",shifts:"Shifts",team:"Team",customers:"Customers & CRM",
    finance:"Finance",analytics:"Analytics",settings:"Settings",trial:"FREE TRIAL",trialTime:"30 days free",
    demoOnboard:"Create a demo company →",
    trialHint:"No card required. No automatic charges.",plans:"Explore plans ↗",admin:"Company owner · DEMO",
    operations:"Operations",live:"DEMO · OPERATIONS CONTROL",title:"Every shipment. Every passenger.",
    subtitle:"Passengers, freight, couriers and specialist transport in one workspace.",newBooking:"New booking",demoTag:"INTERACTIVE DEMO",
    demoDesc:"All data is fictional. Orders are not sent to real drivers.",todayRides:"Bookings today",availableDrivers:"Drivers online",
    completed:"Completed rides",revenue:"Carrier revenue",vsYesterday:"vs yesterday",activeShift:"On active shift",
    sampleMoney:"Illustrative amounts",operationsMap:"Operations map",mapHint:"Illustrative vehicle positions",
    available:"Available",onRide:"On ride",dispatchQueue:"Dispatch queue",queueHint:"Bookings requiring attention",
    allBookings:"View all bookings →",recentBookings:"Recent bookings",recentHint:"Carrier operations",
    viewAll:"All bookings →",bookingNum:"BOOKING",route:"ROUTE",client:"CUSTOMER",driver:"DRIVER",amount:"AMOUNT",status:"STATUS",
    newOrderEyebrow:"DISPATCH / BOOKING",createBooking:"Create booking",pickup:"Pickup",dropoff:"Dropoff",
    passengers:"Passengers",price:"Fare, ₪",cancel:"Cancel",saveBooking:"Save booking",
    pending:"Pending",assigned:"Assigned",finished:"Completed",assign:"Assign",finish:"Complete",
    unassigned:"Unassigned",newSaved:"Demo booking added",driverAssigned:"Driver assigned",rideFinished:"Demo ride completed",
    demoDetail:"Interactive module concept. Real data and connected operations require the secure backend.",
    demoNote:"DEMO NUMBERS · not real operations",plansTitle:"Pricing",viewDashboard:"Back to overview",
    planText:"30-day free trial without a card. Select a paid plan after the trial.",
    settingDetail:"Roles, company settings, languages, plans and security.",
    bookingDetail:"Trips, routes, assignments and trip history.",
    dispatchDetail:"Live booking queue and dispatch decisions.",
    driversDetail:"Shifts, documents, availability and driver accounts.",
    fleetDetail:"Vehicles, passenger capacity and maintenance.",
    customersDetail:"Contacts, corporate accounts and ride history.",
    financeDetail:"Carrier payments, invoices and operational reporting.",
    analyticsDetail:"Dispatch performance, bookings and fleet utilization.",
    bookingsMetric:"Demo bookings",fleetMetric:"Fleet vehicles",driverMetric:"Active shifts",
    companiesMetric:"Corporate customers",pricePerMonth:"per month, excluding VAT"
  },
  he: {
    workspace:"חברת הדגמה",workspaceTitle:"סביבת עבודה",settingsTitle:"מערכת",
    dashboard:"לוח בקרה",transport:"כל סוגי ההובלה",transportDetail:"מטענים, נוסעים, שליחויות והובלה מיוחדת.",calendar:"יומן הובלות",calendarDetail:"תכנון נסיעות עתידיות ושיבוץ צוותים.",bookings:"הזמנות",dispatch:"מרכז סדרנות",drivers:"נהגים",fleet:"צי רכבים",shifts:"משמרות",team:"צוות",customers:"לקוחות ו-CRM",
    finance:"כספים",analytics:"ניתוח נתונים",settings:"הגדרות",trial:"תקופת ניסיון",trialTime:"30 ימים בחינם",
    demoOnboard:"יצירת חברת הדגמה ←",
    trialHint:"ללא כרטיס אשראי. ללא חיוב אוטומטי.",plans:"לצפייה בחבילות ↗",admin:"בעל החברה · הדגמה",
    operations:"תפעול",live:"הדגמה · מרכז בקרה",title:"כל סוגי ההובלה. מערכת אחת.",
    subtitle:"הסעות, מטענים, משלוחים והובלה מיוחדת במערכת אחת.",newBooking:"הזמנה חדשה",demoTag:"הדגמה אינטראקטיבית",
    demoDesc:"כל הנתונים בדיוניים. ההזמנות אינן נשלחות לנהגים אמיתיים.",todayRides:"הזמנות היום",availableDrivers:"נהגים זמינים",
    completed:"נסיעות שהושלמו",revenue:"הכנסות המפעיל",vsYesterday:"בהשוואה לאתמול",activeShift:"משמרת פעילה",
    sampleMoney:"סכומים להמחשה",operationsMap:"מפת פעילות",mapHint:"מיקומי רכבים להמחשה",
    available:"זמין",onRide:"בנסיעה",dispatchQueue:"תור סדרנות",queueHint:"הזמנות הדורשות טיפול",
    allBookings:"לכל ההזמנות ←",recentBookings:"הזמנות אחרונות",recentHint:"פעילות חברת ההסעות",
    viewAll:"כל ההזמנות ←",bookingNum:"הזמנה",route:"מסלול",client:"לקוח",driver:"נהג",amount:"סכום",status:"סטטוס",
    newOrderEyebrow:"DISPATCH / BOOKING",createBooking:"יצירת הזמנה",pickup:"נקודת איסוף",dropoff:"יעד",
    passengers:"נוסעים",price:"מחיר, ₪",cancel:"ביטול",saveBooking:"שמירת הזמנה",
    pending:"ממתין",assigned:"שויך",finished:"הושלם",assign:"שיוך",finish:"סיום",
    unassigned:"לא שובץ",newSaved:"הזמנת הדגמה נוצרה",driverAssigned:"נהג שובץ",rideFinished:"נסיעת הדגמה הושלמה",
    demoDetail:"הדגמה של המודול. חיבור לנתונים אמיתיים יתבצע לאחר פיתוח ממשק מאובטח.",
    demoNote:"נתוני הדגמה בלבד · לא פעילות אמיתית",plansTitle:"תוכניות",viewDashboard:"חזרה ללוח הבקרה",
    planText:"30 ימי ניסיון ללא כרטיס אשראי. לאחר מכן בוחרים תוכנית בתשלום.",
    settingDetail:"הרשאות, פרטי חברה, שפות, חבילות ואבטחה.",
    bookingDetail:"הזמנות, מסלולים, שיבוצים והיסטוריית נסיעות.",
    dispatchDetail:"תור הזמנות פעיל וניהול שיבוצים.",
    driversDetail:"משמרות, מסמכים, זמינות וחשבונות נהגים.",
    fleetDetail:"רכבים, קיבולת ותחזוקה.",
    customersDetail:"אנשי קשר, לקוחות עסקיים והיסטוריית נסיעות.",
    financeDetail:"חשבונות, תשלומים ודיווחים פיננסיים.",
    analyticsDetail:"ביצועי סדרנות, הזמנות וניצול הרכבים.",
    bookingsMetric:"הזמנות הדגמה",fleetMetric:"רכבים בצי",driverMetric:"משמרות פעילות",
    companiesMetric:"לקוחות עסקיים",pricePerMonth:"לחודש, לפני מע״מ"
  }
};
let locale = "ru";
let section = "dashboard";
let nextId = 2060;
const seed = [
  { id:"TR-2051", pickup:"Ben Gurion Airport T3", dropoff:"Tel Aviv · Rothschild", customer:"Daniel Cohen", driver:"Omer Levi", amount:245, status:"assigned", time:"09:20" },
  { id:"TR-2052", pickup:"Herzliya Marina", dropoff:"Jerusalem · City Center", customer:"Avi Rosen", driver:"", amount:430, status:"pending", time:"09:45" },
  { id:"TR-2053", pickup:"Tel Aviv · Savidor", dropoff:"Ramat Gan · Bursa", customer:"Maya Kaplan", driver:"Yossi Bar", amount:96, status:"completed", time:"08:50" },
  { id:"TR-2054", pickup:"Petah Tikva", dropoff:"Ben Gurion Airport T3", customer:"Noa Shahar", driver:"", amount:185, status:"pending", time:"10:15" },
  { id:"TR-2055", pickup:"Netanya · Center", dropoff:"Tel Aviv · Azrieli", customer:"Eyal Nahum", driver:"Gal Azulay", amount:165, status:"assigned", time:"10:30" }
];
const bookings = structuredClone(seed);
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const t = (key) => translations[locale][key] || key;

function statusLabel(status) {
  return status === "pending" ? t("pending") : status === "assigned" ? t("assigned") : t("finished");
}
function chip(status) {
  const span = document.createElement("span");
  span.className = "tag " + status;
  span.textContent = statusLabel(status);
  return span;
}
function textCell(row, value, className) {
  const td = row.insertCell();
  if (className) td.className = className;
  td.textContent = value;
  return td;
}
function actionCell(row, booking) {
  const td = row.insertCell();
  if (booking.status === "completed") return td;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "small-action";
  button.textContent = booking.status === "pending" ? t("assign") : t("finish");
  button.addEventListener("click", () => navigate("dispatch"));
  td.append(button);
  return td;
}
function advanceBooking(id) {
  const item = bookings.find((b) => b.id === id);
  if (!item) return;
  if (item.status === "pending") {
    item.status = "assigned";
    item.driver = "Omer Levi";
    toast(t("driverAssigned"));
  } else if (item.status === "assigned") {
    item.status = "completed";
    toast(t("rideFinished"));
  }
  render();
}
function renderTable(target, list) {
  target.replaceChildren();
  list.forEach((booking) => {
    const tr = document.createElement("tr");
    const tdId = textCell(tr, "#" + booking.id, "booking-id");
    tdId.className = "booking-id";
    textCell(tr, booking.pickup + " → " + booking.dropoff, "route-text");
    textCell(tr, booking.customer);
    textCell(tr, booking.driver || t("unassigned"));
    textCell(tr, "₪" + booking.amount.toLocaleString());
    const status = tr.insertCell(); status.append(chip(booking.status));
    actionCell(tr, booking);
    target.append(tr);
  });
}
function renderQueue() {
  const list = bookings.filter((b) => b.status !== "completed").slice(0, 4);
  $("#queueCount").textContent = String(list.length);
  const parent = $("#queueList");
  parent.replaceChildren();
  list.forEach((b) => {
    const item = document.createElement("div"); item.className = "queue-item";
    const time = document.createElement("div"); time.className = "queue-time"; time.textContent = b.time;
    const body = document.createElement("div"); body.className = "queue-body";
    const strong = document.createElement("strong"); strong.textContent = b.pickup;
    const p = document.createElement("p"); p.textContent = b.dropoff + " · " + b.customer;
    body.append(strong, p);
    const state = document.createElement("span"); state.className = "queue-state state-" + b.status; state.textContent = statusLabel(b.status);
    item.append(time, body, state);
    parent.append(item);
  });
}
function detailSection() {
  const keys = {
    transport:["bookingDetail","▰"],calendar:["calendarDetail","◷"],shifts:["driversDetail","◷"],team:["settingDetail","♧"],
    bookings:["bookingDetail","▤"],dispatch:["dispatchDetail","⌖"],
    drivers:["driversDetail","◉"],fleet:["fleetDetail","▱"],
    customers:["customersDetail","♙"],finance:["financeDetail","₪"],
    analytics:["analyticsDetail","▥"],settings:["settingDetail","⚙"]
  };
  const d = keys[section] || keys.bookings;
  $("#detailTitle").textContent = t(section);
  $("#detailDescription").textContent = t(d[0]);
  $("#detailIcon").textContent = d[1];
  const detail = $("#detailContent");
  detail.replaceChildren();
  if (section === "drivers" || section === "fleet") { fleetDemo.renderFleet(detail,section); return; }
  if (section === "shifts") { fleetDemo.renderShifts(detail); return; }
  if (section === "team") { teamDemo.renderTeam(detail); return; }
  if (section === "transport") { transportDemo.renderHub(detail); return; }
  if (section === "calendar") { calendarDemo.renderCalendar(detail); return; }
  if (section === "dispatch") { fleetDemo.renderDispatch(detail,bookings); return; }
  if (section === "bookings") {
    const wrap = document.createElement("div"); wrap.className = "table-scroll"; wrap.style.marginTop = "25px";
    const table = document.createElement("table");
    const header = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (const field of ["bookingNum","route","client","driver","amount","status"]) {
      const th = document.createElement("th"); th.textContent = t(field); headerRow.append(th);
    }
    headerRow.append(document.createElement("th")); header.append(headerRow);
    const body = document.createElement("tbody");
    renderTable(body, section === "dispatch" ? bookings.filter(b => b.status !== "completed") : bookings);
    table.append(header,body); wrap.append(table); detail.append(wrap);
  } else if (section === "settings") {
    const hint = document.createElement("p"); hint.className = "detail-notes"; hint.textContent = t("planText");
    const grid = document.createElement("div"); grid.className = "detail-grid";
    for(const plan of [{name:"START",price:"₪249",cap:"5"},{name:"GROWTH",price:"₪649",cap:"20"},{name:"BUSINESS",price:"₪1,490",cap:"60"}]){
      const box = document.createElement("div");box.className="detail-card";
      const strong = document.createElement("strong");strong.textContent = plan.price;
      const title = document.createElement("p");title.textContent=plan.name;
      const small=document.createElement("small"); small.textContent=plan.cap+" "+t("drivers")+" · "+t("pricePerMonth");
      box.append(title,strong,small);grid.append(box);
    }
    detail.append(hint,grid);
  } else {
    const grid=document.createElement("div");grid.className="detail-grid";
    const cards=[
      [t("fleetMetric"),"27"],[t("driverMetric"),"18"],[t("companiesMetric"),"12"]
    ];
    cards.forEach(([label,value]) => {
      const card=document.createElement("div"); card.className="detail-card";
      const val=document.createElement("strong");val.textContent=value;
      const sub=document.createElement("small");sub.textContent=label;
      card.append(val,sub);grid.append(card);
    });
    const note=document.createElement("p"); note.className="detail-notes";
    note.textContent=t("demoDetail")+" "+t("demoNote");
    detail.append(grid,note);
  }
}
function render() {
  $("#dashboardView").hidden = section !== "dashboard";
  $("#detailView").hidden = section === "dashboard";
  $$("#primaryNav button, .sidebar nav button").forEach((btn)=>btn.classList.toggle("selected",btn.dataset.section === section));
  $("#crumbCurrent").textContent = t(section);
  $("#pageTitle").textContent = section === "dashboard" ? t("title") : t(section);
  $("#pageSubtitle").textContent = section === "dashboard" ? t("subtitle") : t(section + "Detail");
  $("#statBookings").textContent = String(19 + bookings.length);
  $("#statCompleted").textContent = String(15 + bookings.filter(b=>b.status === "completed").length);
  $("#navOrders").textContent = String(bookings.length);
  renderTable($("#bookingRows"), bookings.slice().reverse().slice(0, 5));
  renderQueue();
  const overview=$("#transportOverview");overview.replaceChildren();
  if(section==="dashboard")transportDemo.overview(overview,()=>navigate("transport"));
  if (section !== "dashboard") detailSection();
}
function navigate(next) {section=next;render();window.scrollTo({top:0,behavior:"smooth"});}
function setLocale(next) {
  locale = next;
  document.documentElement.lang = next;
  document.body.dir = next === "he" ? "rtl" : "ltr";
  $$("[data-i18n]").forEach((node) => {node.textContent = t(node.dataset.i18n);});
  $$("[data-locale]").forEach((btn) => btn.classList.toggle("selected",btn.dataset.locale === next));
  $("#today").textContent = new Intl.DateTimeFormat(next === "he" ? "he-IL" : next === "en" ? "en-GB" : "ru-RU", {day:"numeric",month:"short",year:"numeric"}).format(new Date());
  render();
}
let toastTimer;
function toast(message) {
  const box=$("#toast");box.textContent=message;box.classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove("show"),3000);
}
function openBooking(){ transportDemo.openForm('freight'); }
$$("#primaryNav button, .sidebar nav button").forEach((btn)=>btn.addEventListener("click",()=>navigate(btn.dataset.section)));
$$("[data-locale]").forEach((btn)=>btn.addEventListener("click",()=>setLocale(btn.dataset.locale)));
$("#newBookingTop").addEventListener("click",openBooking);
$("#cancelDialog").addEventListener("click",()=>$("#bookingDialog").close());
$("#discardBooking").addEventListener("click",()=>$("#bookingDialog").close());
$("#viewAll").addEventListener("click",()=>navigate("bookings"));
$("#queueAction").addEventListener("click",()=>navigate("dispatch"));
$("#planButton").addEventListener("click",()=>navigate("settings"));
$("#bookingForm").addEventListener("submit",(event)=>{
  event.preventDefault();
  const customer=$("#customerInput").value.trim();
  const pickup=$("#pickupInput").value.trim();
  const dropoff=$("#dropoffInput").value.trim();
  const passengers=Number($("#passengerInput").value);
  const amount=Number($("#priceInput").value);
  if(!customer||!pickup||!dropoff||!Number.isInteger(passengers)||passengers<1||passengers>8||!Number.isFinite(amount)||amount<0)return;
  const time=new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
  bookings.unshift({id:"TR-"+(++nextId),pickup,dropoff,customer,driver:"",amount,status:"pending",time,passengers});
  $("#bookingForm").reset();$("#bookingDialog").close();render();toast(t("newSaved"));
});
const fleetDemo=createFleetDemo({t:()=>locale,render,toast});
const teamDemo=createTeamDemo({locale:()=>locale,render,toast});
const transportDemo=createTransportDemo({locale:()=>locale,rerender:render,notify:toast,fleet:fleetDemo,getCalendar:()=>calendarDemo});
const calendarDemo=createCalendarDemo({locale:()=>locale,notify:toast,rerender:render,fleet:fleetDemo,jobs:transportDemo.jobs});
setLocale(["ru","he","en"].includes(sessionStorage.getItem("transport_demo_locale"))?sessionStorage.getItem("transport_demo_locale"):"ru");
const demoCompany=sessionStorage.getItem("transport_demo_company");
if(demoCompany&&demoCompany.trim())$(".workspace strong").textContent=demoCompany.slice(0,65);
