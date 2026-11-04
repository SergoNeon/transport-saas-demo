import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'model.dart';
import 'assignment.dart';

class StaffDemoState extends ChangeNotifier {
  static const storageKey = 'electra_afikim_mobile_demo_v2';
  List<StaffMember> members = [];
  List<ShiftEvent> events = [];
  List<WorkAssignment> assignments = [];
  int extraMinutes = 0;
  String selectedId = 'e6';
  bool loaded = false;

  DateTime get now => DateTime.now().add(Duration(minutes: extraMinutes));
  StaffMember get selected =>
      members.firstWhere((w) => w.id == selectedId, orElse: () => members.first);
  int get activeCount =>
      members.where((w) => w.state == ShiftState.working).length;
  int get breakCount =>
      members.where((w) => w.state == ShiftState.onBreak).length;
  int get finishedCount =>
      members.where((w) => w.state == ShiftState.finished).length;
  int get totalMinutes =>
      members.fold(0, (s, w) => s + w.totalWorkedDuration(now).inMinutes);

  StaffDemoState() {
    load();
  }

  WorkAssignment? get selectedAssignment {
    for (final a in assignments) {
      if (a.workerId == selectedId && a.occursOn(now)) return a;
    }
    return null;
  }

  WorkAssignment? assignmentFor(String workerId) {
    for (final a in assignments) {
      if (a.workerId == workerId && a.occursOn(now)) return a;
    }
    return null;
  }

  bool confirmAssignment(String assignmentId) {
    for (final a in assignments) {
      if (a.id == assignmentId && a.workerId == selectedId) {
        if (!a.confirm(now)) return false;
        events.insert(0, ShiftEvent(a.workerId, 'אישור סידור עבודה', now));
        notifyListeners();
        save();
        return true;
      }
    }
    return false;
  }

