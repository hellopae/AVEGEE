// The dossier communicates amounts by text colour; the handbook gives their values.
export const SENTENCE_COLORS = [
  {name:'ขาว',color:'#f2e6dd'}, {name:'เขียว',color:'#62d891'},
  {name:'เหลือง',color:'#f2d36b'}, {name:'ส้ม',color:'#ffa460'}, {name:'แดง',color:'#ff7385'},
];
export const ZERO_SENTENCE_COLOR = {name:'เทา',color:'#8d8890'};
export const sentenceColor = value => value === 0 ? ZERO_SENTENCE_COLOR : SENTENCE_COLORS[Math.max(0,Math.min(4,Math.round(Math.abs(value || 1))-1))];
export const sentenceColorGuide = `<h3>อ่านค่าสีในสำนวน</h3><p>สีของข้อความกรรม บุญ และเหตุบรรเทาโทษแทนจำนวน: <b style="color:${ZERO_SENTENCE_COLOR.color}">เทา = 0</b> · ${SENTENCE_COLORS.map((c,i)=>`<b style="color:${c.color}">${c.name} = ${i+1}</b>`).join(' · ')}<br>ใช้กรรมที่หนักที่สุด − บุญจริงรวม − เหตุบรรเทาโทษรวม แล้วเลือกความแรง 1–5 บุญที่โกหกไม่นับ สีเดียวกันมีค่าเท่ากัน แต่กรรมเป็นตัวตั้ง บุญและเหตุบรรเทาเป็นส่วนที่นำมาลบ</p><p>ตัวอย่าง: กรรมสีแดง 5 − บุญสีเขียว 2 − บรรเทาสีขาว 1 = ความแรง 2<br>สีของป้ายชนิดกรรมบอกประเภท สีของข้อความบอกจำนวน อ่านคู่มือเมื่อต้องการเทียบสี</p>`;
