/* 區域排行：縣市 → 鄉鎮市區，由校別資料彙總（國小、國中、高中職、大專） */
(function (S) {
  'use strict';
  var $ = S.$, fmt = S.fmt, esc = S.esc;
  var st = { lv: '', county: '' };

  function agg(list, keyFn) {
    var m = {};
    list.forEach(function (s) {
      var k = keyFn(s), a = m[k] || (m[k] = { k: k, cur: 0, cur5: 0, base5: 0, n: 0 });
      a.cur += s.cur; a.n++;
      if (s.base) { a.cur5 += s.cur; a.base5 += s.base; }
    });
    return Object.keys(m).map(function (k) { m[k].ch = m[k].base5 ? S.pct(m[k].cur5, m[k].base5) : null; return m[k]; });
  }
  function rowHtml(a, max, attr, current) {
    return '<li><button type="button" class="sx-row" ' + attr + (current ? ' aria-current="true"' : '') + '>' +
      '<span>' + esc(a.k) + '</span><span class="bar"><i style="width:' + (a.cur / max * 100).toFixed(1) + '%"></i></span>' +
      '<span class="n sx-num">' + fmt(a.cur) + '<small>' + a.n + ' 所　' + S.chg(a.ch) + '</small></span></button></li>';
  }

  function render() {
    var list = S.schools.filter(function (s) { return !st.lv || s.lv === st.lv; });
    var cs = agg(list, function (s) { return s.c; }).sort(function (a, b) { return b.cur - a.cur; });
    if (!st.county || !cs.some(function (a) { return a.k === st.county; })) st.county = cs[0].k;
    var max = cs[0].cur;
    $('regCounties').innerHTML = cs.map(function (a) { return rowHtml(a, max, 'data-c="' + esc(a.k) + '"', a.k === st.county); }).join('');
    var ds = agg(list.filter(function (s) { return s.c === st.county; }), function (s) { return s.d; })
      .sort(function (a, b) { return (a.k === '區域未標示') - (b.k === '區域未標示') || b.cur - a.cur; });
    var dmax = Math.max.apply(null, ds.map(function (a) { return a.cur; }));
    $('regTitle').textContent = st.county + '各鄉鎮市區';
    S.setQuery({ c: st.county, lv: st.lv });
    var cur = cs.filter(function (a) { return a.k === st.county; })[0];
    $('regSub').innerHTML = '共 ' + ds.length + ' 個區域、' + cur.n + ' 所學校、' + fmt(cur.cur) + ' 人。點一下區域，直接看那裡的學校。';
    $('regDistricts').innerHTML = ds.map(function (a) { return rowHtml(a, dmax, 'data-d="' + esc(a.k) + '"', false); }).join('');
  }

  function link(c, d) {
    var p = new URLSearchParams(); p.set('c', c); if (d) p.set('d', d); if (st.lv) p.set('lv', st.lv);
    return '/?' + p.toString();
  }

  S.mods.region = {
    init: function () {
      var qs = S.query(); st.lv = qs.lv || ''; st.county = qs.c || '';
      function pressed() { document.querySelectorAll('[data-rlv]').forEach(function (o) { o.setAttribute('aria-pressed', o.dataset.rlv === st.lv); }); }
      pressed();
      document.querySelectorAll('[data-rlv]').forEach(function (b) {
        b.addEventListener('click', function () { st.lv = b.dataset.rlv; pressed(); render(); });
      });
      $('regCounties').addEventListener('click', function (e) {
        var b = e.target.closest('[data-c]'); if (b) { st.county = b.dataset.c; render(); }
      });
      $('regDistricts').addEventListener('click', function (e) {
        var b = e.target.closest('[data-d]');
        if (b) location.href = link(st.county, b.dataset.d === '區域未標示' ? '' : b.dataset.d);
      });
      $('regGo').addEventListener('click', function () { location.href = link(st.county, ''); });
      render();
    }
  };
})(window.SS);
