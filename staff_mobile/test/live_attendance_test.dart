import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:brill_staff/attendance_panel.dart';
import 'package:brill_staff/live_api.dart';

void main(){
  const worker=LiveSession(bearer:'test',id:'w-demo',
    name:'מבקר הדגמה',role:'worker');
  const manager=LiveSession(bearer:'test',id:'m-demo',
    name:'מנהל הדגמה',role:'manager');
  final now=DateTime(2026,11,4,9);
  final shift=LiveShift(id:'1',workerId:'w-demo',state:'working',
    startedAt:now,endedAt:null,breakStartedAt:null,
    completedBreakMs:0,breakMs:0,workedMs:62000,version:1);

  testWidgets('employee has large server clock and break action',
      (tester)async{
    await tester.binding.setSurfaceSize(const Size(393,852));
    addTearDown(() async=>tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(MaterialApp(home:Scaffold(
      body:AttendancePanel(session:worker,
        data:LiveAttendance(own:shift,team:const [],serverTime:now),
        busy:false,onAction:(_){},
      ))));
    expect(find.byKey(const Key('live-server-attendance')),findsOneWidget);
    expect(find.text('00:01:02'),findsOneWidget);
    expect(find.text('יציאה להפסקה'),findsOneWidget);
    expect(find.text('סיום משמרת'),findsOneWidget);
    expect(tester.takeException(),isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('manager sees active employee in live attendance overview',
      (tester)async{
    await tester.pumpWidget(MaterialApp(home:Scaffold(
      body:AttendancePanel(session:manager,
        data:LiveAttendance(own:null,serverTime:now,team:[
          LiveTeamMember('w-demo','מבקר הדגמה',shift),
        ]),busy:false,onAction:(_){},
      ))));
    expect(find.byKey(const Key('live-manager-attendance')),findsOneWidget);
    expect(find.text('מבקר הדגמה'),findsOneWidget);
    expect(find.text('עובד כעת'),findsOneWidget);
    expect(tester.takeException(),isNull);
  });
}
