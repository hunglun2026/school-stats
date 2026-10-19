/* 推廣名單：依 AI Pro for Education 潛在席次排序，標記聯絡進度（只存在這台電腦的瀏覽器），可匯出與匯入 */
(function (S) {
  'use strict';
  var $ = S.$, fmt = S.fmt, esc = S.esc;
  var KEY = 'hlLeads';
  var STATUS = ['未聯絡', '已聯絡', '洽談中', '已報價', '已成交', '暫不需要'];
  var f = { q: '', county: '', district: '', lv: '', pub: '', min: '0', status: '', sort: 'seats', shown: 50 }, store = {}, view = [];
  var NL = String.fromCharCode(10), CR = String.fromCharCode(13), QT = String.fromCharCode(34);

  function load() { try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); $('ldWarn').hidden = true; } catch (e) { $('ldWarn').hidden = false; } }
  function stOf(id) { return (store[id] && store[id].st) || '未聯絡'; }
  function noteOf(id) { return (store[id] && store[id].note) || ''; }
  function staffOf(s) { return s.lv === '大專' ? null : S.staff(s); }

  function filtered() {
    var qn = S.norm(f.q.trim()).toLowerCase(), min = +f.min;
    var out = S.schools.filter(function (s) {
      return (!f.lv || s.lv === f.lv) && (!f.county || s.c === f.county) && (!f.district || s.d === f.district) &&
        (f.pub === '' || String(s.pub) === f.pub) && s.seats >= min && (!f.status || stOf(s.id) === f.status) &&
        (!qn || s.key.indexOf(qn) >= 0 || S.norm(s.c + s.d).indexOf(qn) >= 0);
    });
    var by = {
      seats: function (a, b) { return b.seats - a.seats; },
      stu: function (a, b) { return b.cur - a.cur; },
      name: function (a, b) { return a.n.localeCompare(b.n, 'zh-Hant'); },
      status: function (a, b) { return STATUS.indexOf(stOf(a.id)) - STATUS.indexOf(stOf(b.id)) || b.seats - a.seats; }
    };
    return out.sort(by[f.sort]);
  }

  function sync() { S.setQuery({ q: f.q, c: f.county, d: f.district, lv: f.lv, pub: f.pub, min: f.min === '0' ? '' : f.min, st: f.status, sort: f.sort === 'seats' ? '' : f.sort }); }

  function summary() {
    var seats = 0, staff = 0, stu = 0, cnt = {};
    STATUS.forEach(function (x) { cnt[x] = 0; });
    view.forEach(function (s) { seats += s.seats; staff += S.staff(s); stu += S.stu18(s); cnt[stOf(s.id)]++; });
    $('ldSum').innerHTML =
      '<div class="sx-kpi"><div class="k">符合條件的學校</div><div class="v">' + fmt(view.length) + '</div></div>' +
      '<div class="sx-kpi"><div class="k">潛在授權上限</div><div class="v">' + fmt(seats) + '</div><div class="d">教職員 ' + fmt(staff) + '，可指派學生 ' + fmt(stu) + '</div></div>' +
      '<div class="sx-kpi"><div class="k">聯絡進度</div><div class="d ld-st">' + STATUS.map(function (x) { return '<span>' + x + ' <b>' + cnt[x] + '</b></span>'; }).join('') + '</div></div>';
  }

  function rowHtml(s) {
    var staff = staffOf(s), id = s.id, st = stOf(id);
    var opts = STATUS.map(function (x) { return '<option' + (x === st ? ' selected' : '') + '>' + x + '</option>'; }).join('');
    var tel = s.tel ? '<a href="tel:' + esc(s.tel.replace(/[^0-9+]/g, '')) + '">' + esc(s.tel) + '</a>' : '';
    var web = s.web && /^https?:/.test(s.web) ? '<a href="' + esc(s.web) + '" target="_blank" rel="noopener nofollow">網站</a>' : '';
    return '<tr data-id="' + id + '"><td class="ld-name"><a href="/school/' + id + '/">' + esc(s.n) + '</a><small>' + s.lv + '・' + (s.pub ? '公立' : '私立') + '・' + esc(s.c + (s.d === '區域未標示' ? '' : s.d)) + '</small></td>' +
      '<td class="sx-num">' + (staff == null ? '無資料' : fmt(staff)) + '</td><td class="sx-num">' + fmt(S.stu18(s)) + '</td><td class="sx-num"><b>' + fmt(s.seats) + '</b></td>' +
      '<td class="ld-ct">' + [tel, web].filter(Boolean).join('　') + '</td>' +
      '<td><select class="ld-sel" data-st="' + id + '" aria-label="聯絡進度：' + esc(s.n) + '">' + opts + '</select></td>' +
      '<td><input class="ld-note" data-note="' + id + '" value="' + esc(noteOf(id)) + '" placeholder="備註" maxlength="200" aria-label="備註：' + esc(s.n) + '"></td>' +
      '<td class="ld-act"><a href="/quote/?s=' + id + '">試算提案</a></td></tr>';
  }

  function render() {
    sync();
    view = filtered();
    summary();
    var tb = $('ldBody');
    if (!view.length) { tb.innerHTML = '<tr><td colspan="8" class="sx-empty">沒有符合條件的學校，試試放寬條件。</td></tr>'; $('ldMore').hidden = true; return; }
    tb.innerHTML = view.slice(0, f.shown).map(rowHtml).join('');
    $('ldMore').hidden = view.length <= f.shown;
    $('ldMore').textContent = '再顯示 ' + Math.min(50, view.length - f.shown) + ' 所（還有 ' + fmt(view.length - f.shown) + ' 所）';
  }

  function csvCell(v) { v = String(v == null ? '' : v); return v.indexOf(',') >= 0 || v.indexOf(QT) >= 0 || v.indexOf(NL) >= 0 ? QT + v.split(QT).join(QT + QT) + QT : v; }
  function download(name, rows) {
    var csv = rows.map(function (r) { return r.map(csvCell).join(','); }).join(CR + NL);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([String.fromCharCode(0xFEFF) + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function exportRows(list) {
    var rows = [['學校代碼', '學校', '學制', '公私立', '縣市', '鄉鎮市區', '教職員', '可指派學生（估）', '潛在席次', '電話', '網站', '地址', '聯絡進度', '備註', '更新時間']];
    list.forEach(function (s) {
      var r = store[s.id] || {};
      rows.push([s.id, s.n, s.lv, s.pub ? '公立' : '私立', s.c, s.d, staffOf(s) == null ? '' : S.staff(s), S.stu18(s), s.seats, s.tel || '', s.web || '', s.a || '', stOf(s.id), r.note || '', r.ts ? new Date(r.ts).toLocaleString('zh-TW') : '']);
    });
    return rows;
  }
  function today() { var d = new Date(); return d.getFullYear() + String(d.getMonth() + 101).slice(1) + String(d.getDate() + 100).slice(1); }

  function parseCsv(text) {
    var rows = [], row = [], cell = '', inq = false, i, c;
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    for (i = 0; i < text.length; i++) {
      c = text.charAt(i);
      if (inq) { if (c === QT) { if (text.charAt(i + 1) === QT) { cell += QT; i++; } else inq = false; } else cell += c; }
      else if (c === QT) inq = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === NL) { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== CR) cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function init() {
    load();
    var cs = {}; S.schools.forEach(function (s) { cs[s.c] = (cs[s.c] || 0) + s.seats; });
    var sel = $('lCounty'); sel.innerHTML = '<option value="">全部縣市</option>';
    Object.keys(cs).sort(function (a, b) { return cs[b] - cs[a]; }).forEach(function (c) { sel.add(new Option(c, c)); });
    var ss = $('lStatus'); ss.innerHTML = '<option value="">全部進度</option>' + STATUS.map(function (x) { return '<option>' + x + '</option>'; }).join('');
    var qs = S.query();
    f.q = qs.q || ''; f.county = qs.c || ''; f.district = qs.d || ''; f.lv = qs.lv || ''; f.pub = qs.pub || ''; f.min = qs.min || '0'; f.status = qs.st || ''; f.sort = qs.sort || 'seats';
    function fillD() {
      var d = $('lDistrict'), c = {};
      d.innerHTML = '<option value="">全部鄉鎮市區</option>'; d.disabled = !f.county;
      if (!f.county) return;
      S.schools.forEach(function (s) { if (s.c === f.county) c[s.d] = (c[s.d] || 0) + s.seats; });
      Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).forEach(function (x) { d.add(new Option(x, x)); });
      d.value = f.district;
    }
    function controls() {
      $('lQ').value = f.q; sel.value = f.county; fillD(); $('lMin').value = f.min; ss.value = f.status; $('lSort').value = f.sort;
      document.querySelectorAll('[data-llv]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.llv === f.lv); });
      document.querySelectorAll('[data-lpub]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lpub === f.pub); });
    }
    controls();
    $('lQ').addEventListener('input', function (e) { f.q = e.target.value; f.shown = 50; render(); });
    sel.addEventListener('change', function () { f.county = sel.value; f.district = ''; f.shown = 50; fillD(); render(); });
    $('lDistrict').addEventListener('change', function (e) { f.district = e.target.value; f.shown = 50; render(); });
    $('lMin').addEventListener('change', function (e) { f.min = e.target.value; f.shown = 50; render(); });
    ss.addEventListener('change', function () { f.status = ss.value; f.shown = 50; render(); });
    $('lSort').addEventListener('change', function (e) { f.sort = e.target.value; f.shown = 50; render(); });
    document.querySelectorAll('[data-llv]').forEach(function (b) { b.addEventListener('click', function () { f.lv = b.dataset.llv; f.shown = 50; controls(); render(); }); });
    document.querySelectorAll('[data-lpub]').forEach(function (b) { b.addEventListener('click', function () { f.pub = b.dataset.lpub; f.shown = 50; controls(); render(); }); });
    $('lReset').addEventListener('click', function () { f = { q: '', county: '', district: '', lv: '', pub: '', min: '0', status: '', sort: 'seats', shown: 50 }; controls(); render(); });
    $('ldMore').addEventListener('click', function () { f.shown += 50; render(); });

    var tbody = $('ldBody'), timer;
    tbody.addEventListener('change', function (e) {
      var t = e.target.closest('[data-st]'); if (!t) return;
      var id = t.dataset.st; store[id] = store[id] || {}; store[id].st = t.value; store[id].ts = Date.now(); save();
      if (f.status || f.sort === 'status') render(); else summary();
    });
    tbody.addEventListener('input', function (e) {
      var t = e.target.closest('[data-note]'); if (!t) return;
      var id = t.dataset.note; store[id] = store[id] || {}; store[id].note = t.value; store[id].ts = Date.now();
      clearTimeout(timer); timer = setTimeout(save, 400);
    });

    $('ldExport').addEventListener('click', function () { download('推廣名單_' + today() + '.csv', exportRows(view)); });
    $('ldExportMarked').addEventListener('click', function () {
      var marked = S.schools.filter(function (s) { return store[s.id] && (store[s.id].st && store[s.id].st !== '未聯絡' || store[s.id].note); });
      if (!marked.length) { $('ldMsg').textContent = '還沒有標記過任何學校。'; return; }
      $('ldMsg').textContent = ''; download('推廣進度_' + today() + '.csv', exportRows(marked));
    });
    $('ldImport').addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      var rd = new FileReader();
      rd.onload = function () {
        var rows = parseCsv(String(rd.result)), h = rows[0] || [], iId = h.indexOf('學校代碼'), iSt = h.indexOf('聯絡進度'), iNo = h.indexOf('備註'), n = 0;
        if (iId < 0 || iSt < 0) { $('ldMsg').textContent = '這個檔案不是從本頁匯出的（找不到「學校代碼」「聯絡進度」欄位）。'; return; }
        rows.slice(1).forEach(function (r) {
          var id = r[iId]; if (!id || !S.byId[id]) return;
          var st = STATUS.indexOf(r[iSt]) >= 0 ? r[iSt] : '未聯絡';
          if (st === '未聯絡' && !(iNo >= 0 && r[iNo])) return;
          store[id] = { st: st, note: iNo >= 0 ? r[iNo] : '', ts: Date.now() }; n++;
        });
        save(); render(); $('ldMsg').textContent = '已匯入 ' + n + ' 筆。';
      };
      rd.readAsText(file, 'utf-8'); e.target.value = '';
    });
    $('ldClear').addEventListener('click', function () {
      if (!$('ldClear').dataset.arm) { $('ldClear').dataset.arm = '1'; $('ldClear').textContent = '再按一次確認清除全部進度'; setTimeout(function () { delete $('ldClear').dataset.arm; $('ldClear').textContent = '清除全部進度'; }, 4000); return; }
      store = {}; save(); render(); $('ldClear').textContent = '清除全部進度'; delete $('ldClear').dataset.arm; $('ldMsg').textContent = '已清除。';
    });
    render();
  }

  S.mods.leads = { init: init };
})(window.SS);
