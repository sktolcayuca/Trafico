import assert from 'node:assert/strict';
import {parseCSV,buildRowsFromCSV,dateKey,state,metrics,esCompleto,aging} from './assets/sheets.js';
assert.deepEqual(parseCSV('a,b\n"x,y","z""q"'),[['a','b'],['x,y','z"q']]);
assert.equal(buildRowsFromCSV(parseCSV('Fecha lista,Pedido,Cliente\n29/09/2026,1,SK'))[0].pedido,'1');
assert.throws(()=>buildRowsFromCSV([['Login']]));
assert.equal(dateKey('31/02/2026'),null);
assert.equal(dateKey('29/09/2026'),'2026-09-29');
assert.equal(esCompleto('Incompleta'),false);
const ok={fechaLista:'29/09/2026',fechaEntrega:'29/09/2026',entrega:'Completada',peso:'10'};
const late={...ok,fechaEntrega:'30/09/2026',peso:'5'};
const pending={...ok,entrega:'',peso:'5'};
assert.equal(state(ok),'OTIF');assert.equal(state(late),'NO OTIF');assert.equal(state(pending),'Pendiente');
assert.equal(metrics([ok,late,pending]).count,100/3);
assert.equal(metrics([ok,late,pending]).weight,50);
assert.equal(metrics([]).count,null);
assert.equal(metrics([{...ok,peso:'0'}]).weight,null);
assert.equal(aging({...ok,fechaEntrega:'01/10/2026'},'2026-09-30').days,1);
assert.equal(aging({...ok,fechaEntrega:'01/10/2026'},'2026-09-30').shift,2);
console.log('12 grupos de comprobaciones OTIF correctos.');


