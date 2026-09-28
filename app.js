'use strict';
const $ = s => document.querySelector(s);
const state = {docs:[], view:'home', category:'Alla', query:'', format:'all', sort:'az', loaded:false, error:false, current:null};
let favorites;
try {const value=JSON.parse(localStorage.getItem('personalhandbok-favorites')||'[]'); favorites=new Set(Array.isArray(value)?value:[]);} catch {favorites=new Set();}
const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv');
const el = (tag, cls, text) => {const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2500);}
function saveFavorite(id){if(favorites.has(id))favorites.delete(id);else favorites.add(id);try{localStorage.setItem('personalhandbok-favorites',JSON.stringify([...favorites]));}catch{toast('Favoriten sparas bara under den här sessionen.');}render();if(state.current)updateReaderFavorite();}
function categoryButtons(){const counts=new Map();state.docs.forEach(d=>counts.set(d.category,(counts.get(d.category)||0)+1));const categories=['Alla',...Array.from(counts.keys()).sort((a,b)=>a.localeCompare(b,'sv'))];$('#categories').replaceChildren(...categories.map(c=>{const b=el('button','chip'+(state.category===c?' active':''),c);b.setAttribute('aria-pressed',String(state.category===c));b.append(el('span','',c==='Alla'?String(state.docs.length):String(counts.get(c))));b.onclick=()=>{state.category=c;render();};return b;}));}
function matches(d){const type=d.format.toLowerCase();return (state.view!=='favorites'||favorites.has(d.id))&&(state.category==='Alla'||d.category===state.category)&&(state.format==='all'||(state.format==='word'&&['doc','docx'].includes(type))||(state.format==='powerpoint'&&['ppt','pptx'].includes(type))||(state.format==='pdf'&&type==='pdf'))&&normalize(state.query).split(/\s+/).filter(Boolean).every(w=>normalize(d.title+' '+d.category+' '+d.text).includes(w));}
function render(){
  document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===state.view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('#hero').hidden=state.view!=='home';$('#section-title').textContent=state.view==='favorites'?'Mina favoriter':state.view==='documents'?'Alla dokument':'Utforska handboken';
  $('#section-eyebrow').textContent=state.view==='favorites'?'SPARAT PÅ DEN HÄR ENHETEN':'HITTA DET DU BEHÖVER';
  $('#nav-count').textContent=state.docs.length;$('#fav-count').textContent=state.docs.filter(d=>favorites.has(d.id)).length;$('#total').textContent=state.docs.length+' dokument';categoryButtons();
  const docs=state.docs.filter(matches).sort((a,b)=>state.sort==='recent'?(b.updated||'').localeCompare(a.updated||'')||a.title.localeCompare(b.title,'sv'):a.title.localeCompare(b.title,'sv'));
  $('#results-count').textContent=!state.loaded?'Läser in dokument…':state.error?'Dokumenten kunde inte hämtas':`${docs.length} ${docs.length===1?'dokument':'dokument'}${state.query?' matchar sökningen':''}`;
  $('#documents').replaceChildren(...docs.map(d=>{
    const card=el('article','doc-card');const open=el('button','doc-open');const kind=d.format.startsWith('PPT')?'ppt':d.format==='PDF'?'pdf':'';
    open.append(el('span','file-icon '+kind,kind==='ppt'?'P':kind==='pdf'?'PDF':'W'));
    const copy=el('div','doc-copy');copy.append(el('strong','',d.title));copy.append(el('p','',`${d.category} · ${d.format}${d.updated?' · '+d.updated:''}`));
    if(state.query.trim()){const term=normalize(state.query).split(/\s+/)[0];const at=normalize(d.text).indexOf(term);if(at>=0){const start=Math.max(0,at-40);copy.append(el('p','snippet',(start?'…':'')+d.text.slice(start,start+160)+(d.text.length>start+160?'…':'')));}}
    open.append(copy);open.onclick=()=>{location.hash='dokument/'+d.id;};
    const fav=el('button','fav'+(favorites.has(d.id)?' saved':''),favorites.has(d.id)?'★':'☆');fav.setAttribute('aria-label',(favorites.has(d.id)?'Ta bort favorit: ':'Spara favorit: ')+d.title);fav.setAttribute('aria-pressed',String(favorites.has(d.id)));fav.onclick=()=>saveFavorite(d.id);card.append(open,fav);return card;
  }));
  $('#empty').hidden=!state.loaded||docs.length>0;$('#reset').hidden=true;
  if(state.error){$('#empty-title').textContent='Vi kunde inte hämta handboken';$('#empty-text').textContent='Kontrollera din anslutning och försök igen.';$('#reset').hidden=false;$('#reset').textContent='Försök igen';}
  else if(!state.docs.length){$('#empty-title').textContent='Här börjar din handbok';$('#empty-text').textContent='Inga dokument är publicerade ännu. Här samlas rutiner och information så snart de har lagts till.';}
  else if(state.view==='favorites'&&!state.query&&!state.docs.some(d=>favorites.has(d.id))){$('#empty-title').textContent='Det viktigaste, ett tryck bort';$('#empty-text').textContent='Tryck på stjärnan vid ett dokument för att spara det här.';}
  else {$('#empty-title').textContent='Inga dokument hittades';$('#empty-text').textContent='Prova ett annat sökord eller välj en annan kategori.';$('#reset').hidden=false;$('#reset').textContent='Visa alla dokument';}
}
function updateReaderFavorite(){const saved=favorites.has(state.current.id);$('#reader-favorite').textContent=saved?'★ Sparad':'☆ Spara';$('#reader-favorite').setAttribute('aria-pressed',String(saved));}
function route(){if(!state.loaded||state.error)return;const match=location.hash.match(/^#dokument\/([a-f0-9]{16})$/);if(!match){if($('#reader').open)$('#reader').close();state.current=null;return;}
 const d=state.docs.find(x=>x.id===match[1]);if(!d){toast('Dokumentet finns inte längre i handboken.');history.replaceState(null,'',location.pathname+location.search);return;}
 state.current=d;$('#reader-title').textContent=d.title;$('#reader-meta').textContent=d.category+' · '+d.format+(d.updated?' · '+d.updated:'');$('#download').href=d.path.split('/').map(encodeURIComponent).join('/');$('#download').setAttribute('download',d.path.split('/').pop());updateReaderFavorite();const content=$('#reader-content');content.replaceChildren();if(d.warning)content.append(el('p','reading-note',d.warning));
 for(const [index,block] of d.blocks.entries()){const matched=state.highlight?.id===d.id&&state.highlight.index===index;if(block.type==='table'){const wrap=el('div','table-wrap');const table=el('table');table.setAttribute('aria-label','Tabell från '+d.title);for(const row of block.rows){const tr=el('tr');for(const cell of row)tr.append(el('td','',cell));table.append(tr);}wrap.append(table);if(matched)wrap.classList.add('reader-match');content.append(wrap);}else{const node=el(block.type==='heading'?'h3':'p');if(matched){node.classList.add('reader-match');highlighted(node,block.text,state.highlight.terms);}else node.textContent=block.text;content.append(node);}}
 if(!$('#reader').open)$('#reader').showModal();const matchNode=content.querySelector('.reader-match');if(matchNode)requestAnimationFrame(()=>matchNode.scrollIntoView({block:'center'}));else $('#reader').scrollTop=0;state.highlight=null;
}
async function load(){state.loaded=false;state.error=false;render();try{const r=await fetch('catalog.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();if(!Array.isArray(data.documents))throw Error('Invalid catalog');state.docs=data.documents;}catch{state.error=true;}state.loaded=true;render();route();if(pendingQuestion)showAnswer(pendingQuestion);}
const stopWords=new Set('jag du vi man får kan ska hur vad när var vem vilka vilket vilken gäller med för från till den det ett en och eller om på av i är som de att min mitt mina har finns göra gör blir hos enligt rutin rutinen det här detta mycket'.split(' ').map(normalize));
const words=s=>normalize(s).match(/[a-z0-9]+/g)||[];
const stem=s=>s.replace(/(arna|erna|ande|heten|ningar|ning|orna|ens|ets|are|ade|ing|en|et|er|ar|or|na|an|s)$/,'');
const related={kostnad:['pris','avgift','belopp','betala','kronor','kr','ersattning'],kost:['pris','avgift','belopp','betala','kronor','kr'],reparer:['reparation','reparera','service','underhall','lagning'],cykel:['cyklar','cykeln','cykelforman','formanscykel']};
function queryTerms(question){return [...new Set(words(question).filter(w=>w.length>2&&!stopWords.has(w)).map(stem).filter(w=>w.length>2))];}
function matchesTerm(word,term){const w=stem(word);if(w.startsWith(term)||term.startsWith(w)&&w.length>4)return true;return Object.entries(related).some(([key,alternatives])=>(term.startsWith(key)||key.startsWith(term))&&alternatives.some(a=>{const root=stem(a);return root.length>3&&(w.startsWith(root)||w.includes(root));}));}
function answerQuestion(question){
  const terms=queryTerms(question);if(!terms.length)return {hits:[],related:[]};
  const candidates=[];
  for(const doc of state.docs){
    if(!doc.blocks?.length)continue;let heading='';
    for(let index=0;index<doc.blocks.length;index++){
      const block=doc.blocks[index];if(block.type==='heading'){heading=block.text;continue;}
      const passages=block.type==='table'?block.rows.map(row=>row.join(' · ')):[block.text];
      for(const passage of passages){
        const clean=passage.replace(/\s+/g,' ').trim();if(clean.length<22||clean.startsWith('Den här bilden saknar läsbar text'))continue;
        const body=words(clean),context=words(doc.title+' '+doc.category+' '+heading);
        const bodyHits=terms.filter(t=>body.some(w=>matchesTerm(w,t)));
        const contextHits=terms.filter(t=>context.some(w=>matchesTerm(w,t)));
        const covered=new Set([...bodyHits,...contextHits]);if(!covered.size)continue;
        const exact=terms.every(t=>covered.has(t));
        const intent=words(question).some(w=>['vem','vilka'].includes(w))&&/anställd|medarbetare|villkor/i.test(clean)?5:0;
        const score=bodyHits.length*5+contextHits.length*2+covered.size/terms.length*5+(exact?5:0)+intent-Math.min(clean.length/1000,2);
        candidates.push({doc,index,passage:clean,score,exact,covered:covered.size,bodyHits:bodyHits.length,titleHits:terms.filter(t=>words(doc.title).some(w=>matchesTerm(w,t))).length});
      }
    }
  }
  const ordered=candidates.sort((a,b)=>b.score-a.score);
  const hits=ordered.filter(x=>x.exact&&x.bodyHits>0).slice(0,3);
  const seen=new Set(hits.map(x=>x.doc.id));
  const suggestions=ordered.filter(x=>{if(seen.has(x.doc.id)||!x.titleHits||x.covered<Math.max(1,terms.length-1))return false;seen.add(x.doc.id);return true;}).slice(0,2);
  return {hits,related:suggestions};
}
function highlighted(target,value,terms){
  const parts=value.split(/([\p{L}\p{N}]+)/u);for(const part of parts){
    if(part&&terms.some(t=>matchesTerm(normalize(part),t)))target.append(el('mark','',part));else target.append(document.createTextNode(part));
  }
}
let pendingQuestion='';
function showAnswer(question){
  pendingQuestion=question;const box=$('#answer');box.replaceChildren();
  if(!question.trim()){box.hidden=true;return;}box.hidden=false;
  if(!state.loaded){box.append(el('p','','Läser in rutiner…'));return;}
  if(state.error){box.append(el('p','','Handboken kunde inte hämtas. Kontrollera anslutningen.'));return;}
  const {hits,related}=answerQuestion(question);const terms=queryTerms(question);
  if(hits.length){box.append(el('h3','',`Träff i ${hits.length===1?'rutinen':'rutinerna'}`));
    for(const hit of hits){const item=el('article','answer-hit');const quote=el('p','answer-quote');highlighted(quote,hit.passage,terms);item.append(quote);const link=el('a','answer-source',`${hit.doc.title} · Visa i rutinen →`);link.href='#dokument/'+hit.doc.id;link.addEventListener('click',()=>{state.highlight={id:hit.doc.id,index:hit.index,terms};if(location.hash==='#dokument/'+hit.doc.id)route();});item.append(link);box.append(item);}
  }else box.append(el('h3','','Inget tydligt svar i rutinerna'),el('p','','Prova andra ord. Om frågan gäller pris eller reparation måste det framgå av dokumentet för att visas som svar.'));
  if(related.length){box.append(el('h4','','Närliggande rutiner'));for(const hit of related){const link=el('a','answer-related',hit.doc.title+' →');link.href='#dokument/'+hit.doc.id;link.addEventListener('click',()=>{state.highlight={id:hit.doc.id,index:hit.index,terms};if(location.hash==='#dokument/'+hit.doc.id)route();});box.append(link);}}
  box.append(el('p','answer-caution','Textutdrag ur rutinen. Öppna dokumentet och läs sammanhanget innan du använder informationen.'));
}
const questionInput=$('#question');let questionTimer;
questionInput.addEventListener('input',()=>{clearTimeout(questionTimer);const value=questionInput.value;questionTimer=setTimeout(()=>showAnswer(value),120);});
$('#ask-form').addEventListener('submit',e=>{e.preventDefault();clearTimeout(questionTimer);showAnswer(questionInput.value.trim());});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;state.query='';state.category='Alla';state.format='all';$('#search').value='';$('#format').value='all';render();window.scrollTo({top:0,behavior:'instant'});});
$('#search').addEventListener('input',e=>{state.query=e.target.value;render();});$('#format').onchange=e=>{state.format=e.target.value;render();};$('#sort').onchange=e=>{state.sort=e.target.value;render();};
$('#reset').onclick=()=>{if(state.error){load();return;}state.query='';state.category='Alla';state.format='all';state.view='documents';$('#search').value='';$('#format').value='all';render();};
$('#close-reader').onclick=()=>$('#reader').close();$('#reader').addEventListener('close',()=>{state.current=null;if(location.hash.startsWith('#dokument/'))history.replaceState(null,'',location.pathname+location.search);});$('#reader-favorite').onclick=()=>state.current&&saveFavorite(state.current.id);
$('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('#share').textContent='Länk kopierad';setTimeout(()=>$('#share').textContent='Kopiera länk',2000);}catch{$('#share').textContent='Kopiera adressen i adressfältet';}};
document.querySelectorAll('.install-help').forEach(b=>b.onclick=()=>$('#help').showModal());$('#close-help').onclick=()=>$('#help').close();
window.addEventListener('hashchange',route);document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('#search').focus();}});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
load();
