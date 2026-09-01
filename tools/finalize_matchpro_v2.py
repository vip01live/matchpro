from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
CHANNELS=ROOT/'main/js/channels.js'

ROUTER='''(function(){\n'use strict';\nvar channels=window.MATCHPRO_CHANNELS||[],p=new URLSearchParams(location.search),id=p.get('id');\nif((location.pathname==='/'||/\\/index\\.html$/i.test(location.pathname))&&id){\n var item=channels.find(function(x){return String(x.id)===String(id)});\n if(item){fetch('./'+item.file,{cache:'no-store'}).then(function(r){return r.ok?r.text():Promise.reject(r.status)}).then(function(source){\n  var d=new DOMParser().parseFromString(source,'text/html'),h=d.querySelector('header'),m=d.querySelector('main'),f=d.querySelector('footer');if(!m)throw 0;\n  document.body.innerHTML='';if(h)document.body.appendChild(document.importNode(h,true));document.body.appendChild(document.importNode(m,true));if(f)document.body.appendChild(document.importNode(f,true));document.body.dataset.matchproChannelId=item.id;window.dispatchEvent(new Event('matchpro-content-loaded'));\n }).catch(function(){location.href='./'});return;}\n}\ndocument.documentElement.classList.add('matchpro-ready');\n})();\n'''

def channels():
 t=CHANNELS.read_text(encoding='utf-8')
 return {m.group(2):m.group(1) for m in re.finditer(r"\\{id:(\\d+),file:'([^']+)',nameRu:",t)}

def process(path,map_):
 t=path.read_text(encoding='utf-8',errors='ignore')
 t=re.sub(r'<footer\\b[^>]*>.*?</footer>','<footer class="matchpro-footer">\\n  <p>© <span id="year"></span></p>\\n</footer>',t,flags=re.I|re.S)
 if '<footer' not in t.lower(): t=re.sub(r'</body>','<footer class="matchpro-footer"><p>© <span id="year"></span></p></footer>\\n</body>',t,count=1,flags=re.I)
 for file,cid in map_.items():
  t=re.sub(r'href=["\\'](?:\\./|/)?'+re.escape(file)+r'(?:\\?[^"\\']*)?["\\']',f'href="./?id={cid}"',t,flags=re.I)
 for tag in ['<link rel="stylesheet" href="/main/900-css/matchpro.css">','<script src="/main/js/player-config.js" defer></script>','<script src="/main/js/channels.js" defer></script>','<script src="/main/js/ads-loader.js" defer></script>','<script src="/main/js/matchpro.js" defer></script>','<script src="/main/js/matchpro-enhance.js" defer></script>']:
  t=re.sub(re.escape(tag),'',t,flags=re.I);t=re.sub(r'</head>','    '+tag+'\\n</head>',t,count=1,flags=re.I)
 path.write_text(t,encoding='utf-8')

def main():
 m=channels()
 for p in ROOT.glob('*.html'):
  if p.name.lower()!='404.html': process(p,m)
 (ROOT/'main/js/matchpro-enhance.js').write_text(ROUTER,encoding='utf-8')
if __name__=='__main__': main()