  void seed() {
    final n = now;
    members = [
      StaffMember(id:'e1', name:'דניאל כהן', position:'מבקר תחבורה',
        workplace:'תחנת סבידור, תל אביב', region:'מרכז',
        latitude:32.0836, longitude:34.7982,
        startedAt:n.subtract(const Duration(hours:4,minutes:25)),
        completedBreakMs:15*60000,
        lastSampleAt:n),
      StaffMember(id:'e2', name:'יוסי לוי', position:'מבקר קווים',
        workplace:'תחנה מרכזית, נתניה', region:'שרון',
        latitude:32.3288, longitude:34.8565,
        startedAt:n.subtract(const Duration(hours:5,minutes:10)),
        completedBreakMs:30*60000,
        lastSampleAt:n),
      StaffMember(id:'e3', name:'מיה אברהם', position:'מבקרת תחבורה',
        workplace:'מרכז העיר, פתח תקווה', region:'מרכז',
        latitude:32.0858, longitude:34.8869,
        startedAt:n.subtract(const Duration(hours:3,minutes:40)),
        breakStartedAt:n.subtract(const Duration(minutes:15))),
      StaffMember(id:'e4', name:'אורן מזרחי', position:'מבקר תחבורה',
        workplace:'תחנה מרכזית, אשדוד', region:'דרום',
        latitude:31.8001, longitude:34.6524,
        startedAt:n.subtract(const Duration(hours:4)),
        completedBreakMs:10*60000,
        lastSampleAt:n),
      StaffMember(id:'e5', name:'נועה ברק', position:'אחראית משמרת',
        workplace:'אזור הבורסה, רמת גן', region:'מרכז',
        latitude:32.0834, longitude:34.8014,
        startedAt:n.subtract(const Duration(hours:6)),
        endedAt:n.subtract(const Duration(hours:1)),
        completedBreakMs:20*60000),
      StaffMember(id:'e6', name:'עמית שלום', position:'מבקר תחבורה',
        workplace:'מרכזית המפרץ, חיפה', region:'צפון',
        latitude:32.7923, longitude:34.9989),
    ];
    assignments = [
      for (final worker in members)
        WorkAssignment(
          id: 'assignment-${worker.id}', workerId: worker.id,
          scheduledStart: DateTime(n.year,n.month,n.day,7,0),
          scheduledEnd: DateTime(n.year,n.month,n.day,15,0),
          site: worker.workplace, region: worker.region,
          busLines: worker.id == 'e6' ? '1, 2, 3' : '66, 25',
          instructions: 'יש להתייצב בנקודת העבודה ולדווח על תחילת המשמרת.',
          confirmedAt: worker.id == 'e6' ? null : n.subtract(const Duration(hours:1)),
        ),
    ];
    events = [
      ShiftEvent('e3','יציאה להפסקה',n.subtract(const Duration(minutes:15))),
      ShiftEvent('e5','סיום משמרת',n.subtract(const Duration(hours:1))),
      ShiftEvent('e2','חזרה מהפסקה',n.subtract(const Duration(hours:2))),
      ShiftEvent('e1','תחילת משמרת',n.subtract(const Duration(hours:4,minutes:25)))
    ];
  }

  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(storageKey);
      if (raw != null) {
        final decoded = jsonDecode(raw) as Map<String,dynamic>;
        members = (decoded['members'] as List)
            .map((x) => StaffMember.fromJson(Map<String,dynamic>.from(x as Map)))
            .toList();
        events = (decoded['events'] as List)
            .map((x) => ShiftEvent.fromJson(Map<String,dynamic>.from(x as Map)))
            .toList();
        extraMinutes = decoded['offsetMin'] as int? ?? 0;
        final entries = decoded['assignments'];
        if (entries is List) {
          assignments = entries.map((a) => WorkAssignment.fromJson(
            Map<String,dynamic>.from(a as Map))).toList();
        }
        if (assignments.isEmpty) {
          final n = now;
          assignments = [for (final worker in members) WorkAssignment(
            id:'assignment-${worker.id}',workerId:worker.id,
            scheduledStart:DateTime(n.year,n.month,n.day,7),
            scheduledEnd:DateTime(n.year,n.month,n.day,15),
            site:worker.workplace,region:worker.region,
            busLines:'66, 25',instructions:'יש לדווח על תחילת המשמרת.')];
        }
      }
    } catch (_) {
      members = [];
      events = [];
      assignments = [];
      extraMinutes = 0;
    }
    if (members.isEmpty) seed();
    loaded = true;
    notifyListeners();
  }

  Future<void> save() async {
    final prefs = await SharedPreferences.getInstance();
    final payload = jsonDecode(encodeDemo(members, events, extraMinutes)) as Map<String,dynamic>;
    payload['assignments'] = assignments.map((a) => a.toJson()).toList();
    await prefs.setString(storageKey, jsonEncode(payload));
  }

  void select(String id) {
    if (members.any((x) => x.id == id)) {
      selectedId = id;
      notifyListeners();
    }
  }

  void advance() {
    extraMinutes += 15;
    for (final w in members) {
      if (w.state == ShiftState.working) {
        w.lastSampleAt = now; // synthetic marker refresh, not device GPS
      }
    }
    notifyListeners();
    save();
  }

  void reset() {
    extraMinutes = 0;
    selectedId = 'e6';
    seed();
    notifyListeners();
    save();
  }

  bool transition(String workerId, String action) {
    final worker = members.where((x) => x.id == workerId).firstOrNull;
    if (worker == null) return false;
    final n = now;
    String label;
    bool done;
    if (action == 'start') {
      done = worker.clockIn(n);
      label = 'תחילת משמרת';
    } else if (action == 'pause') {
      done = worker.startBreak(n);
      label = 'יציאה להפסקה';
    } else if (action == 'resume') {
      done = worker.finishBreak(n);
      label = 'חזרה מהפסקה';
    } else if (action == 'end') {
      done = worker.clockOut(n);
      label = 'סיום משמרת';
    } else {
      return false;
    }
    if (done) {
      events.insert(0, ShiftEvent(workerId, label, n));
      if (events.length > 100) events.removeLast();
      notifyListeners();
      save();
    }
    return done;
  }
}
