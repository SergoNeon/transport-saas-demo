import 'package:brill_staff/model.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('second shift is permitted and keeps the previous shift intact', () {
    final w = StaffMember(
      id: 'i1', name: 'יוסי', position: 'מבקר',
      workplace: 'תחנת נתניה', region: 'שרון',
      latitude: 32.32, longitude: 34.86);
    final first = DateTime.utc(2026, 11, 4, 6);
    expect(w.clockIn(first), isTrue);
    expect(w.startBreak(first.add(const Duration(hours: 2))), isTrue);
    expect(w.finishBreak(first.add(const Duration(hours: 2, minutes: 20))), isTrue);
    expect(w.clockOut(first.add(const Duration(hours: 5))), isTrue);
    expect(w.workedDuration(first.add(const Duration(hours: 6))).inMinutes, 280);
    expect(w.clockIn(first.add(const Duration(hours: 8))), isTrue);
    expect(w.previousShifts, hasLength(1));
    expect(w.previousShifts.first.workedDuration.inMinutes, 280);
    expect(w.startedAt, first.add(const Duration(hours: 8)));
    expect(w.endedAt, isNull);
    expect(w.completedBreakMs, 0);
    expect(w.workedDuration(first.add(const Duration(hours: 9))).inMinutes, 60);
    expect(w.totalWorkedDuration(first.add(const Duration(hours: 9))).inMinutes, 340);
    expect(w.clockOut(first.add(const Duration(hours: 10))), isTrue);
    expect(w.totalWorkedDuration(first.add(const Duration(hours: 11))).inMinutes, 400);
  });

  test('completed shift history survives serialization and affects CSV', () {
    final w = StaffMember(
      id: 'i2', name: 'מיה', position: 'מבקרת',
      workplace: 'תל אביב', region: 'מרכז', latitude: 32, longitude: 34);
    final first = DateTime.utc(2026, 11, 4, 8);
    w.clockIn(first);
    w.clockOut(first.add(const Duration(hours: 2)));
    w.clockIn(first.add(const Duration(hours: 3)));
    w.clockOut(first.add(const Duration(hours: 4)));
    final restored = StaffMember.fromJson(w.toJson());
    expect(restored.previousShifts.length, 1);
    expect(restored.totalWorkedDuration(first.add(const Duration(hours: 6))).inMinutes, 180);
    final csv = exportCsv([restored], first.add(const Duration(hours: 6)));
    expect(csv, contains('"180"'));
    expect(csv, contains('מיה'));
  });

  test('new shift cannot start during an active shift or break', () {
    final w = StaffMember(
      id: 'i3', name: 'אורן', position: 'מבקר',
      workplace: 'חיפה', region: 'צפון', latitude: 32, longitude: 34);
    final now = DateTime.utc(2026, 11, 4, 8);
    expect(w.clockIn(now), isTrue);
    expect(w.clockIn(now), isFalse);
    expect(w.startBreak(now.add(const Duration(minutes: 30))), isTrue);
    expect(w.clockIn(now.add(const Duration(minutes: 30))), isFalse);
    expect(w.previousShifts, isEmpty);
  });
}
