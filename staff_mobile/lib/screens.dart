import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'demo_state.dart';
import 'model.dart';

// Portrait-first field-worker app. There is deliberately no desktop dashboard
// in the employee home: one clock, one primary action and a worksite line.
const ink = Color(0xff152734);
const teal = Color(0xff08796d);
const pale = Color(0xffe7f3f0);
const canvas = Color(0xfff8fafb);
const soft = Color(0xffedf1f4);
const muted = Color(0xff697985);
const border = Color(0xffe2e9ed);
const danger = Color(0xffb54b49);

class StaffScreen extends StatefulWidget {
  const StaffScreen({super.key});
  @override
  State<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends State<StaffScreen> {
  late final StaffDemoState demo;
  Timer? tick;
  bool manager = false;
  int tab = 0;

  @override
  void initState() {
    super.initState();
    demo = StaffDemoState();
    demo.addListener(_refresh);
    tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && demo.loaded) setState(() {});
    });
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    tick?.cancel();
    demo.removeListener(_refresh);
    demo.dispose();
    super.dispose();
  }

  String _clock(Duration d) {
    final seconds = math.max(0, d.inSeconds);
    String pair(int n) => n.toString().padLeft(2, '0');
    return pair(seconds ~/ 3600) + ':' +
        pair((seconds % 3600) ~/ 60) + ':' + pair(seconds % 60);
  }

  String _status(StaffMember w) {
    switch (w.state) {
      case ShiftState.off: return 'לא במשמרת';
      case ShiftState.working: return 'במשמרת';
      case ShiftState.onBreak: return 'בהפסקה';
      case ShiftState.finished: return 'המשמרת הסתיימה';
    }
  }

  Color _statusColor(StaffMember w) {
    switch (w.state) {
      case ShiftState.working: return teal;
      case ShiftState.onBreak: return const Color(0xffaa792a);
      case ShiftState.off:
      case ShiftState.finished: return muted;
    }
  }

  Future<void> _endShift(StaffMember w) async {
    final accept = await showDialog<bool>(context: context, builder: (ctx) =>
      AlertDialog(
        title: const Text('סיום משמרת'),
        content: const Text('לסיים את המשמרת ולחשב את שעות העבודה?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false),
            child: const Text('ביטול')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true),
            child: const Text('אישור סיום')),
        ],
      ));
    if (accept == true && mounted) {
      HapticFeedback.mediumImpact();
      demo.transition(w.id, 'end');
    }
  }

  Widget _primary(String text, IconData icon, VoidCallback onPressed) =>
    SizedBox(width: double.infinity, height: 62,
      child: FilledButton.icon(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: teal,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(17)),
        ),
        icon: Icon(icon, size: 24),
        label: Text(text, style: const TextStyle(
          fontSize: 19, fontWeight: FontWeight.w800)),
      ));

  Widget _secondary(String text, VoidCallback onPressed) =>
    SizedBox(width: double.infinity, height: 49,
      child: TextButton(
        onPressed: onPressed,
        style: TextButton.styleFrom(foregroundColor: danger),
        child: Text(text, style: const TextStyle(
          fontSize: 15, fontWeight: FontWeight.w700)),
      ));

  Widget _employeeHome() => LayoutBuilder(builder: (context, layout) {
    // Fills a normal phone, scrolls only on unusually short screens.
    final height = math.max(layout.maxHeight, 604.0);
    final w = demo.selected;
    final duration = w.workedDuration(demo.now);
    final diameter = math.min(MediaQuery.sizeOf(context).width * .64, 236.0);
    final active = w.state == ShiftState.working;
    final paused = w.state == ShiftState.onBreak;
    final off = w.state == ShiftState.off;
    return SingleChildScrollView(
      child: SizedBox(height: height, child: Padding(
        padding: const EdgeInsets.fromLTRB(23, 12, 23, 14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('שלום, ' + w.name.split(' ').first,
                  style: const TextStyle(
                    color: ink, fontSize: 27, fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                const Text('שעון הנוכחות שלי',
                  style: TextStyle(color: muted, fontSize: 14)),
              ])),
            PopupMenuButton<String>(
              tooltip: 'בחירת עובד לדוגמה',
              onSelected: demo.select,
              itemBuilder: (_) => demo.members.map((person) =>
                PopupMenuItem<String>(value: person.id,
                  child: Text(person.name))).toList(),
              child: Container(width: 43, height: 43,
                decoration: const BoxDecoration(
                  color: pale, shape: BoxShape.circle),
                child: const Icon(Icons.person_outline, color: teal)),
            ),
          ]),
          const Spacer(flex: 1),
          Center(child: SizedBox(
            width: diameter, height: diameter,
            child: Stack(alignment: Alignment.center, children: [
              SizedBox.expand(child: CircularProgressIndicator(
                value: active ? .78 : paused ? .51 : .02,
                strokeWidth: 9, strokeCap: StrokeCap.round,
                backgroundColor: soft,
                valueColor: AlwaysStoppedAnimation<Color>(
                  active ? teal : paused ? const Color(0xffc49a50) : border),
              )),
              Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(
                  active ? Icons.directions_walk :
                  paused ? Icons.coffee_outlined : Icons.schedule,
                  size: 26, color: active ? teal : muted),
                const SizedBox(height: 10),
                const Text('שעות עבודה', style: TextStyle(
                  color: muted, fontSize: 13)),
                const SizedBox(height: 5),
                FittedBox(fit: BoxFit.scaleDown, child: Text(_clock(duration),
                  style: const TextStyle(
                    color: ink, fontWeight: FontWeight.w900,
                    fontSize: 37,
                    fontFeatures: [FontFeature.tabularFigures()]))),
                const SizedBox(height: 9),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: active ? pale : soft,
                    borderRadius: BorderRadius.circular(20)),
                  child: Text(_status(w), style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w800,
                    color: _statusColor(w))),
                ),
              ]),
            ]),
          )),
          const Spacer(flex: 1),
          Row(children: [
            _timeDetail('כניסה', timeText(w.startedAt)),
            Container(height: 32, width: 1, color: border),
            _timeDetail('הפסקות', durationText(w.breakDuration(demo.now))),
            Container(height: 32, width: 1, color: border),
            _timeDetail('יציאה', timeText(w.endedAt)),
          ]),
          const SizedBox(height: 22),
          if (off) _primary('תחילת משמרת', Icons.play_arrow_rounded,
            () => demo.transition(w.id, 'start')),
          if (active) ...[
            _primary('יציאה להפסקה', Icons.coffee_outlined,
              () => demo.transition(w.id, 'pause')),
            _secondary('סיום משמרת', () => _endShift(w)),
          ],
          if (paused) ...[
            _primary('חזרה לעבודה', Icons.play_arrow_rounded,
              () => demo.transition(w.id, 'resume')),
            _secondary('סיום משמרת', () => _endShift(w)),
          ],
          if (w.state == ShiftState.finished)
            Container(
              padding: const EdgeInsets.all(17),
              decoration: BoxDecoration(
                color: pale, borderRadius: BorderRadius.circular(16)),
              child: const Row(children: [
                Icon(Icons.check_circle, color: teal),
                SizedBox(width: 9),
                Expanded(child: Text('המשמרת הסתיימה',
                  style: TextStyle(color: teal, fontWeight: FontWeight.w800))),
              ]),
            ),
          if (off || w.state == ShiftState.finished)
            const SizedBox(height: 49),
          const SizedBox(height: 16),
          Container(height: 1, color: border),
          const SizedBox(height: 13),
          Row(children: [
            const Icon(Icons.place_outlined, color: teal, size: 21),
            const SizedBox(width: 8),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('מקום עבודה', style: TextStyle(
                  color: muted, fontSize: 11)),
                const SizedBox(height: 3),
                Text(w.workplace, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: ink,
                    fontSize: 13, fontWeight: FontWeight.w700)),
              ],
            )),
          ]),
          const SizedBox(height: 10),
          const Text('דמו בלבד · אין איסוף GPS או נתוני נוכחות אמיתיים',
            textAlign: TextAlign.center,
            style: TextStyle(color: muted, fontSize: 10)),
        ]),
      )),
    );
  });

  Widget _timeDetail(String caption, String value) => Expanded(
    child: Column(children: [
      Text(caption, style: const TextStyle(color: muted, fontSize: 11)),
      const SizedBox(height: 5),
      Text(value, style: const TextStyle(
        color: ink, fontWeight: FontWeight.w800,
        fontSize: 16, fontFeatures: [FontFeature.tabularFigures()])),
    ]),
  );

  Widget _surface(Widget child) => Container(
    padding: const EdgeInsets.all(17),
    decoration: BoxDecoration(color: Colors.white,
      border: Border.all(color: border),
      borderRadius: BorderRadius.circular(18)),
    child: child,
  );

  Widget _heading(String headline, String subtitle) => Padding(
    padding: const EdgeInsets.only(bottom: 20),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(headline, style: const TextStyle(
        color: ink, fontSize: 26, fontWeight: FontWeight.w900)),
      const SizedBox(height: 6),
      Text(subtitle, style: const TextStyle(color: muted, fontSize: 12)),
    ]),
  );

  Widget _workerLine(StaffMember w) => Material(
    color: Colors.transparent,
    child: InkWell(
      onTap: () => _workerDetails(w),
      child: Padding(padding: const EdgeInsets.symmetric(vertical: 13),
        child: Row(children: [
          CircleAvatar(radius: 22, backgroundColor: pale,
            child: Text(w.name.substring(0, 1), style: const TextStyle(
              color: teal, fontWeight: FontWeight.w900))),
          const SizedBox(width: 10),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(w.name, style: const TextStyle(
                color: ink, fontWeight: FontWeight.w800, fontSize: 14)),
              const SizedBox(height: 4),
              Text(w.workplace, maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: muted, fontSize: 11)),
            ],
          )),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(_status(w), style: TextStyle(
              color: _statusColor(w), fontSize: 11,
              fontWeight: FontWeight.w700)),
            const SizedBox(height: 5),
            Text(durationText(w.workedDuration(demo.now)),
              style: const TextStyle(color: ink, fontSize: 14,
                fontWeight: FontWeight.w900)),
          ]),
          const SizedBox(width: 3),
          const Icon(Icons.chevron_left, color: muted, size: 19),
        ]),
      ),
    ),
  );

  void _workerDetails(StaffMember w) => showModalBottomSheet<void>(
    context: context, showDragHandle: true,
    isScrollControlled: true, backgroundColor: Colors.white,
    builder: (ctx) => SafeArea(child: Padding(
      padding: const EdgeInsets.fromLTRB(22, 10, 22, 28),
      child: Column(mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(w.name, style: const TextStyle(color: ink,
            fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          Text(w.position, style: const TextStyle(color: muted)),
          const SizedBox(height: 16),
          _surface(Column(children: [
            Row(children: [
              _timeDetail('כניסה', timeText(w.startedAt)),
              _timeDetail('הפסקות', durationText(w.breakDuration(demo.now))),
              _timeDetail('שעות נטו',
                durationText(w.workedDuration(demo.now))),
            ]),
            const Divider(height: 28),
            Row(children: [
              const Icon(Icons.place_outlined, color: teal),
              const SizedBox(width: 7),
              Expanded(child: Text(w.workplace,
                style: const TextStyle(color: ink))),
            ]),
          ])),
          const SizedBox(height: 12),
          const Text('תצוגת מנהל · נתונים מדומים בלבד',
            textAlign: TextAlign.center,
            style: TextStyle(color: muted, fontSize: 11)),
        ]),
      ),
    ),
  );

  Widget _managerHome() {
    final workers = demo.members;
    return ListView(padding: const EdgeInsets.fromLTRB(17, 22, 17, 25),
      children: [
        _heading('הצוות שלי', 'נוכחות עובדים בזמן המשמרת'),
        Row(children: [
          Expanded(child: _countTile('בעבודה', demo.activeCount, teal)),
          const SizedBox(width: 10),
          Expanded(child: _countTile('בהפסקה', demo.breakCount,
            const Color(0xffb17a2b))),
          const SizedBox(width: 10),
          Expanded(child: _countTile('סיימו', demo.finishedCount, muted)),
        ]),
        const SizedBox(height: 22),
        const Text('עובדים', style: TextStyle(
          color: ink, fontSize: 18, fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        _surface(Column(children: [
          for (final w in workers) _workerLine(w),
        ])),
        const SizedBox(height: 16),
        SizedBox(height: 50, child: OutlinedButton.icon(
          onPressed: () => setState(() => tab = 1),
          icon: const Icon(Icons.map_outlined),
          label: const Text('מפת העובדים'),
        )),
        const SizedBox(height: 12),
        const Center(child: Text('גרסת הדגמה · לא נתוני עובדים אמיתיים',
          style: TextStyle(color: muted, fontSize: 11))),
      ]);
  }

  Widget _countTile(String title, int count, Color color) => Container(
    padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 10),
    decoration: BoxDecoration(color: Colors.white,
      border: Border.all(color: border),
      borderRadius: BorderRadius.circular(15)),
    child: Column(children: [
      Text(count.toString(), style: TextStyle(
        color: color, fontSize: 27, fontWeight: FontWeight.w900)),
      const SizedBox(height: 4),
      Text(title, style: const TextStyle(color: muted, fontSize: 12)),
    ]),
  );

  Widget _mapPage({required bool employee}) {
    final people = demo.members.where((w) =>
      w.showsSamplePosition && w.lastSampleAt != null &&
      demo.now.difference(w.lastSampleAt!).inMinutes < 5 &&
      (!employee || w.id == demo.selectedId)).toList();
    final here = employee ? demo.selected :
      (people.isNotEmpty ? people.first : demo.members.first);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 24),
      children: [
        _heading(employee ? 'מקום העבודה שלי' : 'מפת עובדים',
          'מיקום דוגמה בלבד · GPS של המכשיר אינו מופעל'),
        ClipRRect(borderRadius: BorderRadius.circular(18),
          child: SizedBox(height: math.max(280,
            MediaQuery.sizeOf(context).height * .5),
            child: FlutterMap(
              options: MapOptions(initialCenter: LatLng(here.latitude,
                here.longitude), initialZoom: employee ? 12 : 9),
              children: [
                TileLayer(
                  urlTemplate:
                    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName:
                    'com.electraafikim.attendance.demo'),
                MarkerLayer(markers: people.map((w) => Marker(
                  point: LatLng(w.latitude, w.longitude),
                  width: 50, height: 50,
                  child: GestureDetector(
                    onTap: employee ? null : () => _workerDetails(w),
                    child: Container(
                      decoration: BoxDecoration(shape: BoxShape.circle,
                        color: teal, border: Border.all(
                          color: Colors.white, width: 3)),
                      child: const Icon(Icons.person_pin_circle,
                        color: Colors.white, size: 28)),
                  ),
                )).toList()),
                const RichAttributionWidget(attributions: [
                  TextSourceAttribution('OpenStreetMap contributors'),
                ]),
              ],
            )),
        ),
        const SizedBox(height: 14),
        _surface(Column(crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(employee ? 'מקום עבודה משויך' :
              'עובדים עם מיקום הדגמה פעיל',
              style: const TextStyle(color: ink,
                fontWeight: FontWeight.w800, fontSize: 15)),
            const SizedBox(height: 10),
            if (employee)
              Text(here.workplace,
                style: const TextStyle(color: muted)),
            if (!employee)
              ...people.map((w) => _workerLine(w)),
            if (!employee && people.isEmpty)
              const Text('אין מיקום לדוגמה בזמן משמרת פעילה',
                style: TextStyle(color: muted)),
          ],
        )),
      ]);
  }

  Widget _reportsPage({required bool employee}) {
    final people = employee ? [demo.selected] : demo.members;
    return ListView(
      padding: const EdgeInsets.fromLTRB(17, 22, 17, 25),
      children: [
        _heading(employee ? 'השעות שלי' : 'דוח שעות',
          'כניסה, הפסקות, יציאה ושעות נטו'),
        _surface(Column(children: [
          for (final w in people) ...[
            Row(children: [
              Expanded(child: Text(w.name,
                style: const TextStyle(
                  color: ink, fontWeight: FontWeight.w800))),
              Text(durationText(w.workedDuration(demo.now)),
                style: const TextStyle(
                  color: teal, fontWeight: FontWeight.w900)),
            ]),
            const SizedBox(height: 6),
            Text(w.workplace, style: const TextStyle(
              color: muted, fontSize: 12)),
            const SizedBox(height: 8),
            Wrap(spacing: 12, children: [
              Text('כניסה ' + timeText(w.startedAt),
                style: const TextStyle(color: muted, fontSize: 11)),
              Text('הפסקות ' +
                durationText(w.breakDuration(demo.now)),
                style: const TextStyle(color: muted, fontSize: 11)),
              Text('יציאה ' + timeText(w.endedAt),
                style: const TextStyle(color: muted, fontSize: 11)),
            ]),
            if (w != people.last)
              const Divider(height: 24),
          ],
        ])),
        const SizedBox(height: 18),
        if (!employee)
          OutlinedButton.icon(onPressed: () {
            Clipboard.setData(ClipboardData(
              text: exportCsv(demo.members, demo.now)));
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('דוח CSV הועתק ללוח · נתוני דמו')));
          }, icon: const Icon(Icons.copy_outlined),
            label: const Text('העתקת דוח CSV')),
        TextButton(
          onPressed: demo.advance,
          child: const Text('הדמיית 15 דקות קדימה')),
        TextButton(
          onPressed: () async {
            final ok = await showDialog<bool>(context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('איפוס נתוני הדגמה'),
                content: const Text('לאפס את נתוני המשמרות המדומים?'),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('ביטול')),
                  FilledButton(onPressed: () => Navigator.pop(ctx, true),
                    child: const Text('איפוס')),
                ]));
            if (ok == true) demo.reset();
          },
          child: const Text('איפוס נתוני הדגמה')),
      ]);
  }

  Widget _body() {
    if (!manager) {
      if (tab == 0) return _employeeHome();
      if (tab == 1) return _mapPage(employee: true);
      return _reportsPage(employee: true);
    }
    if (tab == 0) return _managerHome();
    if (tab == 1) return _mapPage(employee: false);
    return _reportsPage(employee: false);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: canvas,
    appBar: AppBar(
      backgroundColor: Colors.white,
      toolbarHeight: 61,
      surfaceTintColor: Colors.transparent,
      titleSpacing: 17,
      automaticallyImplyLeading: false,
      title: Row(children: [
        Container(
          width: 36, height: 36,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: teal,
            borderRadius: BorderRadius.circular(10)),
          child: const Text('א', style: TextStyle(
            color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
        ),
        const SizedBox(width: 9),
        const Expanded(child: Text('אלקטרה אפיקים',
          maxLines: 1, overflow: TextOverflow.ellipsis,
          style: TextStyle(color: ink,
            fontSize: 17, fontWeight: FontWeight.w900))),
        PopupMenuButton<bool>(
          tooltip: 'החלפת תצוגה לצורך הדגמה',
          onSelected: (value) => setState(() {
            manager = value;
            tab = 0;
          }),
          itemBuilder: (_) => const [
            PopupMenuItem<bool>(value: false,
              child: Text('דמו עובד')),
            PopupMenuItem<bool>(value: true,
              child: Text('דמו מנהל')),
          ],
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 10, vertical: 7),
            decoration: BoxDecoration(color: pale,
              borderRadius: BorderRadius.circular(17)),
            child: Text(manager ? 'מנהל ▾' : 'עובד ▾',
              style: const TextStyle(
                color: teal, fontSize: 12, fontWeight: FontWeight.w800)),
          ),
        ),
      ]),
    ),
    body: !demo.loaded ? const Center(
      child: CircularProgressIndicator(color: teal)) : SafeArea(child: _body()),
    bottomNavigationBar: NavigationBar(
      backgroundColor: Colors.white,
      indicatorColor: pale,
      height: 71,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      selectedIndex: tab,
      onDestinationSelected: (next) => setState(() => tab = next),
      destinations: manager ? const [
        NavigationDestination(icon: Icon(Icons.people_outline),
          selectedIcon: Icon(Icons.people, color: teal), label: 'עובדים'),
        NavigationDestination(icon: Icon(Icons.map_outlined),
          selectedIcon: Icon(Icons.map, color: teal), label: 'מפה'),
        NavigationDestination(icon: Icon(Icons.receipt_long_outlined),
          selectedIcon: Icon(Icons.receipt_long, color: teal), label: 'דוחות'),
      ] : const [
        NavigationDestination(icon: Icon(Icons.schedule_outlined),
          selectedIcon: Icon(Icons.schedule, color: teal), label: 'משמרת'),
        NavigationDestination(icon: Icon(Icons.place_outlined),
          selectedIcon: Icon(Icons.place, color: teal), label: 'מקום'),
        NavigationDestination(icon: Icon(Icons.history_outlined),
          selectedIcon: Icon(Icons.history, color: teal), label: 'שעות'),
      ],
    ),
  );
}
