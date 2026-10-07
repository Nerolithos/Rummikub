// Preserve viewport positions across the UI's synchronous DOM replacement.
export function captureView(root, win) {
  const board = root.querySelector('.board');
  return {
    x: win.scrollX, y: win.scrollY,
    board: board && {top: board.scrollTop, left: board.scrollLeft},
    melds: [...root.querySelectorAll('.meld')].map(el => ({
      ids: [...el.querySelectorAll('[data-tile]')].map(t => t.dataset.tile),
      left: el.scrollLeft, top: el.scrollTop,
    })),
  };
}
export function restoreView(root, win, view) {
  const board = root.querySelector('.board');
  if (board && view.board) { board.scrollTop = view.board.top; board.scrollLeft = view.board.left; }
  for (const el of root.querySelectorAll('.meld')) {
    const ids = [...el.querySelectorAll('[data-tile]')].map(t => t.dataset.tile);
    const previous = view.melds.find(m => m.ids.some(id => ids.includes(id)));
    if (previous) { el.scrollLeft = previous.left; el.scrollTop = previous.top; }
  }
  win.scrollTo({left: view.x, top: view.y, behavior: 'instant'});
}
export function reorderTiles(tiles, selected, action) {
  const indexes = tiles.flatMap((t, i) => selected.includes(t.id) ? [i] : []);
  const next = [...tiles];
  if (action === 'swap' && indexes.length === 2) {
    const [a,b] = indexes;
    [next[a],next[b]] = [next[b],next[a]];
  } else if (indexes.length === 1 && ['left','right'].includes(action)) {
    const a = indexes[0], b = a + (action === 'left' ? -1 : 1);
    if (b >= 0 && b < next.length) [next[a],next[b]] = [next[b],next[a]];
  }
  return next;
}
