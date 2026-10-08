// Sliding rows/columns are permutations, so scrambling a solved board always has a solution.
export const ROWS=5, COLS=14;
export const COLORS=['แดง','เหลือง','ฟ้า','ม่วง'];
export const GOALS=[1,3,0,2];
export function shiftLine(board,axis,index,delta) {
  const size=axis==='row'?COLS:axis==='column'?ROWS:0;
  if(!size || !Number.isInteger(index) || index<0 || index>=(axis==='row'?ROWS:COLS) || !Number.isInteger(delta)) return false;
  const cells=Array.from({length:size},(_,i)=>axis==='row'?index*COLS+i:i*COLS+index);
  const values=cells.map(i=>board[i]);
  cells.forEach((cell,i)=>board[cell]=values[((i-delta)%size+size)%size]);return true;
}
export function columnCounts(board) {
  const counts=[0,0,0,0];
  for(let c=0;c<COLS;c++) {const color=board[c];if(board.length===ROWS*COLS && board.every((v,i)=>i%COLS!==c || v===color)) counts[color]++;}
  return counts;
}
export const solved=board=>columnCounts(board).every((n,i)=>n===GOALS[i]);
export function makePuzzle(seed=1) {
  const full=[0,1,1,1,3,3];
  const board=Array.from({length:ROWS*COLS},(_,i)=>i%COLS<6?full[i%COLS]:(Math.floor(i/COLS)+i%COLS)%4);
  const solution=[];
  for(let r=0;r<ROWS;r++) {const delta=1+((seed+r*7)>>>0)%3;shiftLine(board,'row',r,delta);solution.unshift({axis:'row',index:r,delta:-delta});}
  if(solved(board)) {shiftLine(board,'row',1,1);solution.unshift({axis:'row',index:1,delta:-1});}
  return {board,solution};
}
export function createPuzzle(seed=1) {
  const initial=makePuzzle(seed).board,board=[...initial],history=[];
  return {board,move(axis,index,delta){if(solved(board))return false;const before=[...board];if(!shiftLine(board,axis,index,delta))return false;history.push(before);return true;},
    undo(){if(!history.length)return false;board.splice(0,board.length,...history.pop());return true;},
    reset(){board.splice(0,board.length,...initial);history.length=0;}, counts:()=>columnCounts(board), won:()=>solved(board), moves:()=>history.length};
}
