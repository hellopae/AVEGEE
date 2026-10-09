// Collect matching groups of documents. Blue is optional, but still matches normally.
export const ROWS=5, COLS=14;
export const COLORS=Object.freeze(['แดง','เหลือง','ฟ้า','ม่วง']);
export const GOALS=Object.freeze([1,3,0,2]);
const SIZE=ROWS*COLS, MAX_CASCADES=64;
const validBoard=board=>Array.isArray(board)&&board.length===SIZE&&Array.from(board).every(c=>Number.isInteger(c)&&c>=0&&c<COLORS.length);
const adjacent=(a,b)=>Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<SIZE&&b<SIZE&&
  (Math.abs(a-b)===COLS || (Math.floor(a/COLS)===Math.floor(b/COLS)&&Math.abs(a-b)===1));
const exchange=(board,a,b)=>{[board[a],board[b]]=[board[b],board[a]];};
function randomFor(seed) {
  let state=Number.isFinite(Number(seed))?Number(seed)>>>0:1;
  return ()=>{state=(state+0x6D2B79F5)>>>0;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
}

/** Matching horizontal/vertical runs, merged where matched cells of a color touch. */
export function findMatches(board) {
  if(!validBoard(board))return [];
  const matched=new Set();
  for(const [lines,length,stride] of [[ROWS,COLS,1],[COLS,ROWS,COLS]]) {
    for(let line=0;line<lines;line++) {
      const start=stride===1?line*COLS:line;
      for(let a=0;a<length;) {
        let b=a+1;
        while(b<length&&board[start+b*stride]===board[start+a*stride])b++;
        if(b-a>=3)for(let i=a;i<b;i++)matched.add(start+i*stride);
        a=b;
      }
    }
  }
  const groups=[];
  for(const first of [...matched].sort((a,b)=>a-b)) {
    if(!matched.delete(first))continue;
    const color=board[first],cells=[first];
    for(let i=0;i<cells.length;i++)for(const next of [cells[i]-1,cells[i]+1,cells[i]-COLS,cells[i]+COLS]) {
      if(adjacent(cells[i],next)&&board[next]===color&&matched.delete(next))cells.push(next);
    }
    cells.sort((a,b)=>a-b);
    groups.push({color,cells,anchor:cells[Math.floor(cells.length/2)]});
  }
  return groups;
}

/** Adjacent swaps that create a match. Never mutates the supplied board. */
export function legalMoves(board) {
  if(!validBoard(board)||findMatches(board).length)return [];
  const working=[...board],moves=[];
  for(let a=0;a<SIZE;a++)for(const b of [a+1,a+COLS]) {
    if(!adjacent(a,b)||working[a]===working[b])continue;
    exchange(working,a,b);
    if(findMatches(working).length)moves.push([a,b]);
    exchange(working,a,b);
  }
  return moves;
}

function freshBoard(random) {
  for(let attempt=0;attempt<100;attempt++) {
    const board=[];
    for(let i=0;i<SIZE;i++) {
      const allowed=[0,1,2,3].filter(c=>!(i%COLS>=2&&board[i-1]===c&&board[i-2]===c)&&
        !(i>=COLS*2&&board[i-COLS]===c&&board[i-COLS*2]===c));
      board.push(allowed[Math.floor(random()*allowed.length)]);
    }
    if(legalMoves(board).length)return board;
  }
  // Guaranteed playable fallback, even if a random source is pathological.
  const board=Array.from({length:SIZE},(_,i)=>(Math.floor(i/COLS)+i%COLS)%4);
  board[2]=0;board[COLS+1]=0;
  return board;
}

function shufflePlayable(board,random) {
  const next=[...board];
  for(let attempt=0;attempt<80;attempt++) {
    for(let i=SIZE-1;i>0;i--)exchange(next,i,Math.floor(random()*(i+1)));
    if(!findMatches(next).length&&legalMoves(next).length)return next;
  }
  // Some color distributions cannot be permuted into a match-free board.
  return freshBoard(random);
}

export function reshuffleBoard(board,seed=1) {
  if(!validBoard(board))throw new TypeError('Expected 70 document colors (0–3)');
  return shufflePlayable(board,randomFor(seed));
}
export function makePuzzle(seed=1) {return {board:freshBoard(randomFor(seed))};}

function collapse(board,groups,random) {
  const next=[...board];
  for(const group of groups)for(const cell of group.cells)next[cell]=-1;
  for(let column=0;column<COLS;column++) {
    let write=ROWS-1;
    for(let row=ROWS-1;row>=0;row--)if(next[row*COLS+column]!==-1)next[write--*COLS+column]=next[row*COLS+column];
    while(write>=0)next[write--*COLS+column]=Math.floor(random()*COLORS.length);
  }
  return next;
}

export function createPuzzle(seed=1) {
  let random,board,collected,moves;
  const won=()=>GOALS.every((goal,color)=>collected[color]>=goal);
  const view=()=>({board:[...board],collected:[...collected],goals:[...GOALS],moves,won:won()});
  const reset=()=>{random=randomFor(seed);board=freshBoard(random);collected=[0,0,0,0];moves=0;return view();};
  reset();
  return {
    view,reset,
    hint:()=>won()?null:legalMoves(board)[0]??null,
    swap(a,b) {
      const reject=reason=>({ok:false,reason,frames:[],reshuffled:false,won:won()});
      if(won())return reject('finished');
      if(!adjacent(a,b))return reject('not-adjacent');
      const candidate=[...board];exchange(candidate,a,b);
      let groups=findMatches(candidate);
      if(!groups.length)return reject('no-match');
      moves++;board=candidate;
      const frames=[];
      while(groups.length&&frames.length<MAX_CASCADES) {
        for(const group of groups)collected[group.color]++;
        // Each frame is the matched board before removal; the UI may animate its gold anchors.
        frames.push({board:[...board],groups,collected:[...collected]});
        board=collapse(board,groups,random);
        groups=findMatches(board);
      }
      let reshuffled=false;
      if(groups.length||!legalMoves(board).length) {board=shufflePlayable(board,random);reshuffled=true;}
      return {ok:true,frames,reshuffled,won:won()};
    },
  };
}
