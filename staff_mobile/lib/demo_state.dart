import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'model.dart';

class StaffDemoState extends ChangeNotifier {
  static const storageKey = 'brill_staff_demo_v1';
  List<StaffMember> members = [];
  List<ShiftEvent> events = [];
  int extraMinutes = 0;
  String selectedId = 'e1';
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
      members.fold(0, (s, w) => s + w.workedDuration(now).inMinutes);

  StaffDemoState() {
    load();
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
      }
    } catch (_) {
      members = [];
      events = [];
      extraMinutes = 0;
    }
    if (members.isEmpty) seed();
    loaded = true;
    notifyListeners();
  }

  Future<void> save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(storageKey, encodeDemo(members, events, extraMinutes));
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
    selectedId = 'e1';
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
