// T5'/7 · The boatman "Lung Chaew" (ลุงแจว) and his quest "The Last Verse of the Boat Song" (Rae R2 A section 10, owner G8).
// Rules (Rae 10.3): no fight; unlocked after the SECOND boat ride; two listening spots (the end of the landing in Zone 1 and in Zone 2); then he is told the song; reward 60 coins + a keepsake (a journal note: the story item
// "the boat-song oar" is not an inventory item - Rae allows that) + the sailing lines change. The song is the invention of the game: it is sung by his wife, alone - never called a traditional boat song.
// The text is Rae's, Thai as written, English in the windows. Key: `sqBoatman` (progress record `g.boatman`), notices NB-1..3. Pictures: img/boat/ (Codex slots, placeholders for now).
export const BOATMAN = Object.freeze({ key:'sqBoatman', name:{ th:'ลุงแจว', en:'Lung Chaew' }, zones:Object.freeze(['th', 'asia']), askAfterRides:2, reward:Object.freeze({ coin:60 }),
  askNotice:'boatman-quest', heardNotice:'boatman-heard', doneNotice:'boatman-done' });
export const ART = Object.freeze({ sprite:'img/boat/boatman-lung-chaew.webp', portrait:'img/boat/boatman-lung-chaew-profile.webp', song:'img/boat/cut-boatman-song-asia.webp', water:'img/boat/fx-water-song.webp', oar:'img/boat/item-oar.webp' });
const page = (image, title, line) => ({ image, title, line, fallback:'📜' });
const L = (th, en) => ({ th, en });

/** 10.2 the lines on the boat - short floating text (not cutscenes). `done` replaces the middle lines once the quest is finished (10.3 step 4). */
export const BOAT_LINES = Object.freeze({
  first:L('ลุงแจว: "ขึ้นมาเถิด ข้าไม่ถามชื่อใคร ท่านก็ไม่ต้องถามชื่อข้า เรียกลุงแจวก็พอ น้ำสายนี้ไปได้ทุกท่า ท่านนั่งเฉย ๆ ข้าพาไปเอง"', 'Lung Chaew: "Climb aboard. I do not ask anyone\'s name, and you need not ask mine. Call me Uncle Chaew. This river reaches every harbor. Sit still and I will take you."'),
  board:[L('ลุงแจว: "ขึ้นเถิด น้ำสงบอยู่"', 'Lung Chaew: "Come aboard. The water is calm."'), L('ลุงแจว: "นั่งให้มั่น ข้าไม่แจวเร็ว แต่ไม่เคยพลาดท่า"', 'Lung Chaew: "Sit steady. I do not row fast, but I never miss a landing."'), L('ลุงแจว: "ท่านอยากไปท่าไหนก็บอก ข้ารู้ทางทุกสาย"', 'Lung Chaew: "Tell me which harbor. I know every channel."')],
  mid:[L('ลุงแจว: "น้ำนี้ไม่ย้อนทิศ เหมือนวาระที่ผ่านไป"', 'Lung Chaew: "This water does not flow backward, like terms already served."'), L('ลุงแจว: "ข้าได้ยินเสียงเพลงมากับน้ำบางคืน ฟังไม่ชัด แต่ไม่ใช่เสียงใครที่ข้ารู้จัก"', 'Lung Chaew: "Some nights I hear a song on the water. I cannot make it out, but it is no one I know."'),
    L('ลุงแจว: "นิราเงียบจังนะ แม่นางอ่านน้ำอยู่หรือ"\nนิรา: "ดิฉันนับระลอกค่ะ"', 'Lung Chaew: "Miss Nira is quiet. Are you reading the water?"\nNira: "I am counting ripples."')],
  arrive:[L('ลุงแจว: "ถึงแล้ว ลงเถิด ข้ารออยู่ตรงนี้"', 'Lung Chaew: "We have arrived. Step off. I will be waiting here."'), L('ลุงแจว: "ขอบใจที่ไม่ถามอะไรข้า"', 'Lung Chaew: "Thank you for not asking me anything."'), L('ลุงแจว: "ท่านกลับมาเมื่อไหร่ ข้าก็อยู่ที่นี่"', 'Lung Chaew: "Whenever you come back, I will be here."')],
  done:L('ลุงแจว: "ข้าร้องเพลงทุกค่ำแล้ว ไม่ต้องมีใครฟังก็ได้"', 'Lung Chaew: "I sing every evening now. It does not matter if no one listens."'),
});

