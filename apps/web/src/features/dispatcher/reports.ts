import {DispatchOrder,DispatchTrip} from './types';

const safe=(value:unknown)=>String(value??'').replace(/[^\x20-\x7E]/g,'-');
const csv=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`;
const usage=(used=0,max=0)=>max?`${Math.round(used/max*100)}%`:'0%';

function download(blob:Blob,name:string){
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}

function reportLines(trips:DispatchTrip[],deferred:DispatchOrder[]){
  const served=trips.reduce((total,trip)=>total+trip.stops.length,0);
  const lines=[`WAYPOINT DAILY DELIVERY PLAN - ${new Date().toLocaleDateString()}`,`Served orders: ${served} | Deferred orders: ${deferred.length}`,''];
  trips.forEach(trip=>{
    lines.push(`${trip.reference} | ${trip.vehicle.registration} | Driver: ${trip.driver} | ${trip.status}`);
    lines.push(`Utilization: weight ${usage(trip.totalWeightKg,trip.maxWeightKg)} | volume ${usage(trip.totalVolumeM3,trip.maxVolumeM3)}`);
    trip.stops.forEach(stop=>lines.push(`  ${stop.sequence}. ${stop.order.reference} - ${stop.order.outletName} - ${new Date(stop.eta).toLocaleTimeString()} - ${stop.status}`));
    lines.push('');
  });
  if(deferred.length){lines.push('DEFERRED ORDERS');deferred.forEach(order=>lines.push(`${order.reference} - ${order.outletName} - ${order.deferralReason||'Reason pending'} - P${order.deferralPriority||'-'}`))}
  return lines.map(safe);
}

function pdfDocument(lines:string[]){
  const pages:Array<string[]>=[];for(let index=0;index<lines.length;index+=48)pages.push(lines.slice(index,index+48));if(!pages.length)pages.push(['No delivery plan data']);
  const objects:string[]=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const refs:string[]=[];
  pages.forEach((page,index)=>{const pageId=4+index*2,contentId=pageId+1;refs.push(`${pageId} 0 R`);const commands=['BT','/F1 9 Tf','40 800 Td',...page.flatMap((line,lineIndex)=>[`${lineIndex?'0 -14 Td ':''}(${line.replace(/([\\()])/g,'\\$1')}) Tj`]),'ET'].join('\n');objects[pageId-1]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;objects[contentId-1]=`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`});
  let output='%PDF-1.4\n';
  const offsets=[0];
  objects.forEach((object,index)=>{offsets[index+1]=output.length;output+=`${index+1} 0 obj\n${object}\nendobj\n`});const xref=output.length;output+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let index=1;index<=objects.length;index++)output+=`${String(offsets[index]).padStart(10,'0')} 00000 n \n`;output+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return output;
}

export function exportDailyPlanCsv(trips:DispatchTrip[],deferred:DispatchOrder[]){
  const rows=[['Record','Trip','Vehicle','Driver','Trip Status','Stop','Order','Outlet','ETA','Stop Status','Weight Utilization','Volume Utilization']];
  trips.forEach(trip=>trip.stops.forEach(stop=>rows.push(['SERVED',trip.reference,trip.vehicle.registration,trip.driver,trip.status,String(stop.sequence),stop.order.reference,stop.order.outletName,new Date(stop.eta).toLocaleString(),stop.status,usage(trip.totalWeightKg,trip.maxWeightKg),usage(trip.totalVolumeM3,trip.maxVolumeM3)])));
  deferred.forEach(order=>rows.push(['DEFERRED','','','','','',order.reference,order.outletName,order.nextDeliveryDate||'',order.deferralReason||'','','']));
  download(new Blob([rows.map(row=>row.map(csv).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),`waypoint-daily-plan-${new Date().toISOString().slice(0,10)}.csv`);
}

export function exportDailyPlanPdf(trips:DispatchTrip[],deferred:DispatchOrder[]){download(new Blob([pdfDocument(reportLines(trips,deferred))],{type:'application/pdf'}),`waypoint-daily-plan-${new Date().toISOString().slice(0,10)}.pdf`)}
