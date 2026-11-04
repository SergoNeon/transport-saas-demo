import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'demo_state.dart';
import 'model.dart';

const Color appBg = Color(0xff0c1118);
const Color cardBg = Color(0xff181f29);
const Color subBg = Color(0xff222b37);
const Color border = Color(0xff303b4a);
const Color cream = Color(0xfff1c280);
const Color alertRed = Color(0xffd45148);
const Color freshGreen = Color(0xff70d6b3);
const Color quiet = Color(0xffaeb8c5);

class StaffScreen extends StatefulWidget {
  const StaffScreen({super.key});
  @override
  State<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends State<StaffScreen> {
  late final StaffDemoState data;
  Timer? ticking;
  bool isManager = false; // Employee is the primary mobile experience.
  int selectedTab = 0;
  String filter = 'all';

  @override
  void initState() {
    super.initState();
    data = StaffDemoState();
    data.addListener(_updated);
    ticking = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && data.loaded) setState(() {});
    });
  }

  void _updated() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    ticking?.cancel();
    data.removeListener(_updated);
    data.dispose();
    super.dispose();
  }

  String _clock(Duration value) {
    final s = value.inSeconds < 0 ? 0 : value.inSeconds;
    final h = s ~/ 3600;
    final m = (s % 3600) ~/ 60;
    final sec = s % 60;
    return h.toString().padLeft(2, '0') + ':' +
        m.toString().padLeft(2, '0') + ':' +
        sec.toString().padLeft(2, '0');
  }

  String _date(DateTime d) {
    final wd = <String>['שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת', 'ראשון'];
    return 'יום ' + wd[d.weekday - 1] + ' · ' +
        d.day.toString() + '/' + d.month.toString();
  }

  String _stateName(StaffMember w) {
    switch (w.state) {
      case ShiftState.off: return 'לא במשמרת';
      case ShiftState.working: return 'במשמרת';
      case ShiftState.onBreak: return 'בהפסקה';
      case ShiftState.finished: return 'המשמרת הסתיימה';
    }
  }

  Color _stateColor(StaffMember w) {
    switch (w.state) {
      case ShiftState.off:
      case ShiftState.finished: return quiet;
      case ShiftState.working: return freshGreen;
      case ShiftState.onBreak: return cream;
    }
  }

  void _roleChange(bool value) {
    setState(() {
      isManager = value;
      selectedTab = 0;
    });
  }

  Widget _roleToggle() => PopupMenuButton<bool>(
    tooltip: 'החלפת תפקיד בגרסת ההדגמה',
    initialValue: isManager,
    onSelected: _roleChange,
    itemBuilder: (_) => const [
      PopupMenuItem(value: false, child: Text('הדגמת עובד')),
      PopupMenuItem(value: true, child: Text('הדגמת מנהל')),
    ],
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: subBg,
        border: Border.all(color: border),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(isManager ? Icons.admin_panel_settings_outlined
            : Icons.badge_outlined, size: 16, color: cream),
        const SizedBox(width: 5),
        Text(isManager ? 'מנהל' : 'עובד',
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
        const Icon(Icons.keyboard_arrow_down, size: 17, color: cream),
      ]),
    ),
  );

  Widget _brandHeader() => Row(children: [
    Container(width: 36, height: 36,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xff352720),
        border: Border.all(color: const Color(0xff836442)),
        borderRadius: BorderRadius.circular(10)),
      child: const Text('א', style: TextStyle(
        color: cream, fontSize: 22, fontWeight: FontWeight.w900))),
    const SizedBox(width: 10),
    const Expanded(child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('אלקטרה אפיקים',
          maxLines: 1, overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        Text('מערכת נוכחות', style: TextStyle(fontSize: 11, color: quiet)),
      ],
    )),
    _roleToggle(),
  ]);

  Widget _demoLine() => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
    decoration: BoxDecoration(
      color: const Color(0xff25231e),
      borderRadius: BorderRadius.circular(11),
      border: Border.all(color: const Color(0xff584938))),
    child: const Row(children: [
      Icon(Icons.science_outlined, size: 18, color: cream),
      SizedBox(width: 8),
      Expanded(child: Text('דמו בלבד · עובדים ומיקומים לדוגמה · ללא GPS אמיתי',
        style: TextStyle(color: Color(0xffe3cda8),
          fontSize: 11, height: 1.4))),
    ]),
  );

  Widget _card(Widget child, {EdgeInsets? padding}) => Container(
    width: double.infinity,
    padding: padding ?? const EdgeInsets.all(17),
    decoration: BoxDecoration(
      color: cardBg,
      border: Border.all(color: border),
      borderRadius: BorderRadius.circular(19),
    ),
    child: child,
  );

  Widget _sectionTitle(String title, {String? note, Widget? trailing}) => Row(
    crossAxisAlignment: CrossAxisAlignment.center,
    children: [
      Expanded(child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(
            fontSize: 17, fontWeight: FontWeight.w800)),
          if (note != null) ...[
            const SizedBox(height: 4),
            Text(note, style: const TextStyle(
              fontSize: 11, color: quiet)),
          ],
        ],
      )),
      if (trailing != null) trailing,
    ],
  );

  Widget _statusPill(StaffMember w) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(18),
      color: _stateColor(w).withValues(alpha: .09),
      border: Border.all(color: _stateColor(w).withValues(alpha: .45)),
    ),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.circle, color: _stateColor(w), size: 7),
      const SizedBox(width: 6),
      Text(_stateName(w), style: TextStyle(
        color: _stateColor(w), fontSize: 11, fontWeight: FontWeight.w700)),
    ]),
  );

  Widget _infoItem(String name, String value) => Expanded(
    child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
      Text(name, style: const TextStyle(fontSize: 11, color: quiet)),
      const SizedBox(height: 6),
      FittedBox(fit: BoxFit.scaleDown, child: Text(value,
        style: const TextStyle(fontSize: 16,
          fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()]))),
    ]),
  );

  Widget _largeAction(String label, IconData icon, Color color,
      VoidCallback action, {bool outlined = false}) => SizedBox(
    width: double.infinity, height: 56,
    child: outlined ? OutlinedButton.icon(
      onPressed: action,
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.white,
        side: BorderSide(color: color.withValues(alpha: .75)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
      icon: Icon(icon, size: 21),
      label: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
    ) : FilledButton.icon(
      onPressed: action,
      style: FilledButton.styleFrom(
        backgroundColor: color,
        foregroundColor: appBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
      icon: Icon(icon, size: 22),
      label: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
    ),
  );

  void _shift(String action, StaffMember w) {
    HapticFeedback.selectionClick();
    data.transition(w.id, action);
  }

  Future<void> _confirmEnd(StaffMember w) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('סיום משמרת'),
        content: const Text('לסיים את המשמרת ולחשב את שעות העבודה?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('ביטול')),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('סיום משמרת')),
        ],
      ),
    );
    if (ok == true && mounted) _shift('end', w);
  }

  Widget _employeeHome() {
    final w = data.selected;
    final shiftState = w.state;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_date(data.now),
              style: const TextStyle(fontSize: 12, color: quiet)),
            const SizedBox(height: 5),
            Text('שלום, ' + w.name.split(' ').first,
              style: const TextStyle(fontSize: 27,
                fontWeight: FontWeight.w900, letterSpacing: -.4)),
            const SizedBox(height: 3),
            const Text('ניהול המשמרת שלי',
              style: TextStyle(fontSize: 13, color: quiet)),
          ],
        )),
        PopupMenuButton<String>(
          tooltip: 'החלפת עובד לדוגמה',
          onSelected: data.select,
          itemBuilder: (_) => data.members.map((person) =>
            PopupMenuItem(value: person.id, child: Text(person.name))).toList(),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
            decoration: BoxDecoration(color: subBg,
              borderRadius: BorderRadius.circular(12)),
            child: const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.person_outline, color: cream, size: 17),
              SizedBox(width: 5),
              Text('דמו', style: TextStyle(fontSize: 11)),
              Icon(Icons.expand_more, size: 16),
            ]),
          ),
        ),
      ]),
      const SizedBox(height: 18),
      _card(Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Expanded(child: Text('שעון נוכחות',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800))),
          _statusPill(w),
        ]),
        const SizedBox(height: 25),
        const Text('זמן עבודה נטו', textAlign: TextAlign.center,
          style: TextStyle(color: quiet, fontSize: 12)),
        const SizedBox(height: 7),
        FittedBox(fit: BoxFit.scaleDown,
          child: Text(_clock(w.workedDuration(data.now)),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 49,
              letterSpacing: 1, fontWeight: FontWeight.w900,
              fontFeatures: [FontFeature.tabularFigures()]))),
        const SizedBox(height: 22),
        Container(height: 1, color: border),
        const SizedBox(height: 18),
        Row(children: [
          _infoItem('כניסה', timeText(w.startedAt)),
          Container(width: 1, height: 34, color: border),
          _infoItem('הפסקות', durationText(w.breakDuration(data.now))),
          Container(width: 1, height: 34, color: border),
          _infoItem('יציאה', timeText(w.endedAt)),
        ]),
        const SizedBox(height: 22),
        if (shiftState == ShiftState.off)
          _largeAction('תחילת משמרת', Icons.play_circle_fill_rounded,
            freshGreen, () => _shift('start', w)),
        if (shiftState == ShiftState.working) ...[
          _largeAction('יציאה להפסקה', Icons.coffee_rounded,
            cream, () => _shift('pause', w)),
          const SizedBox(height: 10),
          _largeAction('סיום משמרת', Icons.stop_circle_outlined,
            alertRed, () => _confirmEnd(w), outlined: true),
        ],
        if (shiftState == ShiftState.onBreak) ...[
          _largeAction('חזרה לעבודה', Icons.play_circle_fill_rounded,
            freshGreen, () => _shift('resume', w)),
          const SizedBox(height: 10),
          _largeAction('סיום משמרת', Icons.stop_circle_outlined,
            alertRed, () => _confirmEnd(w), outlined: true),
        ],
        if (shiftState == ShiftState.finished)
          Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(color: subBg,
              borderRadius: BorderRadius.circular(12)),
            child: const Row(children: [
              Icon(Icons.check_circle, color: freshGreen),
              SizedBox(width: 10),
              Expanded(child: Text('המשמרת הסתיימה. הדוח נשמר בדמו.')),
            ]),
          ),
      ])),
      const SizedBox(height: 12),
      _card(Row(children: [
        Container(width: 39, height: 39,
          decoration: BoxDecoration(color: subBg,
            borderRadius: BorderRadius.circular(11)),
          child: const Icon(Icons.place_outlined, color: cream)),
        const SizedBox(width: 12),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('מקום עבודה משויך',
              style: TextStyle(fontSize: 11, color: quiet)),
            const SizedBox(height: 3),
            Text(w.workplace, maxLines: 2,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          ],
        )),
        const Icon(Icons.location_on_outlined, color: quiet, size: 20),
      ])),
      const SizedBox(height: 17),
      _sectionTitle('פעילות במשמרת', note: 'כניסה, הפסקה וסיום'),
      const SizedBox(height: 6),
      ...data.events.where((e) => e.workerId == w.id).take(3).map(_eventRow),
    ]);
  }

  Widget _eventRow(ShiftEvent e) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 10),
    child: Row(children: [
      Container(width: 34, height: 34,
        decoration: BoxDecoration(color: subBg,
          borderRadius: BorderRadius.circular(11)),
        child: const Icon(Icons.history, size: 18, color: cream)),
      const SizedBox(width: 11),
      Expanded(child: Text(e.label,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700))),
      Text(timeText(e.at),
        style: const TextStyle(fontSize: 12, color: quiet)),
    ]),
  );

  Widget _miniStat(String label, String value, IconData icon, Color tint) =>
    Container(padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: cardBg,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(label,
            style: const TextStyle(fontSize: 12, color: quiet))),
          Icon(icon, color: tint, size: 20),
        ]),
        const SizedBox(height: 9),
        FittedBox(fit: BoxFit.scaleDown, child: Text(value,
          style: const TextStyle(fontSize: 28,
            fontWeight: FontWeight.w900))),
      ]),
    );

  Widget _managerHome() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(_date(data.now), style: const TextStyle(color: quiet, fontSize: 12)),
      const SizedBox(height: 5),
      const Text('בקרת עובדים', style: TextStyle(
        fontSize: 28, fontWeight: FontWeight.w900)),
      const SizedBox(height: 4),
      const Text('סקירת נוכחות בזמן משמרת · הדגמה',
        style: TextStyle(fontSize: 12, color: quiet)),
      const SizedBox(height: 18),
      Row(children: [
        Expanded(child: _miniStat('בעבודה', data.activeCount.toString(),
          Icons.people_alt_outlined, freshGreen)),
        const SizedBox(width: 10),
        Expanded(child: _miniStat('בהפסקה', data.breakCount.toString(),
          Icons.coffee_outlined, cream)),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: _miniStat('שעות נטו',
          durationText(Duration(minutes: data.totalMinutes)),
          Icons.timer_outlined, cream)),
        const SizedBox(width: 10),
        Expanded(child: _miniStat('סיימו משמרת',
          data.finishedCount.toString(), Icons.task_alt, alertRed)),
      ]),
      const SizedBox(height: 18),
      _card(Column(children: [
        _sectionTitle('עובדים במשמרת',
          note: 'לחיצה מציגה מידע, ללא שינוי נוכחות של עובד',
          trailing: TextButton(onPressed: () => setState(() => selectedTab = 1),
            child: const Text('הכל', style: TextStyle(color: cream)))),
        const SizedBox(height: 5),
        ...data.members.where((w) =>
          w.state == ShiftState.working || w.state == ShiftState.onBreak)
          .take(5).map(_workerRow),
      ])),
      const SizedBox(height: 13),
      _card(Column(children: [
        _sectionTitle('מפת משמרת', note: 'נקודות בדויות לצורך ההדגמה',
          trailing: const Icon(Icons.map_outlined, color: cream)),
        const SizedBox(height: 13),
        SizedBox(width: double.infinity, height: 48,
          child: OutlinedButton.icon(
            onPressed: () => setState(() => selectedTab = 2),
            icon: const Icon(Icons.place_outlined),
            label: const Text('הצגת עובדים על המפה'),
          )),
      ])),
      const SizedBox(height: 14),
      _sectionTitle('עדכונים אחרונים'),
      ...data.events.take(4).map((e) =>
        _eventWithWorker(e)),
    ],
  );

  Widget _eventWithWorker(ShiftEvent e) {
    final matches = data.members.where((w) => w.id == e.workerId);
    final who = matches.isEmpty ? 'עובד' : matches.first.name;
    return Padding(padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(children: [
        Container(width: 34, height: 34,
          decoration: BoxDecoration(color: subBg,
            borderRadius: BorderRadius.circular(11)),
          child: const Icon(Icons.history, size: 18, color: cream)),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(who, style: const TextStyle(
              fontWeight: FontWeight.w700, fontSize: 12)),
            Text(e.label, style: const TextStyle(color: quiet, fontSize: 11)),
          ],
        )),
        Text(timeText(e.at),
          style: const TextStyle(fontSize: 12, color: cream)),
      ]));
  }

  Widget _workerRow(StaffMember w) => InkWell(
    onTap: () => _workerInfo(w),
    borderRadius: BorderRadius.circular(11),
    child: Padding(padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(children: [
        CircleAvatar(radius: 22, backgroundColor: const Color(0xff42352b),
          child: Text(w.name.substring(0, 1),
            style: const TextStyle(color: cream, fontWeight: FontWeight.w800))),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(w.name, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
            const SizedBox(height: 3),
            Text(w.workplace, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: quiet)),
          ],
        )),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(_stateName(w), style: TextStyle(fontSize: 11,
            color: _stateColor(w), fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(durationText(w.workedDuration(data.now)),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
        ]),
        const SizedBox(width: 4),
        const Icon(Icons.chevron_left, size: 18, color: quiet),
      ]),
    ),
  );

  void _workerInfo(StaffMember w) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: cardBg,
      builder: (ctx) => SafeArea(child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 25),
        child: Column(mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              CircleAvatar(radius: 24,
                backgroundColor: const Color(0xff443328),
                child: Text(w.name.substring(0, 1),
                  style: const TextStyle(color: cream, fontSize: 21))),
              const SizedBox(width: 12),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(w.name, style: const TextStyle(
                    fontSize: 19, fontWeight: FontWeight.w800)),
                  Text(w.position,
                    style: const TextStyle(color: quiet, fontSize: 12)),
                ],
              )),
              _statusPill(w),
            ]),
            const SizedBox(height: 24),
            Row(children: [
              _infoItem('כניסה', timeText(w.startedAt)),
              _infoItem('הפסקות', durationText(w.breakDuration(data.now))),
              _infoItem('שעות נטו', durationText(w.workedDuration(data.now))),
            ]),
            const SizedBox(height: 20),
            const Text('מקום עבודה',
              style: TextStyle(color: quiet, fontSize: 11)),
            const SizedBox(height: 6),
            Text(w.workplace,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            const SizedBox(height: 17),
            if (w.showsSamplePosition)
              _largeAction('הצגת מיקום דוגמה',
                Icons.location_on_outlined, cream, () {
                  Navigator.of(ctx).pop();
                  setState(() => selectedTab = 2);
                }),
            if (!w.showsSamplePosition)
              const Text('אין מיקום מוצג מחוץ למשמרת פעילה.',
                style: TextStyle(color: quiet, fontSize: 12)),
            const SizedBox(height: 14),
            const Text('צפייה בלבד · נתוני הדגמה',
              textAlign: TextAlign.center,
              style: TextStyle(color: quiet, fontSize: 11)),
          ],
        ),
      )),
    );
  }

  Widget _filterChip(String id, String label) => ChoiceChip(
    label: Text(label),
    selected: filter == id,
    onSelected: (_) => setState(() => filter = id),
    visualDensity: VisualDensity.compact,
    selectedColor: const Color(0xff493e30),
    backgroundColor: subBg,
    side: BorderSide(color: filter == id ? cream : border),
    labelStyle: TextStyle(color: filter == id ? cream : Colors.white,
      fontSize: 12, fontWeight: FontWeight.w700),
  );

  Widget _peoplePage() {
    final visible = data.members.where((w) {
      if (filter == 'working') return w.state == ShiftState.working;
      if (filter == 'break') return w.state == ShiftState.onBreak;
      if (filter == 'others') return w.state == ShiftState.off ||
          w.state == ShiftState.finished;
      return true;
    }).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('עובדים', style: TextStyle(
        fontSize: 28, fontWeight: FontWeight.w900)),
      const SizedBox(height: 4),
      const Text('נוכחות ומקומות עבודה · לחצו לפרטים',
        style: TextStyle(color: quiet, fontSize: 12)),
      const SizedBox(height: 14),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          _filterChip('all', 'כולם'),
          const SizedBox(width: 7),
          _filterChip('working', 'בעבודה'),
          const SizedBox(width: 7),
          _filterChip('break', 'בהפסקה'),
          const SizedBox(width: 7),
          _filterChip('others', 'לא עובדים'),
        ]),
      ),
      const SizedBox(height: 13),
      _card(Column(children: visible.map(_workerRow).toList())),
    ]);
  }

  Widget _mapPage({bool employee = false}) {
    final samples = data.members.where((w) =>
      w.showsSamplePosition && w.lastSampleAt != null &&
      data.now.difference(w.lastSampleAt!).inMinutes < 5).toList();
    final markers = employee
      ? samples.where((w) => w.id == data.selected.id).toList()
      : samples;
    final height = MediaQuery.sizeOf(context).height;
    final mapHeight = (height * .49).clamp(270.0, 440.0);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(employee ? 'מקום העבודה שלי' : 'מפת עובדים',
        style: const TextStyle(fontSize: 27, fontWeight: FontWeight.w900)),
      const SizedBox(height: 5),
      const Text('מיקומי דוגמה · לא נאסף מיקום מהמכשיר',
        style: TextStyle(color: quiet, fontSize: 12)),
      const SizedBox(height: 13),
      _card(Column(children: [
        ClipRRect(borderRadius: BorderRadius.circular(13),
          child: SizedBox(height: mapHeight, child: FlutterMap(
            options: MapOptions(
              initialCenter: employee ?
                LatLng(data.selected.latitude, data.selected.longitude) :
                const LatLng(32.19, 34.85),
              initialZoom: employee ? 13.5 : 9.0),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.electraafikim.attendance.demo'),
              MarkerLayer(markers: markers.map((w) => Marker(
                point: LatLng(w.latitude, w.longitude),
                width: 49, height: 49,
                child: Semantics(label: w.name + ' מיקום הדגמה',
                  button: true, child: InkWell(
                    onTap: employee ? null : () => _workerInfo(w),
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: alertRed, border: Border.all(color: cream, width: 3)),
                      child: const Icon(Icons.person_pin_circle,
                        color: Colors.white, size: 26)),
                  )),
              )).toList()),
              const RichAttributionWidget(attributions: [
                TextSourceAttribution('OpenStreetMap contributors'),
              ]),
            ],
          )),
        ),
        const SizedBox(height: 10),
        const Text('נקודות המפה להמחשה בלבד. בהפסקה או אחרי המשמרת המיקום מוסתר.',
          style: TextStyle(color: quiet, fontSize: 11, height: 1.5)),
      ]), padding: const EdgeInsets.all(11)),
      const SizedBox(height: 15),
      _sectionTitle(employee ? 'מקום העבודה המשויך' : 'פקחים במשמרת'),
      const SizedBox(height: 6),
      if (employee)
        _card(Text(data.selected.workplace,
          style: const TextStyle(fontWeight: FontWeight.w700))),
      if (!employee && markers.isEmpty)
        _card(const Text('אין מיקומי הדגמה עדכניים.')),
      if (!employee) ...markers.map((w) =>
        Padding(padding: const EdgeInsets.only(bottom: 7),
          child: _card(InkWell(onTap: () => _workerInfo(w),
            child: Row(children: [
              const Icon(Icons.place_outlined, color: freshGreen),
              const SizedBox(width: 9),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(w.name, style: const TextStyle(
                    fontWeight: FontWeight.w800)),
                  const SizedBox(height: 3),
                  Text(w.workplace,
                    style: const TextStyle(color: quiet, fontSize: 11)),
                ],
              )),
              Text(durationText(w.workedDuration(data.now)),
                style: const TextStyle(color: cream, fontWeight: FontWeight.w800)),
            ]),
          )))),
    ]);
  }

  Widget _reportRow(StaffMember w) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 10),
    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        Expanded(child: Text(w.name,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14))),
        Text(durationText(w.workedDuration(data.now)),
          style: const TextStyle(color: cream, fontWeight: FontWeight.w800)),
      ]),
      const SizedBox(height: 4),
      Text(w.workplace, style: const TextStyle(color: quiet, fontSize: 11)),
      const SizedBox(height: 6),
      Wrap(spacing: 13, runSpacing: 5, children: [
        Text('כניסה ' + timeText(w.startedAt),
          style: const TextStyle(color: quiet, fontSize: 11)),
        Text('הפסקות ' + durationText(w.breakDuration(data.now)),
          style: const TextStyle(color: quiet, fontSize: 11)),
        Text('יציאה ' + timeText(w.endedAt),
          style: const TextStyle(color: quiet, fontSize: 11)),
      ]),
      const SizedBox(height: 10),
      Container(height: 1, color: border),
    ]),
  );

  Widget _reportsPage({bool employee = false}) {
    final people = employee ? [data.selected] : data.members;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(employee ? 'היסטוריית המשמרת' : 'דוחות נוכחות',
        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
      const SizedBox(height: 5),
      Text(employee ? 'שעות עבודה והפסקות שלי' :
        'שעות נטו, הפסקות ומקומות עבודה',
        style: const TextStyle(color: quiet, fontSize: 12)),
      const SizedBox(height: 15),
      _card(Column(children: people.map(_reportRow).toList())),
      const SizedBox(height: 13),
      if (!employee) ...[
        SizedBox(width: double.infinity, height: 48,
          child: OutlinedButton.icon(
            onPressed: () {
              Clipboard.setData(ClipboardData(
                text: exportCsv(data.members, data.now)));
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('דוח CSV לדוגמה הועתק ללוח')));
            },
            icon: const Icon(Icons.copy_outlined, size: 18),
            label: const Text('העתקת דוח CSV'),
          )),
        const SizedBox(height: 11),
        TextButton.icon(
          onPressed: data.advance,
          icon: const Icon(Icons.fast_forward_rounded),
          label: const Text('הדמיית 15 דקות'),
        ),
      ],
      TextButton.icon(
        onPressed: () => showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('איפוס נתוני הדגמה'),
            content: const Text('לאפס את כל המשמרות לדוגמה?'),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('ביטול')),
              TextButton(onPressed: () {
                data.reset();
                Navigator.of(ctx).pop();
              }, child: const Text('איפוס')),
            ],
          )),
        icon: const Icon(Icons.restart_alt_rounded),
        label: const Text('איפוס הדגמה'),
      ),
      const SizedBox(height: 12),
      const Text('אין שימוש בנתוני עובדים אמיתיים או ב-GPS.',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 11, color: quiet)),
    ]);
  }

  Widget _page() {
    if (isManager) {
      switch (selectedTab) {
        case 0: return _managerHome();
        case 1: return _peoplePage();
        case 2: return _mapPage();
        default: return _reportsPage();
      }
    }
    switch (selectedTab) {
      case 0: return _employeeHome();
      case 1: return _mapPage(employee: true);
      default: return _reportsPage(employee: true);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: appBg,
    appBar: AppBar(
      backgroundColor: appBg,
      automaticallyImplyLeading: false,
      toolbarHeight: 69,
      titleSpacing: 16,
      title: _brandHeader(),
      bottom: PreferredSize(preferredSize: const Size.fromHeight(1),
        child: Container(color: border, height: 1)),
    ),
    body: !data.loaded ? const Center(child: CircularProgressIndicator())
      : SafeArea(child: ListView(
          padding: const EdgeInsets.fromLTRB(15, 17, 15, 24),
          children: [
            _demoLine(),
            const SizedBox(height: 19),
            _page(),
            const SizedBox(height: 28),
            const Center(child: Text('אלקטרה אפיקים · גרסת הדגמה',
              style: TextStyle(color: quiet, fontSize: 11))),
          ],
        )),
    bottomNavigationBar: NavigationBar(
      height: 71,
      backgroundColor: cardBg,
      indicatorColor: const Color(0xff443b30),
      selectedIndex: selectedTab,
      onDestinationSelected: (index) =>
        setState(() => selectedTab = index),
      destinations: isManager ? const [
        NavigationDestination(icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home), label: 'ראשי'),
        NavigationDestination(icon: Icon(Icons.people_outline),
          selectedIcon: Icon(Icons.people), label: 'עובדים'),
        NavigationDestination(icon: Icon(Icons.map_outlined),
          selectedIcon: Icon(Icons.map), label: 'מפה'),
        NavigationDestination(icon: Icon(Icons.receipt_long_outlined),
          selectedIcon: Icon(Icons.receipt_long), label: 'דוחות'),
      ] : const [
        NavigationDestination(icon: Icon(Icons.timer_outlined),
          selectedIcon: Icon(Icons.timer), label: 'משמרת'),
        NavigationDestination(icon: Icon(Icons.place_outlined),
          selectedIcon: Icon(Icons.place), label: 'מיקום'),
        NavigationDestination(icon: Icon(Icons.history_outlined),
          selectedIcon: Icon(Icons.history), label: 'דוח שלי'),
      ],
    ),
  );
}
