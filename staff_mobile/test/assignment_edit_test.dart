import 'package:brill_staff/demo_state.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main(){
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<StaffDemoState> create() async {
    final state=StaffDemoState();
    while(!state.loaded){
      await Future<void>.delayed(const Duration(milliseconds:10));
    }
    return state;
  }

  test('manager edits duty and must collect fresh confirmation',() async {
    SharedPreferences.setMockInitialValues({});
    final state=await create();
    final a=state.selectedAssignment!;
    expect(state.confirmAssignment(a.id),isTrue);
    expect(state.selectedAssignment!.isConfirmed,isTrue);
    final start=a.scheduledStart.add(const Duration(hours:1));
    final end=a.scheduledEnd.add(const Duration(hours:1));
    expect(state.rescheduleAssignment(
      assignmentId:a.id,start:start,end:end,
      site:'תחנת בדיקה חדשה',lines:'5, 7',
      instructions:'יש להתייצב ב-8'),isTrue);
    expect(state.selectedAssignment!.isConfirmed,isFalse);
    expect(state.selectedAssignment!.site,'תחנת בדיקה חדשה');
    expect(state.selectedAssignment!.busLines,'5, 7');
    expect(state.confirmAssignment(a.id),isTrue);
    expect(state.confirmAssignment(a.id),isFalse);
    state.dispose();
  });

  test('invalid schedule does not discard existing confirmation',() async {
    SharedPreferences.setMockInitialValues({});
    final state=await create();
    final a=state.selectedAssignment!;
    expect(state.confirmAssignment(a.id),isTrue);
    expect(state.rescheduleAssignment(
      assignmentId:a.id,start:a.scheduledEnd,
      end:a.scheduledStart,
      site:'תחנה',lines:'5',instructions:'בדיקה'),isFalse);
    expect(state.selectedAssignment!.isConfirmed,isTrue);
    expect(state.rescheduleAssignment(
      assignmentId:a.id,start:a.scheduledStart,
      end:a.scheduledEnd,site:'',lines:'5',instructions:'בדיקה'),isFalse);
    expect(state.selectedAssignment!.isConfirmed,isTrue);
    state.dispose();
  });

  test('manager schedule changes persist to fresh app state',() async {
    SharedPreferences.setMockInitialValues({});
    final state=await create();
    final a=state.selectedAssignment!;
    final id=a.id;
    expect(state.rescheduleAssignment(
      assignmentId:id,start:a.scheduledStart,
      end:a.scheduledEnd,site:'חניון חדש',
      lines:'12',instructions:'הגעה 10 דקות לפני'),isTrue);
    await state.save();
    state.dispose();
    final loaded=await create();
    expect(loaded.selectedAssignment!.site,'חניון חדש');
    expect(loaded.selectedAssignment!.busLines,'12');
    expect(loaded.selectedAssignment!.isConfirmed,isFalse);
    loaded.dispose();
  });
}
