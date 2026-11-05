"""Validate the independently authored learning assets, then publish their data bundle."""
import json,pathlib,re,collections
root=pathlib.Path(__file__).resolve().parent
cards=[]
for name in ['mechanik','elektro','automation']:
    value=json.loads((root/f'content/inhalte-{name}.json').read_text(encoding='utf-8-sig'))
    assert isinstance(value,list),name
    cards.extend(value)
expected={f'D{n}' for n in range(1,47)}|{f'E{n}' for n in range(1,49)}
figures={'D3':[25],'D8':[26],'D10':[27],'D11':[28,29],'D13':[30],'D15':[31],'D16':[32],'D18':[33],'D19':[34],'D21':[35,36],'D22':[37],'D25':[38],'D26':[39],'D37':[40],'D40':[41],'E16':[66],'E23':[67],'E26':[68],'E36':[69],'E46':[70],'E48':[71]}
for c in cards:
    if c['id'] in figures:c['imagePage']=figures[c['id']][0];c['imagePages']=figures[c['id']]
assert len(cards)==94 and {c['id'] for c in cards}==expected,'Missing or repeated cases'
assert len({c['id'] for c in cards})==94
for c in cards:
    assert c['category'] in ['Pneumatik','Mechanik','Elektrotechnik','Automation','Sicherheit'],c['id']
    assert all(isinstance(c[k],str) and c[k].strip() for k in ['id','title','question','mnemonic','pitfall']),c['id']
    assert isinstance(c['answer'],list) and len(c['answer'])>=2,c['id']
    for a in c['answer']:assert isinstance(a['label'],str) and isinstance(a['text'],str) and len(a['text'])>30,c['id']
    assert c['sources'] and all(s['url'].startswith('https://') and s['label'] for s in c['sources']),c['id']
    assert isinstance(c['pdfPage'],int) and 1<=c['pdfPage']<=71,c['id']
    assert c.get('imagePage') is None or 1<=c['imagePage']<=71,c['id']
    assert c['keywords'] and all(isinstance(k,str) for k in c['keywords']),c['id']
cards.sort(key=lambda c:(c['id'][0],int(c['id'][1:])))
bundle='window.MEC_META='+json.dumps({'version':'1.0.0','reviewed':'2026-11-05','source':'https://www.wko.at/ooe/bildung-lehre/fragenkatalog-kandidat-mec-h1.pdf','chapters':{'D':46,'E':48}},ensure_ascii=False)+';\nwindow.MEC_CARDS='+json.dumps(cards,ensure_ascii=False,separators=(',',':'))+';\n'
(root/'dist/data.js').write_text(bundle,encoding='utf-8')
audit={'ok':True,'cases':len(cards),'answerSections':sum(len(c['answer']) for c in cards),'categories':dict(collections.Counter(c['category'] for c in cards)),'uniqueSources':len({s['url'] for c in cards for s in c['sources']}),'imagesLinked':sum(bool(c.get('imagePage')) for c in cards),'bytes':len(bundle.encode())}
(root/'.runtime').mkdir(exist_ok=True)
(root/'.runtime/content-validation.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(audit,ensure_ascii=False))
