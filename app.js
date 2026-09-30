// Template helpers
function cloneTemplate(id) {
  return document.getElementById(id).content.cloneNode(true);
}

// Theme selection and companions
const BUILD_VERSION = 'v3.2.2';
const THEME_KEY = 'haderach_theme_v1';

function applyTheme(name) {
  document.documentElement.dataset.theme = name === 'paper' ? '' : name;
  localStorage.setItem(THEME_KEY, name);
  const picker = document.querySelector('#themePicker');
  if (picker) picker.value = name;
  refreshPals();
  if (appReady && app && !session && activeSet === null) renderLibrary();
}
const app = document.querySelector('#app'),
  importDialog = document.querySelector('#importDialog');
const THEME_PALS = {
  memphis: ['Mimo', './assets/avatars/memphis.png'],
  cyber: ['Byte', './assets/avatars/cyber.png'],
  win95: ['Chip', './assets/avatars/win95.png'],
  acid: ['Bloop', './assets/avatars/acid.png'],
  paper: ['Margo', './assets/avatars/paper.png'],
  y2k: ['Aqua', './assets/avatars/y2k.png'],
  riso: ['Riz', './assets/avatars/riso.png'],
  gameboy: ['Pip', './assets/avatars/gameboy.png'],
  sunset: ['Sol', './assets/avatars/sunset.png'],
  botanical: ['Fern', './assets/avatars/botanical.png'],
  spaceage: ['Orbit', './assets/avatars/spaceage.png'],
};

function themeName() {
  return localStorage.getItem(THEME_KEY) || 'memphis';
}

function createPal(stage = 'home', hint = '') {
  const [name, image] = THEME_PALS[themeName()] || THEME_PALS.memphis;
  const pal = cloneTemplate('pal-template').firstElementChild;
  pal.classList.add(`pal-${stage}`);
  pal.dataset.palStage = stage;
  pal.dataset.hint = hint;
  pal.querySelector('img').src = image;
  pal.querySelector('strong').textContent = name;
  if (hint) pal.querySelector('.pal-hint').textContent = hint;
  else pal.querySelector('.pal-hint').remove();
  return pal;
}

function refreshPals() {
  document.querySelectorAll('.pal').forEach((pal) => {
    pal.replaceWith(
      createPal(pal.dataset.palStage || 'home', pal.dataset.hint || '')
    );
  });
}

// Saved question sets and progress
const STORAGE_KEY = 'haderach.v1';
const EXTERNAL_SET_FILES = [
  './question-sets/naturalisation-francaise-2026.json?v=3.2.0',
];
const externalSetIds = new Set();
let database = load(),
  activeSet = null,
  session = null,
  appReady = false;
const VIEW_KEY = 'haderach.view.v1';
let currentPage = 'library';

function load() {
  try {
    return (
      JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        sets: {},
        progress: {},
      }
    );
  } catch {
    return { sets: {}, progress: {} };
  }
}

