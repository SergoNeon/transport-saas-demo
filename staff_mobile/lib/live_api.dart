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

  Future<void> confirm(LiveSession session,LiveAssignment prior) async {
    await _request('/api/assignments/'+Uri.encodeComponent(prior.id)+'/confirm',
      method:'POST',session:session,data:{'version':prior.version});
  }
}
