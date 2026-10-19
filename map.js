/* 學校地圖：3,000 多所學校畫在地圖上，顏色表示近五年或未來 3 年的人數變化，大小表示學生數 */
(function (S) {
  'use strict';
  var $ = S.$, fmt = S.fmt, esc = S.esc;
  var BINS = [
    { max: -15, c: '#c2410c', t: '減少超過 15%' },
    { max: -5, c: '#f08a4b', t: '減少 5% 到 15%' },
    { max: 5, c: '#9aa3ad', t: '變動在 5% 以內' },
    { max: 15, c: '#6aa7e8', t: '增加 5% 到 15%' },
    { max: 1e9, c: '#1d5fb8', t: '增加超過 15%' }
  ];
  var SEAT_BINS = [
    { max: 30, c: '#c6dbef', t: '30 席以下' }, { max: 100, c: '#8fb7e3', t: '30 到 99 席' }, { max: 300, c: '#4f8fd0', t: '100 到 299 席' },
    { max: 1000, c: '#1f5fae', t: '300 到 999 席' }, { max: 1e9, c: '#0b2f66', t: '1,000 席以上' }
  ];
  var st = { lv: '', county: '', mode: 'ch5', q: '' }, map, canvas, layer, coords, marks = [];

  function val(s) { return st.mode === 'ch5' ? s.ch5 : st.mode === 'fut' ? s.fut : s.seats; }
  function bins() { return st.mode === 'seats' ? SEAT_BINS : BINS; }
  function bin(v) { if (v == null) return null; var B = bins(); for (var i = 0; i < B.length; i++) if (v < B[i].max) return i; return B.length - 1; }
  function zf() { var z = map ? map.getZoom() : 8; return z <= 7 ? .42 : z === 8 ? .52 : z === 9 ? .66 : z === 10 ? .82 : z === 11 ? 1 : z === 12 ? 1.2 : 1.45; }
  function radius(n) { return Math.max(2.2, (2 + Math.sqrt(Math.min(n, 5000)) * 0.3) * zf()); }  // 大專人數大，設上限避免蓋住別的學校

  function popupHtml(s) {
    var v5 = s.ch5, vf = s.fut, mapQ = encodeURIComponent(s.a || s.c + s.d + s.n);
    return '<div class="mp"><b>' + esc(s.n) + '</b><div class="mp-sub">' + S.lvName(s.lv) + '・' + (s.pub ? '公立' : '私立') + '・' + esc(s.c + (s.d === '區域未標示' ? '' : s.d)) + '</div>' +
      '<div class="mp-row"><span>' + S.latest + ' 學年度</span><b class="sx-num">' + fmt(s.cur) + ' 人</b></div>' +
      '<div class="mp-row"><span>近五年</span>' + S.chg(v5) + '</div>' +
      '<div class="mp-row"><span>AI Pro 潛在席次</span><b class="sx-num">' + fmt(s.seats) + '</b></div>' +
      (vf != null ? '<div class="mp-row"><span>未來 3 年推估</span>' + S.chg(vf) + '</div>' : '') +
      (coords[s.id][2] === 1 ? '<div class="mp-note">位置是所附設學校的校園，概略位置</div>' : coords[s.id][2] === 2 ? '<div class="mp-note">位置由校名相近的點推定</div>' : '') +
      '<div class="mp-links"><a href="/?s=' + s.id + '">互動詳情</a><a href="/school/' + s.id + '/">完整頁面</a>' +
      '<a href="https://www.google.com/maps/search/?api=1&query=' + mapQ + '" target="_blank" rel="noopener">Google 地圖</a></div></div>';
  }

  function visible(s) { return coords[s.id] && (!st.lv || s.lv === st.lv) && (!st.county || s.c === st.county); }

  function draw() {
    if (layer) layer.remove();
    layer = L.layerGroup().addTo(map); marks = [];
    var counts = [0, 0, 0, 0, 0], n = 0, nodata = 0, bb = [];
    S.schools.forEach(function (s) {
      if (!visible(s)) return;
      var b = bin(val(s));
      if (b == null) { nodata++; return; }
      counts[b]++; n++;
      var c = coords[s.id].slice(0, 2);
      bb.push(c);
      var m = L.circleMarker(c, { renderer: canvas, radius: radius(s.cur), color: '#ffffff', weight: .8, fillColor: bins()[b].c, fillOpacity: .85 })
        .bindPopup(function () { return popupHtml(s); }, { maxWidth: 280 }).addTo(layer);
      m._n = s.cur; marks.push(m);
    });
    $('mapLegend').innerHTML = bins().map(function (x, i) {
      return '<li><i style="background:' + x.c + '"></i>' + x.t + '<span class="sx-num">' + fmt(counts[i]) + '</span></li>';
    }).join('');
    $('mapSum').textContent = '顯示 ' + fmt(n) + ' 所學校' + (nodata ? '（' + nodata + ' 所因資料不足未上色）' : '');
    return bb;
  }

  function fit(bb) { if (bb.length) map.fitBounds(bb, { padding: [30, 30], maxZoom: 13 }); }

  function setupFilters() {
    var cs = {}; S.schools.forEach(function (s) { if (coords[s.id]) cs[s.c] = (cs[s.c] || 0) + 1; });
    var sel = $('mCounty'); sel.innerHTML = '<option value="">全台灣</option>';
    Object.keys(cs).sort(function (a, b) { return cs[b] - cs[a]; }).forEach(function (c) { sel.add(new Option(c, c)); });
    sel.addEventListener('change', function () { st.county = sel.value; fit(draw()); sync(); });
    document.querySelectorAll('[data-mlv]').forEach(function (b) {
      b.addEventListener('click', function () {
        st.lv = b.dataset.mlv;
        document.querySelectorAll('[data-mlv]').forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
        fit(draw()); sync();
      });
    });
    document.querySelectorAll('[data-mmode]').forEach(function (b) {
      b.addEventListener('click', function () {
        st.mode = b.dataset.mmode;
        document.querySelectorAll('[data-mmode]').forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
        draw(); sync();
      });
    });
    var box = $('mQ');
    box.addEventListener('input', function () {
      var q = S.norm(box.value.trim()).toLowerCase(), r = $('mResults');
      if (q.length < 1) { r.innerHTML = ''; return; }
      var hit = S.schools.filter(function (s) { return coords[s.id] && s.key.indexOf(q) >= 0; }).slice(0, 8);
      r.innerHTML = hit.length ? hit.map(function (s) { return '<li><button type="button" data-id="' + s.id + '">' + esc(s.n) + '<small>' + esc(s.c + s.d) + '</small></button></li>'; }).join('') : '<li class="mp-none">找不到有座標的學校</li>';
    });
    $('mResults').addEventListener('click', function (e) {
      var b = e.target.closest('[data-id]'); if (!b) return;
      var s = S.byId[b.dataset.id];
      map.setView(coords[s.id].slice(0, 2), 16);
      L.popup({ maxWidth: 280 }).setLatLng(coords[s.id].slice(0, 2)).setContent(popupHtml(s)).openOn(map);
      $('mResults').innerHTML = '';
    });
  }

  function sync() { S.setQuery({ c: st.county, lv: st.lv, mode: st.mode === 'ch5' ? '' : st.mode }); }

  S.mods.map = {
    init: function () {
      fetch('/coords.json?v=11').then(function (r) { return r.json(); }).then(function (c) {
        coords = c;
        var qs = S.query(); st.county = qs.c || ''; st.lv = qs.lv || ''; st.mode = qs.mode === 'fut' ? 'fut' : qs.mode === 'seats' ? 'seats' : 'ch5';
        map = L.map('map', { zoomControl: true, preferCanvas: true }).setView([23.7, 120.95], 8);
        canvas = L.canvas({ padding: .5 });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '地圖 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 貢獻者' }).addTo(map);
        setupFilters();
        $('mCounty').value = st.county;
        document.querySelectorAll('[data-mlv]').forEach(function (o) { o.setAttribute('aria-pressed', o.dataset.mlv === st.lv); });
        document.querySelectorAll('[data-mmode]').forEach(function (o) { o.setAttribute('aria-pressed', o.dataset.mmode === st.mode); });
        map.on('zoomend', function () { marks.forEach(function (m) { m.setRadius(radius(m._n)); }); });
        var bb = draw();
        if (st.county || st.lv) fit(bb);
        if (qs.s && S.byId[qs.s] && coords[qs.s]) {
          var t = S.byId[qs.s]; map.setView(coords[t.id].slice(0, 2), 16);
          L.popup({ maxWidth: 280 }).setLatLng(coords[t.id].slice(0, 2)).setContent(popupHtml(t)).openOn(map);
        }
        $('mapCover').textContent = fmt(Object.keys(coords).length) + ' / ' + fmt(S.schools.length);
      }).catch(function () { $('mapSum').textContent = '座標資料載入失敗，請重新整理頁面。'; });
    }
  };
})(window.SS);
