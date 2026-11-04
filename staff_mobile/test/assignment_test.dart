import 'package:brill_staff/assignment.dart';
import 'package:brill_staff/demo_state.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main(){
  TestWidgetsFlutterBinding.ensureInitialized();
  test('worker can confirm assigned shift exactly once',(){
    final a=WorkAssignment(id:'shift-1',workerId:'u1',
      scheduledStart:DateTime(2026,11,4,7),scheduledEnd:DateTime(2026,11,4,15),
      site:'תחנה מרכזית',region:'שרון',busLines:'1, 2',instructions:'התייצבות');
    expect(a.isConfirmed,isFalse);
    expect(a.occursOn(DateTime(2026,11,4)),isTrue);
    expect(a.confirm(DateTime(2026,11,4,6)),isTrue);
    expect(a.confirm(DateTime(2026,11,4,6,1)),isFalse);
    final restored=WorkAssignment.fromJson(a.toJson());
    expect(restored.isConfirmed,isTrue);
    expect(restored.site,'תחנה מרכזית');
  });
  test('only the assigned worker can confirm their assignment',() async {
    SharedPreferences.setMockInitialValues({});
    final state=StaffDemoState();
    while(!state.loaded){await Future<void>.delayed(const Duration(milliseconds:10));}
    final chosen=state.selectedAssignment!;
    expect(chosen.workerId,state.selectedId);
    expect(state.confirmAssignment(chosen.id),isTrue);
    expect(state.confirmAssignment(chosen.id),isFalse);
    final other=state.assignments.firstWhere((a)=>a.workerId!=state.selectedId);
    expect(state.confirmAssignment(other.id),isFalse);
    state.dispose();
  });
  test('work schedule survives local persistence',() async {
    SharedPreferences.setMockInitialValues({});
    final first=StaffDemoState();
    while(!first.loaded){await Future<void>.delayed(const Duration(milliseconds:10));}
    final id=first.selectedAssignment!.id;
    first.confirmAssignment(id);
    await first.save();
    first.dispose();
    final second=StaffDemoState();
    while(!second.loaded){await Future<void>.delayed(const Duration(milliseconds:10));}
    expect(second.selectedAssignment!.isConfirmed,isTrue);
    second.dispose();
  });
}