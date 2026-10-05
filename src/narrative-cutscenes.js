// The seated regional heads and the hostile frontier bosses are separate people.
export function authorityPunishmentCutscene(zone) {
  return ({
    th:'img/hero-boss-cutscene.jpeg',
    asia:'img/head-asia-punish-cutscene-v1.png',
    west:'img/head-west-punish-cutscene-v1.png',
    cyberhell:'img/head-cyberhell-punish-cutscene-v1.png',
  })[zone] || 'img/hero-boss-cutscene.jpeg';
}

const FRONTIER_INTROS = {
  th:{
    speaker:{th:'บอสชายแดนสุวรรณภูมิ', en:'Thai frontier lord'},
    line:{th:'แกเองสินะ ผู้คุมคนใหม่ของดินแดนนี้! ตัวกระเปี๊ยกแค่นี้ คิดว่าจะหยุดกองทัพของข้าไหวหรือ?',
      en:'So you are the new warden of this land! Such a tiny thing… Do you really think you can stop my army?'},
  },
  asia:{
    speaker:{th:'ปีศาจโอนิแห่งชายแดนบูรพา', en:'Oni of the Eastern frontier'},
    line:{th:'เจ้าคนต่างถิ่น เดินทางมาไกลถึงบูรพา ยังกล้ามายุ่งกับถิ่นของข้าอีกหรือ? ระวังจะไม่มีโอกาสได้กลับไป!',
      en:'Outsider! You have come all the way to the East, only to meddle in my territory? You may never make it home!'},
  },
  west:{
    speaker:{th:'เจ้าแห่งแวมไพร์', en:'Lord of vampires'},
    line:{th:'แกเป็นใคร ถึงบังอาจล่วงล้ำชายแดนของเจ้าแห่งแวมไพร์? ผู้บุกรุกถิ่นของข้า จะต้องได้รับการลงโทษ!',
      en:'Who are you to trespass on the frontier of the vampire lord? Every intruder in my domain must be punished!'},
  },
  cyberhell:{
    speaker:{th:'ม้าไม้ปีศาจ', en:'Demonic Trojan horse'},
    line:{th:'ข้าคือม้าไม้ปีศาจ ผู้ควบคุมชายแดนนรกเครือข่าย! ทุกเส้นทางอยู่ในอำนาจข้า อย่าบังอาจเข้ามายุ่งเกี่ยว!',
      en:'I am the demonic Trojan horse, master of the network frontier! Every route is under my control. Do not interfere!'},
  },
};

export function frontierIntroduction(zone, lang = 'th') {
  const scene = FRONTIER_INTROS[zone];
  if (!scene) return null;
  return { image:`img/frontier-${zone}-intro-v1.png`,
    speaker:scene.speaker[lang] || scene.speaker.th,
    line:scene.line[lang] || scene.line.th };
}
