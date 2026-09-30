const BUILD_VERSION='v3.2.0';
const THEME_KEY='haderach_theme_v1';
function applyTheme(name){ document.documentElement.dataset.theme=name==='paper'?'':name; localStorage.setItem(THEME_KEY,name); const picker=document.querySelector('#themePicker'); if(picker) picker.value=name; refreshPals(); if(appReady && app && !session && active===null) renderLibrary(); }
const app=document.querySelector('#app'), dlg=document.querySelector('#importDialog');
const THEME_PALS={
 memphis:['Mimo','./assets/avatars/memphis.png'], cyber:['Byte','./assets/avatars/cyber.png'], win95:['Chip','./assets/avatars/win95.png'], acid:['Bloop','./assets/avatars/acid.png'], paper:['Margo','./assets/avatars/paper.png'],
 y2k:['Aqua','./assets/avatars/y2k.png'], riso:['Riz','./assets/avatars/riso.png'], gameboy:['Pip','./assets/avatars/gameboy.png'], sunset:['Sol','./assets/avatars/sunset.png'], botanical:['Fern','./assets/avatars/botanical.png'], spaceage:['Orbit','./assets/avatars/spaceage.png']
};
function themeName(){return localStorage.getItem(THEME_KEY)||'memphis'}

function palHTML(stage='home',hint=''){let [name,img]=THEME_PALS[themeName()]||THEME_PALS.memphis;let extra=hint?`<span class="pal-hint">${esc(hint)}</span>`:'';return `<div class="pal pal-${stage}" data-pal-stage="${stage}" data-hint="${esc(hint)}"><div class="pal-avatar"><img src="${img}" alt=""></div><div class="pal-copy"><strong>${name}</strong>${extra}</div></div>`}
function refreshPals(){document.querySelectorAll('.pal').forEach(el=>{let stage=el.dataset.palStage||'home',hint=el.dataset.hint||'';el.outerHTML=palHTML(stage,hint)})}


