import { authorityOf } from './data.js';

const AREAS = {
  asia: { folder:'Asia', welcome:'ที่นี่คือบูรพา ศาลท่ามกลางถ้ำหินและโคมแดง แต่ละสำนวนต้องตรวจทั้งคำให้การและหลักฐานก่อนตัดสิน', guidance:'ข้ายินดีต้อนรับยมบาทน้อย ข้าจะช่วยท่านพิจารณาคดีของบูรพา จัดสถานีและทีมยมทูตให้พร้อม แล้วเริ่มงานได้เลย' },
  west: { folder:'West', welcome:'ปัจฉิมเป็นดินแดนหิมะและศาลหิน วิญญาณของที่นี่มีชีวิตและภูมิหลังต่างจากสาขาก่อน เราต้องฟังเรื่องของพวกเขาให้ครบ', guidance:'ยินดีต้อนรับสู่ปัจฉิม ข้าดูแลศาลแห่งนี้และจะช่วยท่านชั่งน้ำหนักความผิดกับความดี เตรียมทีมให้พร้อมรับคดีแรก' },
  cyberhell: { folder:'CyberHell', welcome:'นรกเครือข่ายเต็มไปด้วยข้อมูลและเครื่องจักร แม้หลักฐานจะอยู่ในระบบ เราก็ต้องตรวจให้แน่ใจว่าเป็นความจริง', guidance:'ข้าคือผู้ดูแลบัลลังก์นรกเครือข่าย ข้าจะช่วยท่านพิจารณาคดีของสาขานี้ อย่าสับสนข้ากับผู้ตรวจการที่คุกคามดินแดนของเรา' },
};

export function zoneIntroduction(zone) {
  const area = AREAS[zone];
  if (!area) return null;
  return { image:`img/${area.folder}/intro-head-${zone}-v2.png`, speaker:authorityOf(zone).full,
    welcome:area.welcome, guidance:area.guidance };
}

/** Crew belong to the current branch; Yama's chosen outfit is independent. */
export function regionalCrewCutscene(key, zone) {
  const area = AREAS[zone];
  return area ? { src:`img/${area.folder}/crew-${key}-${zone}-cutscene.jpeg`, regional:true }
    : { src:`img/crew-${key}-cutscene.jpeg`, regional:false };
}

/** Arc length follows the image's aspect ratio, so turns do not change speed. */
export function travelPath(route, aspect = 1.78) {
  const distances = [0];
  for (let i = 1; i < route.length; i++) {
    distances.push(distances[i - 1] + Math.hypot((route[i][0] - route[i - 1][0]) * aspect, route[i][1] - route[i - 1][1]));
  }
  const total = distances.at(-1);
  return { total, at(distance) {
    if (route.length < 2) return route[0];
    const done = Math.max(0, Math.min(total, distance));
    let i = 1;
    while (i < distances.length - 1 && distances[i] < done) i++;
    const span = distances[i] - distances[i - 1];
    const t = span ? (done - distances[i - 1]) / span : 0;
    return route[i - 1].map((value, axis) => value + (route[i][axis] - value) * t);
  } };
}
