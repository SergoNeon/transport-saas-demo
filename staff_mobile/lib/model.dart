import 'dart:convert';

enum ShiftState { off, working, onBreak, finished }

class StaffMember {
  final String id;
  final String name;
  final String position;
  final String workplace;
  final String region;
  final double latitude;
  final double longitude;
  DateTime? startedAt;
  DateTime? endedAt;
  DateTime? breakStartedAt;
  int completedBreakMs;
  DateTime? lastSampleAt;

  StaffMember({
    required this.id,
    required this.name,
    required this.position,
    required this.workplace,
    required this.region,
    required this.latitude,
    required this.longitude,
    this.startedAt,
    this.endedAt,
    this.breakStartedAt,
    this.completedBreakMs = 0,
    this.lastSampleAt,
  });

  ShiftState get state {
    if (startedAt == null) return ShiftState.off;
    if (endedAt != null) return ShiftState.finished;
    if (breakStartedAt != null) return ShiftState.onBreak;
    return ShiftState.working;
  }

  Duration breakDuration(DateTime now) {
    final current = breakStartedAt == null
        ? 0
        : (now.difference(breakStartedAt!).inMilliseconds).clamp(0, 1 << 62);
    return Duration(milliseconds: completedBreakMs + current);
  }

  Duration workedDuration(DateTime now) {
    if (startedAt == null) return Duration.zero;
    final until = endedAt ?? now;
    final total = until.difference(startedAt!).inMilliseconds;
    final paid = total - breakDuration(until).inMilliseconds;
    return Duration(milliseconds: paid < 0 ? 0 : paid);
  }

  bool clockIn(DateTime now) {
    if (state != ShiftState.off) return false;
    startedAt = now;
    endedAt = null;
    completedBreakMs = 0;
    breakStartedAt = null;
    lastSampleAt = now;
    return true;
  }

  bool startBreak(DateTime now) {
    if (state != ShiftState.working) return false;
    breakStartedAt = now;
    lastSampleAt = null;
    return true;
  }

  bool finishBreak(DateTime now) {
    if (state != ShiftState.onBreak) return false;
    final elapsed = now.difference(breakStartedAt!).inMilliseconds;
    if (elapsed > 0) completedBreakMs += elapsed;
    breakStartedAt = null;
    lastSampleAt = now;
    return true;
  }

  bool clockOut(DateTime now) {
    if (state != ShiftState.working && state != ShiftState.onBreak) {
      return false;
    }
    if (breakStartedAt != null) finishBreak(now);
    endedAt = now;
    lastSampleAt = null;
    return true;
  }

  bool get showsSamplePosition => state == ShiftState.working;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'position': position,
        'workplace': workplace,
        'region': region,
        'latitude': latitude,
        'longitude': longitude,
        'startedAt': startedAt?.toIso8601String(),
        'endedAt': endedAt?.toIso8601String(),
        'breakStartedAt': breakStartedAt?.toIso8601String(),
        'completedBreakMs': completedBreakMs,
        'lastSampleAt': lastSampleAt?.toIso8601String(),
      };

  factory StaffMember.fromJson(Map<String, dynamic> x) => StaffMember(
        id: x['id'] as String,
        name: x['name'] as String,
        position: x['position'] as String,
        workplace: x['workplace'] as String,
        region: x['region'] as String,
        latitude: (x['latitude'] as num).toDouble(),
        longitude: (x['longitude'] as num).toDouble(),
        startedAt: _date(x['startedAt']),
        endedAt: _date(x['endedAt']),
        breakStartedAt: _date(x['breakStartedAt']),
        completedBreakMs: x['completedBreakMs'] as int? ?? 0,
        lastSampleAt: _date(x['lastSampleAt']),
      );

  static DateTime? _date(dynamic x) =>
      x is String ? DateTime.tryParse(x) : null;
}

class ShiftEvent {
  final String workerId;
  final String label;
  final DateTime at;
  ShiftEvent(this.workerId, this.label, this.at);
  Map<String, dynamic> toJson() => {
        'workerId': workerId,
        'label': label,
        'at': at.toIso8601String(),
      };
  factory ShiftEvent.fromJson(Map<String, dynamic> x) => ShiftEvent(
        x['workerId'] as String,
        x['label'] as String,
        DateTime.parse(x['at'] as String),
      );
}

String durationText(Duration duration) {
  final minutes = duration.inMinutes < 0 ? 0 : duration.inMinutes;
  final hours = minutes ~/ 60;
  return hours.toString() + ':' + (minutes % 60).toString().padLeft(2, '0');
}

String timeText(DateTime? d) {
  if (d == null) return '—';
  final local = d.toLocal();
  return local.hour.toString().padLeft(2, '0') + ':' +
      local.minute.toString().padLeft(2, '0');
}

String exportCsv(List<StaffMember> workers, DateTime now) {
  final entries = <List<String>>[
    ['שם', 'מקום עבודה', 'כניסה', 'הפסקות בדקות', 'עבודה בדקות', 'יציאה']
  ];
  for (final w in workers) {
    entries.add([
      w.name,
      w.workplace,
      timeText(w.startedAt),
      w.breakDuration(now).inMinutes.toString(),
      w.workedDuration(now).inMinutes.toString(),
      timeText(w.endedAt),
    ]);
  }
  String escaped(String value) => '"' + value.replaceAll('"', '""') + '"';
  return entries.map((r) => r.map(escaped).join(',')).join('\r\n');
}

String encodeDemo(List<StaffMember> members, List<ShiftEvent> events, int offsetMin) =>
    jsonEncode({
      'members': members.map((x) => x.toJson()).toList(),
      'events': events.map((x) => x.toJson()).toList(),
      'offsetMin': offsetMin,
    });
