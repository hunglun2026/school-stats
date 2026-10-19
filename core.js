/* 全國中小學人數查詢：共用核心（資料載入、折線圖、迷你線、分頁籤與網址狀態） */
window.SS = (function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var S = { mods: {}, state: {} };

  S.$ = function (id) { return document.getElementById(id); };
  S.fmt = function (n) { return n == null ? '-' : n.toLocaleString('zh-TW'); };
  S.norm = function (s) { return (s || '').replace(/台/g, '臺'); };
  S.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  S.pct = function (a, b) { return b ? (a - b) / b * 100 : null; };
  S.sgn = function (p) { return p == null ? '-' : (p > 0 ? '+' : '') + p.toFixed(1) + '%'; };
  // 變化量：箭頭符號加正負號，不只靠顏色
  S.chg = function (p, label) {
    if (p == null) return '<span class="sx-chg">-</span>';
    var cls = p > 0.05 ? 'up' : p < -0.05 ? 'down' : '';
    var arrow = p > 0.05 ? '▲ ' : p < -0.05 ? '▼ ' : '';
    return '<span class="sx-chg ' + cls + '">' + arrow + S.sgn(p) + (label ? ' ' + label : '') + '</span>';
  };
  S.el = function (tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  };

  /* 迷你趨勢線（清單用）：回傳 svg 字串 */
  S.spark = function (vals) {
    var pts = vals.map(function (v, i) { return v == null ? null : [i, v]; }).filter(Boolean);
    if (pts.length < 2) return '<svg class="spark" aria-hidden="true"></svg>';
    var min = Math.min.apply(null, pts.map(function (p) { return p[1]; })), max = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
    var span = max - min || 1, n = vals.length - 1;
    var xy = pts.map(function (p) { return [(p[0] / n * 88 + 2).toFixed(1), (26 - (p[1] - min) / span * 22).toFixed(1)]; });
    var d = xy.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join('');
    var last = xy[xy.length - 1];
    return '<svg class="spark" viewBox="0 0 92 30" aria-hidden="true"><path d="' + d + '"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.6"/></svg>';
  };

  function niceTicks(min, max, count) {
    var raw = (max - min) / count || 1, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (s) { return s >= raw; })[0];
    var out = [], v = Math.floor(min / step) * step;
    for (;;) { out.push(+v.toFixed(6)); if (v >= max - step * 1e-6) break; v += step; }
    return out;
  }

  /* 折線圖：cfg = {years, series:[{name,color,vals}], zero, label, labels(右側直接標名), valFmt, tickFmt} */
  var charts = [];
  S.lineChart = function (box, cfg) {
    box._cfg = cfg; if (charts.indexOf(box) < 0) charts.push(box);
    box.innerHTML = '';
    var W = Math.max(280, box.clientWidth || 620), H = cfg.h || (W < 480 ? 220 : 280), L = 50, R = cfg.labels ? (W < 480 ? 54 : 70) : 14, T = 12, B = 26;
    var all = [].concat.apply([], cfg.series.map(function (s) { return s.vals.filter(function (v) { return v != null; }); }));
    var min = cfg.zero ? 0 : Math.min.apply(null, all), max = Math.max.apply(null, all);
    if (!cfg.zero) { var pad = (max - min) * 0.12 || max * 0.05 || 1; min -= pad; max += pad; }
    var ticks = niceTicks(min, max, 4);
    min = ticks[0]; max = ticks[ticks.length - 1];
    var n = cfg.years.length - 1;
    var x = function (i) { return L + (W - L - R) * i / n; };
    var y = function (v) { return T + (H - T - B) * (1 - (v - min) / ((max - min) || 1)); };
    var tf = cfg.tickFmt || function (v) { return S.fmt(v); };
    var svg = S.el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': cfg.label || '趨勢圖' });
    ticks.forEach(function (t) {
      svg.appendChild(S.el('line', { x1: L, x2: W - R, y1: y(t), y2: y(t), 'class': 'gl' }));
      svg.appendChild(S.el('text', { x: L - 8, y: y(t) + 4, 'text-anchor': 'end' }, tf(t)));
    });
    var step = n > 8 ? 2 : 1;
    cfg.years.forEach(function (yr, i) {
      if ((n - i) % step === 0) svg.appendChild(S.el('text', { x: x(i), y: H - 6, 'text-anchor': 'middle' }, yr));
    });
    var lastY = [];
    cfg.series.forEach(function (s, k) {
      var d = '', pen = false;
      s.vals.forEach(function (v, i) {
        if (v == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); pen = true;
      });
      var pa = { d: d, fill: 'none', stroke: s.color, 'stroke-width': s.w || 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }; if (s.dash) pa['stroke-dasharray'] = s.dash;
      svg.appendChild(S.el('path', pa));
      for (var i = s.vals.length - 1; i >= 0; i--) if (s.vals[i] != null) { lastY[k] = y(s.vals[i]); break; }
    });
    if (cfg.labels) {  // 右側直接標名，相鄰不足 15px 往下推避免疊字
      var order = cfg.series.map(function (s, k) { return k; }).sort(function (a, b) { return lastY[a] - lastY[b]; }), pos = [];
      order.forEach(function (k, j) { pos[k] = j && lastY[k] < pos[order[j - 1]] + 15 ? pos[order[j - 1]] + 15 : lastY[k]; });
      cfg.series.forEach(function (s, k) {
        svg.appendChild(S.el('text', { x: W - R + 8, y: pos[k] + 4, style: 'fill:var(--text);font-weight:600' }, s.name));
      });
    }
    var cross = S.el('line', { y1: T, y2: H - B, 'class': 'cross', visibility: 'hidden' });
    svg.appendChild(cross);
    var dots = cfg.series.map(function (s) {
      var c = S.el('circle', { r: 4.5, fill: s.color, stroke: 'var(--card)', 'stroke-width': 2, visibility: 'hidden' });
      svg.appendChild(c); return c;
    });
    var hit = S.el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' });
    svg.appendChild(hit);
    box.appendChild(svg);
    var tip = document.createElement('div');
    tip.className = 'sx-tip'; tip.hidden = true;
    box.appendChild(tip);
    var vf = cfg.valFmt || S.fmt;
    function show(ev) {
      var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * W;
      var i = Math.max(0, Math.min(n, Math.round((px - L) / (W - L - R) * n)));
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
      var html = '<b>' + cfg.years[i] + ' 學年度' + (cfg.futureFrom != null && i >= cfg.futureFrom ? '（推估）' : '') + '</b>';
      cfg.series.forEach(function (s, k) {
        var v = s.vals[i];
        if (v == null) { dots[k].setAttribute('visibility', 'hidden'); return; }
        dots[k].setAttribute('cx', x(i)); dots[k].setAttribute('cy', y(v)); dots[k].setAttribute('visibility', 'visible');
        html += '<div><i style="background:' + s.color + '"></i>' + (s.name ? S.esc(s.name) + '　' : '') + vf(v) + '</div>';
      });
      tip.innerHTML = html; tip.hidden = false;
      var bx = box.getBoundingClientRect(), cx = x(i) / W * r.width + (r.left - bx.left);
      var w = tip.offsetWidth;
      tip.style.left = Math.max(0, Math.min(bx.width - w, cx + 12 > bx.width - w ? cx - w - 12 : cx + 12)) + 'px';
      tip.style.top = '4px';
    }
    function hide() {
      cross.setAttribute('visibility', 'hidden'); tip.hidden = true;
      dots.forEach(function (c) { c.setAttribute('visibility', 'hidden'); });
    }
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', hide);
  };

  var rt; window.addEventListener('resize', function () {
    clearTimeout(rt); rt = setTimeout(function () {
      charts.forEach(function (b) { if (b.clientWidth && b._cfg && document.body.contains(b)) S.lineChart(b, b._cfg); });
      if (S.onResize) S.onResize();
    }, 150);
  });

  /* ---------- 網址狀態：?c=縣市&d=鄉鎮&lv=學制&pub=1&sort=down&q=關鍵字&s=學校代碼 ---------- */
  S.query = function () {
    var o = {}; new URLSearchParams(location.search).forEach(function (v, k) { o[k] = v; });
    return o;
  };
  S.setQuery = function (obj) {
    var p = new URLSearchParams();
    for (var k in obj) if (obj[k]) p.set(k, obj[k]);
    var q = p.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  };


  /* ---------- 未來推估 ----------
     現有學生會逐年升級（這部分幾乎確定），只有「新生人數」要假設。三種情境：
       持平：新生和今年一樣多
       全國趨勢：新生每年依全國 6 歲在學人數近五年的年均變化增減
       明顯減少：新生每年依「全國 5 歲在學人數相對 6 歲」的落差減少（下一屆已知比今年少） */
  function rates() {
    var n = {}; S.nat.age.forEach(function (r) {
      if (r.y === S.latest) n[r.age] = (n[r.age] || 0) + r.n;
    });
    var six = {}; S.nat.age.forEach(function (r) { if (r.age === '6歲') six[r.y] = (six[r.y] || 0) + r.n; });
    S.rate = {
      flat: 0,
      trend: Math.pow(six[S.latest] / six[S.latest - 5], 1 / 5) - 1,
      drop: n['5歲'] / n['6歲'] - 1
    };
  }
  S.SCEN = [
    { k: 'flat', name: '新生持平' },
    { k: 'trend', name: '依全國趨勢' },
    { k: 'drop', name: '新生明顯減少' }
  ];
  S.HORIZON = 6;
  // 回傳 {total:[k=0..6], floor:[k=0..6]}：total 含新生，floor 只算目前已在學的學生
  S.project = function (s, r) {
    var gr = s.lv === '國小' ? 6 : 3, g = [], i, k, j, tot = [], floor = [];
    for (i = 0; i < gr; i++) g.push(s.g[i * 2] + s.g[i * 2 + 1]);
    var entrants = g[0];
    for (k = 0; k <= S.HORIZON; k++) {
      var t = 0, f = 0;
      for (j = 1; j <= gr; j++) {
        var from = j - k;  // 今年的 from 年級，到第 k 年升到 j 年級
        if (from >= 1) { t += g[from - 1]; f += g[from - 1]; }
        else t += entrants * Math.pow(1 + r, k - j + 1);
      }
      tot.push(Math.round(t)); floor.push(Math.round(f));
    }
    return { total: tot, floor: floor };
  };

  /* ---------- 載入資料 ---------- */
  function prepare(d) {
    S.years = d.years; S.latest = d.latest; S.iL = d.years.indexOf(d.latest);
    S.built = d.built;
    S.schools = d.schools;
    S.byId = {};
    S.futPending = true;
    d.schools.forEach(function (s) {
      s.cur = s.st[S.iL];
      s.base = s.st[S.iL - 5];
      s.ch5 = s.base ? S.pct(s.cur, s.base) : null;
      s.key = S.norm(s.n).toLowerCase();
      s.fut = null;
      S.byId[s.id] = s;
    });
  }

  S.fillFuture = function () {
    if (!S.rate) return;
    // 太小的學校（30 人以下）百分比跳動太大，不參與「未來減少最多」排序
    S.schools.forEach(function (s) { var p = S.project(s, S.rate.trend).total; s.fut = s.cur >= 30 && s.g[0] + s.g[1] > 0 ? S.pct(p[3], p[0]) : null; });  // 沒有一年級的學校（只收高年級）減少是結構造成，也不排
  };

  S.boot = function () {
    var page = document.body.dataset.page;
    var need = [fetch('/schools.json?v=5').then(function (r) { return r.json(); })];
    if (page === 'national' || page === 'find') need.push(fetch('/data.json?v=5').then(function (r) { return r.json(); }));
    Promise.all(need).then(function (res) {
      prepare(res[0]); S.nat = res[1]; if (S.nat) { rates(); S.fillFuture(); }
      var el = S.$('built'); if (el) el.textContent = S.built;
      var hs = S.$('heroStats');
      if (hs) {
        var tot = 0, cs = {}; S.schools.forEach(function (x) { tot += x.cur; cs[x.c] = 1; });
        hs.innerHTML = '<span><b>' + S.fmt(S.schools.length) + '</b>所學校</span><span><b>' + S.fmt(tot) + '</b>位學生</span><span><b>' + Object.keys(cs).length + '</b>個縣市</span><span>' + S.latest + ' 學年度</span>';
      }
      if (S.mods[page] && S.mods[page].init) S.mods[page].init();
    }).catch(function () {
      var m = S.$('sum') || S.$('regSub') || S.$('nk1'); if (m) m.textContent = '資料載入失敗，請重新整理頁面。';
    });
  };
  document.addEventListener('DOMContentLoaded', S.boot);
  return S;
})();