export const BOATMAN_TEXT = Object.freeze({
  // step 2 - the two verses (stories of one page); `listen` = the button at the end of the landing
  listen:L('ฟังเสียงน้ำ', 'Listen to the Water'),
  talk:L('คุยกับลุงแจว', 'Speak with Lung Chaew'),
  log:L('ฟังเสียงเพลงที่ปลายท่าเรือโซน 1 และโซน 2 · {m}/2', 'Listen to the song at the end of the landing in Zone 1 and Zone 2 · {m}/2'),
  notices:{
    [BOATMAN.askNotice]:{ th:{ title:'ลุงแจวขอความช่วยเหลือ', text:'คนพายเรือขอให้ท่านไปฟังเสียงเพลงที่ปลายท่าเรือของแต่ละโซน', button:'รับทราบ' }, en:{ title:'Lung Chaew Asks for Help', text:'The boatman asks you to listen for a song at the end of the landing in each zone.', button:'Understood' } },
    [BOATMAN.heardNotice]:{ th:{ title:'ได้ยินเพลงเรือ', text:'ท่านได้ยินเพลงเรือบทที่ {k} จดไว้แล้ว {m}/2', button:'ต่อ' }, en:{ title:'You Heard the Song', text:'You heard verse {k} of the boat song and noted it. {m}/2', button:'Continue' } },
    [BOATMAN.doneNotice]:{ th:{ title:'เพลงเรือจบแล้ว', text:'ลุงแจวฟังเพลงจนจบ เขาขอบใจและมอบของที่ระลึกให้ท่าน', button:'ขอบคุณ' }, en:{ title:'The Boat Song Is Finished', text:'Lung Chaew heard the song to the end. He thanks you and gives you a keepsake.', button:'Thank him' } },
  },
  keepsake:L('ไม้แจวเพลงเรือ · ไม้แจวเล็กที่ลุงแจวแกะเก็บไว้ ใช้เป็นที่ขีดบอกว่าฟังเพลงจนจบแล้ว', 'The boat-song oar · A small oar Lung Chaew carved and kept, a mark that the song was heard to the end.'),
});

/** The three verses. Verse 1 Lung Chaew remembers himself; 2 and 3 are heard at the end of the landing of Zone 1 / Zone 2 (the voice is never said to be his wife - the player reads it). */
export const VERSES = Object.freeze({
  1:Object.freeze({ th:'น้ำเอ๋ยน้ำไหล ไม่เคยย้อนหลังกลับมา\nเรือเอ๋ยเรือลอย ไม่เคยหลงทางกลับบ้าน', en:'Oh water, flowing water, never turning back.\nOh boat, drifting boat, never lost on the way home.' }),
  2:Object.freeze({ th:'ฝั่งเอ๋ยฝั่งไกล ใจไม่ไกลจากกัน\nมีคนนั่งรอท่า แม้ฟ้ามืดค่ำลง', en:'Oh shore, far shore, the heart is not far from you.\nSomeone sits waiting at the landing, though the sky turns dark.' }),
  3:Object.freeze({ th:'ถึงฝั่งเอ๋ยถึงฝั่ง จงวางพายอย่าหันหลัง\nขอบใจผู้ที่ฟังจนจบบทเพลง', en:'Oh landing, you have reached the landing. Lay down the oar and do not look back.\nThank you, whoever listened to the end of the song.' }),
});
/** zone -> which verse its landing gives */
export const VERSE_OF_ZONE = Object.freeze({ th:2, asia:3 });

