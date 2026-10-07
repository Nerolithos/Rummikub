import test from 'node:test';
import assert from 'node:assert/strict';
import {reorderTiles,captureView,restoreView} from '../src/table-interaction.js';
const tiles=['a','b','c','d'].map(id=>({id}));
const ids=a=>a.map(t=>t.id).join('');
test('move left and right, including ends, without changing source',()=>{
 assert.equal(ids(reorderTiles(tiles,['d'],'left')),'abdc');
 assert.equal(ids(reorderTiles(tiles,['a'],'right')),'bacd');
 assert.equal(ids(reorderTiles(tiles,['a'],'left')),'abcd');
 assert.equal(ids(reorderTiles(tiles,['d'],'right')),'abcd');
 assert.equal(ids(tiles),'abcd');
});
test('swap non-adjacent tiles in either selection order; ambiguous selection is inert',()=>{
 assert.equal(ids(reorderTiles(tiles,['d','a'],'swap')),'dbca');
 assert.equal(ids(reorderTiles(tiles,['a','d'],'swap')),'dbca');
 assert.equal(ids(reorderTiles(tiles,['a'],'swap')),'abcd');
 assert.equal(ids(reorderTiles(tiles,['a','b'],'left')),'abcd');
});
test('restore document, board, and surviving meld offsets after DOM replacement',()=>{
 const meld=(ids,left)=>({scrollLeft:left,scrollTop:0,querySelectorAll:()=>ids.map(id=>({dataset:{tile:id}}))});
 let board={scrollTop:240,scrollLeft:7},melds=[meld(['a','b'],56),meld(['c','d'],32)];
 const root={querySelector:()=>board,querySelectorAll:()=>melds};
 const win={scrollX:0,scrollY:370,scrollTo(p){this.scrollX=p.left;this.scrollY=p.top;}};
 const view=captureView(root,win);
 board={scrollTop:0,scrollLeft:0};melds=[meld(['d','c'],0)];win.scrollY=0;
 restoreView(root,win,view);
 assert.equal(board.scrollTop,240);assert.equal(board.scrollLeft,7);
 assert.equal(melds[0].scrollLeft,32);assert.equal(win.scrollY,370);
});
