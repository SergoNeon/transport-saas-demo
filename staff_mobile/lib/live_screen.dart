import 'dart:async';
import 'package:flutter/material.dart';
import 'live_api.dart';
import 'screens.dart';

const accent=Color(0xff08796d);
const deep=Color(0xff152734);
const weak=Color(0xff697985);
const edge=Color(0xffe2e9ed);
const paper=Color(0xfff8fafb);

String readableTime(DateTime d)=>
  d.hour.toString().padLeft(2,'0')+':'+d.minute.toString().padLeft(2,'0');

class LiveGate extends StatefulWidget {
  const LiveGate({super.key});
  @override State<LiveGate> createState()=>_LiveGateState();
}

class _LiveGateState extends State<LiveGate> {
  final api=LiveApi();
  final email=TextEditingController(text:'worker@afikim-demo.test');
  final password=TextEditingController();
  LiveSession? session;
  List<LiveAssignment> assignments=[];
  Timer? timer;
  bool signingIn=false;
  bool fetching=false;
  bool updating=false;
  String? message;
  DateTime? lastUpdated;

  @override void dispose(){
    timer?.cancel();api.close();email.dispose();password.dispose();super.dispose();
  }

  void inform(String text){
    if(!mounted)return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content:Text(text),behavior:SnackBarBehavior.floating));
  }

  Future<void> login() async {
    if(signingIn)return;
    setState((){signingIn=true;message=null;});
    try {
      final user=await api.login(email.text.trim(),password.text);
      if(!mounted)return;
      password.clear();
      setState((){session=user;assignments=[];});
      await refresh(showLoading:true);
      timer?.cancel();
      timer=Timer.periodic(const Duration(seconds:3),(_)=>refresh());
    } on LiveApiException catch(e){
      if(mounted)setState(()=>message=e.status==401?'שם משתמש או סיסמה שגויים':e.message);
    } catch(_) {
      if(mounted)setState(()=>message='לא ניתן להתחבר לשרת. בדקו את החיבור לאינטרנט.');
    } finally{if(mounted)setState(()=>signingIn=false);}
  }

  Future<void> refresh({bool showLoading=false}) async {
    if(fetching||session==null)return;
    fetching=true;
    if(showLoading&&mounted)setState(()=>updating=true);
    try {
      final data=await api.assignments(session!);
      if(mounted)setState((){assignments=data;message=null;lastUpdated=DateTime.now();});
    }on LiveApiException catch(e){
      if(e.status==401&&mounted){timer?.cancel();setState((){session=null;assignments=[];message='פג תוקף ההתחברות. יש להתחבר שוב.';});}
      else if(mounted)setState(()=>message='אין סנכרון: '+e.message);
    }catch(_){
      if(mounted)setState(()=>message='הקשר עם השרת נותק. מתבצע ניסיון חוזר.');
    }finally{fetching=false;if(mounted)setState(()=>updating=false);}
  }

  Future<void> confirm(LiveAssignment a) async {
    if(updating||session==null)return;
    setState(()=>updating=true);
    try {await api.confirm(session!,a);await refresh();inform('קבלת סידור העבודה אושרה ונשלחה למנהל.');}
    on LiveApiException catch(e) {
      inform(e.status==409?'הסידור השתנה. יש לעיין בעדכון החדש.':e.message);
      await refresh();
    }catch(_){inform('האישור לא נשלח. בדקו את החיבור.');}
    finally{if(mounted)setState(()=>updating=false);}
  }

  Future<void> edit(LiveAssignment a) async {
    if(session==null||!session!.isManager)return;
    final site=TextEditingController(text:a.site);
    final lines=TextEditingController(text:a.lines);
    final instructions=TextEditingController(text:a.instructions);
    var start=TimeOfDay.fromDateTime(a.start);
    var end=TimeOfDay.fromDateTime(a.end);
    bool working=false;
    var valid=true;
    await showModalBottomSheet<void>(
      context:context,isScrollControlled:true,showDragHandle:true,
      backgroundColor:Colors.white,
      builder:(modal)=>StatefulBuilder(builder:(modal,update)=>SafeArea(
        child:Padding(
          padding:EdgeInsets.fromLTRB(18,5,18,22+MediaQuery.viewInsetsOf(modal).bottom),
          child:SingleChildScrollView(child:Column(
            mainAxisSize:MainAxisSize.min,crossAxisAlignment:CrossAxisAlignment.stretch,
            children:[
              const Text('עדכון משמרת',style:TextStyle(fontSize:23,fontWeight:FontWeight.w900,color:deep)),
              const SizedBox(height:5),
              Text(a.workerName,style:const TextStyle(color:weak)),
              const SizedBox(height:5),
              const Text('לאחר עדכון נדרש אישור חדש מהעובד.',
                style:TextStyle(color:accent,fontSize:12)),
              const SizedBox(height:17),
              Row(children:[
                Expanded(child:OutlinedButton.icon(
                  onPressed:working?null:() async {
                    final t=await showTimePicker(context:modal,initialTime:start);
                    if(t!=null)update(()=>start=t);
                  },icon:const Icon(Icons.schedule),label:Text('כניסה '+_format(start)))),
                const SizedBox(width:9),
                Expanded(child:OutlinedButton.icon(
                  onPressed:working?null:() async {
                    final t=await showTimePicker(context:modal,initialTime:end);
                    if(t!=null)update(()=>end=t);
                  },icon:const Icon(Icons.schedule),label:Text('יציאה '+_format(end)))),
              ]),
              const SizedBox(height:10),
              TextField(controller:site,maxLength:120,
                decoration:const InputDecoration(labelText:'מקום עבודה',border:OutlineInputBorder())),
              const SizedBox(height:8),
              TextField(controller:lines,maxLength:80,
                decoration:const InputDecoration(labelText:'קווים',border:OutlineInputBorder())),
              const SizedBox(height:8),
              TextField(controller:instructions,maxLength:260,maxLines:2,
                decoration:const InputDecoration(labelText:'הוראות',border:OutlineInputBorder())),
              if(!valid)const Padding(padding:EdgeInsets.only(bottom:10),
                child:Text('יש למלא את כל השדות ולוודא ששעת הסיום אחרי ההתחלה.',
                  style:TextStyle(color:Colors.red,fontSize:12))),
              SizedBox(height:55,child:FilledButton.icon(
                onPressed:working?null:() async {
                  final begin=DateTime(a.start.year,a.start.month,a.start.day,start.hour,start.minute);
                  final finish=DateTime(a.end.year,a.end.month,a.end.day,end.hour,end.minute);
                  if(!finish.isAfter(begin)||site.text.trim().isEmpty||
                    lines.text.trim().isEmpty||instructions.text.trim().isEmpty) {
                    update(()=>valid=false);return;
                  }
                  update(()=>working=true);
                  try {
                    await api.update(session!,a,site:site.text,
                      lines:lines.text,instructions:instructions.text,
                      start:begin,end:finish);
                    if(!mounted)return;
                    if(modal.mounted)Navigator.pop(modal);
                    await refresh();
                    inform('המשמרת עודכנה בשרת ונשלחה לעובד.');
                  }on LiveApiException catch(e){
                    inform(e.status==409?'מנהל אחר שינה את הסידור. יש לרענן.':e.message);
                    await refresh();
                  }catch(_){inform('שמירה נכשלה. נסו שוב.');}
                  finally{if(modal.mounted)update(()=>working=false);}
                },icon:const Icon(Icons.save_outlined),label:Text(working?'שומר...':'שמירה ושליחה לעובד'))),
            ],
          ))))),
    );
    site.dispose();lines.dispose();instructions.dispose();
  }

  String _format(TimeOfDay t)=>
    t.hour.toString().padLeft(2,'0')+':'+t.minute.toString().padLeft(2,'0');

  void logout(){
    timer?.cancel();setState((){session=null;assignments=[];message=null;lastUpdated=null;});
  }

  Widget badge(String text,{Color color=accent})=>Container(
    padding:const EdgeInsets.symmetric(horizontal:10,vertical:6),
    decoration:BoxDecoration(color:color.withValues(alpha:0.1),
      borderRadius:BorderRadius.circular(20)),
    child:Text(text,style:TextStyle(fontSize:11,color:color,fontWeight:FontWeight.w800)));

  Widget section(Widget child)=>Container(
    padding:const EdgeInsets.all(19),
    decoration:BoxDecoration(color:Colors.white,border:Border.all(color:edge),
      borderRadius:BorderRadius.circular(17)),child:child);

  Widget _loginBody()=>LayoutBuilder(builder:(context,constraints) {
    // Some in-app browsers provide a desktop-sized layout viewport on phones.
    // Fill that viewport and enlarge controls rather than centering a
    // fixed 410px form that becomes tiny on the physical screen.
    final s=constraints.maxWidth>640
      ?(constraints.maxWidth/470).clamp(1.0,2.0).toDouble():1.0;
    final fieldBorder=OutlineInputBorder(
      borderRadius:BorderRadius.circular(12*s),
      borderSide:const BorderSide(color:edge));
    InputDecoration inputStyle(String label,IconData icon)=>InputDecoration(
      labelText:label,labelStyle:TextStyle(color:weak,fontSize:16*s),
      prefixIcon:Icon(icon,size:23*s,color:accent),
      prefixIconConstraints:BoxConstraints(minWidth:53*s),
      contentPadding:EdgeInsets.symmetric(horizontal:15*s,vertical:19*s),
      filled:true,fillColor:Colors.white,
      border:fieldBorder,enabledBorder:fieldBorder);
    Widget role(String label,bool selected,VoidCallback action)=>
      Expanded(child:SizedBox(height:55*s,
        child:FilledButton(
          onPressed:action,
          style:FilledButton.styleFrom(
            backgroundColor:selected?accent:const Color(0xffedf2f4),
            foregroundColor:selected?Colors.white:deep,
            shape:RoundedRectangleBorder(
              borderRadius:BorderRadius.circular(12*s))),
          child:Text(label,style:TextStyle(
            fontSize:17*s,fontWeight:FontWeight.w800)))));
    return ListView(
      key:const Key('live-phone-login-screen'),
      padding:EdgeInsets.fromLTRB(16*s,13*s,16*s,26*s),
      children:[
        Row(children:[
          Container(width:45*s,height:45*s,
            alignment:Alignment.center,
            decoration:BoxDecoration(color:accent,
              borderRadius:BorderRadius.circular(13*s)),
            child:Text('א',style:TextStyle(color:Colors.white,
              fontSize:28*s,fontWeight:FontWeight.w900))),
          SizedBox(width:12*s),
          Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,
            children:[
              Text('אלקטרה אפיקים',
                style:TextStyle(color:deep,fontSize:23*s,
                  fontWeight:FontWeight.w900)),
              Text('כניסת עובד או מנהל · הדגמה',
                style:TextStyle(color:weak,fontSize:14*s)),
            ])),
        ]),
        SizedBox(height:12*s),
        Container(
          key:const Key('live-login-form-panel'),
          width:double.infinity,
          padding:EdgeInsets.all(17*s),
          decoration:BoxDecoration(
            color:Colors.white,border:Border.all(color:edge),
            borderRadius:BorderRadius.circular(19*s)),
          child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
            Text('כניסה למערכת',style:TextStyle(
              color:deep,fontSize:23*s,fontWeight:FontWeight.w900)),
            SizedBox(height:6*s),
            Text('בחרו תפקיד והזינו את הסיסמה',
              style:TextStyle(color:weak,fontSize:15*s)),
            SizedBox(height:18*s),
            Row(children:[
              role('מבקר',email.text.startsWith('worker@'),
                ()=>setState(()=>email.text='worker@afikim-demo.test')),
              SizedBox(width:10*s),
              role('מנהל',email.text.startsWith('manager@'),
                ()=>setState(()=>email.text='manager@afikim-demo.test')),
            ]),
            SizedBox(height:16*s),
            TextField(key:const Key('live-login-email'),
              controller:email,keyboardType:TextInputType.emailAddress,
              textDirection:TextDirection.ltr,
              style:TextStyle(color:deep,fontSize:17*s),
              decoration:inputStyle('דוא"ל משתמש',Icons.person_outline)),
            SizedBox(height:13*s),
            TextField(key:const Key('live-login-password'),
              controller:password,obscureText:true,
              style:TextStyle(color:deep,fontSize:17*s),
              onSubmitted:(_)=>login(),
              decoration:inputStyle('סיסמה',Icons.lock_outline)),
            if(message!=null)Padding(
              padding:EdgeInsets.only(top:11*s),
              child:Text(message!,style:TextStyle(
                color:Colors.red,fontSize:15*s,fontWeight:FontWeight.w700))),
            SizedBox(height:18*s),
            SizedBox(height:62*s,child:FilledButton.icon(
              key:const Key('live-login-submit'),
              onPressed:signingIn?null:login,
              style:FilledButton.styleFrom(
                backgroundColor:accent,foregroundColor:Colors.white,
                shape:RoundedRectangleBorder(
                  borderRadius:BorderRadius.circular(14*s))),
              icon:Icon(Icons.login_rounded,size:25*s),
              label:Text(signingIn?'מתחבר...':'כניסה למערכת',
                style:TextStyle(fontSize:19*s,fontWeight:FontWeight.w900)))),
          ]),
        ),
        SizedBox(height:15*s),
        SizedBox(height:51*s,child:OutlinedButton.icon(
          onPressed:()=>Navigator.of(context).push(
            MaterialPageRoute(builder:(_)=>const StaffScreen())),
          icon:Icon(Icons.science_outlined,size:21*s),
          label:Text('צפייה בדמו מקומי ללא חשבון',
            style:TextStyle(fontSize:15*s,fontWeight:FontWeight.w700)),
          style:OutlinedButton.styleFrom(foregroundColor:accent,
            side:const BorderSide(color:edge),
            shape:RoundedRectangleBorder(
              borderRadius:BorderRadius.circular(13*s))))),
        SizedBox(height:14*s),
        Text('סנכרון בין מנהל לעובד · נתוני בדיקה בלבד',
          textAlign:TextAlign.center,
          style:TextStyle(color:weak,fontSize:13*s)),
      ],
    );
  });

  Widget _shiftClock(String label,DateTime time,IconData icon) => Expanded(
    child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      Row(children:[
        Icon(icon,color:const Color(0xffbee4dc),size:19),
        const SizedBox(width:7),
        Text(label,style:const TextStyle(
          color:Color(0xffb8d7d3),fontSize:16,fontWeight:FontWeight.w600)),
      ]),
      const SizedBox(height:9),
      Text(readableTime(time),
        key:Key(label=='כניסה'?'live-start-time':'live-end-time'),
        textDirection:TextDirection.ltr,
        style:const TextStyle(color:Colors.white,
          fontSize:40,fontWeight:FontWeight.w900,letterSpacing:0.2,
          fontFeatures:[FontFeature.tabularFigures()])),
    ]),
  );

  Widget _assignmentCard(LiveAssignment a) {
    final isManager=session!.isManager;
    final date=a.start.day.toString().padLeft(2,'0')+'/' +
      a.start.month.toString().padLeft(2,'0')+'/' +
      a.start.year.toString();
    return Column(
      key:const Key('live-assignment-card'),
      crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      Container(
        padding:const EdgeInsets.fromLTRB(21,22,21,24),
        decoration:BoxDecoration(
          gradient:const LinearGradient(
            begin:Alignment.topRight,end:Alignment.bottomLeft,
            colors:[Color(0xff173f46),Color(0xff102c35)]),
          borderRadius:BorderRadius.circular(24),
          boxShadow:[BoxShadow(color:const Color(0xff152734).withValues(alpha:.13),
            blurRadius:18,offset:const Offset(0,7))]),
        child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
          Row(crossAxisAlignment:CrossAxisAlignment.start,children:[
            Container(
              width:46,height:46,alignment:Alignment.center,
              decoration:BoxDecoration(
                color:Colors.white.withValues(alpha:.12),
                borderRadius:BorderRadius.circular(15)),
              child:const Icon(Icons.event_available_rounded,
                color:Color(0xffd2f1e8),size:28)),
            const SizedBox(width:12),
            Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,
              children:[
                Text(isManager?a.workerName:'המשמרת שלי',
                  maxLines:2,overflow:TextOverflow.ellipsis,
                  style:const TextStyle(color:Colors.white,
                    fontSize:23,fontWeight:FontWeight.w900,height:1.2)),
                const SizedBox(height:5),
                Text(date,style:const TextStyle(
                  color:Color(0xffbcd9d7),fontSize:15)),
              ])),
          ]),
          const SizedBox(height:19),
          Container(
            padding:const EdgeInsets.symmetric(horizontal:13,vertical:9),
            decoration:BoxDecoration(
              color:a.confirmed
                ?const Color(0xffd1f5e5).withValues(alpha:.16)
                :const Color(0xffffdca5).withValues(alpha:.16),
              borderRadius:BorderRadius.circular(12),
              border:Border.all(color:Colors.white.withValues(alpha:.19))),
            child:Row(children:[
              Icon(a.confirmed?Icons.check_circle_rounded
                :Icons.pending_actions_rounded,
                color:a.confirmed
                  ?const Color(0xffa3f1ce)
                  :const Color(0xffffd99d),size:24),
              const SizedBox(width:10),
              Expanded(child:Text(a.confirmed
                ?'הסידור אושר'
                :'נדרש אישור למשמרת',
                style:const TextStyle(color:Colors.white,
                  fontSize:16,fontWeight:FontWeight.w800))),
              Text('מס׳ '+a.version.toString(),
                style:const TextStyle(color:Color(0xffb8d7d3),
                  fontSize:13,fontWeight:FontWeight.w600)),
            ]),
          ),
          const SizedBox(height:23),
          Row(children:[
            _shiftClock('כניסה',a.start,Icons.login_rounded),
            Container(width:1,height:65,
              color:Colors.white.withValues(alpha:.18)),
            const SizedBox(width:20),
            _shiftClock('יציאה',a.end,Icons.logout_rounded),
          ]),
        ]),
      ),
      const SizedBox(height:15),
      Container(
        padding:const EdgeInsets.all(20),
        decoration:BoxDecoration(color:Colors.white,
          border:Border.all(color:edge),
          borderRadius:BorderRadius.circular(21)),
        child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
          const Text('מקום העבודה',
            style:TextStyle(color:weak,fontSize:15,fontWeight:FontWeight.w700)),
          const SizedBox(height:9),
          Row(crossAxisAlignment:CrossAxisAlignment.start,children:[
            const Icon(Icons.location_on_rounded,color:accent,size:29),
            const SizedBox(width:10),
            Expanded(child:Text(a.site,
              key:const Key('live-assignment-site'),
              style:const TextStyle(color:deep,fontSize:20,
                fontWeight:FontWeight.w900,height:1.35))),
          ]),
          const Divider(height:29,color:edge),
          Row(crossAxisAlignment:CrossAxisAlignment.start,children:[
            const Icon(Icons.directions_bus_filled_rounded,
              color:accent,size:27),
            const SizedBox(width:10),
            Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,
              children:[
                const Text('קווי אוטובוס',
                  style:TextStyle(color:weak,fontSize:14)),
                const SizedBox(height:4),
                Text(a.lines,style:const TextStyle(
                  color:deep,fontSize:19,fontWeight:FontWeight.w800)),
              ])),
          ]),
          const SizedBox(height:17),
          Container(
            padding:const EdgeInsets.symmetric(horizontal:14,vertical:13),
            decoration:BoxDecoration(color:const Color(0xffeef6f4),
              borderRadius:BorderRadius.circular(13)),
            child:Row(crossAxisAlignment:CrossAxisAlignment.start,children:[
              const Icon(Icons.info_outline_rounded,
                color:accent,size:23),
              const SizedBox(width:10),
              Expanded(child:Text(a.instructions,
                style:const TextStyle(color:deep,
                  fontSize:16,height:1.5,fontWeight:FontWeight.w500))),
            ]),
          ),
        ]),
      ),
      const SizedBox(height:15),
      if(!isManager&&!a.confirmed)
        SizedBox(height:62,child:FilledButton.icon(
          key:const Key('live-confirm-action'),
          onPressed:updating?null:()=>confirm(a),
          style:FilledButton.styleFrom(backgroundColor:accent,
            foregroundColor:Colors.white,
            shape:RoundedRectangleBorder(
              borderRadius:BorderRadius.circular(17))),
          icon:const Icon(Icons.check_circle_outline,size:26),
          label:const Text('אישור קבלת המשמרת',
            style:TextStyle(fontSize:18,fontWeight:FontWeight.w900)))),
      if(isManager)
        SizedBox(height:62,child:FilledButton.icon(
          key:Key('server-edit-'+a.id),
          onPressed:updating?null:()=>edit(a),
          style:FilledButton.styleFrom(backgroundColor:accent,
            foregroundColor:Colors.white,
            shape:RoundedRectangleBorder(
              borderRadius:BorderRadius.circular(17))),
          icon:const Icon(Icons.edit_calendar_outlined,size:25),
          label:const Text('עריכת משמרת ושליחה לעובד',
            maxLines:1,overflow:TextOverflow.ellipsis,
            style:TextStyle(fontSize:17,fontWeight:FontWeight.w900)))),
      if(a.confirmed)
        Container(
          padding:const EdgeInsets.symmetric(horizontal:16,vertical:15),
          decoration:BoxDecoration(
            color:const Color(0xffe0f3eb),
            borderRadius:BorderRadius.circular(15)),
          child:Row(children:[
            const Icon(Icons.verified_rounded,color:accent,size:25),
            const SizedBox(width:11),
            Expanded(child:Text('אושר ב־'+readableTime(a.confirmedAt!),
              style:const TextStyle(color:deep,
                fontSize:16,fontWeight:FontWeight.w800))),
          ]),
        ),
    ]);
  }

  Widget _dashboard()=>RefreshIndicator(
    onRefresh:()=>refresh(showLoading:true),
    child:ListView(
      key:const Key('live-mobile-dashboard'),
      padding:const EdgeInsets.fromLTRB(14,18,14,29),
      children:[
        Text('שלום, '+session!.name,
          style:const TextStyle(color:deep,
            fontSize:28,fontWeight:FontWeight.w900)),
        const SizedBox(height:6),
        Text(session!.isManager
          ?'ניהול משמרות הצוות'
          :'סידור העבודה שלך להיום',
          style:const TextStyle(color:weak,
            fontSize:16,fontWeight:FontWeight.w600)),
        const SizedBox(height:15),
        Row(children:[
          Container(
            padding:const EdgeInsets.symmetric(horizontal:13,vertical:10),
            decoration:BoxDecoration(
              color:const Color(0xffdff3eb),
              borderRadius:BorderRadius.circular(13)),
            child:const Row(mainAxisSize:MainAxisSize.min,children:[
              Icon(Icons.cloud_done_rounded,color:accent,size:20),
              SizedBox(width:8),
              Text('מסונכרן',style:TextStyle(color:accent,
                fontSize:15,fontWeight:FontWeight.w800)),
            ]),
          ),
          const Spacer(),
          if(lastUpdated!=null)
            Text('עודכן '+readableTime(lastUpdated!),
              style:const TextStyle(color:weak,fontSize:13)),
          IconButton(
            onPressed:()=>refresh(showLoading:true),
            icon:const Icon(Icons.refresh_rounded,color:accent,size:27),
            tooltip:'רענון מידע',
            constraints:const BoxConstraints(minWidth:45,minHeight:48)),
        ]),
        if(message!=null)Padding(
          padding:const EdgeInsets.only(top:11),
          child:Text(message!,style:const TextStyle(
            color:Colors.red,fontSize:15,fontWeight:FontWeight.w700))),
        const SizedBox(height:14),
        if(updating)const LinearProgressIndicator(minHeight:3),
        if(assignments.isEmpty)
          section(const Text('עדיין אין שיבוץ להצגה',
            style:TextStyle(color:weak,fontSize:17))),
        ...assignments.map((a)=>Padding(
          padding:const EdgeInsets.only(bottom:15),
          child:_assignmentCard(a))),
        const SizedBox(height:7),
        const Center(child:Text(
          'בדיקת סנכרון · עדכון אוטומטי כל 3 שניות',
          textAlign:TextAlign.center,
          style:TextStyle(color:weak,fontSize:13))),
      ],
    ),
  );

  @override Widget build(BuildContext context) {
    final width=MediaQuery.sizeOf(context).width;
    final s=width>640?(width/470).clamp(1.0,2.0).toDouble():1.0;
    return Scaffold(
    backgroundColor:paper,
    appBar:AppBar(backgroundColor:Colors.white,automaticallyImplyLeading:false,
      toolbarHeight:72*s,titleSpacing:14*s,
      title:Row(children:[
        Container(width:44*s,height:44*s,alignment:Alignment.center,
          decoration:BoxDecoration(color:accent,borderRadius:BorderRadius.circular(10*s)),
          child:Text('א',style:TextStyle(color:Colors.white,
            fontSize:27*s,fontWeight:FontWeight.w900))),
        SizedBox(width:11*s),
        Expanded(child:Text('אלקטרה אפיקים',
          style:TextStyle(fontSize:20*s,color:deep,fontWeight:FontWeight.w900))),
        if(session!=null)IconButton(
          onPressed:logout,tooltip:'התנתקות',
          icon:const Icon(Icons.logout,color:weak)),
      ])),
    body:session==null?_loginBody():_dashboard(),
  );
  }
}
