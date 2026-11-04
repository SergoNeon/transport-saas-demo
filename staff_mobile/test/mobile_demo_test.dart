import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:brill_staff/demo_state.dart';
import 'package:brill_staff/model.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('a fresh mobile demo opens on an employee who can clock in', () async {
    SharedPreferences.setMockInitialValues({});
    final state = StaffDemoState();
    while (!state.loaded) {
      await Future<void>.delayed(const Duration(milliseconds: 10));
    }
    expect(state.selectedId, 'e6');
    expect(state.selected.state, ShiftState.off);
    expect(state.selected.workedDuration(state.now), Duration.zero);
    expect(state.transition(state.selectedId, 'start'), isTrue);
    expect(state.selected.state, ShiftState.working);
    expect(state.transition(state.selectedId, 'start'), isFalse);
    expect(state.transition(state.selectedId, 'pause'), isTrue);
    expect(state.selected.state, ShiftState.onBreak);
    expect(state.selected.showsSamplePosition, isFalse);
    expect(state.transition(state.selectedId, 'resume'), isTrue);
    expect(state.transition(state.selectedId, 'end'), isTrue);
    expect(state.selected.state, ShiftState.finished);
    state.dispose();
  });

  test('reset reopens a clean clock-in screen', () async {
    SharedPreferences.setMockInitialValues({});
    final state = StaffDemoState();
    while (!state.loaded) {
      await Future<void>.delayed(const Duration(milliseconds: 10));
    }
    state.transition(state.selectedId, 'start');
    state.transition(state.selectedId, 'end');
    state.reset();
    expect(state.selectedId, 'e6');
    expect(state.selected.state, ShiftState.off);
    state.dispose();
  });
}
