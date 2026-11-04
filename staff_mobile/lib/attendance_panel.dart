import 'package:flutter/material.dart';
import 'live_api.dart';

const clockInk=Color(0xff152734);
const clockTeal=Color(0xff08796d);
const clockBorder=Color(0xffe2e9ed);
const clockMuted=Color(0xff697985);

String attendanceDuration(int ms) {
  final d=Duration(milliseconds:ms<0?0:ms);
  String two(int n)=>n.toString().padLeft(2,'0');
  return two(d.inHours)+':'+two(d.inMinutes.remainder(60))+
    ':'+two(d.inSeconds.remainder(60));
}
String attendanceTime(DateTime dt)=>
  dt.hour.toString().padLeft(2,'0')+':'+dt.minute.toString().padLeft(2,'0');

class AttendancePanel extends StatelessWidget {
  final LiveSession session;
  final LiveAttendance data;
  final bool busy;
  final void Function(String) onAction;
  const AttendancePanel({super.key,required this.session,required this.data,
    required this.busy,required this.onAction});

  Widget _action(String text,String action,IconData icon,{bool quiet=false})=>
    SizedBox(width:double.infinity,height:63,
      child:quiet?OutlinedButton.icon(
        onPressed:busy?null:()=>onAction(action),
        icon:Icon(icon,size:24),
        label:Text(text,style:const TextStyle(fontSize:18,fontWeight:FontWeight.w800)),
        style:OutlinedButton.styleFrom(
          foregroundColor:clockInk,
          side:const BorderSide(color:clockBorder),
          shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(16))),
      ):FilledButton.icon(
        onPressed:busy?null:()=>onAction(action),
        icon:Icon(icon,size:26),
        label:Text(text,style:const TextStyle(fontSize:19,fontWeight:FontWeight.w900)),
        style:FilledButton.styleFrom(
          backgroundColor:clockTeal,foregroundColor:Colors.white,
          shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(16))),
      ));

  Widget _employee() {
    final shift=data.own;
    final status=switch(shift?.state){
      'working'=>'במשמרת',
      'break'=>'בהפסקה',
      'finished'=>'משמרת הסתיימה',
      _=>'מוכן לתחילת משמרת',
    };
    return Column(
      key:const Key('live-server-attendance'),
      crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      Container(
        padding:const EdgeInsets.fromLTRB(20,22,20,22),
        decoration:BoxDecoration(
          gradient:const LinearGradient(
            begin:Alignment.topRight,end:Alignment.bottomLeft,
            colors:[Color(0xff173f46),Color(0xff102c35)]),
          borderRadius:BorderRadius.circular(23)),
        child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
          const Row(children:[
            Icon(Icons.access_time_filled_rounded,
              color:Color(0xffb3e5da),size:25),
            SizedBox(width:10),
            Expanded(child:Text('שעון הנוכחות שלי',
              style:TextStyle(color:Colors.white,
                fontSize:22,fontWeight:FontWeight.w900))),
          ]),
          const SizedBox(height:16),
          Text(status,style:const TextStyle(
            color:Color(0xffc6e7df),fontSize:16)),
          const SizedBox(height:8),
          FittedBox(fit:BoxFit.scaleDown,
            child:Text(attendanceDuration(shift?.workedMs??0),
              key:const Key('live-worked-time'),
              textDirection:TextDirection.ltr,
              textAlign:TextAlign.center,
              style:const TextStyle(
                color:Colors.white,fontSize:54,
                fontWeight:FontWeight.w900,
                fontFeatures:[FontFeature.tabularFigures()]))),
          const SizedBox(height:13),
          Text(shift==null?'טרם התחילה משמרת':
            'כניסה: '+attendanceTime(shift.startedAt),
            style:const TextStyle(color:Color(0xffc6e7df),
              fontSize:16,fontWeight:FontWeight.w700)),
        ]),
      ),
      const SizedBox(height:13),
      if(shift==null||shift.state=='finished')
        _action('תחילת משמרת','start',Icons.play_arrow_rounded),
      if(shift?.state=='working') ...[
        _action('יציאה להפסקה','pause',Icons.coffee_outlined),
        const SizedBox(height:8),
        _action('סיום משמרת','end',Icons.stop_circle_outlined,quiet:true),
      ],
      if(shift?.state=='break') ...[
        _action('חזרה לעבודה','resume',Icons.play_arrow_rounded),
        const SizedBox(height:8),
        _action('סיום משמרת','end',Icons.stop_circle_outlined,quiet:true),
      ],
    ]);
  }

  Widget _metric(String value,String title,Color color)=>Expanded(
    child:Container(
      padding:const EdgeInsets.symmetric(horizontal:6,vertical:15),
      decoration:BoxDecoration(
        color:Colors.white,
        border:Border.all(color:clockBorder),
        borderRadius:BorderRadius.circular(15)),
      child:Column(children:[
        Text(value,style:TextStyle(
          color:color,fontSize:29,fontWeight:FontWeight.w900)),
        const SizedBox(height:5),
        Text(title,style:const TextStyle(
          color:clockMuted,fontSize:13)),
      ]),
    ),
  );

  Widget _manager() {
    final members=data.team;
    final active=members.where((p)=>p.shift?.state=='working').length;
    final resting=members.where((p)=>p.shift?.state=='break').length;
    return Column(
      key:const Key('live-manager-attendance'),
      crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      const Text('נוכחות בזמן אמת',
        style:TextStyle(color:clockInk,fontSize:23,fontWeight:FontWeight.w900)),
      const SizedBox(height:12),
      Row(children:[
        _metric(active.toString(),'בעבודה',clockTeal),
        const SizedBox(width:9),
        _metric(resting.toString(),'בהפסקה',const Color(0xffb4822f)),
        const SizedBox(width:9),
        _metric(members.length.toString(),'עובדים',clockInk),
      ]),
      const SizedBox(height:14),
      for(final person in members)
        Container(
          margin:const EdgeInsets.only(bottom:10),
          padding:const EdgeInsets.all(15),
          decoration:BoxDecoration(
            color:Colors.white,border:Border.all(color:clockBorder),
            borderRadius:BorderRadius.circular(16)),
          child:Row(children:[
            const CircleAvatar(
              radius:24,backgroundColor:Color(0xffe0f2ec),
              child:Icon(Icons.person,color:clockTeal)),
            const SizedBox(width:11),
            Expanded(child:Column(
              crossAxisAlignment:CrossAxisAlignment.start,children:[
              Text(person.name,style:const TextStyle(
                color:clockInk,fontSize:17,fontWeight:FontWeight.w800)),
              const SizedBox(height:4),
              Text(switch(person.shift?.state){
                'working'=>'עובד כעת',
                'break'=>'בהפסקה',
                'finished'=>'סיים משמרת',
                _=>'לא במשמרת',
              },style:const TextStyle(color:clockMuted,fontSize:14)),
            ])),
            Text(attendanceDuration(person.shift?.workedMs??0),
              textDirection:TextDirection.ltr,
              style:const TextStyle(color:clockInk,
                fontSize:16,fontWeight:FontWeight.w900)),
          ]),
        ),
    ]);
  }

  @override Widget build(BuildContext context)=>
    session.isManager?_manager():_employee();
}
