import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'live_api.dart';

const ink=Color(0xff152734),teal=Color(0xff08796d);
const muted=Color(0xff697985),edge=Color(0xffe2e9ed);
String dateStr(DateTime x)=>x.year.toString().padLeft(4,'0')+'-'+
 x.month.toString().padLeft(2,'0')+'-'+x.day.toString().padLeft(2,'0');
String hhmm(dynamic value) {
 if(value==null)return '—';
 final m=((value as num).toInt()/60000).floor();
 return (m~/60).toString().padLeft(2,'0')+':'+(m%60).toString().padLeft(2,'0');
}
String clock(dynamic value){
 if(value is! String)return '—';
 final x=DateTime.parse(value).toLocal();
 return x.hour.toString().padLeft(2,'0')+':'+x.minute.toString().padLeft(2,'0');
}
Map<String,dynamic> map(dynamic value)=>Map<String,dynamic>.from(value as Map);
class TimesheetPanel extends StatefulWidget {
 final LiveSession session;
 const TimesheetPanel({super.key,required this.session});
 @override State<TimesheetPanel> createState()=>_TimesheetPanelState();
}
class _TimesheetPanelState extends State<TimesheetPanel>{
 final api=LiveApi();
 DateTime month=DateTime(DateTime.now().year,DateTime.now().month);
 Map<String,dynamic>? result;
 String? error;
 bool loading=false,copying=false;
 String get from=>dateStr(month);
 String get to=>dateStr(DateTime(month.year,month.month+1,0));
 @override void initState(){
  super.initState();
  WidgetsBinding.instance.addPostFrameCallback((_){if(mounted)load();});
 }
 @override void dispose(){api.close();super.dispose();}
 Future<void> load() async{
  if(loading)return;
  setState((){loading=true;error=null;});
  try{
   final response=await api.timesheet(widget.session,from:from,to:to);
   if(mounted)setState(()=>result=response);
  }catch(_){if(mounted)setState(()=>error='לא ניתן לקבל את הדוח מהשרת');}
  finally{if(mounted)setState(()=>loading=false);}
 }
 Future<void> next(int direction) async{
  setState((){month=DateTime(month.year,month.month+direction);result=null;});
  await load();
 }
 Future<void> copyCsv()async{
  if(copying)return;
  setState(()=>copying=true);
  try{
   final text=await api.timesheetCsv(widget.session,from:from,to:to);
   await Clipboard.setData(ClipboardData(text:text));
   if(mounted)ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content:Text('CSV הועתק. אפשר להדביק ב-Excel')));
  }catch(_){if(mounted)ScaffoldMessenger.of(context).showSnackBar(
   const SnackBar(content:Text('העתקת דוח נכשלה')));}
  finally{if(mounted)setState(()=>copying=false);}
 }
 Widget metric(String title,String value)=>Expanded(child:Container(
  padding:const EdgeInsets.symmetric(vertical:15,horizontal:7),
  decoration:BoxDecoration(color:Colors.white,border:Border.all(color:edge),
   borderRadius:BorderRadius.circular(14)),
  child:Column(children:[
   FittedBox(fit:BoxFit.scaleDown,child:Text(value,
    textDirection:TextDirection.ltr,
    style:const TextStyle(color:teal,fontSize:24,fontWeight:FontWeight.w900))),
   const SizedBox(height:6),
   Text(title,style:const TextStyle(color:muted,fontSize:13)),
  ]),
 ));
 Widget cell(String title,String value)=>Expanded(child:Column(children:[
  Text(title,style:const TextStyle(color:muted,fontSize:12)),
  const SizedBox(height:6),
  FittedBox(fit:BoxFit.scaleDown,child:Text(value,
   textDirection:TextDirection.ltr,
   style:const TextStyle(color:ink,fontSize:17,fontWeight:FontWeight.w800))),
 ]));
 Widget shiftCard(Map<String,dynamic> x)=>Container(
  margin:const EdgeInsets.only(bottom:10),padding:const EdgeInsets.all(16),
  decoration:BoxDecoration(color:Colors.white,border:Border.all(color:edge),
   borderRadius:BorderRadius.circular(16)),
  child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
   Row(children:[
    const Icon(Icons.event_available,color:teal),
    const SizedBox(width:9),
    Expanded(child:Text(x['workDay'].toString(),
     style:const TextStyle(color:ink,fontSize:17,fontWeight:FontWeight.w900))),
    Text(x['finalized']==true?'הושלמה':'פתוחה',
     style:const TextStyle(color:teal,fontSize:14,fontWeight:FontWeight.w800)),
   ]),
   if(widget.session.isManager)...[
    const SizedBox(height:5),
    Text(x['workerName'].toString(),style:const TextStyle(color:muted,fontSize:14)),
   ],
   const Divider(height:23),
   Row(children:[
    cell('כניסה',clock(x['startedAt'])),
    cell('יציאה',clock(x['endedAt'])),
    cell('עבודה',hhmm(x['workedMs'])),
    cell('הפסקה',hhmm(x['breakMs'])),
   ]),
  ]),
 );
 @override Widget build(BuildContext context){
  final rows=(result?['rows'] as List<dynamic>? ?? []).map(map).toList();
  final summary=result==null?<String,dynamic>{}:map(result!['summary']);
  final totals=summary.isEmpty?<String,dynamic>{}:map(summary['totals']);
  final workers=(summary['workers'] as List<dynamic>? ?? []).map(map).toList();
  return RefreshIndicator(onRefresh:load,child:ListView(
   key:const Key('live-timesheet-screen'),
   padding:const EdgeInsets.fromLTRB(15,18,15,28),
   children:[
    const Text('דוח שעות עבודה',style:TextStyle(
     color:ink,fontSize:27,fontWeight:FontWeight.w900)),
    const SizedBox(height:5),
    Text(widget.session.isManager?'שעות הצוות ודיווחי נוכחות':'המשמרות והשעות שלי',
     style:const TextStyle(color:muted,fontSize:16)),
    const SizedBox(height:16),
    Container(padding:const EdgeInsets.all(8),
     decoration:BoxDecoration(color:Colors.white,border:Border.all(color:edge),
      borderRadius:BorderRadius.circular(15)),
     child:Row(children:[
      IconButton(onPressed:loading?null:()=>next(1),
       icon:const Icon(Icons.chevron_right,size:32,color:teal)),
      Expanded(child:Column(children:[
       const Text('חודש',style:TextStyle(color:muted,fontSize:13)),
       Text(month.month.toString().padLeft(2,'0')+'/'+month.year.toString(),
        key:const Key('timesheet-period'),
        style:const TextStyle(color:ink,fontSize:22,fontWeight:FontWeight.w900)),
      ])),
      IconButton(onPressed:loading?null:()=>next(-1),
       icon:const Icon(Icons.chevron_left,size:32,color:teal)),
     ])),
    const SizedBox(height:14),
    if(loading)const LinearProgressIndicator(minHeight:3),
    if(error!=null)Text(error!,style:const TextStyle(color:Colors.red,fontSize:15)),
    if(result!=null)...[
     Row(children:[
      metric('שעות עבודה',hhmm(totals['workedMs'])),
      const SizedBox(width:8),
      metric('הפסקות',hhmm(totals['breakMs'])),
      const SizedBox(width:8),
      metric('משמרות',(totals['finished']??0).toString()),
     ]),
     const SizedBox(height:18),
     if(widget.session.isManager && workers.isNotEmpty)...[
      const Text('סיכום לפי עובד',style:TextStyle(
       color:ink,fontSize:20,fontWeight:FontWeight.w900)),
      const SizedBox(height:9),
      for(final person in workers)
       Container(margin:const EdgeInsets.only(bottom:8),
        padding:const EdgeInsets.all(15),
        decoration:BoxDecoration(color:Colors.white,border:Border.all(color:edge),
         borderRadius:BorderRadius.circular(14)),
        child:Row(children:[
         const Icon(Icons.person_outline,color:teal,size:25),
         const SizedBox(width:9),
         Expanded(child:Text(person['name'].toString(),style:const TextStyle(
          color:ink,fontSize:16,fontWeight:FontWeight.w800))),
         Text(hhmm(person['workedMs']),textDirection:TextDirection.ltr,
          style:const TextStyle(color:teal,fontSize:19,fontWeight:FontWeight.w900)),
        ])),
      const SizedBox(height:14),
     ],
     const Text('משמרות',style:TextStyle(
      color:ink,fontSize:20,fontWeight:FontWeight.w900)),
     const SizedBox(height:10),
     if(rows.isEmpty)const Padding(padding:EdgeInsets.all(18),
      child:Text('אין משמרות לתקופה זו.',
       style:TextStyle(color:muted,fontSize:16))),
     ...rows.map(shiftCard),
     const SizedBox(height:13),
     SizedBox(height:57,child:OutlinedButton.icon(
      key:const Key('timesheet-copy-csv'),
      onPressed:copying?null:copyCsv,
      icon:const Icon(Icons.content_copy_outlined,size:25),
      label:Text(copying?'מכין...':'העתקת CSV ל-Excel',
       style:const TextStyle(fontSize:16,fontWeight:FontWeight.w900)),
      style:OutlinedButton.styleFrom(foregroundColor:teal,
       shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(14))))),
     const SizedBox(height:14),
     const Text('דוח שעות גולמי בלבד. לא חישוב שכר או שעות נוספות. משמרות פתוחות לא נכללות בסיכום.',
      textAlign:TextAlign.center,
      style:TextStyle(color:muted,fontSize:13,height:1.5)),
    ],
   ],
  ));
 }
}
