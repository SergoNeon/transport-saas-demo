import 'package:brill_staff/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('phone screen shows readable clock and immediate shift action',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.binding.setSurfaceSize(const Size(393, 852));
    addTearDown(() async => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(const ElectraAfikimApp(localDemo:true));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('employee-clock-screen')), findsOneWidget);
    expect(find.byKey(const Key('shift-timer-card')), findsOneWidget);
    expect(find.byKey(const Key('shift-timer-value')), findsOneWidget);
    expect(find.text('תחילת משמרת'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('תחילת משמרת'));
    await tester.pump();
    expect(find.text('יציאה להפסקה'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(const SizedBox());
  });


  testWidgets('finished shift offers next shift without resetting history',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.binding.setSurfaceSize(const Size(393, 852));
    addTearDown(() async => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const ElectraAfikimApp(localDemo:true));
    await tester.pumpAndSettle();
    await tester.tap(find.text('תחילת משמרת'));
    await tester.pump();
    final endButton = find.text('סיום משמרת');
    await tester.ensureVisible(endButton);
    await tester.tap(endButton);
    await tester.pumpAndSettle();
    expect(find.text('אישור סיום'), findsOneWidget);
    await tester.tap(find.text('אישור סיום'));
    await tester.pumpAndSettle();
    expect(find.text('תחילת משמרת חדשה'), findsOneWidget);
    await tester.tap(find.text('תחילת משמרת חדשה'));
    await tester.pump();
    expect(find.text('יציאה להפסקה'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('short phone does not overflow the primary time clock',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.binding.setSurfaceSize(const Size(360, 640));
    addTearDown(() async => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const ElectraAfikimApp(localDemo:true));
    await tester.pumpAndSettle();
    expect(find.text('תחילת משמרת'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
}
