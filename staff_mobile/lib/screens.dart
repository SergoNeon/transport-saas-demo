import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'demo_state.dart';
import 'model.dart';

const Color background=Color(0xff0e1015);
const Color panel=Color(0xff1b2028);
const Color panel2=Color(0xff242b35);
const Color outline=Color(0xff343b47);
const Color gold=Color(0xffe3b877);
const Color red=Color(0xffd14e46);
const Color green=Color(0xff68d7af);
const Color dim=Color(0xffa8b0bc);

class StaffScreen extends StatefulWidget {
  const StaffScreen({super.key});
  @override State<StaffScreen> createState()=>_StaffScreenState();
}
class _StaffScreenState extends State<StaffScreen> {
  late final StaffDemoState state;
  Timer? clock;
  int section=0;
  bool manager=true;
  @override void initState(){super.initState();state=StaffDemoState();
    state.addListener(_change);
    clock=Timer.periodic(const Duration(seconds:15),(_){if(mounted)setState((){});});}
  void _change(){if(mounted)setState((){});}
  @override void dispose(){clock?.cancel();state.removeListener(_change);state.dispose();super.dispose();}

  @override Widget build(BuildContext context){
    final pages=[manager?_dashboard():_employee(),manager?_employees():_employee(),_map(),_reports()];
    return Scaffold(
      appBar:AppBar(toolbarHeight:72,automaticallyImplyLeading:false,
        title:Row(children:[
          Container(width:39,height:39,alignment:Alignment.center,
            decoration:BoxDecoration(color:const Color(0xff352720),
              border:Border.all(color:gold.withValues(alpha:.4)),borderRadius:BorderRadius.circular(10)),
            child:const Text('B.',style:TextStyle(color:gold,fontWeight:FontWeight.w900,fontSize:24))),
          const SizedBox(width:11),
          const Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
            Text('BRILL STAFF',style:TextStyle(fontWeight:FontWeight.w900,fontSize:15,letterSpacing:1.1)),
            Text('ניהול נוכחות ועובדי שטח',style:TextStyle(color:dim,fontSize:10))]),
          const Spacer(),
          PopupMenuButton<bool>(tooltip:'תפקיד הדגמה',initialValue:manager,
            onSelected:(v)=>setState((){manager=v;section=0;}),
            itemBuilder:(_)=>const [
              PopupMenuItem(value:true,child:Text('תצוגת מנהל')),
              PopupMenuItem(value:false,child:Text('תצוגת עובד'))
            ],
            child:Container(padding:const EdgeInsets.symmetric(horizontal:9,vertical:10),
              decoration:BoxDecoration(border:Border.all(color:outline),
                borderRadius:BorderRadius.circular(10)),
              child:Row(mainAxisSize:MainAxisSize.min,children:[
                Text(manager?'מנהל':'עובד',style:const TextStyle(fontSize:12)),
                const SizedBox(width:4),const Icon(Icons.expand_more,color:gold,size:18)])),
          )
        ]),
      ),
      body:!state.loaded?const Center(child:CircularProgressIndicator()):
        SafeArea(child:Center(child:ConstrainedBox(
          constraints:const BoxConstraints(maxWidth:1100),
          child:ListView(padding:const EdgeInsets.fromLTRB(14,16,14,30),children:[
            _banner(),
            const SizedBox(height:18),
            pages[section],
            const SizedBox(height:24),
            const Center(child:Text('Developed by Brill Team Project',
              style:TextStyle(color:dim,fontSize:11))),
          ]),
        ))),
      bottomNavigationBar:NavigationBar(height:68,selectedIndex:section,
        onDestinationSelected:(n)=>setState(()=>section=n),
        destinations:[
          NavigationDestination(icon:const Icon(Icons.dashboard_outlined),
            selectedIcon:const Icon(Icons.dashboard),label:manager?'ראשי':'המשמרת שלי'),
          const NavigationDestination(icon:Icon(Icons.groups_outlined),label:'עובדים'),
          const NavigationDestination(icon:Icon(Icons.map_outlined),label:'מפה'),
          const NavigationDestination(icon:Icon(Icons.query_stats_outlined),label:'דוחות'),
        ]),
    );
  }

  Widget _banner()=>Container(padding:const EdgeInsets.all(12),
    decoration:BoxDecoration(color:const Color(0xff30261a),
      border:Border.all(color:const Color(0xff755935)),borderRadius:BorderRadius.circular(10)),
    child:const Row(crossAxisAlignment:CrossAxisAlignment.start,children:[
      Icon(Icons.info_outline,color:gold,size:20),SizedBox(width:9),
      Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
        Text('גרסת הדגמה · נתונים לדוגמה',style:TextStyle(
          fontSize:12,color:gold,fontWeight:FontWeight.w800)),
        SizedBox(height:3),
        Text('המיקומים והעובדים בדויים. אין איסוף GPS מהטלפון ואין חיבור לשרת אמיתי. '
          'השינויים נשמרים מקומית במכשיר.',style:TextStyle(
          color:Color(0xffd5cabb),height:1.4,fontSize:11)),
      ]))
    ]));

  Widget _title(String over,String heading,String desc,{Widget? trailing})=>
    Padding(padding:const EdgeInsets.only(bottom:17),
      child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
        Text(over,style:const TextStyle(color:gold,fontSize:10,
          fontWeight:FontWeight.w800,letterSpacing:1.1)),
        const SizedBox(height:7),
        Wrap(crossAxisAlignment:WrapCrossAlignment.center,
          spacing:14,runSpacing:8,children:[
          Text(heading,style:const TextStyle(fontSize:27,fontWeight:FontWeight.w800)),
          if(trailing!=null)trailing,
        ]),
        const SizedBox(height:5),
        Text(desc,style:const TextStyle(color:dim,fontSize:12)),
      ]));

  Widget _box(Widget child,{EdgeInsets? padding})=>Container(
    padding:padding??const EdgeInsets.all(16),
    decoration:BoxDecoration(color:panel,border:Border.all(color:outline),
      borderRadius:BorderRadius.circular(14)),child:child);

  Widget _stat(String title,String value,IconData icon,Color tint)=>Container(
    width:165,padding:const EdgeInsets.all(16),
    decoration:BoxDecoration(color:panel,border:Border.all(color:outline),
      borderRadius:BorderRadius.circular(12)),
    child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      Row(children:[Expanded(child:Text(title,style:const TextStyle(color:dim,fontSize:11))),
        Icon(icon,color:tint,size:19)]),
      const SizedBox(height:10),
      Text(value,style:const TextStyle(fontSize:27,fontWeight:FontWeight.w800)),
    ]));

  Widget _subtitle(String text,String note)=>Column(
    crossAxisAlignment:CrossAxisAlignment.start,children:[
      Text(text,style:const TextStyle(fontSize:17,fontWeight:FontWeight.w800)),
      const SizedBox(height:4),
      Text(note,style:const TextStyle(color:dim,fontSize:11)),
    ]);

  Widget _dashboard()=>Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    _title('OPERATIONS / ISRAEL','מרכז בקרת נוכחות',
      'עובדים, שעות עבודה, הפסקות ומקומות עבודה'),
    Wrap(spacing:10,runSpacing:10,children:[
      _stat('עובדים עכשיו',state.activeCount.toString(),Icons.people_alt_outlined,green),
      _stat('בהפסקה',state.breakCount.toString(),Icons.coffee_outlined,gold),
      _stat('שעות נטו',durationText(Duration(minutes:state.totalMinutes)),Icons.schedule,gold),
      _stat('סיימו משמרת',state.finishedCount.toString(),Icons.check_circle_outline,red),
    ]),
    const SizedBox(height:15),
    _box(Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      _subtitle('עובדי שטח','בחר עובד להצגת שעות העבודה שלו'),
      const SizedBox(height:11),
      ...state.members.take(5).map(_workerTile),
      const SizedBox(height:12),
      SizedBox(width:double.infinity,child:OutlinedButton(
        onPressed:()=>setState(()=>section=1),child:const Text('לרשימת כל העובדים'))),
    ])),
    const SizedBox(height:14),
    _box(Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      _subtitle('פעילות אחרונה','דיווחי נוכחות והפסקות'),
      ...state.events.take(5).map(_eventTile),
    ])),
  ]);

  String _status(StaffMember w)=>switch(w.state){
    ShiftState.off=>'לא במשמרת',ShiftState.working=>'בעבודה',
    ShiftState.onBreak=>'בהפסקה',ShiftState.finished=>'סיים',
  };
  Color _statusColor(StaffMember w)=>switch(w.state){
    ShiftState.working=>green,ShiftState.onBreak=>gold,
    ShiftState.finished=>dim,ShiftState.off=>dim,
  };

  Widget _workerTile(StaffMember w)=>InkWell(
    onTap:()=>setState((){state.select(w.id);manager=false;section=0;}),
    child:Container(padding:const EdgeInsets.symmetric(horizontal:9,vertical:12),
      decoration:const BoxDecoration(border:Border(bottom:BorderSide(color:outline))),
      child:Row(children:[
        CircleAvatar(radius:20,backgroundColor:const Color(0xff433427),
          child:Text(w.name.substring(0,1),style:const TextStyle(color:gold))),
        const SizedBox(width:10),
        Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
          Text(w.name,style:const TextStyle(fontWeight:FontWeight.w800,fontSize:13)),
          const SizedBox(height:4),
          Text(w.workplace,style:const TextStyle(color:dim,fontSize:11),
            maxLines:1,overflow:TextOverflow.ellipsis),
        ])),
        Column(crossAxisAlignment:CrossAxisAlignment.end,children:[
          Text(_status(w),style:TextStyle(color:_statusColor(w),
            fontWeight:FontWeight.w700,fontSize:11)),
          const SizedBox(height:4),
          Text(durationText(w.workedDuration(state.now)),style:const TextStyle(
            fontSize:14,fontWeight:FontWeight.w800)),
        ]),
        const Icon(Icons.chevron_left,color:dim,size:19),
      ])));

  Widget _eventTile(ShiftEvent e){
    final found=state.members.where((w)=>w.id==e.workerId);
    final name=found.isEmpty?'עובד':found.first.name;
    return Padding(padding:const EdgeInsets.symmetric(vertical:11),
      child:Row(children:[
        const Icon(Icons.history,color:gold,size:20),const SizedBox(width:10),
        Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
          Text(name,style:const TextStyle(fontSize:12,fontWeight:FontWeight.w800)),
          Text(e.label,style:const TextStyle(fontSize:11,color:dim)),
        ])),
        Text(timeText(e.at),style:const TextStyle(color:gold,fontSize:12)),
      ]));
  }

  Widget _employees()=>Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    _title('צוות','ניהול עובדים','סטטוס נוכחות ושעות לכל עובד'),
    _box(Column(children:state.members.map(_workerTile).toList())),
  ]);

  Widget _fact(String title,String value)=>Expanded(child:Column(children:[
    Text(title,style:const TextStyle(color:dim,fontSize:11)),
    const SizedBox(height:5),
    Text(value,style:const TextStyle(fontWeight:FontWeight.w800,fontSize:16)),
  ]));

  Widget _action(String title,String action,StaffMember w,Color color)=>SizedBox(
    width:double.infinity,child:FilledButton(
      style:FilledButton.styleFrom(backgroundColor:color,foregroundColor:background,
        padding:const EdgeInsets.symmetric(vertical:17)),
      onPressed:()=>state.transition(w.id,action),
      child:Text(title,style:const TextStyle(fontWeight:FontWeight.w800,fontSize:16)),
    ));

  Widget _employee(){
    final w=state.selected;
    return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      _title('שעון נוכחות','המשמרת שלי','נוכחות, הפסקות ושעות נטו'),
      _box(Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
        Row(children:[
          CircleAvatar(radius:25,backgroundColor:const Color(0xff433427),
            child:Text(w.name.substring(0,1),style:const TextStyle(color:gold,fontSize:22))),
          const SizedBox(width:11),
          Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
            Text(w.name,style:const TextStyle(fontSize:17,fontWeight:FontWeight.w800)),
            Text(w.position,style:const TextStyle(fontSize:12,color:dim)),
          ])),
          PopupMenuButton<String>(tooltip:'מעבר לעובד אחר בדמו',
            onSelected:state.select,
            itemBuilder:(_)=>state.members.map((x)=>
              PopupMenuItem(value:x.id,child:Text(x.name))).toList(),
            icon:const Icon(Icons.swap_horiz,color:gold)),
        ]),
        const SizedBox(height:17),
        Container(padding:const EdgeInsets.all(12),
          decoration:BoxDecoration(color:panel2,borderRadius:BorderRadius.circular(9)),
          child:Row(children:[
            const Icon(Icons.location_on_outlined,color:gold),
            const SizedBox(width:9),
            Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
              Text(w.workplace,style:const TextStyle(fontWeight:FontWeight.w800,fontSize:13)),
              const Text('מקום עבודה משויך',style:TextStyle(color:dim,fontSize:11)),
            ])),
          ])),
        const SizedBox(height:15),
        Row(children:[Icon(Icons.circle,color:_statusColor(w),size:9),
          const SizedBox(width:7),Text(_status(w),style:TextStyle(
            color:_statusColor(w),fontWeight:FontWeight.w800))]),
        const SizedBox(height:10),
        const Center(child:Text('שעות עבודה נטו',style:TextStyle(color:dim,fontSize:12))),
        Center(child:Text(durationText(w.workedDuration(state.now)),
          style:const TextStyle(fontSize:52,fontWeight:FontWeight.w900))),
        const SizedBox(height:13),
        Row(children:[
          _fact('כניסה',timeText(w.startedAt)),
          _fact('הפסקות',durationText(w.breakDuration(state.now))),
          _fact('יציאה',timeText(w.endedAt)),
        ]),
        const SizedBox(height:20),
        if(w.state==ShiftState.off)_action('התחלת משמרת','start',w,red),
        if(w.state==ShiftState.working)...[
          _action('יציאה להפסקה','pause',w,gold),const SizedBox(height:9),
          _action('סיום משמרת','end',w,red)],
        if(w.state==ShiftState.onBreak)...[
          _action('חזרה לעבודה','resume',w,green),const SizedBox(height:9),
          _action('סיום משמרת','end',w,red)],
        if(w.state==ShiftState.finished)
          const Text('המשמרת הסתיימה. אפשר לאפס נתוני הדגמה במסך הדוחות.',
            style:TextStyle(color:dim,fontSize:12)),
      ])),
      const SizedBox(height:12),
      _box(const Text('זוהי סימולציה. אין כאן הרשאות GPS או דיווחי אמת. '
        'בגרסה האמיתית שיתוף המיקום ייעשה רק בזמן העבודה המורשה.',
        style:TextStyle(color:dim,fontSize:12,height:1.6))),
    ]);
  }

  Widget _map(){
    final items=state.members.where((w)=>w.showsSamplePosition &&
      w.lastSampleAt!=null &&
      state.now.difference(w.lastSampleAt!).inMinutes<5).toList();
    return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      _title('GPS / מיקומי עובדים','מפת מקומות עבודה',
        'מיקומים לדוגמה · העובדים הפעילים בלבד'),
      _box(Column(children:[
        ClipRRect(borderRadius:BorderRadius.circular(9),
          child:SizedBox(height:365,child:FlutterMap(
            options:const MapOptions(initialCenter:LatLng(32.19,34.85),
              initialZoom:9),
            children:[
              TileLayer(urlTemplate:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName:'com.brillteam.brill_staff'),
              MarkerLayer(markers:items.map((w)=>Marker(
                point:LatLng(w.latitude,w.longitude),width:49,height:49,
                child:InkWell(onTap:()=>state.select(w.id),
                  child:Container(
                    decoration:BoxDecoration(color:red,shape:BoxShape.circle,
                      border:Border.all(color:gold,width:3)),
                    child:const Icon(Icons.person,color:Colors.white,size:22)),
                ))).toList()),
              const RichAttributionWidget(
                attributions:[TextSourceAttribution('OpenStreetMap contributors')]),
            ],
          ))),
        const SizedBox(height:9),
        const Text('נקודות הדמיה בלבד. אין גישה למיקום המכשיר. '
          'בהפסקה או לאחר סיום משמרת הנקודה מוסתרת.',
          style:TextStyle(color:dim,fontSize:11)),
      ])),
      const SizedBox(height:11),
      ...items.map((w)=>Padding(padding:const EdgeInsets.only(bottom:8),
        child:_box(Row(children:[
          const Icon(Icons.location_on,color:green),
          const SizedBox(width:9),
          Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
            Text(w.name,style:const TextStyle(fontWeight:FontWeight.w800)),
            Text(w.workplace,style:const TextStyle(fontSize:11,color:dim))
          ])),
          Text(durationText(w.workedDuration(state.now)),
            style:const TextStyle(color:gold,fontWeight:FontWeight.w800)),
        ])))),
    ]);
  }

  Widget _reports()=>Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    _title('דוחות / שעות','דוח שעות נוכחות','שעות נטו, הפסקות ומקומות עבודה',
      trailing:TextButton.icon(onPressed:(){
        Clipboard.setData(ClipboardData(text:exportCsv(state.members,state.now)));
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content:Text('דוח CSV הועתק ללוח. נתוני דוגמה בלבד.')));
      },icon:const Icon(Icons.copy,size:18),label:const Text('העתקת CSV'))),
    _box(Column(children:state.members.map((w)=>Padding(
      padding:const EdgeInsets.symmetric(vertical:11),
      child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
        Row(children:[
          Expanded(child:Text(w.name,style:const TextStyle(fontWeight:FontWeight.w800))),
          Text(durationText(w.workedDuration(state.now)),
            style:const TextStyle(color:gold,fontWeight:FontWeight.w800)),
        ]),
        const SizedBox(height:5),
        Text(w.workplace,style:const TextStyle(color:dim,fontSize:11)),
        const SizedBox(height:5),
        Wrap(spacing:15,runSpacing:5,children:[
          Text('כניסה: '+timeText(w.startedAt),style:const TextStyle(color:dim,fontSize:11)),
          Text('הפסקות: '+durationText(w.breakDuration(state.now)),
            style:const TextStyle(color:dim,fontSize:11)),
          Text('יציאה: '+timeText(w.endedAt),style:const TextStyle(color:dim,fontSize:11)),
        ]),
        const Divider(color:outline),
      ]),
    )).toList())),
    const SizedBox(height:13),
    OutlinedButton.icon(
      onPressed:()=>showDialog(context:context,builder:(dialog)=>AlertDialog(
        title:const Text('איפוס נתוני ההדגמה'),
        content:const Text('למחוק את הפעולות ולשחזר את נתוני הדוגמה?'),
        actions:[
          TextButton(onPressed:()=>Navigator.pop(dialog),child:const Text('ביטול')),
          TextButton(onPressed:(){state.reset();Navigator.pop(dialog);},
            child:const Text('איפוס')),
        ])),
      icon:const Icon(Icons.restart_alt),label:const Text('איפוס הדגמה')),
    const SizedBox(height:10),
    OutlinedButton.icon(
      onPressed:state.advance,
      icon:const Icon(Icons.fast_forward),label:const Text('הדמיית 15 דקות קדימה')),
  ]);
}