const K='haderach.v1'; const EXTERNAL_SET_FILES=['./question-sets/naturalisation-francaise-2026.json?v=3.2.0']; const externalSetIds=new Set(); let db=load(), active=null, session=null, appReady=false;
const VIEW_KEY='haderach.view.v1';
let currentPage='library';
function load(){try{return JSON.parse(localStorage.getItem(K))||{sets:{},progress:{}}}catch{return {sets:{},progress:{}}}}
function save(){const clean={...db,sets:{...db.sets}}; for(const id of externalSetIds) delete clean.sets[id]; localStorage.setItem(K,JSON.stringify(clean))}
async function sha256(value){const bytes=new TextEncoder().encode(JSON.stringify(value));const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function fingerprintQuestion(q){return sha256({question:q.question,options:q.options,correct:q.correct})}
async function reconcileQuestionFingerprints(){let changed=false;for(const set of Object.values(db.sets)){for(const q of set.questions){const k=pkey(set.id,q.id),p=prog(set.id,q.id),hash=await fingerprintQuestion(q);if(p.contentHash&&p.contentHash!==hash){p.sure=false;p.contentChangedAt=Date.now();changed=true}if(p.contentHash!==hash){p.contentHash=hash;db.progress[k]=p;changed=true}}}if(changed)save()}
async function init(){for(const path of EXTERNAL_SET_FILES){try{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error(`${r.status} ${r.statusText}`);const set=await r.json();if(!set?.id||!Array.isArray(set.questions))throw Error('Invalid question-set file');externalSetIds.add(set.id);db.sets[set.id]=set}catch(err){console.error('Could not load auxiliary question set',path,err)}}await reconcileQuestionFingerprints();appReady=true;restoreView();if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{})}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function pkey(set,q){return set+'::'+q} function prog(set,q){let p=db.progress[pkey(set,q)]||{};return {attempts:p.attempts||0,correct:p.correct||0,wrong:p.wrong||0,star:!!p.star,sure:!!p.sure,last:p.last||null,mistakes:Array.isArray(p.mistakes)?p.mistakes:[],contentHash:p.contentHash||null,contentChangedAt:p.contentChangedAt||null}}
function renderLibrary(){active=session=null;rememberView('library'); let sets=Object.values(db.sets); app.innerHTML=`${palHTML('home')}<div class="spread"><div><h1>Library</h1><div class="metric">${sets.length} question set${sets.length!==1?'s':''} · Haderach ${BUILD_VERSION}</div></div><button class="secondary" id="importBtn">Add question set</button></div><div class="grid">${sets.map(s=>{let ps=s.questions.map(q=>prog(s.id,q.id)), stars=ps.filter(x=>x.star).length, sure=ps.filter(x=>x.sure).length, wrong=ps.filter(x=>x.wrong).length, seen=ps.filter(x=>x.attempts).length;return `<div class="card set" data-id="${esc(s.id)}"><div class="spread set-heading"><h3>${esc(s.name)}</h3>${externalSetIds.has(s.id)?'':`<button type="button" class="ghost delete-set" data-delete-id="${esc(s.id)}" aria-label="Delete ${esc(s.name)}" title="Delete question set">×</button>`}</div><div class="metric">${s.questions.length} questions · ${new Set(s.questions.map(q=>q.topic||'General')).size} topics</div><div class="metric">${seen} seen · ${wrong} previously incorrect · ${sure} sure · ${stars} starred</div></div>`}).join('')}</div>`; document.querySelectorAll('.set').forEach(x=>x.onclick=()=>openSet(x.dataset.id));document.querySelectorAll('.delete-set').forEach(button=>button.onclick=e=>{e.stopPropagation();deleteQuestionSet(button.dataset.deleteId)});document.querySelector('#importBtn').onclick=()=>dlg.showModal()}
function openSet(id){session=null;active=db.sets[id];rememberView('study'); let topics=[...new Set(active.questions.map(q=>q.topic||'General'))]; let ps=active.questions.map(q=>prog(id,q.id)); let seen=ps.filter(p=>p.attempts).length, stars=ps.filter(p=>p.star).length, wrong=ps.filter(p=>p.wrong).length, sure=ps.filter(p=>p.sure).length; app.innerHTML=`<div class="card"><h1>${esc(active.name)}</h1><p class="metric">${esc(active.description||'')}</p><div class="row"><b>${active.questions.length}</b> questions · <b>${wrong}</b> previously incorrect · <b>${sure}</b> sure · <b>${stars}</b> starred</div></div><div class="card"><h2>Study</h2><label>Mode <select id="mode"><option value="everything">All</option><option value="all">All except sure</option><option value="unseen">Unseen</option><option value="wrong">Previously incorrect</option><option value="sure">Sure</option><option value="starred">Starred</option></select></label><p>Topics</p><div class="topics"><label class="topic"><input id="allTopics" type="checkbox" checked> <b>All topics</b></label>${topics.map((t,i)=>`<label class="topic"><input class="topicCheck" type="checkbox" value="${esc(t)}" checked> ${esc(t)}</label>`).join('')}</div><div class="row" style="margin-top:14px"><label>Questions <input id="count" type="number" min="1" max="${active.questions.length}" value="20" style="width:85px"></label><button id="start">Start quiz</button></div></div><div class="card"><div class="spread"><b>Progress</b><span>${seen}/${active.questions.length} seen · ${sure} sure</span></div><div class="progress"><div style="width:${100*sure/active.questions.length}%"></div></div></div>`; let all=document.querySelector('#allTopics'), checks=[...document.querySelectorAll('.topicCheck')]; const saved=db.studyOptions?.[id]; if(saved){const mode=document.querySelector('#mode');if([...mode.options].some(o=>o.value===saved.mode))mode.value=saved.mode;if(Number.isInteger(saved.count)&&saved.count>0)document.querySelector('#count').value=saved.count;if(Array.isArray(saved.topics)){checks.forEach(c=>c.checked=saved.topics.includes(c.value));all.checked=checks.every(c=>c.checked)}} all.onchange=()=>checks.forEach(c=>c.checked=all.checked); checks.forEach(c=>c.onchange=()=>all.checked=checks.every(x=>x.checked)); document.querySelector('#start').onclick=startQuiz;app.onchange=rememberStudyOptions;app.oninput=rememberStudyOptions}
function startQuiz(){let mode=document.querySelector('#mode').value, topics=[...document.querySelectorAll('.topicCheck:checked')].map(x=>x.value), n=Math.max(1,+document.querySelector('#count').value||20); db.studyOptions=db.studyOptions||{};db.studyOptions[active.id]={mode,topics,count:n};save(); let pool=active.questions.filter(q=>topics.includes(q.topic||'General')).filter(q=>{let p=prog(active.id,q.id); return mode==='everything'||mode==='unseen'&&p.attempts===0||mode==='all'&&!p.sure||mode==='starred'&&p.star||mode==='wrong'&&p.wrong>0&&!p.sure||mode==='sure'&&p.sure}); shuffle(pool); pool=pool.slice(0,n); if(!pool.length){session=null;rememberView('empty');let label=mode==='starred'?'starred':mode==='wrong'?'previously incorrect':mode==='sure'?'sure':'matching';app.innerHTML=`${palHTML('home')}<div class="card empty"><h2>${mode==='unseen'?'No unseen questions in the selected topics':`No ${label} questions yet`}</h2><p class="metric">Nothing to review in this group. Your progress is safe.</p><button id="emptyBack" class="secondary">Back to study options</button></div>`;document.querySelector('#emptyBack').onclick=()=>openSet(active.id);return} session={qs:pool,i:0,score:0,answered:false,missed:[],completed:new Set()}; renderQuestion()}
function shuffle(a){for(let i=a.length-1;i;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function renderQuestion(){let q=session.qs[session.i], p=prog(active.id,q.id); session.answered=false;session.lastAnswer=null;rememberView('question'); app.innerHTML=`<div class="spread question-top"><span class="metric">${session.i+1} / ${session.qs.length} · ${esc(q.topic||'General')}</span><button id="star" class="star ${p.star?'on':''}" title="Flag / unflag">${p.star?'★ Flagged':'☆ Flag'}</button></div><div class="card"><div class="question">${esc(q.question)}</div><div id="opts">${q.options.map((o,i)=>`<button class="option" data-i="${i}"><b>${'ABCD'[i]}.</b> ${esc(o)}</button>`).join('')}</div><div class="study-controls"><button class="secondary reveal utility-btn" id="reveal">I don’t know</button><button class="secondary utility-btn" id="skip">Skip</button></div><div id="feedback"></div></div><div class="spread"><button class="secondary utility-btn" id="quit">Quit</button><span class="metric">Score ${session.score}/${session.completed.size} answered</span></div>`; document.querySelector('#star').onclick=toggleStar; document.querySelectorAll('.option').forEach(b=>b.onclick=()=>answer(+b.dataset.i,false)); document.querySelector('#reveal').onclick=()=>answer(null,true); document.querySelector('#skip').onclick=()=>{if(!session.answered)next()}; document.querySelector('#quit').onclick=()=>openSet(active.id)}
function syncStarButtons(isStarred){document.querySelectorAll('#star,#feedbackStar').forEach(b=>{b.textContent=isStarred?'★ Flagged':'☆ Flag';b.classList.toggle('on',isStarred)})}
function toggleStar(){let q=session.qs[session.i], k=pkey(active.id,q.id), p=prog(active.id,q.id); p.star=!p.star; db.progress[k]=p;save(); syncStarButtons(p.star)}
function answer(i,revealed=false){if(session.answered)return;session.answered=true;session.completed.add(session.i);let q=session.qs[session.i],k=pkey(active.id,q.id),p=prog(active.id,q.id),ok=!revealed&&i===q.correct;p.attempts++;p.last=Date.now();if(ok){p.correct++;session.score++}else{session.missed.push(q);p.wrong++;p.sure=false;p.mistakes.push({at:p.last,chosen:revealed?null:i,revealed:!!revealed});if(p.mistakes.length>50)p.mistakes=p.mistakes.slice(-50)}db.progress[k]=p;save();session.lastAnswer={i,revealed};rememberView('question');showAnswerFeedback(i,revealed)}
function showAnswerFeedback(i,revealed){let q=session.qs[session.i],k=pkey(active.id,q.id),p=prog(active.id,q.id),ok=!revealed&&i===q.correct;document.querySelectorAll('.option').forEach((b,j)=>{b.disabled=true;if(j===q.correct){b.classList.add('correct','result-correct')}else if(!revealed&&j===i){b.classList.add('wrong','result-wrong')}else{b.classList.add('result-dim')}if(!revealed&&j===i)b.classList.add('result-selected')});let skip=document.querySelector('#skip');if(skip)skip.remove();let rb=document.querySelector('#reveal');if(rb)rb.remove();let answerText=q.options[q.correct];document.querySelector('#feedback').innerHTML=`<div class="feedback"><b class="${ok?'good':'bad'}">${revealed?'I don’t know — counted as a miss':ok?'Correct':'Not quite'}</b><p><strong>${'ABCD'[q.correct]}. ${esc(answerText)}</strong></p>${palHTML('answer',q.explanation||answerText)}${q.source?`<div class="tiny">${esc(q.source)}</div>`:''}<div class="spread feedback-actions"><button id="feedbackStar" class="star inline-star ${p.star?'on':''}">${p.star?'★ Flagged':'☆ Flag'}</button><div class="next-group">${ok?`<button id="sure" class="sure ${p.sure?'on':''}"><span class="sure-label">${p.sure?"✓ I'm sure":"I'm sure"}</span></button>`:''}<button id="next">${session.i+1===session.qs.length?'Finish':'Next →'}</button></div></div></div>`;document.querySelector('#next').onclick=next;document.querySelector('#feedbackStar').onclick=toggleStar;let sb=document.querySelector('#sure');if(sb)sb.onclick=()=>{let p2=prog(active.id,q.id);p2.sure=!p2.sure;db.progress[k]=p2;save();let sl=sb.querySelector('.sure-label');if(sl)sl.textContent=p2.sure?"✓ I'm sure":"I'm sure";else sb.textContent=p2.sure?"✓ I'm sure":"I'm sure";sb.classList.toggle('on',p2.sure)}}
function next(){session.i++;while(session.i<session.qs.length&&session.completed.has(session.i))session.i++;if(session.i>=session.qs.length)return finish();renderQuestion()}
function warnUnanswered(){rememberView('unanswered');const remaining=session.qs.length-session.completed.size;app.innerHTML=`<div class="card empty"><h2>You still have ${remaining} unanswered question${remaining===1?'':'s'}.</h2><p>Answer them now, or finish with them marked as unanswered.</p><div class="finish-actions"><button id="answerRemaining">Answer remaining</button><button class="secondary" id="finishAnyway">Finish anyway</button></div></div>`;document.querySelector('#answerRemaining').onclick=()=>{session.i=session.qs.findIndex((q,i)=>!session.completed.has(i));renderQuestion()};document.querySelector('#finishAnyway').onclick=()=>finish(true)}
function startSubset(qs){if(!qs.length){alert('No questions in that group.');return}session={qs:shuffle([...qs]),i:0,score:0,answered:false,missed:[],completed:new Set()};renderQuestion()}
function finish(allowUnanswered=false){if(!allowUnanswered&&session.completed.size<session.qs.length)return warnUnanswered();rememberView('results');let total=session.qs.length, score=session.score, flagged=session.qs.filter(q=>prog(active.id,q.id).star), missed=session.missed; app.innerHTML=`<div class="card empty"><h1>${score}/${total}</h1><p>${Math.round(100*score/total)}% correct</p><p class="metric">${score} correct · ${missed.length} incorrect · ${total-session.completed.size} unanswered</p><p class="metric">${flagged.length} flagged in this quiz</p><div class="finish-actions"><button id="flagged" ${flagged.length?'':'disabled'}>★ Review flagged (${flagged.length})</button><button class="secondary" id="reviewWrong" ${missed.length?'':'disabled'}>Review wrong answers (${missed.length})</button><button class="secondary" id="finishStudy">Finish</button></div></div>`;document.querySelector('#flagged').onclick=()=>startSubset(flagged);document.querySelector('#reviewWrong').onclick=()=>startSubset(missed);document.querySelector('#finishStudy').onclick=()=>openSet(active.id)}
function csvParse(text){let rows=[],row=[],cell='',q=false;for(let i=0;i<text.length;i++){let c=text[i],n=text[i+1];if(c==='"'){if(q&&n==='"'){cell+='"';i++}else q=!q}else if(c===','&&!q){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}else cell+=c}row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows}
function norm(s){return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')}
function rowsToSet(rows,name){if(rows.length<2)throw Error('No data rows found.');let h=rows[0].map(norm), find=(...names)=>{for(let n of names){let i=h.indexOf(norm(n));if(i>=0)return i}return -1};let qi=find('question','prompt'), ai=find('a','optiona','answera'),bi=find('b','optionb','answerb'),ci=find('c','optionc','answerc'),di=find('d','optiond','answerd'),ri=find('correct','correctanswer','bonne réponse','bonnereponse','answer'),ti=find('topic','category','catégorie','categorie'),ei=find('explanation','explication','réponse','reponse'),si=find('source'),hi=find('hint','indice');if([qi,ai,bi,ci,di,ri].some(i=>i<0))throw Error('Required columns: Question, A, B, C, D, Correct.');let qs=[];for(let r=1;r<rows.length;r++){let x=rows[r];if(!x[qi])continue;let raw=String(x[ri]||'').trim(),idx='ABCD'.indexOf(raw.toUpperCase());if(idx<0){idx=[x[ai],x[bi],x[ci],x[di]].findIndex(v=>String(v).trim()===raw)}if(idx<0)throw Error(`Row ${r+1}: Correct must be A, B, C, D, or exactly match an option.`);qs.push({id:`q-${Date.now()}-${r}`,question:x[qi],options:[x[ai],x[bi],x[ci],x[di]],correct:idx,topic:ti>=0&&x[ti]?x[ti]:'General',explanation:ei>=0?x[ei]||'':'',source:si>=0?x[si]||'':'',hint:hi>=0?x[hi]||'':''})}return {id:'set-'+Date.now(),name:name.replace(/\.(csv|xlsx)$/i,''),description:'Imported question set',questions:qs}}
async function unzipXlsx(buf){let u=new Uint8Array(buf),dv=new DataView(buf),files={};let e=-1;for(let i=u.length-22;i>=Math.max(0,u.length-65557);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break}if(e<0)throw Error('Invalid XLSX file.');let count=dv.getUint16(e+10,true),pos=dv.getUint32(e+16,true),dec=new TextDecoder();for(let z=0;z<count;z++){if(dv.getUint32(pos,true)!==0x02014b50)break;let method=dv.getUint16(pos+10,true),cs=dv.getUint32(pos+20,true),nl=dv.getUint16(pos+28,true),el=dv.getUint16(pos+30,true),cl=dv.getUint16(pos+32,true),off=dv.getUint32(pos+42,true),name=dec.decode(u.slice(pos+46,pos+46+nl));let lnl=dv.getUint16(off+26,true),lel=dv.getUint16(off+28,true),data=u.slice(off+30+lnl+lel,off+30+lnl+lel+cs);if(method===0)files[name]=data;else if(method===8){let ds=new DecompressionStream('deflate-raw'),ab=await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer();files[name]=new Uint8Array(ab)}pos+=46+nl+el+cl}return files}
async function xlsxRows(buf){let f=await unzipXlsx(buf),dec=new TextDecoder(),xml=n=>f[n]?new DOMParser().parseFromString(dec.decode(f[n]),'application/xml'):null, shared=[];let ss=xml('xl/sharedStrings.xml');if(ss)shared=[...ss.getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent).join(''));let wb=xml('xl/workbook.xml'),rels=xml('xl/_rels/workbook.xml.rels');if(!wb||!rels)throw Error('Could not read workbook.');let sh=wb.getElementsByTagName('sheet')[0],rid=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'),rel=[...rels.getElementsByTagName('Relationship')].find(x=>x.getAttribute('Id')===rid),target=rel.getAttribute('Target').replace(/^\//,'');let path=target.startsWith('xl/')?target:'xl/'+target.replace(/^\.\//,'');let sx=xml(path),out=[];for(let row of sx.getElementsByTagName('row')){let arr=[];for(let c of row.getElementsByTagName('c')){let ref=c.getAttribute('r'),col=ref.match(/[A-Z]+/)[0],idx=[...col].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0)-1,t=c.getAttribute('t'),v=c.getElementsByTagName('v')[0]?.textContent??'',inline=c.getElementsByTagName('is')[0];let val=t==='s'?shared[+v]:(t==='inlineStr'&&inline?[...inline.getElementsByTagName('t')].map(x=>x.textContent).join(''):v);arr[idx]=val}out.push(arr)}return out}
function jsonToSet(text,filename){
  let data;try{data=JSON.parse(text.replace(/^\uFEFF/,''))}catch{throw Error('Invalid JSON. Please choose a valid question-set file.')}
  if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.questions)||!data.questions.length)throw Error('JSON must contain a non-empty questions array.');
  const ids=new Set();
  const questions=data.questions.map((q,index)=>{
    const fail=message=>{throw Error(`Question ${index+1}: ${message}`)};
    if(!q||typeof q.question!=='string'||!q.question.trim())fail('question must be non-empty text.');
    if(!Array.isArray(q.options)||q.options.length!==4||q.options.some(o=>typeof o!=='string'||!o.trim()))fail('options must contain four non-empty strings.');
    if(!Number.isInteger(q.correct)||q.correct<0||q.correct>3)fail('correct must be an index from 0 to 3 (A to D).');
    const id=q.id===undefined?`imported-question-${index+1}`:q.id;
    if(typeof id!=='string'||!id.trim()||ids.has(id))fail('id must be unique, non-empty text.');
    ids.add(id);
    const result={id,question:q.question,options:q.options,correct:q.correct};
    for(const key of ['topic','explanation','source','hint']){
      if(q[key]!==undefined&&typeof q[key]!=='string')fail(`${key} must be text.`);
      result[key]=q[key]||(key==='topic'?'General':'');
    }
    return result;
  });
  let id=typeof data.id==='string'&&data.id.trim()?data.id:`set-${Date.now()}`;
  while(Object.prototype.hasOwnProperty.call(db.sets,id)||externalSetIds.has(id)||['__proto__','constructor','prototype'].includes(id))id=`set-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  return {id,name:typeof data.name==='string'&&data.name.trim()?data.name:filename.replace(/\.json$/i,''),description:typeof data.description==='string'?data.description:'Imported question set',questions};
}
async function importFile(file){
  if(!file)throw Error('Please choose a CSV, XLSX, or JSON file.');
  let set;const name=file.name.toLowerCase();
  if(name.endsWith('.json'))set=jsonToSet(await file.text(),file.name);
  else if(name.endsWith('.csv'))set=rowsToSet(csvParse(await file.text()),file.name);
  else if(name.endsWith('.xlsx'))set=rowsToSet(await xlsxRows(await file.arrayBuffer()),file.name);
  else throw Error('Please choose a CSV, XLSX, or JSON file.');
  return set;
}
document.querySelector('#brandHome').onclick=e=>{e.preventDefault();renderLibrary()};
document.querySelector('#homeBtn').onclick=renderLibrary;
let pendingSet=null,importRequest=0;
const quizName=document.querySelector('#quizName'),addSetBtn=document.querySelector('#addSetBtn'),importStatus=document.querySelector('#importStatus');
function resetImport(){importRequest++;pendingSet=null;document.querySelector('#fileInput').value='';quizName.value='';quizName.setCustomValidity('');quizName.disabled=true;addSetBtn.disabled=true;importStatus.textContent=''}
dlg.addEventListener('close',resetImport);
document.querySelector('#closeImport').onclick=()=>dlg.close();
document.querySelector('#fileInput').onchange=async e=>{
  const request=++importRequest;pendingSet=null;quizName.value='';quizName.disabled=true;addSetBtn.disabled=true;
  const file=e.target.files[0];if(!file){importStatus.textContent='';return}
  importStatus.textContent='Reading questions…';
  try{const set=await importFile(file);if(request!==importRequest)return;pendingSet=set;quizName.value=set.name;quizName.disabled=false;addSetBtn.disabled=false;importStatus.textContent=`${set.questions.length} questions ready to add. You can edit the name above.`}
  catch(err){if(request===importRequest)importStatus.textContent=err.message}
};
document.querySelector('#addSetForm').onsubmit=e=>{
  e.preventDefault();if(!pendingSet)return;
  const name=quizName.value.trim();if(!name){quizName.setCustomValidity('Please enter a name.');quizName.reportValidity();return}
  const set={...pendingSet,name};
  while(Object.prototype.hasOwnProperty.call(db.sets,set.id)||externalSetIds.has(set.id))set.id=`set-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  db.sets[set.id]=set;
  try{save()}catch(err){delete db.sets[set.id];importStatus.textContent='Could not save this set. Browser storage may be full.';return}
  pendingSet=null;dlg.close();renderLibrary();
};
quizName.oninput=()=>quizName.setCustomValidity('');

init();

const themePicker=document.querySelector('#themePicker'); themePicker.onchange=e=>applyTheme(e.target.value); applyTheme(localStorage.getItem(THEME_KEY)||'memphis');

function rememberStudyOptions(){
  const mode=document.querySelector('#mode'),count=document.querySelector('#count');
  if(!active||!mode||!count)return;
  db.studyOptions=db.studyOptions||{};
  db.studyOptions[active.id]={mode:mode.value,count:Math.max(1,+count.value||20),topics:[...document.querySelectorAll('.topicCheck:checked')].map(c=>c.value)};
  save();
}
function rememberView(page){
  currentPage=page;
  if(!appReady)return;
  const snapshot={page,setId:active?.id,session:session?{...session,completed:[...session.completed]}:null};
  try{sessionStorage.setItem(VIEW_KEY,JSON.stringify(snapshot))}catch(err){console.warn('Could not remember current page',err)}
}
function restoreView(){
  let saved;
  try{saved=JSON.parse(sessionStorage.getItem(VIEW_KEY))}catch{}
  if(!saved||saved.page==='library'||!db.sets[saved.setId])return renderLibrary();
  active=db.sets[saved.setId];
  if(saved.page==='study')return openSet(active.id);
  if(saved.page==='empty'){openSet(active.id);return startQuiz()}
  const restored=saved.session;
  if(!restored||!Array.isArray(restored.qs)||!restored.qs.length||!Array.isArray(restored.completed)||!Array.isArray(restored.missed)||!Number.isInteger(restored.i)||restored.i<0||restored.i>restored.qs.length)return openSet(active.id);
  // A bank update can invalidate a saved quiz. Keep progress, but return to choices.
  if(restored.qs.some(q=>!active.questions.some(current=>current.id===q.id&&JSON.stringify(current)===JSON.stringify(q))))return openSet(active.id);
  session={...restored,completed:new Set(restored.completed)};
  if(saved.page==='results')return finish(true);
  if(saved.page==='unanswered')return warnUnanswered();
  if(saved.page!=='question'||session.i>=session.qs.length)return openSet(active.id);
  const lastAnswer=session.lastAnswer;
  renderQuestion();
  if(lastAnswer&&session.completed.has(session.i)){
    session.answered=true;session.lastAnswer=lastAnswer;
    showAnswerFeedback(lastAnswer.i,lastAnswer.revealed);
    rememberView('question');
  }
}

let pendingDeleteId=null;
const deleteDialog=document.querySelector('#deleteDialog');
function deleteQuestionSet(id){
  const set=db.sets[id];
  if(!set||externalSetIds.has(id))return;
  pendingDeleteId=id;
  document.querySelector('#deleteTitle').textContent=`Delete “${set.name}”?`;
  document.querySelector('#deleteError').textContent='';
  deleteDialog.showModal();
  document.querySelector('#cancelDelete').focus();
}
document.querySelector('#cancelDelete').onclick=()=>deleteDialog.close();
deleteDialog.addEventListener('close',()=>{pendingDeleteId=null});
document.querySelector('#confirmDelete').onclick=()=>{
  const id=pendingDeleteId,set=db.sets[id];
  if(!set||externalSetIds.has(id)){deleteDialog.close();return}
  const previous=db;
  db={...db,sets:{...db.sets},progress:{...db.progress},studyOptions:{...db.studyOptions}};
  delete db.sets[id];delete db.studyOptions[id];
  for(const q of set.questions)delete db.progress[pkey(id,q.id)];
  try{save()}catch(err){db=previous;document.querySelector('#deleteError').textContent='Could not delete this question set. Please try again.';return}
  deleteDialog.close();renderLibrary();
  document.querySelector('#importBtn').focus();
};
