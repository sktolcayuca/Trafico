function parseCSV(text){
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for(let i=0;i<text.length;i++){
    const c = text[i];
    if(inQuotes){
      if(c === '"'){
        if(text[i+1] === '"'){ field += '"'; i++; }
        else{ inQuotes = false; }
      } else { field += c; }
    } else {
      if(c === '"'){ inQuotes = true; }
      else if(c === ','){ row.push(field); field=''; }
      else if(c === '\n'){ row.push(field); rows.push(row); row=[]; field=''; }
      else if(c === '\r'){ /* ignore */ }
      else { field += c; }
    }
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows;
}

function normalize(s){
  return (s||'').toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // quita acentos
    .toLowerCase()
    .replace(/\./g,'')
    .trim()
    .replace(/\s+/g,' ');
}

// mapea nombre normalizado de columna -> clave interna
const HEADER_MAP = {
  'fecha lista': 'fechaLista',
  'flista': 'fechaLista',
  'f lista': 'fechaLista',
  'f entrega': 'fechaEntrega',
  'pedido': 'pedido',
  'cliente': 'cliente',
  'simbolo': 'simbolo',
  'piezas': 'piezas',
  'piezas pedido': 'piezasPedido',
  'peso': 'peso',
  'estatus manana': 'estatusManana',
  'estatus tarde': 'estatusTarde',
  'estatus': 'estatus',
  'entrega': 'entrega',
  'tipo': 'tipo',
  'depto implicado': 'deptoImplicado',
  'observaciones': 'observaciones',
  'depto involucrado': 'depto',
  'motivo del atraso': 'motivo'
};

function buildRowsFromCSV(rows2D){
  // busca la fila de encabezados: alguna variante de "fecha lista" + "pedido"
  const variantesFechaLista = ['fecha lista','flista','f lista'];
  let headerRowIdx = -1;
  for(let i=0;i<rows2D.length;i++){
    const norm = rows2D[i].map(normalize);
    const tieneFechaLista = norm.some(h=> variantesFechaLista.includes(h));
    if(tieneFechaLista && norm.includes('pedido')){ headerRowIdx = i; break; }
  }
  if(headerRowIdx === -1) throw new Error('Encabezados no reconocidos en Google Sheets');

  const headers = rows2D[headerRowIdx].map(normalize);
  const colIndex = {};
  headers.forEach((h, idx)=>{ if(HEADER_MAP[h]) colIndex[HEADER_MAP[h]] = idx; });

  const out = [];
  for(let i=headerRowIdx+1; i<rows2D.length; i++){
    const r = rows2D[i];
    const isEmpty = r.every(c => (c||'').trim()==='');
    if(isEmpty) continue;
    const obj = {};
    Object.keys(colIndex).forEach(key=>{ obj[key] = (r[colIndex[key]]||'').trim(); });
    // ignora filas sin Pedido (renglones basura)
    if(!obj.pedido) continue;
    out.push(obj);
  }
  return out;
}

function parseFecha(str){
  if(!str) return null;
  const m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if(!m) return null;
  let a = parseInt(m[1],10), b = parseInt(m[2],10), y = parseInt(m[3],10);
  if(y < 100) y += 2000;
  let day, month;
  if(a > 12){ day = a; month = b; }        // a no puede ser mes -> es dia
  else if(b > 12){ day = b; month = a; }   // b no puede ser mes -> a es mes, b es dia
  else { day = a; month = b; }             // ambiguo -> default DD/MM
  const d = new Date(y, month-1, day);
  d.setHours(0,0,0,0);
  return isNaN(d.getTime()) ? null : d;
}

function sameDay(d1, d2){
  return d1 && d2 && d1.getFullYear()===d2.getFullYear() && d1.getMonth()===d2.getMonth() && d1.getDate()===d2.getDate();
}
function fmtFecha(d){
  if(!d) return '—';
  return d.toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric'});
}
function parseNum(str){
  if(!str) return 0;
  const clean = str.toString().replace(/,/g,'').replace(/[^\d.\-]/g,'');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}
function normEntrega(str){ return normalize(str); }

/* ============================================================
   LÓGICA DE NEGOCIO: On Time, Completo, OTIF
   ============================================================ */
function esCompleto(entregaStr){
  const e = normEntrega(entregaStr);
  if(e.includes('incomplet')) return false;
  if(e.includes('complet')) return true;   // Completada
  if(e.includes('dentro')) return true;    // Dentro del +/-
  if(e.includes('parcial')) return false;  // Parcial
  if(e.includes('devoluc')) return false;  // Devolución
  if(e.includes('detenid')) return false;  // Detenido
  return false; // vacío / otro valor -> aún no se puede dar por cumplido
}



export { parseCSV, buildRowsFromCSV, normalize, parseNum, esCompleto };
export const config = {sheetId:'1YffDN35RzYP3W-CkMd9HnRGCUDr8YxA5IoOXcyi_YMY', tabs:{diario:'0',atrasos:'1719704144',siguiente:'1156833206'}};
export function dateKey(raw){
  const m=String(raw||'').trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if(!m)return null;
  let [,d,mo,y]=m.map(Number); if(y<100)y+=2000;
  if(mo>12&&d<=12)[d,mo]=[mo,d];
  const dt=new Date(Date.UTC(y,mo-1,d));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d?dt.toISOString().slice(0,10):null;
}
export function today(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value])); return p.year+'-'+p.month+'-'+p.day;
}
export function state(r){
  if(!r.entrega)return 'Pendiente';
  const a=dateKey(r.fechaLista),b=dateKey(r.fechaEntrega);
  return a&&b&&b<=a&&esCompleto(r.entrega)?'OTIF':'NO OTIF';
}
export function metrics(rows){
  const ok=rows.filter(r=>state(r)==='OTIF');
  const weight=rows.reduce((a,r)=>a+Math.max(0,parseNum(r.peso)),0);
  return {total:rows.length,ok:ok.length,pending:rows.filter(r=>!r.entrega||normalize(r.entrega).includes('detenid')).length,
    count:rows.length?100*ok.length/rows.length:null,
    weight:weight?100*ok.reduce((a,r)=>a+Math.max(0,parseNum(r.peso)),0)/weight:null};
}
export function aging(r,day){
  const listed=dateKey(r.fechaLista),promise=dateKey(r.fechaEntrega);
  const diff=to=>listed?Math.max(0,Math.round((Date.parse(to)-Date.parse(listed))/86400000)):null;
  return {days:diff(day),shift:promise?diff(promise):null,status:!promise?'Sin fecha compromiso':promise<day?'Compromiso vencido':promise===day?'Se entrega hoy':'Compromiso: '+promise};
}
export async function load(){
  const entries=await Promise.all(Object.entries(config.tabs).map(async([name,gid])=>{
    const response=await fetch('https://docs.google.com/spreadsheets/d/'+config.sheetId+'/export?format=csv&gid='+gid,{cache:'no-store',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(name+': HTTP '+response.status);
    const text=await response.text();
    if(/^\s*</.test(text))throw new Error(name+': Google devolvió una página de acceso en lugar de CSV');
    return [name,buildRowsFromCSV(parseCSV(text))];
  }));
  return Object.fromEntries(entries);
}

