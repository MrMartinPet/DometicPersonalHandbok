'use strict';
const $ = selector => document.querySelector(selector);
const state = {docs:[],view:'home',category:'Alla',query:'',format:'all',sort:'az',loaded:false,error:false,current:null,highlight:null};
const pageNames = {home:'oversikt',documents:'dokument',forms:'blanketter',favorites:'favoriter',search:'sok'};
let returnHash='#oversikt', suppressReaderClose=false;
let favorites;
try {const value=JSON.parse(localStorage.getItem('personalhandbok-favorites')||'[]');favorites=new Set(Array.isArray(value)?value:[]);} catch {favorites=new Set();}
const normalize = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv');
const el = (tag,cls,text) => {const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const isForm = doc => doc.kind==='form'||(!doc.kind&&/^(blanketter\/|dokument\/blanketter\/)/i.test(doc.path));
const fileUrl = doc => doc.path.split('/').map(encodeURIComponent).join('/');
const byName = (a,b) => a.title.localeCompare(b.title,'sv');
const byRecent = (a,b) => (b.updated||'').localeCompare(a.updated||'')||byName(a,b);
function formatDate(value){if(!value)return '';const date=new Date(value+'T12:00:00');return Number.isNaN(date.getTime())?'':date.toLocaleDateString('sv-SE',{day:'numeric',month:'short',year:'numeric'});}
function fileSize(bytes){if(!Number.isFinite(bytes)||bytes<0)return '';if(bytes<1024)return bytes+' B';if(bytes<1024*1024)return Math.ceil(bytes/1024)+' kB';return (bytes/(1024*1024)).toLocaleString('sv-SE',{maximumFractionDigits:1})+' MB';}
function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('icon');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','#i-'+name);svg.append(use);return svg;}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2500);}
function saveFavorite(id){if(favorites.has(id))favorites.delete(id);else favorites.add(id);try{localStorage.setItem('personalhandbok-favorites',JSON.stringify([...favorites]));}catch{toast('Favoriten sparas bara under den här sessionen.');}render();if(state.current)updateReaderFavorite();}
function pageHash(view=state.view,filters=state){const params=new URLSearchParams();if(filters.query)params.set('q',filters.query);if(filters.category&&filters.category!=='Alla')params.set('kategori',filters.category);if(filters.format&&filters.format!=='all')params.set('filtyp',filters.format);if(filters.sort&&filters.sort!=='az')params.set('sort',filters.sort);return '#'+pageNames[view]+(params.size?'?'+params:'');}
function navigate(view,filters={}){const next=pageHash(view,{query:'',category:'Alla',format:'all',sort:'az',...filters});if(location.hash!==next)history.pushState({handbookPage:true},'',next);route();window.scrollTo({top:0,behavior:'instant'});}
function updateFilters(){const next=pageHash();history.replaceState({handbookPage:true},'',next);returnHash=next;render();}
function viewDocuments(){if(state.error)return [];if(state.view==='forms')return state.docs.filter(isForm);if(state.view==='favorites')return state.docs.filter(d=>favorites.has(d.id));if(state.view==='search')return state.docs;return state.docs.filter(d=>!isForm(d));}
function categoryButtons(base){const counts=new Map();base.forEach(doc=>counts.set(doc.category,(counts.get(doc.category)||0)+1));const names=['Alla',...Array.from(counts.keys()).sort((a,b)=>a.localeCompare(b,'sv'))];$('#categories').replaceChildren(...names.map(name=>{const button=el('button','chip'+(state.category===name?' active':''),name);button.type='button';button.setAttribute('aria-pressed',String(state.category===name));button.append(el('span','',name==='Alla'?String(base.length):String(counts.get(name))));button.onclick=()=>{state.category=name;updateFilters();};return button;}));}
function matches(doc){const type=doc.format.toLowerCase();const formats={word:['doc','docx'],powerpoint:['ppt','pptx'],excel:['xls','xlsx'],pdf:['pdf']};return (state.category==='Alla'||doc.category===state.category)&&(state.format==='all'||formats[state.format]?.includes(type))&&normalize(state.query).split(/\s+/).filter(Boolean).every(word=>normalize(doc.title+' '+doc.category+' '+(doc.text||'')).includes(word));}
function documentCard(doc,compact=false){
 const card=el('article','doc-card'+(compact?' compact':''));
 const open=el('button','doc-open');open.type='button';open.setAttribute('aria-label','Öppna '+doc.title);
 const type=doc.format.toUpperCase();const kind=type.startsWith('PPT')?'ppt':type.startsWith('XLS')?'excel':type==='PDF'?'pdf':'word';
 open.append(el('span','file-icon '+kind,kind==='ppt'?'P':kind==='excel'?'X':kind==='pdf'?'PDF':'W'));
 const copy=el('div','doc-copy');const code=doc.title.match(/^(PERS\s*\d+)\s*[-–—]?\s*/i);const title=code?doc.title.slice(code[0].length)||doc.title:doc.title;
 copy.append(el('strong','',title));
 const meta=[code?.[1],doc.category,doc.format];if(isForm(doc)){const size=fileSize(doc.size);if(size)meta.push(size);}else if(doc.updated)meta.push(formatDate(doc.updated));
 copy.append(el('p','',meta.filter(Boolean).join(' · ')));
 if(isForm(doc)&&['favorites','search'].includes(state.view))copy.append(el('span','type-badge','Blankett'));
 if(!compact&&state.query.trim()){const term=normalize(state.query).trim().split(/\s+/)[0];const text=doc.text||'';const at=normalize(text).indexOf(term);if(at>=0){const start=Math.max(0,at-40);copy.append(el('p','snippet',(start?'…':'')+text.slice(start,start+160)+(text.length>start+160?'…':'')));}}
 open.append(copy);open.onclick=()=>openDocument(doc.id);card.append(open);
 if(isForm(doc)&&!compact){const download=el('a','download-link','Hämta');download.prepend(icon('download'));download.href=fileUrl(doc);download.download=doc.path.split('/').pop();download.setAttribute('aria-label','Hämta blankett: '+doc.title);card.append(download);}
 const fav=el('button','fav'+(favorites.has(doc.id)?' saved':''),favorites.has(doc.id)?'★':'☆');fav.type='button';fav.setAttribute('aria-label',(favorites.has(doc.id)?'Ta bort favorit: ':'Spara favorit: ')+doc.title);fav.setAttribute('aria-pressed',String(favorites.has(doc.id)));fav.onclick=()=>saveFavorite(doc.id);card.append(fav);return card;
}
function renderOverview(){
 const routines=state.docs.filter(doc=>!isForm(doc));const forms=state.docs.filter(isForm);const saved=state.docs.filter(doc=>favorites.has(doc.id));
 for(const [selector,count] of [['#nav-count',routines.length],['#forms-count',forms.length],['#fav-count',saved.length],['#home-doc-count',routines.length],['#home-form-count',forms.length],['#home-fav-count',saved.length]])$(selector).textContent=count;
 $('#home-status').hidden=state.loaded&&!state.error;$('#home-status').textContent=state.error?'Dokumenten kunde inte hämtas. Kontrollera din anslutning.':'Läser in handboken…';$('#home-retry').hidden=!state.error;$('#home-retry').disabled=!state.loaded;
 const counts=new Map();routines.forEach(doc=>counts.set(doc.category,(counts.get(doc.category)||0)+1));
 $('#home-categories').replaceChildren(...Array.from(counts.entries()).sort(([a],[b])=>a.localeCompare(b,'sv')).map(([name,count],index)=>{
  const key=normalize(name);const style=key.includes('arbetsmiljo')?['shield','blue']:key.includes('halsa')||key.includes('forman')?['heart','teal']:key.includes('lon')||key.includes('ersattning')?['wallet','amber']:['folder',['blue','teal','amber','violet'][index%4]];
  const button=el('button','category-card tone-'+style[1]);button.type='button';const pictogram=el('span','category-icon');pictogram.append(icon(style[0]));const copy=el('span','category-copy');copy.append(el('strong','',name),el('span','',count+' dokument'));const arrow=el('span','category-arrow');arrow.append(icon('chevron'));button.append(pictogram,copy,arrow);button.onclick=()=>navigate('documents',{category:name});return button;
 }));
 $('#home-recent').replaceChildren(...routines.slice().sort(byRecent).slice(0,3).map(doc=>documentCard(doc,true)));
 $('#recent-empty').hidden=!state.loaded||routines.length>0||state.error;
}
function render(){
 document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===state.view;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
 $('#overview').hidden=state.view!=='home';$('#library').hidden=state.view==='home';renderOverview();
 if(state.view==='home')return;
 const info={documents:['PERSONALHANDBOKEN','Dokument','Rutiner och information för din arbetsdag.'],forms:['LADDA NER OCH FYLL I','Blanketter','Hitta och hämta blanketten du behöver.'],favorites:['SPARAT PÅ DEN HÄR ENHETEN','Mina favoriter','Dina sparade dokument och blanketter.'],search:['SÖK I HELA PERSONALAPPEN','Sökresultat','Sök bland både dokument och blanketter.']}[state.view];
 $('#section-eyebrow').textContent=info[0];$('#section-title').textContent=info[1];$('#section-description').textContent=info[2];$('#forms-info').hidden=state.view!=='forms';
 $('#search').placeholder=state.view==='forms'?'Sök blankett eller ämne…':state.view==='favorites'?'Sök bland dina favoriter…':'Sök dokument, ämne eller ord…';
 if($('#search').value!==state.query)$('#search').value=state.query;$('#format').value=state.format;$('#sort').value=state.sort;
 const base=viewDocuments();const docs=base.filter(matches).sort(state.sort==='recent'?byRecent:byName);categoryButtons(base);
 const noun=state.view==='forms'?'blanketter':state.view==='search'||state.view==='favorites'?'filer':'dokument';$('#total').textContent=base.length+' '+noun;
 $('#results-count').textContent=!state.loaded?'Läser in…':state.error?'Dokumenten kunde inte hämtas':docs.length+(state.view==='forms'?(docs.length===1?' blankett':' blanketter'):' dokument')+(state.query?' matchar sökningen':'');
 $('#documents').replaceChildren(...docs.map(doc=>documentCard(doc)));const filtered=Boolean(state.query||state.category!=='Alla'||state.format!=='all');$('#clear-filters').hidden=!filtered;
 $('#empty').hidden=!state.loaded||docs.length>0;$('#reset').hidden=true;
 if(state.error){$('#empty-title').textContent='Handboken kunde inte hämtas';$('#empty-text').textContent='Kontrollera din anslutning och försök igen.';$('#reset').hidden=false;$('#reset').textContent='Försök igen';}
 else if(state.view==='forms'&&!base.length){$('#empty-title').textContent='Inga blanketter publicerade ännu';$('#empty-text').textContent='Här samlas blanketter som du kan öppna och hämta. De visas när de har lagts till.';}
 else if(state.view==='favorites'&&!base.length){$('#empty-title').textContent='Det viktigaste, ett tryck bort';$('#empty-text').textContent='Tryck på stjärnan vid ett dokument eller en blankett för att spara det här.';}
 else if(!base.length){$('#empty-title').textContent='Inga dokument publicerade ännu';$('#empty-text').textContent='Här samlas rutiner och information när de har lagts till.';}
 else{$('#empty-title').textContent=state.view==='forms'?'Inga blanketter hittades':'Inga dokument hittades';$('#empty-text').textContent='Prova ett annat sökord eller rensa dina filter.';$('#reset').hidden=false;$('#reset').textContent='Rensa filter';}
}
function openDocument(id,highlight=null){const hash='#dokument/'+id;state.highlight=highlight;const origin=state.current?(history.state?.readerOrigin||returnHash):pageHash();if(location.hash!==hash){const record={handbookReader:true,readerOrigin:origin};if(state.current)history.replaceState(record,'',hash);else history.pushState(record,'',hash);}returnHash=origin;route();}
function updateReaderFavorite(){const saved=favorites.has(state.current.id);$('#reader-favorite').textContent=saved?'★ Sparad':'☆ Spara';$('#reader-favorite').setAttribute('aria-pressed',String(saved));}
function renderReader(doc){
 state.current=doc;$('#reader-title').textContent=doc.title;$('#reader-meta').textContent=[isForm(doc)?'Blankett':null,doc.category,doc.format,formatDate(doc.updated)].filter(Boolean).join(' · ');
 $('#download').href=fileUrl(doc);$('#download').download=doc.path.split('/').pop();$('#download').textContent=isForm(doc)?'Hämta blankett ↗':'Hämta original ↗';$('#share').textContent='Kopiera länk';
 $('#reader-note').textContent=isForm(doc)?'Hämta originalfilen för att fylla i blanketten. Textvyn visar inte alla fält och all formatering.':'Textvy · Bilder, diagram och fullständig formatering visas i originalfilen.';
 updateReaderFavorite();const content=$('#reader-content');content.replaceChildren();if(doc.warning)content.append(el('p','reading-note',doc.warning));
 for(const [index,block] of (doc.blocks||[]).entries()){const matched=state.highlight?.id===doc.id&&state.highlight.index===index;if(block.type==='table'){const wrap=el('div','table-wrap');const table=el('table');table.setAttribute('aria-label','Tabell från '+doc.title);for(const row of block.rows){const tr=el('tr');for(const cell of row)tr.append(el('td','',cell));table.append(tr);}wrap.append(table);if(matched)wrap.classList.add('reader-match');content.append(wrap);}else{const node=el(block.type==='heading'?'h3':'p');if(matched){node.classList.add('reader-match');highlighted(node,block.text,state.highlight.terms);}else node.textContent=block.text;content.append(node);}}
 if(!$('#reader').open)$('#reader').showModal();const matchNode=content.querySelector('.reader-match');if(matchNode)requestAnimationFrame(()=>matchNode.scrollIntoView({block:'center'}));else $('#reader').scrollTop=0;state.highlight=null;
}
function parsePage(hash){const [slug,query='']=hash.replace(/^#/,'').split('?');const view=Object.keys(pageNames).find(key=>pageNames[key]===slug)||'home';const params=new URLSearchParams(query);state.view=view;state.query=params.get('q')||'';state.category=params.get('kategori')||'Alla';const format=params.get('filtyp');state.format=['word','pdf','excel','powerpoint'].includes(format)?format:'all';state.sort=params.get('sort')==='recent'?'recent':'az';}
function route(){
 const match=location.hash.match(/^#dokument\/([a-f0-9]{16})$/);
 if(match){
  if(!state.loaded||state.error){render();return;}
  const doc=state.docs.find(item=>item.id===match[1]);
  if(!doc){toast('Dokumentet finns inte längre i handboken.');history.replaceState({handbookPage:true},'',returnHash);route();return;}
  const origin=history.state?.readerOrigin;
  if(origin){returnHash=origin;parsePage(origin);}else if(!state.current){parsePage(isForm(doc)?'#blanketter':'#dokument');returnHash=pageHash();}
  render();renderReader(doc);return;
 }
 if($('#reader').open){suppressReaderClose=true;$('#reader').close();}state.current=null;
 parsePage(location.hash);returnHash=pageHash();render();
}
async function load(){
 state.loaded=false;state.error=false;state.docs=[];render();
 try{const response=await fetch('catalog.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(!Array.isArray(data.documents)||!data.documents.every(doc=>doc&&['id','title','category','format','path'].every(key=>typeof doc[key]==='string')))throw Error('Invalid catalog');state.docs=data.documents;}
 catch{state.error=true;state.docs=[];}
 state.loaded=true;render();route();if(pendingQuestion)showAnswer(pendingQuestion);
}
const stopWords=new Set('jag du vi man får kan ska hur vad när var vem vilka vilket vilken gäller med för från till den det ett en och eller om på av i är som de att min mitt mina har finns göra gör blir hos enligt rutin rutinen det här detta mycket'.split(' ').map(normalize));
const words=s=>normalize(s).match(/[a-z0-9]+/g)||[];
const stem=s=>s.replace(/(arna|erna|ande|heten|ningar|ning|orna|ens|ets|are|ade|ing|en|et|er|ar|or|na|an|s)$/,'');
const related={kostnad:['pris','avgift','belopp','betala','kronor','kr','ersattning'],kost:['pris','avgift','belopp','betala','kronor','kr'],reparer:['reparation','reparera','service','underhall','lagning'],cykel:['cyklar','cykeln','cykelforman','formanscykel']};
function queryTerms(question){return [...new Set(words(question).filter(w=>w.length>2&&!stopWords.has(w)).map(stem).filter(w=>w.length>2))];}
function matchesTerm(word,term){const w=stem(word);if(w.startsWith(term)||term.startsWith(w)&&w.length>4)return true;return Object.entries(related).some(([key,alternatives])=>(term.startsWith(key)||key.startsWith(term))&&alternatives.some(a=>{const root=stem(a);return root.length>3&&(w.startsWith(root)||w.includes(root));}));}
function answerQuestion(question){
  const terms=queryTerms(question);if(!terms.length)return {hits:[],related:[]};
  const candidates=[];
  for(const doc of state.docs.filter(d=>!isForm(d))){
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
    for(const hit of hits){const item=el('article','answer-hit');const quote=el('p','answer-quote');highlighted(quote,hit.passage,terms);item.append(quote);const link=el('a','answer-source',`${hit.doc.title} · Visa i rutinen →`);link.href='#dokument/'+hit.doc.id;link.addEventListener('click',event=>{event.preventDefault();openDocument(hit.doc.id,{id:hit.doc.id,index:hit.index,terms});});item.append(link);box.append(item);}
  }else box.append(el('h3','','Inget tydligt svar i rutinerna'),el('p','','Prova andra ord. Om frågan gäller pris eller reparation måste det framgå av dokumentet för att visas som svar.'));
  if(related.length){box.append(el('h4','','Närliggande rutiner'));for(const hit of related){const link=el('a','answer-related',hit.doc.title+' →');link.href='#dokument/'+hit.doc.id;link.addEventListener('click',event=>{event.preventDefault();openDocument(hit.doc.id,{id:hit.doc.id,index:hit.index,terms});});box.append(link);}}
  box.append(el('p','answer-caution','Textutdrag ur rutinen. Öppna dokumentet och läs sammanhanget innan du använder informationen.'));
}

const questionInput=$('#question');let questionTimer;
questionInput.addEventListener('input',()=>{clearTimeout(questionTimer);const value=questionInput.value;questionTimer=setTimeout(()=>showAnswer(value),120);});
$('#ask-form').addEventListener('submit',event=>{event.preventDefault();clearTimeout(questionTimer);showAnswer(questionInput.value.trim());});
document.querySelectorAll('[data-question]').forEach(button=>button.onclick=()=>{questionInput.value=button.dataset.question;clearTimeout(questionTimer);showAnswer(questionInput.value);questionInput.focus();});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();navigate(button.dataset.view);}));
$('#home-search-form').addEventListener('submit',event=>{event.preventDefault();navigate('search',{query:$('#home-search').value.trim()});});
$('#search').addEventListener('input',event=>{state.query=event.target.value;updateFilters();});
$('#format').onchange=event=>{state.format=event.target.value;updateFilters();};$('#sort').onchange=event=>{state.sort=event.target.value;updateFilters();};
function clearFilters(){state.query='';state.category='Alla';state.format='all';updateFilters();$('#search').focus();}
$('#clear-filters').onclick=clearFilters;$('#reset').onclick=()=>state.error?load():clearFilters();$('#home-retry').onclick=load;
$('#close-reader').onclick=()=>$('#reader').close();
$('#reader').addEventListener('close',()=>{if(suppressReaderClose){suppressReaderClose=false;return;}state.current=null;if(location.hash.startsWith('#dokument/')){if(history.state?.handbookReader&&history.state.readerOrigin)history.back();else{history.replaceState({handbookPage:true},'',returnHash);route();}}});
$('#reader-favorite').onclick=()=>state.current&&saveFavorite(state.current.id);
$('#share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('#share').textContent='Länk kopierad';setTimeout(()=>$('#share').textContent='Kopiera länk',2000);}catch{$('#share').textContent='Kopiera adressen i adressfältet';}};
let installPrompt=null;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('appinstalled',()=>{installPrompt=null;$('#install-app').hidden=true;$('#install-tile').hidden=true;$('#help').close();toast('Personalhandboken är installerad!');});
function installGuide(){
 const instructions=$('#install-instructions');
 if(ios){instructions.textContent='iPhone/iPad: Öppna sidan i Safari, tryck på Dela (fyrkanten med pil uppåt), välj Lägg till på hemskärmen och tryck Lägg till.';}
 else if(/Android/i.test(navigator.userAgent)){instructions.textContent='Android: Öppna sidan i Chrome, tryck på menyn ⋮ och välj Installera app eller Lägg till på startskärmen.';}
 else{instructions.textContent='Öppna webbläsarens meny och välj Installera app. Om valet saknas kan webbläsaren inte installera sidan här.';}
 $('#help').showModal();
}
async function installApp(){
 if(standalone()){toast('Appen finns redan på hemskärmen.');return;}
 if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();return;}
 installGuide();
}
$('#install-app').onclick=installApp;
$('#install-tile').onclick=installApp;
$('#install-from-help').onclick=()=>{if(installPrompt){$('#help').close();installApp();}else{$('#install-instructions').scrollIntoView({block:'nearest'});}};
if(standalone()){$('#install-app').hidden=true;$('#install-tile').hidden=true;}
document.querySelectorAll('.install-help').forEach(button=>button.onclick=()=>$('#help').showModal());$('#close-help').onclick=()=>$('#help').close();
document.querySelectorAll('a[href="#main"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();$('#main').focus();$('#main').scrollIntoView({block:'start'});}));
window.addEventListener('popstate',route);window.addEventListener('hashchange',route);
document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){event.preventDefault();$(state.view==='home'?'#home-search':'#search').focus();}});
$('#today-date').textContent=new Date().toLocaleDateString('sv-SE',{weekday:'long',day:'numeric',month:'long'});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(()=>{});
parsePage(location.hash);load();
