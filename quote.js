/* 導入試算與提案：Google AI Pro for Education 授權數、研習場次、預算，並產生可列印的提案 */
(function (S) {
  'use strict';
  var $ = S.$, fmt = S.fmt, esc = S.esc;
  var NL = String.fromCharCode(10);
  var p = { s: '', sf: 100, su: 0, xs: 0, price: '', yrs: 1, sz: 30, hr: 3 }, sc = null;

  function num(v, d) { v = parseFloat(v); return isFinite(v) ? v : d; }
  function readUrl() {
    var q = S.query();
    p.s = q.s || ''; p.sf = num(q.sf, 100); p.su = num(q.su, 0); p.xs = num(q.xs, 0); p.price = q.p || ''; p.yrs = num(q.yrs, 1); p.sz = num(q.sz, 30); p.hr = num(q.hr, 3);
    p.sf = Math.max(0, Math.min(100, p.sf)); p.su = Math.max(0, Math.min(100, p.su)); p.sz = Math.max(5, p.sz); p.hr = Math.max(1, p.hr); p.yrs = Math.max(1, Math.min(5, Math.round(p.yrs)));
  }
  function writeUrl() {
    S.setQuery({ s: p.s, sf: p.sf === 100 ? '' : p.sf, su: p.su ? p.su : '', xs: p.xs ? p.xs : '', p: p.price, yrs: p.yrs === 1 ? '' : p.yrs, sz: p.sz === 30 ? '' : p.sz, hr: p.hr === 3 ? '' : p.hr });
  }

  function calc() {
    var s = sc, r = {};
    r.staffBase = s.lv === '大專' ? p.xs : S.staff(s);
    r.stuBase = S.stu18(s);
    r.staffSeats = Math.round(r.staffBase * p.sf / 100);
    r.stuSeats = Math.round(r.stuBase * p.su / 100);
    r.seats = r.staffSeats + r.stuSeats;
    var price = num(p.price, 0);
    r.cost = price > 0 ? r.seats * price * p.yrs : null;
    r.sessions = r.staffSeats > 0 ? Math.ceil(r.staffSeats / p.sz) : 0;
    r.hours = r.sessions * p.hr;
    return r;
  }

  function stuNote(s) {
    if (s.lv === '大專') return '大專學生年滿 18 歲，可以指派 AI Pro for Education。';
    if (s.lv === '高中職') return '高中職學生只有年滿 18 歲的可以指派；這裡用全國比例（約 ' + Math.round((S.hs18 || 0) * 100) + '%）估算，各校實際不同，請以貴校帳號年齡設定為準。未滿 18 歲的學生使用學校方案內含的 Gemini for Education，依年齡資格分階段開放。';
    return '國小與國中學生未滿 18 歲，不適用 AI Pro for Education；他們能用的 Gemini 功能來自學校方案內含的 Gemini for Education，依年齡資格分階段開放，管理員可逐一應用程式決定開不開。';
  }

  function render() {
    var s = sc, r = calc(), where = s.d === '區域未標示' ? s.c : s.c + s.d;
    writeUrl();
    $('qtManual').hidden = s.lv !== '大專';
    $('qtOut').innerHTML =
      '<div class="sx-kpis sx-num qt-kpis">' +
      '<div class="sx-kpi"><div class="k">AI Pro 授權數（估）</div><div class="v">' + fmt(r.seats) + '</div><div class="d">教職員 ' + fmt(r.staffSeats) + '，學生 ' + fmt(r.stuSeats) + '</div></div>' +
      '<div class="sx-kpi"><div class="k">潛在上限</div><div class="v">' + fmt(r.staffBase + r.stuBase) + '</div><div class="d">全部可指派的人都使用</div></div>' +
      '<div class="sx-kpi"><div class="k">教師研習</div><div class="v">' + r.sessions + ' 場</div><div class="d">每場 ' + p.sz + ' 人、' + p.hr + ' 小時，共 ' + r.hours + ' 小時</div></div>' +
      '<div class="sx-kpi"><div class="k">預算參考</div><div class="v">' + (r.cost == null ? '填單價' : fmt(r.cost)) + '</div><div class="d">' + (r.cost == null ? '左邊填入你取得的每授權年費' : fmt(r.seats) + ' 席 × 單價 × ' + p.yrs + ' 年') + '</div></div></div>';

    var rows = [['教職員（專任教師加職員）', fmt(r.staffBase), p.sf + '%', fmt(r.staffSeats)], ['年滿 18 歲的學生（估）', fmt(r.stuBase), p.su + '%', fmt(r.stuSeats)]];
    var tbl = '<table class="sx-tbl"><thead><tr><th>對象</th><th>可指派人數</th><th>預計導入比例</th><th>授權數</th></tr></thead><tbody>' +
      rows.map(function (x) { return '<tr><td>' + x[0] + '</td><td class="sx-num">' + x[1] + '</td><td class="sx-num">' + x[2] + '</td><td class="sx-num"><b>' + x[3] + '</b></td></tr>'; }).join('') +
      '<tr><td><b>合計</b></td><td></td><td></td><td class="sx-num"><b>' + fmt(r.seats) + '</b></td></tr></tbody></table>';

    var money = r.cost == null
      ? '<p>授權單價依授權人數、訂閱年限與貴校現有的 Workspace 版本而定，沒有一個對所有學校都適用的單價。請洽鴻綸科技取得當期報價。</p>'
      : '<p>以每授權每年 ' + fmt(num(p.price, 0)) + ' 元、訂閱 ' + p.yrs + ' 年估算：' + fmt(r.seats) + ' 席 × ' + fmt(num(p.price, 0)) + ' 元 × ' + p.yrs + ' 年 = <b>' + fmt(r.cost) + ' 元</b>。單價為試算輸入值，實際金額以當期報價為準。</p>';

    $('proposal').innerHTML =
      '<header class="pp-head"><img src="/img/hunglun-logo-company-light.webp" alt="鴻綸科技" width="150" height="47"><div><div class="pp-t">Google AI Pro for Education 導入評估</div><div class="pp-s">' + esc(s.n) + '（' + esc(where) + '）</div><div class="pp-d">日期：' + new Date().toLocaleDateString('zh-TW') + '</div></div></header>' +
      '<h3>一、學校概況</h3>' +
      '<table class="sx-tbl"><tbody><tr><td>學制</td><td>' + s.lv + '・' + (s.pub ? '公立' : '私立') + '</td><td>' + S.latest + ' 學年度學生數</td><td class="sx-num">' + fmt(s.cur) + '</td></tr>' +
      '<tr><td>班級數</td><td class="sx-num">' + (s.cl[S.iL] == null ? '無資料' : s.cl[S.iL]) + '</td><td>專任教師</td><td class="sx-num">' + (s.lv === '大專' ? '無資料' : fmt(s.t[0] + s.t[1])) + '</td></tr>' +
      '<tr><td>職員</td><td class="sx-num">' + (s.lv === '大專' ? '無資料' : fmt(s.sf ? s.sf[0] + s.sf[1] : 0)) + '</td><td>資料來源</td><td>教育部統計處</td></tr></tbody></table>' +
      '<h3>二、建議的授權範圍</h3>' + tbl +
      '<ul><li>授權數就是實際要使用的人數，可以只開給教職員，不必全校一起買。</li><li>2025 年 10 月起已取消「每 4 個學生授權送 1 個教職員授權」，教職員人數要一併編列。</li><li>' + stuNote(s) + '</li><li>Google AI Pro for Education 是 Workspace for Education 的加購項目，學校需先有 Workspace for Education 方案（免費的 Education Fundamentals 或付費方案皆可，實際可訂購的版本以 Google 當期公告為準），授權在管理主控台逐人指派。</li></ul>' +
      '<h3>三、預算參考</h3>' + money +
      '<h3>四、建議的導入節奏</h3>' +
      '<ol><li><b>盤點情境：</b>先挑三到五個真實情境，例如公文改寫、家長通知、命題，授權買了沒人用是最常見的浪費。</li>' +
      '<li><b>授權開通與管理端設定：</b>訂購、指派授權、在管理主控台開啟要用的應用程式，通常一到兩週內完成。「方案有含」不等於「老師看得到」，部分功能是分批推送的，要確認到老師真的看得到為止。</li>' +
      '<li><b>教師研習：</b>估計 ' + r.sessions + ' 場（每場 ' + p.sz + ' 人、' + p.hr + ' 小時），從基本操作到課堂與行政實作，由鴻綸科技認證講師授課，費用與授權分開列。</li>' +
      '<li><b>追蹤與擴大：</b>導入後收集使用情形，確認情境跑得順，再評估是否擴大對象。</li></ol>' +
      '<h3>五、採購方式</h3><p>可以評估共同供應契約、台銀標或學校自行採購，各自的流程與所需文件不同。教育部選購名單產品序號：Google AI Pro for Education 1152-0275、Gemini Notebook 1152-0282、Google Vids 1152-0287。</p>' +
      '<h3>六、資料保護</h3><p>教育版等級的 Gemini 不會把資料用於訓練模型，這與個人版 Google AI Pro 不同，學校要用請走教育版授權。</p>' +
      '<footer class="pp-foot"><p><b>鴻綸科技股份有限公司</b>　Google for Education Professional Development Partner</p><p>電話 06-6371192　信箱 gfeh@hunglun.com　台南市新營區綠川路10號</p>' +
      '<p class="pp-note">本文件的人數由教育部公開資料推算，授權數與預算為試算，不是報價。各方案的實際功能、資格與計價條件請以 Google 官方或授權夥伴當期公告為準。</p></footer>';
    $('proposal').hidden = false;
  }

  function summaryText() {
    var s = sc, r = calc();
    return ['【Google AI Pro for Education 導入評估：' + s.n + '】',
      '學制與規模：' + s.lv + '，' + S.latest + ' 學年度 ' + fmt(s.cur) + ' 位學生',
      '建議授權數：' + fmt(r.seats) + ' 席（教職員 ' + fmt(r.staffSeats) + '，年滿 18 歲學生 ' + fmt(r.stuSeats) + '）',
      '教師研習：約 ' + r.sessions + ' 場，每場 ' + p.sz + ' 人、' + p.hr + ' 小時',
      r.cost == null ? '預算：請洽鴻綸科技取得當期報價' : '預算參考：' + fmt(r.cost) + ' 元（單價 ' + fmt(num(p.price, 0)) + ' 元 × ' + fmt(r.seats) + ' 席 × ' + p.yrs + ' 年，試算值）',
      '說明：人數由教育部公開資料推算，授權為試算，不是報價。', '鴻綸科技 06-6371192 gfeh@hunglun.com'].join(NL);
  }

  function quoteLink() {
    var s = sc, r = calc(), n = r.seats, b = n <= 50 ? '50 人以下' : n <= 100 ? '51–100 人' : n <= 300 ? '101–300 人' : n <= 600 ? '301–600 人' : '600 人以上';
    var note = '（由「全國學校人數查詢」試算帶入：建議授權 ' + fmt(r.seats) + ' 席，教職員 ' + fmt(r.staffSeats) + '、學生 ' + fmt(r.stuSeats) + '；研習約 ' + r.sessions + ' 場。僅供參考）';
    return 'https://www.hunglun.com/services/ai-pro-quote?org=' + encodeURIComponent(s.n) + '&seats=' + encodeURIComponent(b) + '&note=' + encodeURIComponent(note);
  }

  function setSchool(id) {
    var s = S.byId[id]; if (!s) return;
    sc = s; p.s = id;
    $('qtPick').hidden = false; $('qtPickName').textContent = s.n + '（' + s.lv + '・' + s.c + (s.d === '區域未標示' ? '' : s.d) + '）';
    $('qtEmpty').hidden = true; $('qtBody').hidden = false;
    $('qS').value = '';
    render();
  }

  function bind() {
    var map = { qSf: 'sf', qSu: 'su', qXs: 'xs', qPrice: 'price', qYrs: 'yrs', qSz: 'sz', qHr: 'hr' };
    Object.keys(map).forEach(function (id) {
      $(id).addEventListener('input', function (e) {
        var k = map[id], v = e.target.value;
        p[k] = k === 'price' ? v : num(v, 0);
        if (k === 'sf' || k === 'su') { $(id + 'V').textContent = v + '%'; if ($(id + 'N')) $(id + 'N').value = v; }
        if (k === 'sz') p.sz = Math.max(5, p.sz);
        if (k === 'hr') p.hr = Math.max(1, p.hr);
        if (k === 'yrs') p.yrs = Math.max(1, Math.min(5, Math.round(p.yrs)));
        if (sc) render();
      });
    });
    $('qS').addEventListener('input', function (e) {
      var q = S.norm(e.target.value.trim()).toLowerCase(), r = $('qRes');
      if (!q) { r.innerHTML = ''; return; }
      var hit = S.schools.filter(function (s) { return s.key.indexOf(q) >= 0 || S.norm(s.c + s.d).indexOf(q) >= 0; }).sort(function (a, b) { return b.seats - a.seats; }).slice(0, 8);
      r.innerHTML = hit.length ? hit.map(function (s) { return '<li><button type="button" data-id="' + s.id + '">' + esc(s.n) + '<small>' + s.lv + '・' + esc(s.c + s.d) + '</small></button></li>'; }).join('') : '<li class="mp-none">找不到學校</li>';
    });
    $('qRes').addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (b) { $('qRes').innerHTML = ''; setSchool(b.dataset.id); } });
    $('qtChange').addEventListener('click', function () { $('qS').focus(); });
    $('qtPrint').addEventListener('click', function () { window.print(); });
    function flash(btn, msg) { var o = btn.dataset.o || btn.textContent; btn.dataset.o = o; btn.textContent = msg; setTimeout(function () { btn.textContent = o; }, 1800); }
    function copy(text, btn) {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { flash(btn, '已複製'); }, function () { flash(btn, '複製失敗，請手動選取'); });
      else { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); flash(btn, '已複製'); } catch (e) { flash(btn, '複製失敗'); } t.remove(); }
    }
    $('qtLink').addEventListener('click', function () { copy(location.href, this); });
    $('qtText').addEventListener('click', function () { if (sc) copy(summaryText(), this); });
    $('qtQuote').addEventListener('click', function () { if (sc) window.open(quoteLink(), '_blank', 'noopener'); });
  }

  S.mods.quote = {
    init: function () {
      readUrl(); bind();
      $('qSf').value = p.sf; $('qSfV').textContent = p.sf + '%'; $('qSfN').value = p.sf;
      $('qSu').value = p.su; $('qSuV').textContent = p.su + '%'; $('qSuN').value = p.su;
      $('qXs').value = p.xs || ''; $('qPrice').value = p.price; $('qYrs').value = p.yrs; $('qSz').value = p.sz; $('qHr').value = p.hr;
      $('qSfN').addEventListener('input', function (e) { $('qSf').value = e.target.value; $('qSf').dispatchEvent(new Event('input')); });
      $('qSuN').addEventListener('input', function (e) { $('qSu').value = e.target.value; $('qSu').dispatchEvent(new Event('input')); });
      if (p.s && S.byId[p.s]) setSchool(p.s);
      else { $('qtEmpty').hidden = false; $('qtBody').hidden = true; }
    }
  };
})(window.SS);
