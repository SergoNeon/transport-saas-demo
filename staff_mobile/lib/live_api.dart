import 'dart:convert';
import 'package:http/http.dart' as http;

const String liveApiBase='https://attendance.77.42.93.209.sslip.io';

class LiveAssignment {
  final String id,workerId,workerName,site,lines,instructions;
  final DateTime start,end,updatedAt;
  final int version;
  final DateTime? confirmedAt;
  const LiveAssignment({required this.id,required this.workerId,
    required this.workerName,required this.site,required this.lines,
    required this.instructions,required this.start,required this.end,
    required this.version,required this.confirmedAt,required this.updatedAt});
  bool get confirmed=>confirmedAt!=null;
  factory LiveAssignment.fromJson(Map<String,dynamic> x)=>LiveAssignment(
    id:x['id'] as String,workerId:x['workerId'] as String,
    workerName:x['workerName'] as String,site:x['site'] as String,
    lines:x['lines'] as String,instructions:x['instructions'] as String,
    start:DateTime.parse(x['start'] as String).toLocal(),
    end:DateTime.parse(x['end'] as String).toLocal(),
    version:(x['version'] as num).toInt(),
    confirmedAt:x['confirmedAt']==null?null:
      DateTime.parse(x['confirmedAt'] as String).toLocal(),
    updatedAt:DateTime.parse(x['updatedAt'] as String).toLocal());
}

class LiveSession {
  final String bearer,id,name,role;
  const LiveSession({required this.bearer,required this.id,
    required this.name,required this.role});
  bool get isManager=>role=='manager';
}

class LiveShift {
  final String id,workerId,state;
  final DateTime startedAt;
  final DateTime? endedAt,breakStartedAt;
  final int completedBreakMs,breakMs,workedMs,version;
  const LiveShift({required this.id,required this.workerId,required this.state,
    required this.startedAt,required this.endedAt,required this.breakStartedAt,
    required this.completedBreakMs,required this.breakMs,required this.workedMs,
    required this.version});
  factory LiveShift.fromJson(Map<String,dynamic> d)=>LiveShift(
    id:d['id'] as String,workerId:d['workerId'] as String,
    state:d['state'] as String,startedAt:DateTime.parse(d['startedAt'] as String).toLocal(),
    endedAt:d['endedAt']==null?null:DateTime.parse(d['endedAt'] as String).toLocal(),
    breakStartedAt:d['breakStartedAt']==null?null:
      DateTime.parse(d['breakStartedAt'] as String).toLocal(),
    completedBreakMs:(d['completedBreakMs'] as num).toInt(),
    breakMs:(d['breakMs'] as num).toInt(),
    workedMs:(d['workedMs'] as num).toInt(),
    version:(d['version'] as num).toInt());
}
class LiveTeamMember {
  final String id,name;
  final LiveShift? shift;
  const LiveTeamMember(this.id,this.name,this.shift);
  factory LiveTeamMember.fromJson(Map<String,dynamic> d)=>LiveTeamMember(
    d['id'] as String,d['name'] as String,
    d['shift']==null?null:LiveShift.fromJson(Map<String,dynamic>.from(d['shift'] as Map)));
}
class LiveAttendance {
  final LiveShift? own;
  final List<LiveTeamMember> team;
  final DateTime serverTime;
  const LiveAttendance({this.own,required this.team,required this.serverTime});
}

class LiveApiException implements Exception {
  final int status;final String message;
  const LiveApiException(this.status,this.message);
  @override String toString()=>message;
}

class LiveApi {
  final http.Client client;final String base;
  LiveApi({http.Client? client,String? base})
      :client=client??http.Client(),base=base??liveApiBase;
  void close()=>client.close();

