import 'package:flutter_test/flutter_test.dart';
import 'package:brill_staff/model.dart';

void main() {
  test('clock in, pause, resume, clock out computes net time', () {
    final start=DateTime.utc(2026,11,4,8);
    final w=StaffMember(id:'x',name:'עובד',position:'מבקר',
      workplace:'נתניה',region:'צפון',latitude:32,longitude:34);
    expect(w.clockIn(start),isTrue);
    expect(w.clockIn(start),isFalse);
    expect(w.startBreak(start.add(const Duration(hours:2))),isTrue);
    expect(w.state,ShiftState.onBreak);
    expect(w.workedDuration(start.add(const Duration(hours:2,minutes:30))).inMinutes,120);
    expect(w.finishBreak(start.add(const Duration(hours:2,minutes:30))),isTrue);
    expect(w.clockOut(start.add(const Duration(hours:5))),isTrue);
    expect(w.workedDuration(start.add(const Duration(hours:8))).inMinutes,270);
    expect(w.breakDuration(start.add(const Duration(hours:8))).inMinutes,30);
  });

  test('position visibility is strictly tied to active work status', () {
    final now=DateTime.utc(2026,11,4,8);
    final w=StaffMember(id:'y',name:'עובד',position:'מבקר',
      workplace:'חיפה',region:'צפון',latitude:32,longitude:34);
    expect(w.showsSamplePosition,isFalse);
    w.clockIn(now);
    expect(w.showsSamplePosition,isTrue);
    w.startBreak(now.add(const Duration(minutes:10)));
    expect(w.showsSamplePosition,isFalse);
    w.finishBreak(now.add(const Duration(minutes:20)));
    expect(w.showsSamplePosition,isTrue);
    w.clockOut(now.add(const Duration(minutes:30)));
    expect(w.showsSamplePosition,isFalse);
    expect(w.clockOut(now.add(const Duration(minutes:31))),isFalse);
  });

  test('Hebrew CSV includes totals and workplace', () {
    final now=DateTime.utc(2026,11,4,12);
    final w=StaffMember(id:'z',name:'דניאל כהן',position:'מבקר',
      workplace:'תל אביב',region:'מרכז',latitude:32,longitude:34,
      startedAt:DateTime.utc(2026,11,4,8),completedBreakMs:30*60000);
    final text=exportCsv([w],now);
    expect(text,contains('דניאל כהן'));
    expect(text,contains('תל אביב'));
    expect(text,contains('210'));
  });

  test('serialization preserves paid time and shift status', () {
    final now=DateTime.utc(2026,11,4,12);
    final w=StaffMember(id:'a',name:'יוסי',position:'מבקר',
      workplace:'נתניה',region:'שרון',latitude:32,longitude:34,
      startedAt:now.subtract(const Duration(hours:3)),
      breakStartedAt:now.subtract(const Duration(minutes:5)),
      completedBreakMs:600000);
    final restored=StaffMember.fromJson(w.toJson());
    expect(restored.state,ShiftState.onBreak);
    expect(restored.workedDuration(now).inMinutes,165);
  });
}
