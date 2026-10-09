// Shared browser/server vehicle suitability policy.
// Important: this does not replace separate human and legal compliance review.
const profiles={
  private_transfer:['passenger','van','mixed'],
  group_transport:['passenger','van','mixed'],
  freight:['van','truck','mixed'],
  parcel:['passenger','van','truck','mixed'],
  moving:['van','truck','mixed'],
  refrigerated:['refrigerated'],
  heavy_haul:['heavy'],
  vehicle_recovery:['recovery']
};
const passengerServices=new Set(['private_transfer','group_transport']);
const cargoServices=new Set(['freight','parcel','moving','refrigerated','heavy_haul']);
const numeric=(v)=>v===null||v===undefined?null:Number(v);
export function matchVehicle(job,vehicle){
 const type=job.service_type??job.type??job.serviceType;
 const req=job.requirements??job.summary??{};
 const kind=vehicle.transport_kind??vehicle.transportKind??vehicle.kind??'passenger';
 if(!profiles[type]?.includes(kind))return {allowed:false,reason:'vehicle_type'};
 if(vehicle.status!=='available')return {allowed:false,reason:'unavailable'};
 if(passengerServices.has(type)&&Number(vehicle.passenger_capacity??vehicle.passengerCapacity??vehicle.capacity)<Number(req.passengers)){
   return {allowed:false,reason:'seats'};
 }
 if(cargoServices.has(type)){
   const weight=numeric(vehicle.payload_capacity_kg??vehicle.payloadCapacityKg);
   if(weight===null||!Number.isFinite(weight)||weight<Number(req.weightKg))return {allowed:false,reason:'payload'};
   if(req.volumeM3!==null&&req.volumeM3!==undefined){
     const volume=numeric(vehicle.cargo_volume_m3??vehicle.cargoVolumeM3);
     if(volume===null||!Number.isFinite(volume)||volume<Number(req.volumeM3))return {allowed:false,reason:'volume'};
   }
 }
 if(type==='refrigerated'){
   const low=numeric(vehicle.min_temp_c??vehicle.minTempC),high=numeric(vehicle.max_temp_c??vehicle.maxTempC);
   if(low===null||high===null||!Number.isFinite(low)||!Number.isFinite(high)||
     low>Number(req.minTemperatureC)||high<Number(req.maxTemperatureC)){
       return {allowed:false,reason:'temperature'};
   }
 }
 if(type==='heavy_haul' && !job.clearanceVerified)return {allowed:false,reason:'permit'};
 return {allowed:true,reason:'compatible'};
}
export function supportedTransportKinds(){
 return ['passenger','van','truck','refrigerated','heavy','recovery','mixed'];
}
