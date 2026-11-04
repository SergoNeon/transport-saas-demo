import 'package:flutter/material.dart';
import 'screens.dart';
void main() { WidgetsFlutterBinding.ensureInitialized(); runApp(const ElectraAfikimApp()); }
class ElectraAfikimApp extends StatelessWidget {
 const ElectraAfikimApp({super.key});
 @override Widget build(BuildContext context) => MaterialApp(debugShowCheckedModeBanner:false,title:'Electra Afikim | אלקטרה אפיקים',theme:ThemeData(brightness:Brightness.dark,useMaterial3:true,scaffoldBackgroundColor:const Color(0xff0e1015),colorScheme:const ColorScheme.dark(primary:Color(0xffe3b877),secondary:Color(0xffd24e46),surface:Color(0xff1a1f27))),builder:(context,child)=>Directionality(textDirection:TextDirection.rtl,child:child??const SizedBox.shrink()),home:const StaffScreen());
}
