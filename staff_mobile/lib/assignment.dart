// A work assignment is a schedule, not a tracked employee location.
// Fictional local-demo records; production requires server-side authorization.
class WorkAssignment {
  final String id;
  final String workerId;
  final DateTime scheduledStart;
  final DateTime scheduledEnd;
  final String site;
  final String region;
  final String busLines;
  final String instructions;
  DateTime? confirmedAt;

  WorkAssignment({
    required this.id,
    required this.workerId,
    required this.scheduledStart,
    required this.scheduledEnd,
    required this.site,
    required this.region,
    required this.busLines,
    required this.instructions,
    this.confirmedAt,
  });

  bool get isConfirmed => confirmedAt != null;

  bool occursOn(DateTime day) {
    final local = scheduledStart.toLocal();
    return local.year == day.year &&
      local.month == day.month &&
      local.day == day.day;
  }

  bool confirm(DateTime at) {
    if (confirmedAt != null) return false;
    confirmedAt = at;
    return true;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'workerId': workerId,
    'scheduledStart': scheduledStart.toIso8601String(),
    'scheduledEnd': scheduledEnd.toIso8601String(),
    'site': site,
    'region': region,
    'busLines': busLines,
    'instructions': instructions,
    'confirmedAt': confirmedAt?.toIso8601String(),
  };

  factory WorkAssignment.fromJson(Map<String, dynamic> source) => WorkAssignment(
    id: source['id'] as String,
    workerId: source['workerId'] as String,
    scheduledStart: DateTime.parse(source['scheduledStart'] as String),
    scheduledEnd: DateTime.parse(source['scheduledEnd'] as String),
    site: source['site'] as String,
    region: source['region'] as String,
    busLines: source['busLines'] as String,
    instructions: source['instructions'] as String,
    confirmedAt: source['confirmedAt'] is String
      ? DateTime.parse(source['confirmedAt'] as String) : null,
  );
}
