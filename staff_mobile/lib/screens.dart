import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'demo_state.dart';
import 'model.dart';
import 'assignment.dart';

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

  Widget _employeeHome() {
    final w = demo.selected;
    final state = w.state;
    final active = state == ShiftState.working;
    final paused = state == ShiftState.onBreak;
    final off = state == ShiftState.off;

    return ListView(
      key: const Key('employee-clock-screen'),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 20),
      children: [
        Row(children: [
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('שלום, ' + w.name.split(' ').first,
                style: const TextStyle(color: ink,
                  fontSize: 28, fontWeight: FontWeight.w900)),
              const SizedBox(height: 3),
              const Text('הנוכחות שלי היום',
                style: TextStyle(color: muted, fontSize: 14)),
            ],
          )),
          PopupMenuButton<String>(
            tooltip: 'בחירת עובד לצורך הדגמה',
            onSelected: (value) {
              if (value == 'reset-demo') {
                demo.reset();
              } else {
                demo.select(value);
              }
            },
            itemBuilder: (_) => [
              ...demo.members.map((person) => PopupMenuItem<String>(
                value: person.id, child: Text(person.name))),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'reset-demo',
                child: Text('איפוס נתוני ההדגמה')),
            ],
            child: Container(
              width: 48, height: 48,
              decoration: const BoxDecoration(
                color: pale, shape: BoxShape.circle),
              child: const Icon(Icons.person_outline, color: teal, size: 25),
            ),
          ),
        ]),
        const SizedBox(height: 17),
        Container(
          key: const Key('shift-timer-card'),
          padding: const EdgeInsets.fromLTRB(20, 19, 20, 20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
              colors: [Color(0xff163d46), Color(0xff102932)]),
            borderRadius: BorderRadius.circular(23),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Row(children: [
                Icon(Icons.access_time_rounded,
                  color: Color(0xffa5d7cd), size: 19),
                SizedBox(width: 8),
                Text('שעון נוכחות',
                  style: TextStyle(color: Color(0xffcee6e0),
                    fontSize: 13, fontWeight: FontWeight.w700)),
              ]),
              const SizedBox(height: 22),
              const Center(child: Text('שעות עבודה נטו',
                style: TextStyle(color: Color(0xffbfd4d7), fontSize: 14))),
              const SizedBox(height: 5),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(_clock(w.workedDuration(demo.now)),
                  key: const Key('shift-timer-value'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white,
                    fontSize: 48, fontWeight: FontWeight.w900,
                    letterSpacing: 1.1,
                    fontFeatures: [FontFeature.tabularFigures()])),
              ),
              const SizedBox(height: 14),
              Center(child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(18)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.circle, color: active ? const Color(0xff89e6bf)
                    : paused ? const Color(0xfff5cb87) : Colors.white70,
                    size: 8),
                  const SizedBox(width: 7),
                  Text(_status(w), style: const TextStyle(
                    color: Colors.white, fontSize: 13,
                    fontWeight: FontWeight.w800)),
                ]),
              )),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (off)
          _primary('תחילת משמרת', Icons.play_arrow_rounded,
            () => demo.transition(w.id, 'start')),
        if (active) ...[
          _primary('יציאה להפסקה', Icons.coffee_outlined,
            () => demo.transition(w.id, 'pause')),
          const SizedBox(height: 3),
          _secondary('סיום משמרת', () => _endShift(w)),
        ],
        if (paused) ...[
          _primary('חזרה לעבודה', Icons.play_arrow_rounded,
            () => demo.transition(w.id, 'resume')),
          const SizedBox(height: 3),
          _secondary('סיום משמרת', () => _endShift(w)),
        ],
        if (state == ShiftState.finished) ...[
          _primary('תחילת משמרת חדשה', Icons.play_arrow_rounded,
            () => demo.transition(w.id, 'start')),
          const SizedBox(height: 9),
          Container(
            key: const Key('finished-shift-message'),
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: pale, borderRadius: BorderRadius.circular(15)),
            child: const Row(children: [
              Icon(Icons.check_circle, color: teal, size: 24),
              SizedBox(width: 10),
              Expanded(child: Text('המשמרת הסתיימה. סיכום השעות נשמר.',
                style: TextStyle(
                  color: teal, fontSize: 14, fontWeight: FontWeight.w800))),
            ]),
          ),
        ],
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: 10, vertical: 17),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: border),
            borderRadius: BorderRadius.circular(16)),
          child: Row(children: [
            _timeDetail('כניסה', timeText(w.startedAt)),
            Container(height: 36, width: 1, color: border),
            _timeDetail('הפסקות', durationText(w.breakDuration(demo.now))),
            Container(height: 36, width: 1, color: border),
            _timeDetail('יציאה', timeText(w.endedAt)),
          ]),
        ),
        const SizedBox(height: 13),
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: 15, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: border),
            borderRadius: BorderRadius.circular(16)),
          child: Row(children: [
            const Icon(Icons.place_outlined, color: teal, size: 24),
            const SizedBox(width: 10),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('מקום עבודה', style: TextStyle(
                  color: muted, fontSize: 12)),
                const SizedBox(height: 3),
                Text(w.workplace, maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: ink,
                    fontSize: 14, fontWeight: FontWeight.w800)),
              ],
            )),
          ]),
        ),
        const SizedBox(height: 16),
        const Text('גרסת הדגמה · אין איסוף GPS או דיווחי נוכחות אמיתיים',
          textAlign: TextAlign.center,
          style: TextStyle(color: muted, fontSize: 11)),
      ],
    );
  }

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
          onPressed: () => setState(() => tab = 2),
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
              Text(durationText(w.totalWorkedDuration(demo.now)),
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
            if (w.previousShifts.isNotEmpty) ...[
              const SizedBox(height: 11),
              Text('משמרות קודמות: ${w.previousShifts.length}',
                style: const TextStyle(color: teal,
                  fontSize: 12, fontWeight: FontWeight.w800)),
              for (final record in w.previousShifts.reversed.take(5))
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    '${timeText(record.startedAt)}–${timeText(record.endedAt)} · '
                    '${durationText(record.workedDuration)} שעות · '
                    '${record.workplace}',
                    style: const TextStyle(color: muted, fontSize: 11),
                  ),
                ),
            ],
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

  Widget _assignmentPage({required bool employee}) {
    final records=demo.assignments.where((a)=>a.occursOn(demo.now)
      && (!employee || a.workerId==demo.selectedId)).toList();
    return ListView(key:const Key('assignment-screen'),
      padding:const EdgeInsets.fromLTRB(17,20,17,27),
      children:[
        _heading(employee?'סידור העבודה שלי':'סידור עבודה',
          employee?'משמרת, קווים ונקודת התייצבות':'שעות עבודה ואישור קבלת הסידור'),
        if(records.isEmpty)_surface(const Text('אין סידור עבודה להיום',
          style:TextStyle(color:muted))),
        ...records.map((a)=>Padding(
          padding:const EdgeInsets.only(bottom:13),
          child:_assignmentCard(a,employee))),
        const SizedBox(height:12),
        const Text('נתוני הדגמה בלבד · האישורים נשמרים במכשיר',
          textAlign:TextAlign.center,
          style:TextStyle(color:muted,fontSize:11)),
      ]);
  }

  String _format24h(TimeOfDay t) =>
    t.hour.toString().padLeft(2,'0') + ':' +
    t.minute.toString().padLeft(2,'0');

  Future<void> _editAssignment(WorkAssignment assignment) async {
    final siteController=TextEditingController(text:assignment.site);
    final linesController=TextEditingController(text:assignment.busLines);
    final instructionsController=TextEditingController(text:assignment.instructions);
    var start=TimeOfDay.fromDateTime(assignment.scheduledStart);
    var end=TimeOfDay.fromDateTime(assignment.scheduledEnd);
    await showModalBottomSheet<void>(
      context:context,
      backgroundColor:Colors.white,
      isScrollControlled:true,
      showDragHandle:true,
      builder:(sheetContext)=>StatefulBuilder(
        builder:(sheetContext,update)=>SafeArea(child:Padding(
          padding:EdgeInsets.fromLTRB(20,8,20,
            MediaQuery.viewInsetsOf(sheetContext).bottom+22),
          child:SingleChildScrollView(child:Column(
            mainAxisSize:MainAxisSize.min,
            crossAxisAlignment:CrossAxisAlignment.stretch,
            children:[
              const Text('עריכת סידור עבודה',
                style:TextStyle(color:ink,fontSize:21,fontWeight:FontWeight.w900)),
              const SizedBox(height:6),
              const Text('שינוי משמרת מבטל אישור קודם ודורש אישור חדש.',
                style:TextStyle(color:muted,fontSize:12)),
              const SizedBox(height:18),
              Row(children:[
                Expanded(child:OutlinedButton.icon(
                  onPressed:() async {
                    final choice=await showTimePicker(
                      context:sheetContext,initialTime:start,
                      helpText:'שעת התחלה');
                    if(choice!=null)update(()=>start=choice);
                  },
                  icon:const Icon(Icons.schedule),
                  label:Text('כניסה '+_format24h(start)),
                )),
                const SizedBox(width:8),
                Expanded(child:OutlinedButton.icon(
                  onPressed:() async {
                    final choice=await showTimePicker(
                      context:sheetContext,initialTime:end,
                      helpText:'שעת סיום');
                    if(choice!=null)update(()=>end=choice);
                  },
                  icon:const Icon(Icons.schedule),
                  label:Text('יציאה '+_format24h(end)),
                )),
              ]),
              const SizedBox(height:11),
              TextField(controller:siteController,maxLength:120,
                decoration:const InputDecoration(
                  labelText:'מקום עבודה',border:OutlineInputBorder())),
              const SizedBox(height:8),
              TextField(controller:linesController,maxLength:80,
                decoration:const InputDecoration(
                  labelText:'קווי אוטובוס',border:OutlineInputBorder())),
              const SizedBox(height:8),
              TextField(controller:instructionsController,maxLines:2,
                maxLength:260,decoration:const InputDecoration(
                  labelText:'הוראות לעובד',border:OutlineInputBorder())),
              const SizedBox(height:14),
              _primary('שמירת סידור ושליחה לאישור',
                Icons.save_outlined,(){
                  final day=assignment.scheduledStart;
                  final begin=DateTime(day.year,day.month,day.day,
                    start.hour,start.minute);
                  final finish=DateTime(day.year,day.month,day.day,
                    end.hour,end.minute);
                  final ok=demo.rescheduleAssignment(
                    assignmentId:assignment.id,
                    start:begin,end:finish,
                    site:siteController.text,
                    lines:linesController.text,
                    instructions:instructionsController.text);
                  if(!ok){
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content:Text(
                        'יש למלא את כל השדות ולוודא שעת סיום אחרי התחלה')));
                    return;
                  }
                  Navigator.pop(sheetContext);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content:Text(
                      'הסידור עודכן · נדרש אישור חדש מהעובד')));
                }),
            ],
          ))))),
    );
    siteController.dispose();
    linesController.dispose();
    instructionsController.dispose();
  }

  Widget _assignmentCard(WorkAssignment a,bool employee) {
    final found=demo.members.where((w)=>w.id==a.workerId);
    final name=found.isEmpty?'עובד':found.first.name;
    return _surface(Column(crossAxisAlignment:CrossAxisAlignment.stretch,
      children:[
        Row(children:[
          const Icon(Icons.event_available,color:teal,size:28),
          const SizedBox(width:10),
          Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,
            children:[
              Text(employee?'המשמרת המתוכננת':name,
                style:const TextStyle(color:ink,fontSize:17,fontWeight:FontWeight.w900)),
              Text(a.region,style:const TextStyle(color:muted,fontSize:12)),
            ])),
          Icon(a.isConfirmed?Icons.verified:Icons.pending_actions,
            color:a.isConfirmed?teal:const Color(0xffb48139)),
        ]),
        const SizedBox(height:19),
        Row(children:[
          _timeDetail('תחילה',timeText(a.scheduledStart)),
          Container(height:35,width:1,color:border),
          _timeDetail('סיום',timeText(a.scheduledEnd)),
        ]),
        const Divider(height:29),
        Row(children:[
          const Icon(Icons.place_outlined,color:teal),
          const SizedBox(width:8),
          Expanded(child:Text(a.site,
            style:const TextStyle(color:ink,fontSize:14,fontWeight:FontWeight.w800))),
        ]),
        const SizedBox(height:12),
        Row(children:[
          const Icon(Icons.route_outlined,color:teal),
          const SizedBox(width:8),
          Expanded(child:Text('קווים: '+a.busLines,
            style:const TextStyle(color:ink,fontSize:13))),
        ]),
        const SizedBox(height:12),
        Text(a.instructions,style:const TextStyle(color:muted,fontSize:12,height:1.5)),
        const SizedBox(height:16),
        if(!employee) ...[
          OutlinedButton.icon(
            key:Key('edit-assignment-'+a.id),
            onPressed:()=>_editAssignment(a),
            icon:const Icon(Icons.edit_outlined),
            label:const Text('עריכת סידור עבודה'),
          ),
          const SizedBox(height:10),
        ],
        if(employee&&!a.isConfirmed)
          _primary('אישור קבלת סידור העבודה',Icons.check_circle_outline,(){
            if(demo.confirmAssignment(a.id)){
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content:Text('סידור העבודה אושר')));
            }
          }),
        if(!employee||a.isConfirmed)
          Container(padding:const EdgeInsets.all(12),
            decoration:BoxDecoration(color:a.isConfirmed?pale:soft,
              borderRadius:BorderRadius.circular(12)),
            child:Row(children:[
              Icon(a.isConfirmed?Icons.check_circle:Icons.schedule,
                color:a.isConfirmed?teal:muted),
              const SizedBox(width:9),
              Expanded(child:Text(a.isConfirmed
                  ?'אושר בשעה '+timeText(a.confirmedAt)
                  :'ממתין לאישור העובד',
                style:TextStyle(color:a.isConfirmed?teal:muted,
                  fontSize:12,fontWeight:FontWeight.w800))),
            ])),
      ]));
  }

  Widget _body() {
    if (!manager) {
      if (tab == 0) return _employeeHome();
      if (tab == 1) return _assignmentPage(employee: true);
      if (tab == 2) return _mapPage(employee: true);
      return _reportsPage(employee: true);
    }
    if (tab == 0) return _managerHome();
    if (tab == 1) return _assignmentPage(employee: false);
    if (tab == 2) return _mapPage(employee: false);
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
        NavigationDestination(icon: Icon(Icons.event_note_outlined),
          selectedIcon: Icon(Icons.event_note, color: teal), label: 'סידור'),
        NavigationDestination(icon: Icon(Icons.map_outlined),
          selectedIcon: Icon(Icons.map, color: teal), label: 'מפה'),
        NavigationDestination(icon: Icon(Icons.receipt_long_outlined),
          selectedIcon: Icon(Icons.receipt_long, color: teal), label: 'דוחות'),
      ] : const [
        NavigationDestination(icon: Icon(Icons.schedule_outlined),
          selectedIcon: Icon(Icons.schedule, color: teal), label: 'משמרת'),
        NavigationDestination(icon: Icon(Icons.event_note_outlined),
          selectedIcon: Icon(Icons.event_note, color: teal), label: 'סידור'),
        NavigationDestination(icon: Icon(Icons.place_outlined),
          selectedIcon: Icon(Icons.place, color: teal), label: 'מקום'),
        NavigationDestination(icon: Icon(Icons.history_outlined),
          selectedIcon: Icon(Icons.history, color: teal), label: 'שעות'),
      ],
    ),
  );
}
