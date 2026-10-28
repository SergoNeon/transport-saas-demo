(() => {
  'use strict';

  const QUESTIONS = Array.isArray(window.EXAM_QUESTIONS) ? window.EXAM_QUESTIONS : [];
  const TOTAL = 30;
  const PASSING = 24;
  const DURATION = 40 * 60 * 1000;
  const STORAGE_KEY = 'bikoret-derech-exam-v1';
  const LABELS = ['א', 'ב', 'ג', 'ד'];
  const app = document.getElementById('app');
  const toast = document.getElementById('toast');
  let state = null;
  let screen = 'intro';
  let timerId = null;
  let toastTimeout = null;
  let dialogAction = null;

  const icons = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5c2-1 5-1 8 1 3-2 6-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1V5Z"/><path d="M12 6v14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 11 6-5m-6 8 6 4"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4V9h16v9h-2M6 14h12v7H6v-7Z"/><path d="M17 12h.01"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4V4Z"/></svg>'
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const answeredCount = () => state.answers.filter(a => a !== null).length;
  const score = () => QUESTIONS.reduce((total, q, i) => total + (state.answers[i] === q.answer ? 1 : 0), 0);
  const timeRemaining = () => Math.max(0, state.endsAt - Date.now());
  const formatTime = ms => {
    const seconds = Math.ceil(Math.max(0, ms) / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };
  const dateTime = time => new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date(time));

  function readSaved() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.answers) || parsed.answers.length !== TOTAL ||
          !Array.isArray(parsed.marked) || parsed.marked.length !== TOTAL ||
          typeof parsed.name !== 'string' || !Number.isFinite(parsed.startsAt) || !Number.isFinite(parsed.endsAt)) return null;
      parsed.answers = parsed.answers.map(a => Number.isInteger(a) && a >= 0 && a <= 3 ? a : null);
      parsed.marked = parsed.marked.map(Boolean);
      parsed.current = Math.min(TOTAL - 1, Math.max(0, Number.isInteger(parsed.current) ? parsed.current : 0));
      parsed.employeeId = typeof parsed.employeeId === 'string' ? parsed.employeeId : '';
      return parsed;
    } catch { return null; }
  }
  function save() {
    try { if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }
  function removeSaved() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
  }
  function notify(message) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimeout = setTimeout(() => toast.classList.remove('visible'), 3600);
  }
  function scrollToTop() { window.scrollTo({top:0,behavior:'smooth'}); }
  function stopClock() { if (timerId) { clearInterval(timerId); timerId = null; } }
  function startClock() {
    stopClock();
    updateClock();
    timerId = setInterval(updateClock, 1000);
  }
  function updateClock() {
    if (screen !== 'exam' || !state || state.finishedAt) { stopClock(); return; }
    const remaining = timeRemaining();
    if (!remaining) { finishNow('timeout'); return; }
    const timerNode = document.getElementById('timer-text');
    if (timerNode) {
      timerNode.textContent = formatTime(remaining);
      timerNode.closest('.timer-box')?.classList.toggle('warn', remaining <= 300000);
    }
  }
  function begin(name, employeeId) {
    const now = Date.now();
    state = {version:1, name, employeeId, startsAt:now, endsAt:now + DURATION, current:0, answers:Array(TOTAL).fill(null), marked:Array(TOTAL).fill(false), finishedAt:null, finishReason:null};
    save();
    renderExam(true);
  }
  function resume() {
    if (!state) return;
    if (state.finishedAt) { renderResult(); return; }
    if (timeRemaining() === 0) { finishNow('timeout'); return; }
    renderExam(true);
  }
  function renderIntro() {
    stopClock(); screen = 'intro';
    const canResume = state && !state.finishedAt;
    const hasResult = state && state.finishedAt;
    app.innerHTML = `
      <div class="welcome">
        <section class="hero" aria-labelledby="welcome-title">
          <div>
            <div class="eyebrow"><span class="eyebrow-line"></span> אלקטרה אפיקים | הכשרת מבקרים</div>
            <h1 id="welcome-title">ביקורת טובה מתחילה <em>בידע מדויק.</em></h1>
            <p class="hero-description">מבחן ידע מקצועי למבקרי אלקטרה אפיקים. תרחישים מעולם העבודה, שירות לנוסע, בטיחות, תיקוף וסמכויות — בחוויה פשוטה ונוחה מכל מכשיר.</p>
          </div>
          <div class="hero-bottom" aria-label="פרטי הבחינה">
            <div class="hero-metric"><b>30</b><small>שאלות במבחן</small></div>
            <div class="hero-metric"><b>40</b><small>דקות לביצוע</small></div>
            <div class="hero-metric"><b>80%</b><small>ציון מעבר מוצע</small></div>
          </div>
        </section>
        <section class="start-panel" aria-labelledby="start-title">
          <div class="panel-icon" aria-hidden="true">${icons.book}</div>
          <h2 id="start-title">מוכנים להתחיל?</h2>
          <p>מלאו את הפרטים והתחילו את המבחן. לכל שאלה תשובה אחת נכונה, וניתן לחזור לשאלות קודמות לפני ההגשה.</p>
          <form id="start-form" novalidate>
            <div class="field"><label for="employee-name">שם מלא <span aria-hidden="true">*</span></label><input id="employee-name" name="name" type="text" minlength="2" maxlength="90" autocomplete="name" placeholder="הקלידו שם מלא" required></div>
            <div class="field"><label for="employee-id">מספר עובד <span class="optional">לא חובה</span></label><input id="employee-id" name="employeeId" type="text" maxlength="30" inputmode="text" autocomplete="off" placeholder="למשל 12345"></div>
            <p id="form-error" class="form-error" role="alert"></p>
            <button class="primary-btn full-width" type="submit">מתחילים במבחן ${icons.arrow}</button>
          </form>
          <div class="consent-note">${icons.shield}<span>התקדמות הבחינה נשמרת בדפדפן שלכם בלבד. התוצאה תישלח למנהל רק אם תבחרו לשתף אותה.</span></div>
          ${canResume ? `<div class="resume-box"><p>נמצאה בחינה פתוחה עבור <strong>${escapeHtml(state.name)}</strong>, עם ${answeredCount()} תשובות מתוך ${TOTAL}. שעון הבחינה ממשיך לפעול מרגע ההתחלה.</p><button class="secondary-btn full-width" type="button" data-action="resume">המשך בחינה קיימת ${icons.arrow}</button></div>` : ''}
          ${hasResult ? `<div class="resume-box"><p>קיימת תוצאה קודמת עבור <strong>${escapeHtml(state.name)}</strong>.</p><button class="secondary-btn full-width" type="button" data-action="last-result">הצגת התוצאה האחרונה ${icons.arrow}</button></div>` : ''}
        </section>
      </div>
      <div class="features" aria-label="יתרונות המבחן">
        <div class="feature"><div class="feature-symbol">${icons.book}</div><div><strong>ידע מהשטח</strong><span>שאלות ותסריטים מעבודת המבקר</span></div></div>
        <div class="feature"><div class="feature-symbol">${icons.clock}</div><div><strong>התקדמות נשמרת</strong><span>ניתן לחזור לאותה בחינה במכשיר</span></div></div>
        <div class="feature"><div class="feature-symbol">${icons.check}</div><div><strong>ציון מיידי</strong><span>דוח תוצאה זמין בתום הבחינה</span></div></div>
      </div>`;
  }

  function renderExam(goTop = false, focusAnswer = null) {
    if (!state) { renderIntro(); return; }
    if (state.finishedAt) { renderResult(); return; }
    if (timeRemaining() <= 0) { finishNow('timeout'); return; }
    screen = 'exam';
    const n = state.current;
    const q = QUESTIONS[n];
    const answered = answeredCount();
    const remaining = timeRemaining();
    app.innerHTML = `
      <div class="exam-page">
        <div class="exam-heading">
          <div class="exam-heading-copy"><div class="mini-label">אלקטרה אפיקים · מבחן הכשרה</div><h1>מבחן ידע למבקרים</h1><p>נבחן/ת: <strong>${escapeHtml(state.name)}</strong>${state.employeeId ? ` · מס' עובד: ${escapeHtml(state.employeeId)}` : ''}</p></div>
          <button class="outline-btn" type="button" data-action="exit">יציאה ושמירה</button>
        </div>
        <div class="exam-grid">
          <aside class="exam-sidebar" aria-label="התקדמות הבחינה">
            <div class="sidebar-top-line"><div class="sidebar-label">ההתקדמות שלי</div><div class="sidebar-stats"><b>${answered}<span>/${TOTAL}</span></b><small>שאלות שנענו</small></div></div>
            <div class="progress-track" role="progressbar" aria-label="שאלות שנענו" aria-valuemin="0" aria-valuemax="${TOTAL}" aria-valuenow="${answered}"><div class="progress-fill" style="width:${answered * 100 / TOTAL}%"></div></div>
            <div class="sidebar-rule"></div>
            <div class="timer-box${remaining <= 300000 ? ' warn' : ''}"><div class="timer-description"><span>הזמן שנותר</span><strong id="timer-text" aria-live="off">${formatTime(remaining)}</strong></div><div class="timer-symbol">${icons.clock}</div></div>
            <div class="sidebar-label">מעבר בין שאלות</div>
            <div class="num-grid" aria-label="ניווט שאלות">${QUESTIONS.map((_,i) => `<button type="button" class="num ${state.answers[i] !== null ? 'answered' : ''} ${i === n ? 'current' : ''} ${state.marked[i] ? 'marked' : ''}" aria-label="שאלה ${i + 1}${state.answers[i] !== null ? ', נענתה' : ', לא נענתה'}${state.marked[i] ? ', סומנה לחזרה' : ''}" ${i === n ? 'aria-current="step"' : ''} data-goto="${i}">${i + 1}</button>`).join('')}</div>
            <div class="grid-legend"><span><i class="leg-dot filled"></i>נענתה</span><span><i class="leg-dot now"></i>נוכחית</span><span><i class="leg-dot"></i>טרם נענתה</span></div>
            <div class="sidebar-note">אפשר לדלג ולחזור לשאלות. התשובות נשמרות אוטומטית במכשיר. ניתן להגיש בכל שלב.</div>
          </aside>
          <section class="question-card" aria-labelledby="question-text">
            <div class="question-meta"><span class="question-count"><i></i> שאלה ${n+1} מתוך ${TOTAL}</span><span class="question-category">${escapeHtml(q.section)}</span></div>
            <h2 id="question-text">${escapeHtml(q.question)}</h2>
            <div class="answers-list" role="radiogroup" aria-labelledby="question-text">
              <span class="visually-hidden" style="position:absolute;clip-path:inset(50%);white-space:nowrap;width:1px;height:1px;overflow:hidden">בחרו תשובה אחת</span>
              ${q.options.map((o,i) => `<button type="button" role="radio" aria-checked="${state.answers[n] === i}" data-answer="${i}" class="answer-option ${state.answers[n] === i ? 'selected' : ''}"><span class="option-label">${LABELS[i]}</span><span class="answer-text">${escapeHtml(o)}</span><span class="fake-radio" aria-hidden="true"></span></button>`).join('')}
            </div>
            <div class="question-bottom"><div class="question-bottom-left"><button type="button" class="text-btn ${state.marked[n] ? 'is-marked' : ''}" data-action="mark">${icons.bookmark} ${state.marked[n] ? 'הסר סימון' : 'סמן לחזרה'}</button><button type="button" class="text-btn" data-action="clear" ${state.answers[n] === null ? 'disabled' : ''}>נקה בחירה</button></div><div class="question-bottom-right"><button type="button" class="secondary-btn" data-action="previous" ${n === 0 ? 'disabled' : ''}>${icons.back} הקודמת</button>${n === TOTAL-1 ? `<button type="button" class="primary-btn end-btn" data-action="finish">סיום והגשת מבחן ${icons.check}</button>` : `<button type="button" class="primary-btn" data-action="next">השאלה הבאה ${icons.arrow}</button>`}</div></div>
          </section>
        </div>
      </div>`;
    startClock();
    if (goTop) scrollToTop();
    if (focusAnswer !== null) app.querySelector(`[data-answer="${focusAnswer}"]`)?.focus({preventScroll:true});
  }

  function showDialog({heading, text, actionLabel, onConfirm, destructive = false}) {
    dialogAction = onConfirm;
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'confirm-overlay';
    overlay.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-text"><div class="dialog-symbol">!</div><h2 id="dialog-title">${escapeHtml(heading)}</h2><p id="dialog-text">${escapeHtml(text)}</p><div class="dialog-actions"><button class="secondary-btn" type="button" data-action="cancel-dialog">חזרה למבחן</button><button class="primary-btn ${destructive ? 'end-btn' : ''}" type="button" data-action="confirm-dialog">${escapeHtml(actionLabel)}</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="cancel-dialog"]').focus();
  }
  function closeDialog() { document.getElementById('confirm-overlay')?.remove(); dialogAction = null; }
  function tryFinish() {
    if (!state || state.finishedAt) return;
    const missing = TOTAL - answeredCount();
    if (missing === 0) { finishNow('submitted'); return; }
    showDialog({heading:'להגיש את המבחן?',text:`נותרו ${missing} שאלות ללא תשובה. שאלות שלא נענו ייחשבו כשגויות. ניתן לחזור אליהן לפני ההגשה.`,actionLabel:'הגש בכל זאת',onConfirm:() => finishNow('submitted')});
  }
  function finishNow(reason) {
    if (!state || state.finishedAt) return;
    state.finishedAt = Date.now(); state.finishReason = reason;
    save(); closeDialog(); stopClock(); renderResult(true);
  }
  function renderResult(goTop = false) {
    if (!state || !state.finishedAt) { renderIntro(); return; }
    stopClock(); screen = 'result';
    const points = score();
    const percent = Math.round(points / TOTAL * 100);
    const passed = points >= PASSING;
    const elapsedMinutes = Math.max(1, Math.round((Math.min(state.finishedAt, state.endsAt) - state.startsAt) / 60000));
    const rows = QUESTIONS.map((q,i) => `<tr><td>${i+1}</td><td>${state.answers[i] === null ? 'לא נענתה' : LABELS[state.answers[i]]}</td><td>${escapeHtml(q.section)}</td></tr>`).join('');
    app.innerHTML = `<div class="result-page"><section class="result-card" aria-label="תוצאת מבחן">
      <div class="result-top"><div><div class="result-eyebrow">המבחן הושלם</div><h1>סיכום תוצאות המבחן</h1><p>כל הכבוד על השלמת הבחינה, ${escapeHtml(state.name)}. אפשר לשמור את הדוח או לשתף אותו עם המנהל להמשך תהליך ההכשרה.</p></div><div class="score-dial" style="--percent:${percent}%" role="img" aria-label="ציון ${percent} אחוז"><div class="score-inner"><strong>${percent}%</strong><small>${points} מתוך ${TOTAL}</small></div></div></div>
      <div class="result-body">
        <div class="result-status"><div class="status-icon ${passed ? '' : 'fail'}" aria-hidden="true">${passed ? '✓' : '!'}</div><div><strong>${passed ? 'עמדת בציון המעבר המוצע' : 'עדיין לא הושג ציון המעבר המוצע'}</strong><p>${passed ? 'נדרשו לפחות 24 תשובות נכונות מתוך 30.' : 'ציון המעבר המוצע הוא 80%, כלומר 24 תשובות נכונות.'}${state.finishReason === 'timeout' ? ' · המבחן הוגש אוטומטית בתום הזמן.' : ''}</p></div></div>
        <div class="result-details"><div class="detail"><small>שם הנבחן/ת</small><strong>${escapeHtml(state.name)}</strong></div><div class="detail"><small>תשובות נכונות</small><strong>${points} / ${TOTAL}</strong></div><div class="detail"><small>משך הבחינה</small><strong>${elapsedMinutes} דקות</strong></div><div class="detail"><small>מספר עובד</small><strong>${escapeHtml(state.employeeId || 'לא צוין')}</strong></div><div class="detail"><small>מועד הגשה</small><strong>${escapeHtml(dateTime(state.finishedAt))}</strong></div><div class="detail"><small>שאלות שנענו</small><strong>${answeredCount()} / ${TOTAL}</strong></div></div>
        <div class="result-actions no-print"><button type="button" class="primary-btn" data-action="share">${icons.share} שיתוף תוצאה עם המנהל</button><button type="button" class="secondary-btn" data-action="csv">${icons.download} הורדת דוח CSV</button><button type="button" class="secondary-btn" data-action="print">${icons.print} שמירה כ-PDF / הדפסה</button><button type="button" class="secondary-btn alt" data-action="restart">מבחן חדש</button></div>
        <p class="result-footer-note no-print">שימו לב: אין שליחה אוטומטית למנהל ואין שמירה בשרת. כדי שהמנהל יקבל את התוצאה, יש להשתמש בכפתור השיתוף או לשלוח לו את הדוח. גרסת הדרכה זו אינה מבחן הסמכה מאובטח.</p>
        <h2 class="print-only">פירוט התשובות שנבחרו</h2><table class="print-only detail-table"><thead><tr><th>מס' שאלה</th><th>תשובת הנבחן/ת</th><th>נושא</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </section></div>`;
    if (goTop) scrollToTop();
  }

  function resultText() {
    const points = score();
    return `סיכום מבחן למבקרי תחבורה ציבורית\nשם: ${state.name}\nמספר עובד: ${state.employeeId || 'לא צוין'}\nמועד הגשה: ${dateTime(state.finishedAt)}\nציון: ${points}/${TOTAL} (${Math.round(points / TOTAL * 100)}%)\nסטטוס: ${points >= PASSING ? 'עבר את ציון המעבר המוצע' : 'לא עבר את ציון המעבר המוצע'}\nתשובות שסומנו: ${state.answers.map((x,i) => `${i+1}-${x === null ? 'ללא תשובה' : LABELS[x]}`).join(', ')}\n\nתוצאה המופקת במכשיר הנבחן; אינה מאומתת בשרת.`;
  }
  async function shareResult() {
    const text = resultText();
    if (navigator.share) {
      try { await navigator.share({title:'תוצאת מבחן מבקרים',text}); return; }
      catch (error) { if (error?.name === 'AbortError') return; }
    }
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const node = document.createElement('textarea'); node.value = text; node.style.position = 'fixed';node.style.opacity='0';document.body.appendChild(node);node.select();
        if (!document.execCommand('copy')) throw new Error('copy unavailable');
        node.remove();
      }
      notify('סיכום התוצאה הועתק. אפשר לשלוח אותו למנהל.');
    } catch { notify('לא ניתן לשתף אוטומטית. אפשר להוריד דוח CSV או להדפיס.'); }
  }
  function downloadCSV() {
    const points = score();
    const rows = [
      ['מבחן ידע למבקרי תחבורה ציבורית'],
      ['שם נבחן/ת',state.name],['מספר עובד',state.employeeId || ''],['מועד הגשה',dateTime(state.finishedAt)],['ציון',`${points}/${TOTAL}`],['אחוז',`${Math.round(points/TOTAL*100)}%`],['סטטוס',points >= PASSING ? 'עבר' : 'לא עבר'],
      [],['מספר שאלה','תשובה שסומנה','נושא'],
      ...QUESTIONS.map((q,i) => [String(i+1),state.answers[i] === null ? 'לא נענתה' : LABELS[state.answers[i]],q.section])
    ];
    const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"','""')}"`).join(',')).join('\r\n');
    const file = new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');link.href=url;link.download=`inspector-exam-result-${new Date(state.finishedAt).toISOString().slice(0,10)}.csv`;document.body.appendChild(link);link.click();link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    notify('דוח התוצאה נשמר במכשיר.');
  }

  app.addEventListener('submit', event => {
    if (event.target.id !== 'start-form') return;
    event.preventDefault();
    const name = document.getElementById('employee-name').value.trim().replace(/\s+/g,' ');
    const employeeId = document.getElementById('employee-id').value.trim();
    const error = document.getElementById('form-error');
    if (name.length < 2) {error.textContent='יש להזין שם מלא (לפחות שני תווים).';document.getElementById('employee-name').focus();return;}
    if (state && !state.finishedAt) {
      showDialog({heading:'להתחיל מבחן חדש?',text:'נמצאה בחינה קיימת. התחלה מחדש תמחק את כל התשובות השמורות באותו מכשיר.',actionLabel:'התחל מחדש',destructive:true,onConfirm:() => {closeDialog();begin(name,employeeId);}});
      return;
    }
    begin(name,employeeId);
  });
  document.addEventListener('click', event => {
    const clicked = event.target.closest('[data-action], [data-answer], [data-goto]');
    if (!clicked || clicked.disabled) return;
    if (clicked.dataset.answer !== undefined && screen === 'exam') {
      const answer = Number(clicked.dataset.answer);
      if (Number.isInteger(answer) && answer >= 0 && answer <= 3) {state.answers[state.current]=answer;save();renderExam(false,answer);} return;
    }
    if (clicked.dataset.goto !== undefined && screen === 'exam') {
      const index = Number(clicked.dataset.goto);
      if (Number.isInteger(index) && index>=0 && index<TOTAL) {state.current=index;save();renderExam(true);} return;
    }
    const action = clicked.dataset.action;
    if (action === 'cancel-dialog') {closeDialog();return;}
    if (action === 'confirm-dialog') {const fn = dialogAction;closeDialog();if (fn) fn();return;}
    if (action === 'resume') return resume();
    if (action === 'last-result') return renderResult(true);
    if (action === 'exit' && screen === 'exam') {save();renderIntro();scrollToTop();return;}
    if (screen === 'exam') {
      if (action === 'next' && state.current < TOTAL-1) {state.current++;save();renderExam(true);return;}
      if (action === 'previous' && state.current > 0) {state.current--;save();renderExam(true);return;}
      if (action === 'mark') {state.marked[state.current]=!state.marked[state.current];save();renderExam(false);return;}
      if (action === 'clear') {state.answers[state.current]=null;save();renderExam(false);return;}
      if (action === 'finish') return tryFinish();
    }
    if (screen === 'result') {
      if (action === 'share') return void shareResult();
      if (action === 'csv') return downloadCSV();
      if (action === 'print') return window.print();
      if (action === 'restart') return showDialog({heading:'לפתוח מבחן חדש?',text:'המבחן הקודם והתוצאה שלו יימחקו ממכשיר זה. מומלץ לשמור את התוצאה לפני התחלה מחדש.',actionLabel:'מבחן חדש',destructive:true,onConfirm:() => {removeSaved();state=null;renderIntro();scrollToTop();}});
    }
  });
  document.addEventListener('keydown', event => {if (event.key === 'Escape' && document.getElementById('confirm-overlay')) closeDialog();});

  if (QUESTIONS.length !== TOTAL || QUESTIONS.some(q => !Array.isArray(q.options) || q.options.length !== 4 || !Number.isInteger(q.answer))) {
    app.innerHTML = '<p class="loading-state">לא ניתן לטעון את מאגר השאלות. יש לרענן את הדף.</p>';
    return;
  }
  state = readSaved();
  renderIntro();
})();