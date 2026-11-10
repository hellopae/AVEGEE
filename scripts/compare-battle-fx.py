#!/usr/bin/env python3
"""BATTLE-FX: compare two sim-battle-fx.mjs outputs. usage: compare-battle-fx.py before after [boss|frontier]"""
import json,sys
d='output/coordination/2026-11-10-battle-fx/'
a=json.load(open(d+sys.argv[1]+'.json'))['rows']; b=json.load(open(d+sys.argv[2]+'.json'))['rows']
want=sys.argv[3] if len(sys.argv)>3 else None
key=lambda r:(r['zone'],r['size'],r['kind'],r.get('encounter'),r['moves'])
bm={key(r):r for r in b}
big=0;n=0;ds=[];tot=[]
print('zone size enc moves | win% before->after (delta) | rounds | ult/fight | >=2 | firstAct | foes')
for r in a:
    if want=='boss' and not (r['kind'] in('boss','final')): continue
    if want=='frontier' and r['kind']!='frontier': continue
    o=bm[key(r)]; dl=o['winRate']-r['winRate']; ds.append(dl); n+=1
    if abs(dl)>10: big+=1
    print(f"{r['zone']:9}{r['size']} {(r.get('encounter') or r['kind']):8}{str(r['moves'])[0]} | {r['winRate']:5}->{o['winRate']:5} ({dl:+5.1f}) | {r['rounds']:.2f}->{o['rounds']:.2f} | {r['ult']}->{o['ult']} | {r['ult2plus']}->{o['ult2plus']} | {r['firstUltAct']}->{o['firstUltAct']} | {r['foes']}->{o['foes']}")
print(f"rows {n}  |delta|>10: {big}  mean delta {sum(ds)/n:+.2f}  mean|delta| {sum(abs(x) for x in ds)/n:.2f}")