export const BOATMAN_STORIES = Object.freeze({
  // 10.2 first ride, one page, played before the first sailing
  'boatman-first':{ title:'ลุงแจว', pages:[ page(ART.portrait, 'ลุงแจว', BOAT_LINES.first.th) ] },
  // step 1 - after the second ride
  'boatman-ask':{ title:'ลุงแจวเรียกให้หยุด', pages:[ page(ART.portrait, 'ท่านนั่งเรือข้ามาสองหนแล้ว',
    'ลุงแจว: "ท่านผู้ถือบัญชี ข้าไม่ชอบขอ แต่ท่านนั่งเรือข้ามาสองหนแล้ว ข้ามีเรื่องจะบอก"\n'
    + 'ลุงแจว: "เมียข้าร้องเพลงเรือให้ข้าฟังทุกค่ำ วันสุดท้ายข้าเหนื่อย ข้าบอกให้เธอเงียบ เธอหยุดร้องกลางเพลง คืนนั้นเธอไม่ตื่นอีก ข้าจำได้แค่ท่อนแรก ท่อนอื่นข้าไม่เคยฟังจนจบ"\n'
    + 'ลุงแจว: "บางคืนมีเสียงเพลงลอยมากับน้ำ ท่อนที่ข้าไม่เคยได้ยิน ข้าไปตามฟังไม่ได้ เพราะข้าลงจากเรือไม่ได้ ท่านไปฟังแทนข้าได้ไหม ที่ปลายท่าของแต่ละโซน"') ] },
  // step 2 - at the end of the landing
  'boatman-verse-th':{ title:'เสียงที่ปลายท่า', pages:[ page(ART.water, 'บทที่ 2',
    `บรรยาย: ลมเย็นพัดผ่านปลายท่า เสียงน้ำกระทบเสาไม้เบาลง ใต้เสียงน้ำมีเสียงผู้หญิงร้องแผ่ว ๆ เป็นทำนองเพลงเรือ: "ฝั่งเอ๋ยฝั่งไกล ใจไม่ไกลจากกัน / มีคนนั่งรอท่า แม้ฟ้ามืดค่ำลง" แล้วเสียงก็จางหาย\nนิรา: "ดิฉันจดทำนองไว้แล้วค่ะ ท่านคะ"`) ] },
  'boatman-verse-asia':{ title:'เสียงที่ปลายท่า', pages:[ page(ART.water, 'บทที่ 3',
    `บรรยาย: ที่ปลายท่าบูรพา โคมแดงเล็กลอยเอื่อยอยู่กลางน้ำ เสียงผู้หญิงคนเดิมร้องต่อจากที่ฟังมา: "ถึงฝั่งเอ๋ยถึงฝั่ง จงวางพายอย่าหันหลัง / ขอบใจผู้ที่ฟังจนจบบทเพลง" เสียงหยุดตรงคำสุดท้าย แล้วโคมแดงดับไป\nยมบาทน้อย: "เธอร้องจบแล้วครับ"`) ] },
  // step 3 - singing it to him
  'boatman-sing':{ title:'ร้องให้ลุงแจวฟัง', pages:[ page(ART.song, 'ท่านร้องให้ข้าฟังได้ไหม',
    'ลุงแจว: "ท่านได้ยินแล้วหรือ ช้า ๆ ข้าไม่เคยร้อง ท่านร้องให้ข้าฟังได้ไหม"\n'
    + 'บรรยาย: ยามาและนิราร้องเนื้อสองบทสุดท้ายเบา ๆ นิราจดทำนองไว้ ยามาจำเนื้อได้ ลุงแจวยืนท้ายเรือนิ่ง ไม้แจวหยุดกลางอากาศ ก่อนเริ่มร้องบทที่หนึ่งเสียงแหบ แล้วต่อสองบทที่ฟังมา ร้องจนจบ น้ำใต้เรือสงบเหมือนกระจก\n'
    + 'ลุงแจว: "...จบแล้ว ข้าฟังจนจบแล้ว ขอบใจนะ ข้าไม่ถามชื่อท่าน แต่ข้าจะจำท่านไว้"') ] },
});
export const BOATMAN_NOTICES = Object.freeze(Object.fromEntries(Object.entries(BOATMAN_TEXT.notices).map(([id, n]) => [id, { ...n.th, art:ART.portrait, en:n.en }])));

// ---- the record in the save: g.boatman = { rides, quest:'none'|'active'|'done', heard:{th,asia}, firstSeen } ----
export const freshBoatman = () => ({ rides:0, quest:'none', heard:{}, firstSeen:false });
export function ensureBoatman(g) {
  const b = g.boatman;
  if (!b || typeof b !== 'object') return (g.boatman = freshBoatman());
  b.rides = Math.max(0, Number(b.rides) || 0); b.quest = ['none', 'active', 'done'].includes(b.quest) ? b.quest : 'none'; b.heard = b.heard && typeof b.heard === 'object' ? b.heard : {}; b.firstSeen = !!b.firstSeen;
  return b;
}
export const heardCount = g => BOATMAN.zones.filter(z => ensureBoatman(g).heard[z]).length;
/** the button at the end of the landing: this zone's verse still to be heard while the quest is open */
export const canListen = g => { const b = ensureBoatman(g); return b.quest === 'active' && BOATMAN.zones.includes(g.zone) && !b.heard[g.zone]; };
/** both verses heard -> he can be sung to */
export const canSing = g => { const b = ensureBoatman(g); return b.quest === 'active' && heardCount(g) >= BOATMAN.zones.length; };
/** a random line of the group, in the current language */
export function boatLine(g, group, lang = 'th', rnd = Math.random) {
  const b = ensureBoatman(g);
  const row = group === 'first' ? BOAT_LINES.first : group === 'mid' && b.quest === 'done' ? BOAT_LINES.done : (() => { const arr = BOAT_LINES[group]; return arr[Math.floor(rnd() * arr.length) % arr.length]; })();
  return (row[lang] || row.th);
}
