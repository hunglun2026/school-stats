/* 全國概況：各學制逐年趨勢、年齡性別金字塔（教育部統計處彙總表 data.json） */
(function (S) {
  'use strict';
  var $ = S.$, fmt = S.fmt;
  var LEVELS = ['幼兒園', '國小', '國中', '高中職', '大專'];
  var COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)'];
  var year;

  function sumYear(y, lv) {
    return S.nat.county.filter(function (r) { return r.y === y; }).reduce(function (t, r) { return t + r[lv]; }, 0);
  }
  function total(y) { return S.nat.level.filter(function (r) { return r.y === y && r.item === '總計'; })[0].total; }

  function kpis(years) {
    var prev = year - 1, first = years[0], all = function (y) { return LEVELS.reduce(function (t, l) { return t + sumYear(y, l); }, 0); };
    var t = total(year), tp = years.indexOf(prev) >= 0 ? total(prev) : null;
    $('nk1').innerHTML = '<div class="k">' + year + ' 學年度全國學生總數</div><div class="v">' + fmt(t) + '</div><div class="d">' + (tp ? '較上一學年 ' + S.chg(S.pct(t, tp)) : '最早一學年') + '</div>';
    $('nk2').innerHTML = '<div class="k">五大學制合計，較 ' + first + ' 學年度</div><div class="v">' + S.sgn(S.pct(all(year), all(first))) + '</div><div class="d">' + fmt(all(first)) + ' 人 → ' + fmt(all(year)) + ' 人</div>';
    var kid = sumYear(year, '國小'), kid0 = sumYear(first, '國小');
    $('nk3').innerHTML = '<div class="k">國小學生數，較 ' + first + ' 學年度</div><div class="v">' + S.sgn(S.pct(kid, kid0)) + '</div><div class="d">' + fmt(kid0) + ' 人 → ' + fmt(kid) + ' 人</div>';
  }

  function trend(years) {
    var series = LEVELS.map(function (l, k) { return { name: S.lvName(l), color: COLORS[k], vals: years.map(function (y) { return sumYear(y, l); }) }; });
    S.lineChart($('natTrend'), {
      years: years, series: series, zero: true, labels: true, label: '各學制學生人數逐年趨勢',
      tickFmt: function (v) { return (v / 10000) + ' 萬'; }
    });
    $('natLegend').innerHTML = LEVELS.map(function (l, k) { return '<span><i style="background:' + COLORS[k] + '"></i>' + S.lvName(l) + '</span>'; }).join('');
  }

  function svg0() { return $('natPyr'); }
  function pyramid() {
    var svg = $('natPyr'), W = Math.max(280, svg0().clientWidth || 620), rowH = 17, T = 22, H = T + 28 * rowH + 6, mid = W / 2, NS = 'http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.innerHTML = '';
    var rows = S.nat.age.filter(function (r) { return r.y === year; }), ages = [];
    rows.forEach(function (r) { if (ages.indexOf(r.age) < 0) ages.push(r.age); });
    ages.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    var get = function (a, g) { return rows.filter(function (r) { return r.age === a && r.g === g; })[0].n; };
    var max = Math.max.apply(null, rows.map(function (r) { return r.n; })), half = mid - 56, w = function (n) { return n / max * half; };
    function add(tag, attrs, text) { var e = S.el(tag, attrs, text); svg.appendChild(e); return e; }
    add('text', { x: mid - 44, y: 12, 'text-anchor': 'end', style: 'fill:var(--c1);font-weight:600' }, '男生');
    add('text', { x: mid + 44, y: 12, style: 'fill:var(--c2);font-weight:600' }, '女生');
    ages.forEach(function (a, i) {
      var yy = T + i * rowH, m = get(a, '男'), f = get(a, '女');
      add('rect', { x: mid - 30 - w(m), y: yy, width: w(m), height: rowH - 3, rx: 2, fill: 'var(--c1)' });
      add('rect', { x: mid + 30, y: yy, width: w(f), height: rowH - 3, rx: 2, fill: 'var(--c2)' });
      add('text', { x: mid, y: yy + rowH - 5, 'text-anchor': 'middle' }, a.replace('歲', ''));
      add('title', {}, a + '：男 ' + fmt(m) + ' 人，女 ' + fmt(f) + ' 人');
    });
  }

  function renderAll() {
    var years = Array.from(new Set(S.nat.county.map(function (r) { return r.y; }))).sort();
    kpis(years); trend(years); pyramid();
  }

  S.mods.national = {
    init: function () {
      var years = Array.from(new Set(S.nat.county.map(function (r) { return r.y; }))).sort();
      year = years[years.length - 1];
      var sel = $('natYear');
      years.slice().reverse().forEach(function (y) { sel.add(new Option(y + ' 學年度', y)); });
      sel.addEventListener('change', function () { year = +sel.value; kpis(years); pyramid(); });
      renderAll();
      S.onResize = function () { pyramid(); };
    }
  };
})(window.SS);
