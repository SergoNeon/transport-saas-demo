import 'package:flutter/material.dart';
import 'screens.dart';
void main() { WidgetsFlutterBinding.ensureInitialized(); runApp(const ElectraAfikimApp()); }
class ElectraAfikimApp extends StatelessWidget {
 const ElectraAfikimApp({super.key});
 @override Widget build(BuildContext context) => MaterialApp(debugShowCheckedModeBanner:false,title:'Electra Afikim | אלקטרה אפיקים',theme:ThemeData(brightness:Brightness.light,useMaterial3:true,scaffoldBackgroundColor:const Color(0xfff8fafb),colorScheme:const ColorScheme.light(primary:Color(0xff08796d),secondary:Color(0xffb54b49),surface:Colors.white)),builder:(context,child)=>Directionality(textDirection:TextDirection.rtl,child:child??const SizedBox.shrink()),home:const StaffScreen());
}