  Future<Map<String,dynamic>> _request(String path,{
    required String method,LiveSession? session,Map<String,dynamic>? data,
  }) async {
    final headers=<String,String>{'Accept':'application/json'};
    if(data!=null)headers['Content-Type']='application/json';
    if(session!=null)headers['Authorization']='Bearer '+session.bearer;
    final req=http.Request(method,Uri.parse(base+path));
    req.headers.addAll(headers);
    if(data!=null)req.body=jsonEncode(data);
    final response=await http.Response.fromStream(
      await client.send(req).timeout(const Duration(seconds:12)));
    Map<String,dynamic> value;
    try{value=Map<String,dynamic>.from(jsonDecode(response.body) as Map);}
    catch(_){throw LiveApiException(response.statusCode,'שגיאת תשובה מהשרת');}
    if(response.statusCode<200||response.statusCode>=300) {
      throw LiveApiException(response.statusCode,
        value['error']?.toString()??'שגיאת שרת');
    }
    return value;
  }

  Future<LiveSession> login(String email,String password) async {
    final value=await _request('/api/login',method:'POST',
      data:{'email':email,'password':password});
    return LiveSession(bearer:value['token'] as String,id:value['id'] as String,
      name:value['name'] as String,role:value['role'] as String);
  }

  Future<List<LiveAssignment>> assignments(LiveSession session) async {
    final value=await _request('/api/assignments',method:'GET',session:session);
    return (value['assignments'] as List<dynamic>)
      .map((e)=>LiveAssignment.fromJson(Map<String,dynamic>.from(e as Map)))
      .toList();
  }

  Future<void> update(LiveSession session,LiveAssignment prior,{
    required String site,required String lines,required String instructions,
    required DateTime start,required DateTime end,
  }) async {
    await _request('/api/assignments/'+Uri.encodeComponent(prior.id),
      method:'PUT',session:session,data:{
        'version':prior.version,'site':site,'lines':lines,
        'instructions':instructions,
        'start':start.toUtc().toIso8601String(),
        'end':end.toUtc().toIso8601String(),
      });
  }

  Future<LiveAttendance> attendance(LiveSession session) async {
    final result=await _request('/api/attendance/current',
      method:'GET',session:session);
    final raw=result['current'];
    return LiveAttendance(
      own:raw==null?null:LiveShift.fromJson(Map<String,dynamic>.from(raw as Map)),
      team:(result['team'] as List<dynamic>? ?? []).map((e)=>
        LiveTeamMember.fromJson(Map<String,dynamic>.from(e as Map))).toList(),
      serverTime:DateTime.parse(result['now'] as String).toLocal(),
    );
  }
  Future<LiveShift> transition(LiveSession session,String action) async {
    final result=await _request('/api/attendance/transition',
      method:'POST',session:session,data:{'action':action});
    return LiveShift.fromJson(Map<String,dynamic>.from(result['current'] as Map));
  }
  Future<List<LiveShift>> history(LiveSession session) async {
    final result=await _request('/api/attendance/history',
      method:'GET',session:session);
    return (result['history'] as List<dynamic>).map((e)=>
      LiveShift.fromJson(Map<String,dynamic>.from(e as Map))).toList();
  }

  Future<Map<String,dynamic>> timesheet(LiveSession session,{
    required String from,required String to,String? workerId,
  }) async {
    final query=<String,String>{'from':from,'to':to};
    if(workerId!=null)query['workerId']=workerId;
    final uri=Uri(path:'/api/attendance/timesheet',queryParameters:query);
    return _request(uri.toString(),method:'GET',session:session);
  }
  Future<String> timesheetCsv(LiveSession session,{
    required String from,required String to,String? workerId,
  }) async {
    final query=<String,String>{'from':from,'to':to};
    if(workerId!=null)query['workerId']=workerId;
    final uri=Uri(path:'/api/attendance/timesheet.csv',queryParameters:query);
    final response=await client.get(Uri.parse(base+uri.toString()),
      headers:{'Authorization':'Bearer '+session.bearer,
        'Accept':'text/csv'}).timeout(const Duration(seconds:12));
    if(response.statusCode!=200){
      throw LiveApiException(response.statusCode,'לא ניתן לייצא דוח');
    }
    return utf8.decode(response.bodyBytes);
  }

  Future<void> confirm(LiveSession session,LiveAssignment prior) async {
    await _request('/api/assignments/'+Uri.encodeComponent(prior.id)+'/confirm',
      method:'POST',session:session,data:{'version':prior.version});
  }
}