function save() {
  const clean = { ...database, sets: { ...database.sets } };
  for (const id of externalSetIds) delete clean.sets[id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function fingerprintQuestion(q) {
  return sha256({
    question: q.question,
    options: q.options,
    correct: q.correct,
  });
}

async function reconcileQuestionFingerprints() {
  let changed = false;
  for (const set of Object.values(database.sets)) {
    for (const q of set.questions) {
      const k = progressKey(set.id, q.id),
        p = getProgress(set.id, q.id),
        hash = await fingerprintQuestion(q);
      if (p.contentHash && p.contentHash !== hash) {
        p.sure = false;
        p.contentChangedAt = Date.now();
        changed = true;
      }
      if (p.contentHash !== hash) {
        p.contentHash = hash;
        database.progress[k] = p;
        changed = true;
      }
    }
  }
  if (changed) save();
}

async function init() {
  for (const path of EXTERNAL_SET_FILES) {
    try {
      const r = await fetch(path, { cache: 'no-store' });
      if (!r.ok) throw Error(`${r.status} ${r.statusText}`);
      const set = await r.json();
      if (!set?.id || !Array.isArray(set.questions))
        throw Error('Invalid question-set file');
      externalSetIds.add(set.id);
      database.sets[set.id] = set;
    } catch (err) {
      console.error('Could not load auxiliary question set', path, err);
    }
  }
  await reconcileQuestionFingerprints();
  appReady = true;
  restoreView();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http'))
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}

function progressKey(set, q) {
  return set + '::' + q;
}

function getProgress(set, q) {
  let p = database.progress[progressKey(set, q)] || {};
  return {
    attempts: p.attempts || 0,
    correct: p.correct || 0,
    wrong: p.wrong || 0,
    star: !!p.star,
    sure: !!p.sure,
    last: p.last || null,
    mistakes: Array.isArray(p.mistakes) ? p.mistakes : [],
    contentHash: p.contentHash || null,
    contentChangedAt: p.contentChangedAt || null,
  };
}

// Library and study options
function renderLibrary() {
  activeSet = session = null;
  rememberView('library');
  const sets = Object.values(database.sets);
  app.replaceChildren(createPal(), cloneTemplate('library-template'));
  app.querySelector('[data-library-summary]').textContent = `${
    sets.length
  } question set${sets.length !== 1 ? 's' : ''} · Haderach ${BUILD_VERSION}`;
  const grid = app.querySelector('.grid');
  for (const set of sets) {
    const progress = set.questions.map((question) =>
      getProgress(set.id, question.id)
    );
    const stars = progress.filter((item) => item.star).length;
    const sure = progress.filter((item) => item.sure).length;
    const wrong = progress.filter((item) => item.wrong).length;
    const seen = progress.filter((item) => item.attempts).length;
    const topics = new Set(
      set.questions.map((question) => question.topic || 'General')
    );
    const card = cloneTemplate('set-card-template').firstElementChild;
    card.dataset.id = set.id;
    card.querySelector('h3').textContent = set.name;
    card.querySelector(
      '[data-set-summary]'
    ).textContent = `${set.questions.length} questions · ${topics.size} topics`;
    card.querySelector(
      '[data-set-progress]'
    ).textContent = `${seen} seen · ${wrong} previously incorrect · ${sure} sure · ${stars} starred`;
    card.onclick = () => openSet(set.id);
    const deleteButton = card.querySelector('.delete-set');
    if (externalSetIds.has(set.id)) deleteButton.remove();
    else {
      deleteButton.setAttribute('aria-label', `Delete ${set.name}`);
      deleteButton.onclick = (event) => {
        event.stopPropagation();
        deleteQuestionSet(set.id);
      };
    }
    grid.append(card);
  }
  document.querySelector('#importBtn').onclick = () => importDialog.showModal();
}

function openSet(id) {
  session = null;
  activeSet = database.sets[id];
  rememberView('study');
  let topics = [
    ...new Set(activeSet.questions.map((q) => q.topic || 'General')),
  ];
  let ps = activeSet.questions.map((q) => getProgress(id, q.id));
  let seen = ps.filter((p) => p.attempts).length,
    stars = ps.filter((p) => p.star).length,
    wrong = ps.filter((p) => p.wrong).length,
    sure = ps.filter((p) => p.sure).length;
  app.replaceChildren(cloneTemplate('study-template'));
  app.querySelector('[data-set-name]').textContent = activeSet.name;
  app.querySelector('[data-set-description]').textContent =
    activeSet.description || '';
  app.querySelector('[data-question-count]').textContent =
    activeSet.questions.length;
  app.querySelector('[data-wrong-count]').textContent = wrong;
  app.querySelector('[data-sure-count]').textContent = sure;
  app.querySelector('[data-star-count]').textContent = stars;
  app.querySelector(
    '[data-progress-summary]'
  ).textContent = `${seen}/${activeSet.questions.length} seen · ${sure} sure`;
  app.querySelector('.progress > div').style.width = `${
    (100 * sure) / activeSet.questions.length
  }%`;
  app.querySelector('#count').max = activeSet.questions.length;
  const topicList = app.querySelector('.topics');
  for (const topic of topics) {
    const label = cloneTemplate('topic-template').firstElementChild;
    label.querySelector('input').value = topic;
    label.querySelector('span').textContent = topic;
    topicList.append(label);
  }
  let all = document.querySelector('#allTopics'),
    checks = [...document.querySelectorAll('.topicCheck')];
  const saved = database.studyOptions?.[id];
  if (saved) {
    const mode = document.querySelector('#mode');
    if ([...mode.options].some((o) => o.value === saved.mode))
      mode.value = saved.mode;
    if (Number.isInteger(saved.count) && saved.count > 0)
      document.querySelector('#count').value = saved.count;
    if (Array.isArray(saved.topics)) {
      checks.forEach((c) => (c.checked = saved.topics.includes(c.value)));
      all.checked = checks.every((c) => c.checked);
    }
  }
  all.onchange = () => checks.forEach((c) => (c.checked = all.checked));
  checks.forEach(
    (c) => (c.onchange = () => (all.checked = checks.every((x) => x.checked)))
  );
  document.querySelector('#start').onclick = startQuiz;
  app.onchange = rememberStudyOptions;
  app.oninput = rememberStudyOptions;
}

// Quiz session and answer feedback
function startQuiz() {
  let mode = document.querySelector('#mode').value,
    topics = [...document.querySelectorAll('.topicCheck:checked')].map(
      (x) => x.value
    ),
    n = Math.max(1, +document.querySelector('#count').value || 20);
  database.studyOptions = database.studyOptions || {};
  database.studyOptions[activeSet.id] = { mode, topics, count: n };
  save();
  let pool = activeSet.questions
    .filter((q) => topics.includes(q.topic || 'General'))
    .filter((q) => {
      let p = getProgress(activeSet.id, q.id);
      return (
        mode === 'everything' ||
        (mode === 'unseen' && p.attempts === 0) ||
        (mode === 'all' && !p.sure) ||
        (mode === 'starred' && p.star) ||
        (mode === 'wrong' && p.wrong > 0 && !p.sure) ||
        (mode === 'sure' && p.sure)
      );
    });
  shuffle(pool);
  pool = pool.slice(0, n);
  if (!pool.length) {
    session = null;
    rememberView('empty');
    let label =
      mode === 'starred'
        ? 'starred'
        : mode === 'wrong'
        ? 'previously incorrect'
        : mode === 'sure'
        ? 'sure'
        : 'matching';
    app.replaceChildren(createPal(), cloneTemplate('empty-template'));
    app.querySelector('h2').textContent =
      mode === 'unseen'
        ? 'No unseen questions in the selected topics'
        : `No ${label} questions yet`;
    document.querySelector('#emptyBack').onclick = () => openSet(activeSet.id);
    return;
  }
  session = {
    qs: pool,
    i: 0,
    score: 0,
    answered: false,
    missed: [],
    completed: new Set(),
  };
  renderQuestion();
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderQuestion() {
  const question = session.qs[session.i];
  const progress = getProgress(activeSet.id, question.id);
  session.answered = false;
  session.lastAnswer = null;
  rememberView('question');
  app.replaceChildren(cloneTemplate('question-template'));
  app.querySelector('[data-question-position]').textContent = `${
    session.i + 1
  } / ${session.qs.length} · ${question.topic || 'General'}`;
  app.querySelector('.question').textContent = question.question;
  app.querySelector(
    '[data-score]'
  ).textContent = `Score ${session.score}/${session.completed.size} answered`;
  const options = app.querySelector('#opts');
  question.options.forEach((text, index) => {
    const button = cloneTemplate('option-template').firstElementChild;
    button.dataset.i = index;
    button.querySelector('b').textContent = `${'ABCD'[index]}.`;
    button.querySelector('span').textContent = text;
    button.onclick = () => answer(index);
    options.append(button);
  });
  syncStarButtons(progress.star);
  document.querySelector('#star').onclick = toggleStar;
  document.querySelector('#reveal').onclick = () => answer(null, true);
  document.querySelector('#skip').onclick = () => {
    if (!session.answered) next();
  };
  document.querySelector('#quit').onclick = () => openSet(activeSet.id);
}

function syncStarButtons(isStarred) {
  document.querySelectorAll('#star,#feedbackStar').forEach((b) => {
    b.textContent = isStarred ? '★ Flagged' : '☆ Flag';
    b.classList.toggle('on', isStarred);
  });
}

function toggleStar() {
  let q = session.qs[session.i],
    k = progressKey(activeSet.id, q.id),
    p = getProgress(activeSet.id, q.id);
  p.star = !p.star;
  database.progress[k] = p;
  save();
  syncStarButtons(p.star);
}

function answer(i, revealed = false) {
  if (session.answered) return;
  session.answered = true;
  session.completed.add(session.i);
  let q = session.qs[session.i],
    k = progressKey(activeSet.id, q.id),
    p = getProgress(activeSet.id, q.id),
    ok = !revealed && i === q.correct;
  p.attempts++;
  p.last = Date.now();
  if (ok) {
    p.correct++;
    session.score++;
  } else {
    session.missed.push(q);
    p.wrong++;
    p.sure = false;
    p.mistakes.push({
      at: p.last,
      chosen: revealed ? null : i,
      revealed: !!revealed,
    });
    if (p.mistakes.length > 50) p.mistakes = p.mistakes.slice(-50);
  }
  database.progress[k] = p;
  save();
  session.lastAnswer = { i, revealed };
  rememberView('question');
  showAnswerFeedback(i, revealed);
}

function showAnswerFeedback(chosenIndex, revealed) {
  const question = session.qs[session.i];
  const key = progressKey(activeSet.id, question.id);
  const progress = getProgress(activeSet.id, question.id);
  const correct = !revealed && chosenIndex === question.correct;
  document.querySelectorAll('.option').forEach((button, index) => {
    button.disabled = true;
    if (index === question.correct)
      button.classList.add('correct', 'result-correct');
    else if (!revealed && index === chosenIndex)
      button.classList.add('wrong', 'result-wrong');
    else button.classList.add('result-dim');
    if (!revealed && index === chosenIndex)
      button.classList.add('result-selected');
  });
  document.querySelector('#skip')?.remove();
  document.querySelector('#reveal')?.remove();
  const feedback = document.querySelector('#feedback');
  feedback.replaceChildren(cloneTemplate('feedback-template'));
  const result = feedback.querySelector('[data-result]');
  result.className = correct ? 'good' : 'bad';
  result.textContent = revealed
    ? 'I don’t know — counted as a miss'
    : correct
    ? 'Correct'
    : 'Not quite';
  const answerText = question.options[question.correct];
  feedback.querySelector('[data-correct-answer]').textContent = `${
    'ABCD'[question.correct]
  }. ${answerText}`;
  feedback
    .querySelector('[data-pal-placeholder]')
    .replaceWith(createPal('answer', question.explanation || answerText));
  const source = feedback.querySelector('[data-source]');
  if (question.source) source.textContent = question.source;
  else source.remove();
  const nextButton = feedback.querySelector('#next');
  nextButton.textContent =
    session.i + 1 === session.qs.length ? 'Finish' : 'Next →';
  nextButton.onclick = next;
  syncStarButtons(progress.star);
  feedback.querySelector('#feedbackStar').onclick = toggleStar;
  const sureButton = feedback.querySelector('#sure');
  if (!correct) {
    sureButton.remove();
    return;
  }
  const updateSureButton = (isSure) => {
    sureButton.querySelector('.sure-label').textContent = isSure
      ? "✓ I'm sure"
      : "I'm sure";
    sureButton.classList.toggle('on', isSure);
  };
  updateSureButton(progress.sure);
  sureButton.onclick = () => {
    const updated = getProgress(activeSet.id, question.id);
    updated.sure = !updated.sure;
    database.progress[key] = updated;
    save();
    updateSureButton(updated.sure);
  };
}

function next() {
  session.i++;
  while (session.i < session.qs.length && session.completed.has(session.i))
    session.i++;
  if (session.i >= session.qs.length) return finish();
  renderQuestion();
}

function warnUnanswered() {
  rememberView('unanswered');
  const remaining = session.qs.length - session.completed.size;
  app.replaceChildren(cloneTemplate('unanswered-template'));
  app.querySelector(
    'h2'
  ).textContent = `You still have ${remaining} unanswered question${
    remaining === 1 ? '' : 's'
  }.`;
  document.querySelector('#answerRemaining').onclick = () => {
    session.i = session.qs.findIndex(
      (question, index) => !session.completed.has(index)
    );
    renderQuestion();
  };
  document.querySelector('#finishAnyway').onclick = () => finish(true);
}

function startSubset(qs) {
  if (!qs.length) {
    alert('No questions in that group.');
    return;
  }
  session = {
    qs: shuffle([...qs]),
    i: 0,
    score: 0,
    answered: false,
    missed: [],
    completed: new Set(),
  };
  renderQuestion();
}

function finish(allowUnanswered = false) {
  if (!allowUnanswered && session.completed.size < session.qs.length)
    return warnUnanswered();
  rememberView('results');
  const total = session.qs.length;
  const score = session.score;
  const flagged = session.qs.filter(
    (question) => getProgress(activeSet.id, question.id).star
  );
  const missed = session.missed;
  app.replaceChildren(cloneTemplate('results-template'));
  app.querySelector('[data-final-score]').textContent = `${score}/${total}`;
  app.querySelector('[data-percent-correct]').textContent = `${Math.round(
    (100 * score) / total
  )}% correct`;
  app.querySelector(
    '[data-result-summary]'
  ).textContent = `${score} correct · ${missed.length} incorrect · ${
    total - session.completed.size
  } unanswered`;
  app.querySelector(
    '[data-flag-summary]'
  ).textContent = `${flagged.length} flagged in this quiz`;
  const reviewFlagged = document.querySelector('#flagged');
  reviewFlagged.textContent = `★ Review flagged (${flagged.length})`;
  reviewFlagged.disabled = !flagged.length;
  reviewFlagged.onclick = () => startSubset(flagged);
  const reviewWrong = document.querySelector('#reviewWrong');
  reviewWrong.textContent = `Review wrong answers (${missed.length})`;
  reviewWrong.disabled = !missed.length;
  reviewWrong.onclick = () => startSubset(missed);
  document.querySelector('#finishStudy').onclick = () => openSet(activeSet.id);
}

// CSV, Excel, and JSON imports
function parseCsv(text) {
  let rows = [],
    row = [],
    cell = '',
    q = false;
  for (let i = 0; i < text.length; i++) {
    let c = text[i],
      n = text[i + 1];
    if (c === '"') {
      if (q && n === '"') {
        cell += '"';
        i++;
      } else q = !q;
    } else if (c === ',' && !q) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !q) {
      if (c === '\r' && n === '\n') i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

function normalizeColumnName(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function rowsToQuestionSet(rows, name) {
  if (rows.length < 2) throw Error('No data rows found.');
  let h = rows[0].map(normalizeColumnName),
    find = (...names) => {
      for (let n of names) {
        let i = h.indexOf(normalizeColumnName(n));
        if (i >= 0) return i;
      }
      return -1;
    };
  let qi = find('question', 'prompt'),
    ai = find('a', 'optiona', 'answera'),
    bi = find('b', 'optionb', 'answerb'),
    ci = find('c', 'optionc', 'answerc'),
    di = find('d', 'optiond', 'answerd'),
    ri = find(
      'correct',
      'correctanswer',
      'bonne réponse',
      'bonnereponse',
      'answer'
    ),
    ti = find('topic', 'category', 'catégorie', 'categorie'),
    ei = find('explanation', 'explication', 'réponse', 'reponse'),
    si = find('source'),
    hi = find('hint', 'indice');
  if ([qi, ai, bi, ci, di, ri].some((i) => i < 0))
    throw Error('Required columns: Question, A, B, C, D, Correct.');
  let qs = [];
  for (let r = 1; r < rows.length; r++) {
    let x = rows[r];
    if (!x[qi]) continue;
    let raw = String(x[ri] || '').trim(),
      idx = 'ABCD'.indexOf(raw.toUpperCase());
    if (idx < 0) {
      idx = [x[ai], x[bi], x[ci], x[di]].findIndex(
        (v) => String(v).trim() === raw
      );
    }
    if (idx < 0)
      throw Error(
        `Row ${r + 1}: Correct must be A, B, C, D, or exactly match an option.`
      );
    qs.push({
      id: `q-${Date.now()}-${r}`,
      question: x[qi],
      options: [x[ai], x[bi], x[ci], x[di]],
      correct: idx,
      topic: ti >= 0 && x[ti] ? x[ti] : 'General',
      explanation: ei >= 0 ? x[ei] || '' : '',
      source: si >= 0 ? x[si] || '' : '',
      hint: hi >= 0 ? x[hi] || '' : '',
    });
  }
  return {
    id: 'set-' + Date.now(),
    name: name.replace(/\.(csv|xlsx)$/i, ''),
    description: 'Imported question set',
    questions: qs,
  };
}

async function unzipXlsx(buf) {
  let u = new Uint8Array(buf),
    dv = new DataView(buf),
    files = {};
  let e = -1;
  for (let i = u.length - 22; i >= Math.max(0, u.length - 65557); i--)
    if (dv.getUint32(i, true) === 0x06054b50) {
      e = i;
      break;
    }
  if (e < 0) throw Error('Invalid XLSX file.');
  let count = dv.getUint16(e + 10, true),
    pos = dv.getUint32(e + 16, true),
    dec = new TextDecoder();
  for (let z = 0; z < count; z++) {
    if (dv.getUint32(pos, true) !== 0x02014b50) break;
    let method = dv.getUint16(pos + 10, true),
      cs = dv.getUint32(pos + 20, true),
      nl = dv.getUint16(pos + 28, true),
      el = dv.getUint16(pos + 30, true),
      cl = dv.getUint16(pos + 32, true),
      off = dv.getUint32(pos + 42, true),
      name = dec.decode(u.slice(pos + 46, pos + 46 + nl));
    let lnl = dv.getUint16(off + 26, true),
      lel = dv.getUint16(off + 28, true),
      data = u.slice(off + 30 + lnl + lel, off + 30 + lnl + lel + cs);
    if (method === 0) files[name] = data;
    else if (method === 8) {
      let ds = new DecompressionStream('deflate-raw'),
        ab = await new Response(
          new Blob([data]).stream().pipeThrough(ds)
        ).arrayBuffer();
      files[name] = new Uint8Array(ab);
    }
    pos += 46 + nl + el + cl;
  }
  return files;
}

async function readXlsxRows(buf) {
  let f = await unzipXlsx(buf),
    dec = new TextDecoder(),
    xml = (n) =>
      f[n]
        ? new DOMParser().parseFromString(dec.decode(f[n]), 'application/xml')
        : null,
    shared = [];
  let ss = xml('xl/sharedStrings.xml');
  if (ss)
    shared = [...ss.getElementsByTagName('si')].map((si) =>
      [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')
    );
  let wb = xml('xl/workbook.xml'),
    rels = xml('xl/_rels/workbook.xml.rels');
  if (!wb || !rels) throw Error('Could not read workbook.');
  let sh = wb.getElementsByTagName('sheet')[0],
    rid =
      sh.getAttribute('r:id') ||
      sh.getAttributeNS(
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'id'
      ),
    rel = [...rels.getElementsByTagName('Relationship')].find(
      (x) => x.getAttribute('Id') === rid
    ),
    target = rel.getAttribute('Target').replace(/^\//, '');
  let path = target.startsWith('xl/')
    ? target
    : 'xl/' + target.replace(/^\.\//, '');
  let sx = xml(path),
    out = [];
  for (let row of sx.getElementsByTagName('row')) {
    let arr = [];
    for (let c of row.getElementsByTagName('c')) {
      let ref = c.getAttribute('r'),
        col = ref.match(/[A-Z]+/)[0],
        idx = [...col].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1,
        t = c.getAttribute('t'),
        v = c.getElementsByTagName('v')[0]?.textContent ?? '',
        inline = c.getElementsByTagName('is')[0];
      let val =
        t === 's'
          ? shared[+v]
          : t === 'inlineStr' && inline
          ? [...inline.getElementsByTagName('t')]
              .map((x) => x.textContent)
              .join('')
          : v;
      arr[idx] = val;
    }
    out.push(arr);
  }
  return out;
}

function jsonToQuestionSet(text, filename) {
  let data;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw Error('Invalid JSON. Please choose a valid question-set file.');
  }
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !Array.isArray(data.questions) ||
    !data.questions.length
  )
    throw Error('JSON must contain a non-empty questions array.');
  const ids = new Set();
  const questions = data.questions.map((q, index) => {
    const fail = (message) => {
      throw Error(`Question ${index + 1}: ${message}`);
    };
    if (!q || typeof q.question !== 'string' || !q.question.trim())
      fail('question must be non-empty text.');
    if (
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      q.options.some((o) => typeof o !== 'string' || !o.trim())
    )
      fail('options must contain four non-empty strings.');
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3)
      fail('correct must be an index from 0 to 3 (A to D).');
    const id = q.id === undefined ? `imported-question-${index + 1}` : q.id;
    if (typeof id !== 'string' || !id.trim() || ids.has(id))
      fail('id must be unique, non-empty text.');
    ids.add(id);
    const result = {
      id,
      question: q.question,
      options: q.options,
      correct: q.correct,
    };
    for (const key of ['topic', 'explanation', 'source', 'hint']) {
      if (q[key] !== undefined && typeof q[key] !== 'string')
        fail(`${key} must be text.`);
      result[key] = q[key] || (key === 'topic' ? 'General' : '');
    }
    return result;
  });
  let id =
    typeof data.id === 'string' && data.id.trim()
      ? data.id
      : `set-${Date.now()}`;
  while (
    Object.prototype.hasOwnProperty.call(database.sets, id) ||
    externalSetIds.has(id) ||
    ['__proto__', 'constructor', 'prototype'].includes(id)
  )
    id = `set-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    name:
      typeof data.name === 'string' && data.name.trim()
        ? data.name
        : filename.replace(/\.json$/i, ''),
    description:
      typeof data.description === 'string'
        ? data.description
        : 'Imported question set',
    questions,
  };
}

async function importFile(file) {
  if (!file) throw Error('Please choose a CSV, XLSX, or JSON file.');
  let set;
  const name = file.name.toLowerCase();
  if (name.endsWith('.json'))
    set = jsonToQuestionSet(await file.text(), file.name);
  else if (name.endsWith('.csv'))
    set = rowsToQuestionSet(parseCsv(await file.text()), file.name);
  else if (name.endsWith('.xlsx'))
    set = rowsToQuestionSet(
      await readXlsxRows(await file.arrayBuffer()),
      file.name
    );
  else throw Error('Please choose a CSV, XLSX, or JSON file.');
  return set;
}
// Navigation and import dialog
document.querySelector('#brandHome').onclick = (e) => {
  e.preventDefault();
  renderLibrary();
};
document.querySelector('#homeBtn').onclick = renderLibrary;
let pendingSet = null,
  importRequest = 0;
const quizName = document.querySelector('#quizName'),
  addSetBtn = document.querySelector('#addSetBtn'),
  importStatus = document.querySelector('#importStatus');

function resetImport() {
  importRequest++;
  pendingSet = null;
  document.querySelector('#fileInput').value = '';
  quizName.value = '';
  quizName.setCustomValidity('');
  quizName.disabled = true;
  addSetBtn.disabled = true;
  importStatus.textContent = '';
}
importDialog.addEventListener('close', resetImport);
document.querySelector('#closeImport').onclick = () => importDialog.close();
document.querySelector('#fileInput').onchange = async (e) => {
  const request = ++importRequest;
  pendingSet = null;
  quizName.value = '';
  quizName.disabled = true;
  addSetBtn.disabled = true;
  const file = e.target.files[0];
  if (!file) {
    importStatus.textContent = '';
    return;
  }
  importStatus.textContent = 'Reading questions…';
  try {
    const set = await importFile(file);
    if (request !== importRequest) return;
    pendingSet = set;
    quizName.value = set.name;
    quizName.disabled = false;
    addSetBtn.disabled = false;
    importStatus.textContent = `${set.questions.length} questions ready to add. You can edit the name above.`;
  } catch (err) {
    if (request === importRequest) importStatus.textContent = err.message;
  }
};
document.querySelector('#addSetForm').onsubmit = (e) => {
  e.preventDefault();
  if (!pendingSet) return;
  const name = quizName.value.trim();
  if (!name) {
    quizName.setCustomValidity('Please enter a name.');
    quizName.reportValidity();
    return;
  }
  const set = { ...pendingSet, name };
  while (
    Object.prototype.hasOwnProperty.call(database.sets, set.id) ||
    externalSetIds.has(set.id)
  )
    set.id = `set-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  database.sets[set.id] = set;
  try {
    save();
  } catch (err) {
    delete database.sets[set.id];
    importStatus.textContent =
      'Could not save this set. Browser storage may be full.';
    return;
  }
  pendingSet = null;
  importDialog.close();
  renderLibrary();
};
quizName.oninput = () => quizName.setCustomValidity('');

const themePicker = document.querySelector('#themePicker');
themePicker.onchange = (e) => applyTheme(e.target.value);

// Restore the current screen and study filters
function rememberStudyOptions() {
  const mode = document.querySelector('#mode'),
    count = document.querySelector('#count');
  if (!activeSet || !mode || !count) return;
  database.studyOptions = database.studyOptions || {};
  database.studyOptions[activeSet.id] = {
    mode: mode.value,
    count: Math.max(1, +count.value || 20),
    topics: [...document.querySelectorAll('.topicCheck:checked')].map(
      (c) => c.value
    ),
  };
  save();
}

function rememberView(page) {
  currentPage = page;
  if (!appReady) return;
  const snapshot = {
    page,
    setId: activeSet?.id,
    session: session ? { ...session, completed: [...session.completed] } : null,
  };
  try {
    sessionStorage.setItem(VIEW_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Could not remember current page', err);
  }
}

function restoreView() {
  let saved;
  try {
    saved = JSON.parse(sessionStorage.getItem(VIEW_KEY));
  } catch {}
  if (!saved || saved.page === 'library' || !database.sets[saved.setId])
    return renderLibrary();
  activeSet = database.sets[saved.setId];
  if (saved.page === 'study') return openSet(activeSet.id);
  if (saved.page === 'empty') {
    openSet(activeSet.id);
    return startQuiz();
  }
  const restored = saved.session;
  if (
    !restored ||
    !Array.isArray(restored.qs) ||
    !restored.qs.length ||
    !Array.isArray(restored.completed) ||
    !Array.isArray(restored.missed) ||
    !Number.isInteger(restored.i) ||
    restored.i < 0 ||
    restored.i > restored.qs.length
  )
    return openSet(activeSet.id);
  // A bank update can invalidate a saved quiz. Keep progress, but return to choices.
  if (
    restored.qs.some(
      (q) =>
        !activeSet.questions.some(
          (current) =>
            current.id === q.id && JSON.stringify(current) === JSON.stringify(q)
        )
    )
  )
    return openSet(activeSet.id);
  session = { ...restored, completed: new Set(restored.completed) };
  if (saved.page === 'results') return finish(true);
  if (saved.page === 'unanswered') return warnUnanswered();
  if (saved.page !== 'question' || session.i >= session.qs.length)
    return openSet(activeSet.id);
  const lastAnswer = session.lastAnswer;
  renderQuestion();
  if (lastAnswer && session.completed.has(session.i)) {
    session.answered = true;
    session.lastAnswer = lastAnswer;
    showAnswerFeedback(lastAnswer.i, lastAnswer.revealed);
    rememberView('question');
  }
}

// Question-set deletion
let pendingDeleteId = null;
const deleteDialog = document.querySelector('#deleteDialog');

function deleteQuestionSet(id) {
  const set = database.sets[id];
  if (!set || externalSetIds.has(id)) return;
  pendingDeleteId = id;
  document.querySelector('#deleteTitle').textContent = `Delete “${set.name}”?`;
  document.querySelector('#deleteError').textContent = '';
  deleteDialog.showModal();
  document.querySelector('#cancelDelete').focus();
}
document.querySelector('#cancelDelete').onclick = () => deleteDialog.close();
deleteDialog.addEventListener('close', () => {
  pendingDeleteId = null;
});
document.querySelector('#confirmDelete').onclick = () => {
  const id = pendingDeleteId,
    set = database.sets[id];
  if (!set || externalSetIds.has(id)) {
    deleteDialog.close();
    return;
  }
  const previous = database;
  database = {
    ...database,
    sets: { ...database.sets },
    progress: { ...database.progress },
    studyOptions: { ...database.studyOptions },
  };
  delete database.sets[id];
  delete database.studyOptions[id];
  for (const q of set.questions)
    delete database.progress[progressKey(id, q.id)];
  try {
    save();
  } catch (err) {
    database = previous;
    document.querySelector('#deleteError').textContent =
      'Could not delete this question set. Please try again.';
    return;
  }
  deleteDialog.close();
  renderLibrary();
  document.querySelector('#importBtn').focus();
};

// Startup
applyTheme(localStorage.getItem(THEME_KEY) || 'memphis');
init();
