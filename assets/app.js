
import {load,today,dateKey,state,metrics,esCompleto,parseNum,aging} from './sheets.js';
const modules=[['inicio','Portada','Panorama general'],['produccion','Producción','Volumen, cumplimiento de plan y eficiencia'],['mantenimiento','Mantenimiento','Disponibilidad, fallas y órdenes de trabajo'],['almacen','Almacén','Entradas, salidas y materiales pendientes'],['inventarios','Inventarios','Existencias, cobertura y diferencias'],['otif','OTIF','Entregas a tiempo y completas'],['avisos','Avisos importantes','Comunicados y prioridades de la planta'],['sgc','SGC','Documentos, auditorías y acciones de mejora']];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null,updated=null,error='',busy=false,cut=today(),search='',month=today().slice(0,7);
const pct=n=>n===null?'Sin datos':n.toFixed(1)+'%';
const color=n=>n===null?'neutral':n>=95?'good':n>=85?'warn':'bad';
function card(label,value,note='',tone='neutral'){return '<div class="card '+tone+'"><label>'+esc(label)+'</label><strong class="value">'+esc(value)+'</strong><small>'+esc(note)+'</small></div>';}
function table(title,rows,cols){return '<section class="panel"><h2>'+esc(title)+'</h2>'+(rows.length?'<table><thead><tr>'+cols.map(c=>'<th scope="col">'+esc(c[0])+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td>'+esc(typeof c[1]==='function'?c[1](r):r[c[1]]||'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'<p class="muted">Sin registros para esta selección.</p>')+'</section>';}
function kpis(day){
 const rows=data.diario.filter(r=>dateKey(r.fechaLista)===day),m=metrics(rows);
 return '<div class="grid">'+card('OTIF por pedidos',pct(m.count),'Meta ≥95% · corte parcial',color(m.count))+card('OTIF por peso',pct(m.weight),'Ponderado por toneladas',color(m.weight))+card('Programados',m.total,'Filas de Diario')+card('Pedidos OTIF',m.ok,'A tiempo y completos')+card('Pendientes de salida',m.pending,'Sin Entrega o detenidos')+card('Atrasos abiertos',data.atrasos.filter(r=>!esCompleto(r.entrega)).length,'Todos los compromisos abiertos')+'</div>';
}
function render(){
 const route=location.hash.slice(1)||'inicio',mod=modules.find(m=>m[0]===route)||modules[0];
 $('title').textContent=mod[0]==='inicio'?'Panorama general':mod[1];
 $('nav').innerHTML=modules.map(m=>'<a href="#'+m[0]+'" class="'+(m===mod?'active':'')+'" '+(m===mod?'aria-current="page"':'')+'>'+m[1]+'</a>').join('');
 $('status').textContent=busy?'Actualizando…':error?(updated?'No se pudo actualizar. Se conservan los datos de '+updated+'. ':'Sin conexión a los datos. ')+error:updated?'Última lectura: '+updated+' · Google Sheets · actualización cada 5 minutos':'Esperando datos';
 let html=error?'<p class="notice">'+esc(error)+' Verifica el acceso de lectura al Sheet y vuelve a actualizar.</p>':'';
 if(mod[0]==='inicio'){
 html+='<div class="hero"><span>TOLCAYUCA · VISTA EJECUTIVA</span><h2>Lo importante de la planta, en un solo lugar.</h2><p>Empezamos con el cumplimiento de entregas. Las demás áreas tienen su espacio preparado para crecer paso a paso.</p></div>';
 html+=data?kpis(today()):'<p class="notice">Los indicadores aparecerán cuando se complete la lectura de Google Sheets.</p>';
 html+='<h2>Áreas de operación</h2><div class="grid">'+modules.slice(1).map(m=>'<a class="card module" href="#'+m[0]+'"><span class="tag">'+(m[0]==='otif'?'Primer módulo activo':'Pendiente de integrar')+'</span><h3>'+m[1]+'</h3><p class="muted">'+m[2]+'</p></a>').join('')+'</div>';
 }else if(mod[0]==='otif'){
 html+='<p class="muted">Completo + fecha de entrega ≤ fecha lista. Pendientes incluidos en el denominador. Semáforo: rojo &lt;85%, amarillo 85–94.9%, verde ≥95%.</p><div class="filters"><label>Fecha de corte <input id="cut" type="date" value="'+cut+'"></label><input id="search" type="search" aria-label="Buscar pedido o cliente" placeholder="Buscar pedido o cliente" value="'+esc(search)+'"></div>';
 if(data){
 html+=kpis(cut);
 const match=r=>(r.pedido+' '+r.cliente).toLowerCase().includes(search.toLowerCase());
 const cols=[['Pedido','pedido'],['Cliente','cliente'],['Símbolo','simbolo'],['Piezas','piezas'],['Peso (ton)',r=>parseNum(r.peso)],['Fecha lista','fechaLista'],['Fecha entrega','fechaEntrega'],['Entrega','entrega']];
 html+=table('Pedidos del corte',data.diario.filter(r=>dateKey(r.fechaLista)===cut&&match(r)),[...cols,['OTIF',state],['Tipo','tipo'],['Mañana','estatusManana'],['Tarde','estatusTarde'],['Departamento','deptoImplicado'],['Observaciones','observaciones']]);
 html+=table('Siguiente día · programación de la pestaña Sig día',data.siguiente.filter(match),[...cols.slice(0,6),['Estatus','estatus'],['Observaciones','observaciones']]);
 html+=table('Atrasos abiertos',data.atrasos.filter(r=>!esCompleto(r.entrega)&&match(r)),[...cols,['Días desde fecha lista',r=>aging(r,cut).days??'Sin fecha'],['Días de reprogramación',r=>aging(r,cut).shift??'Sin compromiso'],['Compromiso',r=>aging(r,cut).status],['Departamento','depto'],['Motivo','motivo']]);
 html+='<section class="panel"><h2>Histórico y acumulado mensual</h2><label>Mes <input id="month" type="month" value="'+month+'"></label><p class="muted">Hasta la fecha de corte; las fechas futuras quedan fuera. Búsqueda aplicada solo a tablas operativas.</p>';
 const history=data.diario.filter(r=>dateKey(r.fechaLista)?.startsWith(month)&&dateKey(r.fechaLista)<=cut);
 const m=metrics(history);
 html+='<div class="grid">'+card('OTIF mensual por pedidos',pct(m.count),'Ponderado por filas',color(m.count))+card('OTIF mensual por peso',pct(m.weight),'Ponderado por toneladas',color(m.weight))+'</div></section>';
 html+=table('Evolución diaria', [...new Set(history.map(r=>dateKey(r.fechaLista)))].sort().map(day=>({day,...metrics(history.filter(r=>dateKey(r.fechaLista)===day))})),[['Fecha','day'],['Programados','total'],['Pedidos OTIF','ok'],['OTIF pedidos',r=>pct(r.count)],['OTIF peso',r=>pct(r.weight)]]);
 const failures=history.filter(r=>state(r)==='NO OTIF'),groups=new Map();
 failures.forEach(r=>{const d=r.deptoImplicado||'Sin definir';groups.set(d,(groups.get(d)||0)+1);});
 html+=table('Incumplimientos confirmados por departamento',Array.from(groups,([dept,count])=>({dept,count})).sort((a,b)=>b.count-a.count),[['Departamento','dept'],['Pedidos',r=>r.count],['Participación',r=>pct(100*r.count/failures.length)]]);
 }else html+='<p class="notice">Sin datos disponibles. Usa Actualizar datos para reintentar.</p>';
 }else html+='<section class="hero"><span>PENDIENTE DE INTEGRAR</span><h2>'+mod[1]+'</h2><p>'+mod[2]+'.</p></section><section class="panel"><h2>Espacio preparado para esta área</h2><p class="muted">El siguiente paso será definir indicadores, fuente de datos y responsables. Aún no hay información conectada para este módulo.</p><a href="#inicio">Volver a la portada →</a></section>';
 $('content').innerHTML=html;
 $('cut')?.addEventListener('change',e=>{if(e.target.value){cut=e.target.value;render();}});
 $('month')?.addEventListener('change',e=>{if(e.target.value){month=e.target.value;render();}});
 $('search')?.addEventListener('change',e=>{search=e.target.value;render();});
}
async function refresh(){if(busy)return;busy=true;$('refresh').disabled=true;render();try{data=await load();updated=new Date().toLocaleString('es-MX',{timeZone:'America/Mexico_City'});error='';}catch(e){error=e.message;}finally{busy=false;$('refresh').disabled=false;render();}}
window.addEventListener('hashchange',render);
$('refresh').addEventListener('click',refresh);
render();refresh();setInterval(refresh,300000);

