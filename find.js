/* 找學校：篩選、結果清單、學校詳情側欄、比較 */
(function (S) {
  'use strict';
  var $ = S.$, fmt = S.fmt, esc = S.esc;
  var COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)'];
  var f = { q: '', county: '', district: '', lv: '', pub: '', sort: 'big', shown: 40 }, curId = '';
  function sync() { S.setQuery({ q: f.q, c: f.county, d: f.district, lv: f.lv, pub: f.pub, sort: f.sort === 'big' ? '' : f.sort, s: curId }); }
  var cmp = [], metric = 'st', lastFocus = null, view = [];

  function match(s, qn) { return !qn || s.key.indexOf(qn) >= 0 || S.norm(s.c + s.d).indexOf(qn) >= 0; }
  function filtered() {
    var qn = S.norm(f.q.trim()).toLowerCase();
    var out = S.schools.filter(function (s) {
      return (!f.lv || s.lv === f.lv) && (!f.county || s.c === f.county) && (!f.district || s.d === f.district) &&
        (f.pub === '' || String(s.pub) === f.pub) && match(s, qn);
    });
    var by = {
      big: function (a, b) { return b.cur - a.cur; },
      small: function (a, b) { return a.cur - b.cur; },
      down: function (a, b) { return (a.ch5 == null) - (b.ch5 == null) || a.ch5 - b.ch5; },
      up: function (a, b) { return (a.ch5 == null) - (b.ch5 == null) || b.ch5 - a.ch5; },
      fut: function (a, b) { return (a.fut == null) - (b.fut == null) || a.fut - b.fut; },
      name: function (a, b) { return a.n.localeCompare(b.n, 'zh-Hant'); }
    };
    return out.sort(by[f.sort]);
  }

  function counties() {
    var c = {};
    S.schools.forEach(function (s) { c[s.c] = (c[s.c] || 0) + s.cur; });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
  }
  function fillDistricts() {
    var sel = $('fDistrict'), c = {};
    sel.innerHTML = '<option value="">全部鄉鎮市區</option>';
    sel.disabled = !f.county;
    if (!f.county) return;
    S.schools.forEach(function (s) { if (s.c === f.county) c[s.d] = (c[s.d] || 0) + 1; });
    Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).forEach(function (d) {
      sel.add(new Option(d + '（' + c[d] + ' 所）', d));
    });
    sel.value = f.district;
  }

  function hl(name, qn) {
    var i = qn ? S.norm(name).toLowerCase().indexOf(qn) : -1;
    return i < 0 ? esc(name) : esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + qn.length)) + '</mark>' + esc(name.slice(i + qn.length));
  }

  function exportCsv() {
    var rows = [['學校', '學制', '公私立', '縣市', '鄉鎮市區', S.latest + '學年度學生數', '班級數', '五年變化(%)', '專任教師', '地址', '電話', '網站']];
    view.forEach(function (s) {
      rows.push([s.n, s.lv, s.pub ? '公立' : '私立', s.c, s.d, s.cur, s.cl[S.iL], s.ch5 == null ? '' : s.ch5.toFixed(1), s.t[0] + s.t[1], s.a || '', s.tel || '', s.web || '']);
    });
    var csv = rows.map(function (r) { return r.map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = '學校人數_' + S.latest + '學年度.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function render() {
    sync();
    view = filtered();
    var qn = S.norm(f.q.trim()).toLowerCase(), total = 0, cur5 = 0, base5 = 0;
    view.forEach(function (s) { total += s.cur; if (s.base) { cur5 += s.cur; base5 += s.base; } });
    $('sum').innerHTML = '<strong>' + fmt(view.length) + ' 所學校</strong><span class="sx-num">合計 ' + fmt(total) + ' 人' +
      (base5 ? '，較 ' + S.years[S.iL - 5] + ' 學年度 ' + S.chg(S.pct(cur5, base5)) : '') + ' <button type="button" class="sx-link" id="exp">匯出清單</button></span>';
    $('exp').onclick = exportCsv;
    var ul = $('list');
    if (!view.length) {
      ul.innerHTML = '<li class="sx-empty">找不到符合條件的學校。試試縮短校名，或按「清除條件」。</li>';
      $('more').hidden = true; return;
    }
    ul.innerHTML = view.slice(0, f.shown).map(function (s) {
      var on = cmp.indexOf(s.id) >= 0;
      return '<li class="sx-item"><button type="button" class="sx-open" data-id="' + s.id + '">' +
        '<div><div class="sx-name">' + hl(s.n, qn) + '</div><div class="sx-meta"><span class="sx-tag">' + s.lv + '</span><span class="sx-tag">' +
        (s.pub ? '公立' : '私立') + '</span><span>' + esc(s.c) + ' ' + esc(s.d) + '</span></div></div>' +
        S.spark(s.st.slice(-11)) +
        '<div class="sx-big sx-num"><b>' + fmt(s.cur) + '</b>' + S.chg(s.ch5, '五年') + '</div></button>' +
        '<button type="button" class="sx-cmp" data-cmp="' + s.id + '" aria-pressed="' + on + '" aria-label="' + (on ? '移出比較：' : '加入比較：') + esc(s.n) + '">' +
        (on ? '已加入' : '＋比較') + '</button></li>';
    }).join('');
    $('more').hidden = view.length <= f.shown;
    $('more').textContent = '再顯示 ' + Math.min(40, view.length - f.shown) + ' 所（還有 ' + fmt(view.length - f.shown) + ' 所）';
  }

  /* ---------- 比較 ---------- */
  function toggleCmp(id) {
    var i = cmp.indexOf(id);
    if (i >= 0) cmp.splice(i, 1);
    else if (cmp.length >= 4) { $('trayMsg').textContent = '最多同時比較 4 所學校'; return; }
    else cmp.push(id);
    $('trayMsg').textContent = '';
    renderTray(); render();
    var b = $('dCmp'); if (b && !$('drawer').hidden && b.dataset.id === id) b.textContent = cmp.indexOf(id) >= 0 ? '移出比較' : '加入比較';
  }
  function renderTray() {
    var t = $('tray');
    t.hidden = !cmp.length;
    $('trayPills').innerHTML = cmp.map(function (id, k) {
      return '<span class="sx-pill"><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + COLORS[k] + '"></i>' +
        esc(S.byId[id].n) + '<button type="button" data-rm="' + id + '" aria-label="移出比較：' + esc(S.byId[id].n) + '">×</button></span>';
    }).join('');
    $('goCmp').disabled = cmp.length < 2;
    $('goCmp').textContent = cmp.length < 2 ? '再選 1 所即可比較' : '比較 ' + cmp.length + ' 所';
  }

  function openCompare() {
    var ids = cmp.slice(), idx = false;
    var box = $('cmpChart'), body = $('cmpBody');
    function draw() {
      var schools = ids.map(function (id) { return S.byId[id]; });
      var base = 0;  // 指數基準：所有學校都有資料的第一個學年
      for (var i = 0; i < S.years.length; i++) if (schools.every(function (s) { return s.st[i] != null; })) { base = i; break; }
      var series = schools.map(function (s, k) {
        return { name: s.n, color: COLORS[k], vals: s.st.map(function (v, i) { return v == null ? null : idx ? (i < base ? null : +(v / s.st[base] * 100).toFixed(1)) : v; }) };
      });
      S.lineChart(box, { years: S.years, series: series, label: '學校人數比較', valFmt: idx ? function (v) { return v.toFixed(1); } : fmt });
      $('cmpNote').textContent = idx ? S.years[base] + ' 學年度 = 100，看相對變化，不受學校大小影響。' : '各校每學年學生人數。';
      $('cmpLegend').innerHTML = schools.map(function (s, k) { return '<span><i style="background:' + COLORS[k] + '"></i>' + esc(s.n) + '</span>'; }).join('');
      body.innerHTML = '<table class="sx-tbl"><thead><tr><th>學校</th><th>學生數</th><th>班級</th><th>每班</th><th>五年變化</th></tr></thead><tbody>' +
        schools.map(function (s) {
          var cl = s.cl[S.iL];
          return '<tr><td>' + esc(s.n) + '<br><small>' + esc(s.c + ' ' + s.d) + '</small></td><td class="sx-num">' + fmt(s.cur) + '</td><td class="sx-num">' + (cl == null ? '-' : cl) +
            '</td><td class="sx-num">' + (cl ? (s.cur / cl).toFixed(1) : '-') + '</td><td>' + S.chg(s.ch5) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    $('cmpSeg').querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { idx = b.dataset.m === 'idx'; $('cmpSeg').querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-pressed', o === b); }); draw(); };
      b.setAttribute('aria-pressed', b.dataset.m === 'abs');
    });
    draw();
    openDrawer($('cmp'));
  }

  /* ---------- 側欄 ---------- */
  function openDrawer(el) {
    lastFocus = document.activeElement;
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    var x = el.querySelector('.sx-x'); if (x) x.focus();
  }
  function closeDrawers() {
    ['drawer', 'cmp'].forEach(function (id) { $(id).hidden = true; });
    document.body.style.overflow = '';
    curId = ''; sync();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function gradeBars(s) {
    var first = s.lv === '國中' ? 7 : 1, n = s.g.length / 2, max = Math.max.apply(null, s.g) || 1, h = '';
    var lab = function (k) { return s.lv === '高中職' ? '高' + '一二三四'.charAt(k) : (first + k) + ' 年級'; };
    for (var i = 0; i < n; i++) {
      var m = s.g[i * 2], w = s.g[i * 2 + 1];
      h += '<div class="sx-g sx-num" title="' + lab(i) + '：' + s.gc[i] + ' 班"><span>' + lab(i) + '</span>' +
        '<span class="bm"><i style="width:' + (m / max * 100).toFixed(1) + '%"></i><em>' + m + '</em></span>' +
        '<span class="bf"><i style="width:' + (w / max * 100).toFixed(1) + '%"></i><em>' + w + '</em></span></div>';
    }
    return '<div class="sx-ghead"><span></span><span>男生</span><span>女生</span></div><div class="sx-grades">' + h + '</div>' +
      '<p class="sub" style="margin-top:8px">各年級班級數：' + s.gc.join('、') + '</p>';
  }

  function rankBlock(s) {
    var same = S.schools.filter(function (o) { return o.lv === s.lv && o.c === s.c && (s.d === '區域未標示' || o.d === s.d); });
    var cty = S.schools.filter(function (o) { return o.lv === s.lv && o.c === s.c; });
    var avg = function (a) { return Math.round(a.reduce(function (t, o) { return t + o.cur; }, 0) / a.length); };
    var rank = same.filter(function (o) { return o.cur > s.cur; }).length + 1;
    var rows = [[s.n, s.cur], ['同區平均', avg(same)], [s.c + '平均', avg(cty)]], max = Math.max.apply(null, rows.map(function (r) { return r[1]; }));
    var where = s.d === '區域未標示' ? s.c : s.c + s.d;
    return '<p class="sub">' + esc(where) + '共有 ' + same.length + ' 所' + s.lv + '，本校學生數排第 <b>' + rank + '</b>。</p><div class="sx-rank sx-num">' +
      rows.map(function (r, k) {
        return '<div class="sx-rk"><span>' + esc(r[0]) + '</span><span class="bar"><i style="width:' + (r[1] / max * 100).toFixed(1) +
          '%;' + (k ? 'background:var(--muted)' : '') + '"></i></span><span>' + fmt(r[1]) + '</span></div>';
      }).join('') + '</div>';
  }


  var PCOL = ['var(--c3)', 'var(--c2)', 'var(--c5)'];
  function projHtml(s) {
    if (!s.g.length) return '';
    var pc = S.project(s, 'cohort'), pf = S.project(s, 'flat');
    var cl = s.cl[S.iL], per = cl ? s.cur / cl : 0, end = S.latest + S.HORIZON;
    var kf = Math.min(3, s.g.length / 2 - 1), last = pc.total[S.HORIZON], f3 = pc.floor[kf], h3 = pc.total[3];  // 三年制學校 3 年後現有學生已全部畢業，改看第 kf 年
    var classes = per ? Math.max(1, Math.round(last / per)) : null;
    var err = s.lv === '國小' ? '約 2%、4%、7%' : '約 4%、7%、9%';
    return '<div class="sx-sec"><h3>未來 ' + S.HORIZON + ' 年推估</h3><p class="sub">現有學生逐年升級，這部分幾乎確定；新生人數依「世代銜接」推估（國小看現在 5 歲、4 歲的在學人數，國中與高中職看現在更低年級的在學人數），不是單純假設趨勢。</p>' +
      '<div class="sx-chart" id="pChart"></div><div class="sx-legend" id="pLegend"></div>' +
      '<p class="sx-pnote">推估 ' + (S.latest + 3) + ' 學年度約 <b>' + fmt(h3) + ' 人</b>（較今年 ' + S.chg(S.pct(h3, s.cur)) + '），' + end + ' 學年度約 <b>' + fmt(last) + ' 人</b>' + (classes ? '，約 ' + classes + ' 班（以目前每班 ' + per.toFixed(1) + ' 人估）' : '') +
      '。其中 ' + fmt(f3) + ' 人是 ' + (S.latest + kf) + ' 學年度仍在學的現有學生。</p>' +
      '<p class="sub">用過去資料回測，預測 1、2、3 年後的學校人數，平均誤差' + err + '。不含遷入遷出與學區調整，也不代表任何裁併或減班決定。<a href="/method/">算法說明</a></p></div>';
  }
  function drawProj(s) {
    if (!s.g.length || !$('pChart')) return;
    var yrs = S.years.slice(), k;
    for (k = 1; k <= S.HORIZON; k++) yrs.push(S.latest + k);
    var pad = function (arr, from) { var o = []; for (var i = 0; i < yrs.length; i++) o.push(i < from ? null : arr[i - from]); return o; };
    var pc = S.project(s, 'cohort'), pf = S.project(s, 'flat');
    var series = [{ name: '實際', color: 'var(--c1)', w: 2.8, vals: s.st.concat(new Array(S.HORIZON).fill(null)) },
      { name: '現有學生仍在學', color: 'var(--muted)', dash: '2 4', vals: pad(pc.floor, S.iL) },
      { name: '若新生持平', color: 'var(--c4)', dash: '6 4', vals: pad(pf.total, S.iL) },
      { name: '推估（世代銜接）', color: 'var(--c2)', w: 2.8, dash: '7 3', vals: pad(pc.total, S.iL) }];
    S.lineChart($('pChart'), { zero: true, years: yrs, series: series, futureFrom: S.iL + 1, label: s.n + '未來推估', valFmt: function (v) { return fmt(v) + ' 人'; } });
    $('pLegend').innerHTML = series.map(function (x) { return '<span><i style="background:' + x.color + '"></i>' + x.name + '</span>'; }).join('');
  }
  function gwsHtml(s) {
    var tch = s.t[0] + s.t[1];
    return '<div class="sx-sec sx-gws"><h3>導入 Google Workspace for Education 的規模估算</h3>' +
      '<p class="sub">依這所學校的在學人數與專任教師數粗估，方便評估導入範圍。</p>' +
      '<div class="sx-kpis sx-num"><div class="sx-kpi"><div class="k">學生帳號</div><div class="v">' + fmt(s.cur) + '</div></div>' +
      '<div class="sx-kpi"><div class="k">教師帳號（專任）</div><div class="v">' + (tch ? fmt(tch) : '無資料') + '</div></div>' +
      (s.lv === '大專' ? '' : '<div class="sx-kpi"><div class="k">每人一台 Chromebook</div><div class="v">' + fmt(s.cur) + ' 台</div><div class="d">班級共用一般只需其中一部分</div></div>' +
      '<div class="sx-kpi"><div class="k">班級數（Classroom 課程）</div><div class="v">' + s.cl[S.iL] + '</div><div class="d">一班至少一個</div></div>') + '</div>' +
      '<p class="sub" style="margin-top:8px">只是帳號與設備數量的概算，不含職員與行政帳號，授權方案與費用請洽我們。鴻綸科技是 Google for Education Professional Development Partner，可協助評估、導入與教師研習。</p>' +
      '<a class="sx-btn primary" style="display:inline-block;margin-top:6px;text-decoration:none" href="https://www.hunglun.com/contact" target="_blank" rel="noopener">詢問 ' + esc(s.n) + ' 的導入方案</a></div>';
  }

  function drawMetric(s) {
    var vals, vf = fmt, label;
    if (metric === 'st') { vals = s.st; label = '學生數'; }
    else if (metric === 'cl') { vals = s.cl; label = '班級數'; }
    else { vals = s.st.map(function (v, i) { return v != null && s.cl[i] ? +(v / s.cl[i]).toFixed(1) : null; }); vf = function (v) { return v.toFixed(1); }; label = '平均每班人數'; }
    S.lineChart($('dChart'), { years: S.years, series: [{ name: '', color: 'var(--c1)', vals: vals }], label: s.n + label + '逐年趨勢', valFmt: function (v) { return vf(v) + (metric === 'cl' ? ' 班' : ' 人'); }, tickFmt: metric === 'avg' ? function (v) { return v.toFixed(0); } : fmt });
  }

  function open(id, fromHash) {
    var s = S.byId[id]; if (!s) return;
    var cl = s.cl[S.iL], tch = s.t[0] + s.t[1], males = 0, i;
    for (i = 0; i < s.g.length; i += 2) males += s.g[i];
    if (s.mf) males = s.mf[0];  // 大專沒有各年級資料，直接用男生計
    var mp = Math.round(males / s.cur * 100);
    var mapQ = encodeURIComponent(s.a || s.c + s.d + s.n);
    metric = 'st';
    $('dBody').innerHTML =
      '<h2 id="dName">' + esc(s.n) + '</h2><div class="sx-where"><span class="sx-tag">' + s.lv + '</span><span class="sx-tag">' + (s.pub ? '公立' : '私立') + '</span><span>' + esc(s.c + ' ' + s.d) + '</span></div>' +
      '<div class="sx-kpis sx-num">' +
      '<div class="sx-kpi"><div class="k">' + S.latest + ' 學年度學生數</div><div class="v">' + fmt(s.cur) + '</div><div class="d">' + S.chg(s.ch5, '較 ' + S.years[S.iL - 5]) + '</div></div>' +
      (cl == null ? '' : '<div class="sx-kpi"><div class="k">班級數</div><div class="v">' + cl + '</div><div class="d">平均每班 ' + (cl ? (s.cur / cl).toFixed(1) : '-') + ' 人</div></div>') +
      (s.lv === '大專' ? '' : '<div class="sx-kpi"><div class="k">專任教師</div><div class="v">' + (tch || '無資料') + '</div><div class="d">' + (tch ? '每位教師對應 ' + (s.cur / tch).toFixed(1) + ' 位學生' : '無資料') + '</div></div>') +
      '<div class="sx-kpi"><div class="k">男女比例</div><div class="v">' + mp + ' : ' + (100 - mp) + '</div><div class="d">男 ' + fmt(males) + '，女 ' + fmt(s.cur - males) + '</div></div></div>' +
      '<div class="sx-sec"><h3>白話解讀</h3><div class="sx-sumtext" id="dSm">載入中…</div><p class="sub">由公開在學人數自動整理，沒有人工評論。</p></div>' +
      '<div class="sx-sec"><h3>歷年變化</h3><div class="sx-seg" id="dSeg"><button type="button" data-m="st" aria-pressed="true">學生數</button><button type="button" data-m="cl" aria-pressed="false">班級數</button><button type="button" data-m="avg" aria-pressed="false">每班人數</button></div><div class="sx-chart" id="dChart"></div></div>' +
      (s.g.length ? '<div class="sx-sec"><h3>各年級男女人數</h3><p class="sub">' + S.latest + ' 學年度</p>' + gradeBars(s) + '</div>' : '') +
      '<div class="sx-sec"><h3>和附近學校比</h3>' + rankBlock(s) + '</div>' +
      projHtml(s) + gwsHtml(s) +
      '<div class="sx-sec"><h3>聯絡資訊</h3><div class="sx-contact">' +
      (s.a ? '<div>地址：<a href="https://www.google.com/maps/search/?api=1&query=' + mapQ + '" target="_blank" rel="noopener">' + esc(s.a) + '</a></div>' : '') +
      (s.tel ? '<div>電話：<a href="tel:' + esc(s.tel.replace(/[^\d+]/g, '')) + '">' + esc(s.tel) + '</a></div>' : '') +
      (s.web && /^https?:\/\//.test(s.web) ? '<div>網站：<a href="' + esc(s.web) + '" target="_blank" rel="noopener">' + esc(s.web) + '</a></div>' : '') +
      (!s.a && !s.tel ? '<div>這所學校附設在其他學校內，名錄沒有獨立的聯絡資料。</div>' : '') + '</div></div>' +
      '<div class="sx-actions"><button type="button" class="sx-btn primary" id="dCmp" data-id="' + s.id + '">' + (cmp.indexOf(s.id) >= 0 ? '移出比較' : '加入比較') + '</button>' +
      (s.d !== '區域未標示' ? '<button type="button" class="sx-btn" id="dArea">看 ' + esc(s.d) + ' 所有學校</button>' : '') +
      '<a class="sx-btn" style="text-decoration:none" href="/school/' + s.id + '/">開啟完整頁面</a>' +
      '<a class="sx-btn" style="text-decoration:none" href="/map/?s=' + s.id + '">在地圖上看</a></div>';
    drawMetric(s); drawProj(s);
    if (cl == null && $('dSeg')) $('dSeg').style.display = 'none';
    S.summaries().then(function (m) {
      var el = $('dSm'); if (!el || curId !== s.id) return;
      el.innerHTML = (m[s.id] || '').split(/(?<=。)/).filter(Boolean).map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') || '暫無解讀';
    }).catch(function () { var el = $('dSm'); if (el) el.textContent = '解讀載入失敗'; });
    $('dSeg').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      metric = b.dataset.m;
      this.querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
      drawMetric(s);
    };
    $('dCmp').onclick = function () { toggleCmp(s.id); };
    var area = $('dArea');
    if (area) area.onclick = function () {
      f.county = s.c; f.district = s.d; f.lv = s.lv; f.q = ''; f.shown = 40;
      syncControls(); closeDrawers(); render(); $('sum').scrollIntoView({ block: 'start' });
    };
    $('cmp').hidden = true;
    if ($('drawer').hidden) openDrawer($('drawer')); else $('drawer').querySelector('.sx-panel').scrollTop = 0;
    curId = id; sync();
  }

  function syncControls() {
    $('q').value = f.q; $('fCounty').value = f.county; fillDistricts();
    $('fSort').value = f.sort;
    document.querySelectorAll('[data-lv]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lv === f.lv); });
    document.querySelectorAll('[data-pub]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.pub === f.pub); });
  }

  S.mods.find = {
    open: open,
    init: function () {
      var c = $('fCounty');
      c.innerHTML = '<option value="">全部縣市</option>';
      counties().forEach(function (n) { c.add(new Option(n, n)); });
      fillDistricts();
      $('q').addEventListener('input', function (e) { f.q = e.target.value; f.shown = 40; render(); });
      c.addEventListener('change', function () { f.county = c.value; f.district = ''; f.shown = 40; fillDistricts(); render(); });
      $('fDistrict').addEventListener('change', function (e) { f.district = e.target.value; f.shown = 40; render(); });
      $('fSort').addEventListener('change', function (e) { f.sort = e.target.value; f.shown = 40; render(); });
      document.querySelectorAll('[data-lv]').forEach(function (b) { b.addEventListener('click', function () { f.lv = b.dataset.lv; f.shown = 40; syncControls(); render(); }); });
      document.querySelectorAll('[data-pub]').forEach(function (b) { b.addEventListener('click', function () { f.pub = b.dataset.pub; f.shown = 40; syncControls(); render(); }); });
      document.querySelectorAll('[data-quick]').forEach(function (b) {
        b.addEventListener('click', function () {
          f = { q: '', county: '', district: '', lv: '', pub: '', sort: b.dataset.quick, shown: 40 };
          syncControls(); render(); $('sum').scrollIntoView({ block: 'start' });
        });
      });
      $('reset').addEventListener('click', function () { f = { q: '', county: '', district: '', lv: '', pub: '', sort: 'big', shown: 40 }; syncControls(); render(); });
      $('more').addEventListener('click', function () { f.shown += 40; render(); });
      $('list').addEventListener('click', function (e) {
        var o = e.target.closest('.sx-open'), m = e.target.closest('[data-cmp]');
        if (m) toggleCmp(m.dataset.cmp); else if (o) open(o.dataset.id);
      });
      $('trayPills').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) toggleCmp(b.dataset.rm); });
      $('clearCmp').addEventListener('click', function () { cmp = []; renderTray(); render(); });
      $('goCmp').addEventListener('click', openCompare);
      document.querySelectorAll('.sx-drawer').forEach(function (d) {
        d.querySelector('.sx-scrim').addEventListener('click', closeDrawers);
        d.querySelector('.sx-x').addEventListener('click', closeDrawers);
        d.addEventListener('keydown', function (e) {  // 焦點限制在側欄內
          if (e.key === 'Escape') { closeDrawers(); return; }
          if (e.key !== 'Tab') return;
          var items = [].slice.call(d.querySelectorAll('button,a[href]')).filter(function (n) { return !n.disabled && n.offsetParent; });
          if (!items.length) return;
          var first = items[0], last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
      });
      var qs = S.query();
      f.q = qs.q || ''; f.county = qs.c || ''; f.district = qs.d || ''; f.lv = qs.lv || ''; f.pub = qs.pub || ''; f.sort = qs.sort || 'big';
      if (f.county && counties().indexOf(f.county) < 0) { f.county = ''; f.district = ''; }
      renderTray(); syncControls(); render();
      if (qs.s && S.byId[qs.s]) open(qs.s);
    }
  };
})(window.SS);
