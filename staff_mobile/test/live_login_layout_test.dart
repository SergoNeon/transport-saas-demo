import 'package:brill_staff/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  for (final size in <Size>[
    const Size(360,640),
    const Size(393,852),
    const Size(980,1740),
  ]) {
    testWidgets('login fills the viewport on $size without tiny centered card',
        (tester) async {
      await tester.binding.setSurfaceSize(size);
      addTearDown(() async=>tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(const ElectraAfikimApp());
      await tester.pumpAndSettle();
      final screen=find.byKey(const Key('live-phone-login-screen'));
      final panel=find.byKey(const Key('live-login-form-panel'));
      expect(screen,findsOneWidget);
      expect(panel,findsOneWidget);
      final rect=tester.getRect(panel);
      expect(rect.width,greaterThan(size.width*0.85));
      expect(rect.top,lessThan(size.height*0.38));
      expect(find.text('כניסה למערכת'),findsWidgets);
      expect(find.byKey(const Key('live-login-submit')),findsOneWidget);
      expect(tester.takeException(),isNull);
      await tester.pumpWidget(const SizedBox());
    });
  }
}
