import {planAI} from './engine.js';
self.onmessage=({data:g})=>{ // Strip opponents' private racks before planning.
 const view={...g,players:g.players.map((p,i)=>i===g.current?p:{...p,rack:[]})};
 self.postMessage(planAI(view));
};
