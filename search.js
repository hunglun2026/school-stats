/* 學校搜尋：找學校、地圖、推廣名單、導入試算共用（S.search）。
   比對順序（前一步找不到才做下一步，避免結果太雜）：
   1. 空白分開的每個詞都要出現在「校名＋簡稱＋俗稱＋代碼」或「縣市鄉鎮」裡
   2. 黏在一起的地名拆開再比：高雄中山工商 → 高雄＋中山工商
   3. 字依序出現就算：每個字都在校名裡、順序一樣，中間可以夾別的字
   正式全名先換成教育部簡稱再比（國民小學→國小），所以打全名也找得到。
   每筆結果標 _t（吻合程度，越小越前面）與 _g（依序比對時中間夾了幾個字）。 */
(function (S) {
  'use strict';
  // 正式全名 → 教育部簡稱；長的放前面，免得被短的先換掉
  var CANON = [['學校財團法人', ''], ['財團法人', ''], ['女子高級中學', '女中'], ['高級中等學校', '高中'], ['高級中學', '高中'],
    ['國民小學', '國小'], ['國民中學', '國中'], ['高級工商職業學校', '工商'], ['高級商工職業學校', '商工'], ['高級農工職業學校', '農工'],
    ['高級家事商業職業學校', '家商'], ['高級商業職業學校', '高商'], ['高級工業職業學校', '高工'], ['高級農業職業學校', '高農'],
    ['高級海事水產職業學校', '海事'], ['附屬', '附'], ['附設', '附']];
  // 常用俗稱：只收對得到唯一一所、代碼查過的（2026-10-22）
  var ALIAS = {
    h353301: '建中 建國高中', h343301: '中山女高', h573301: '雄女', h180309: '竹中', h200303: '嘉中', h070307: '彰中', h130305: '屏中',
    u0003: '臺大', u0002: '清大', u0007: '交大 陽明交大 陽交大', u0001: '政大', u0005: '成大', u0006: '興大', u0004: '師大 臺師大',
    u0017: '北大', u0022: '臺科大', u0025: '北科大 北科', u0053: '高科大', u0014: '高師大', u0015: '彰師大', u0037: '北教大',
    u0021: '暨大', u0012: '海大', u1002: '輔大', u1019: '高醫', u1028: '北醫', u0051: '北商大', u0046: '北護', u0023: '雲科大',
    u0033: '虎科大 虎科', u0024: '屏科大', u0018: '嘉大', u0036: '南大', u0031: '宜大', u0032: '聯大', u0052: '屏大',
    u0028: '北藝大', u0029: '臺藝大', u0035: '南藝大', u0050: '中科大', u1006: '文大'
  };

  S.canon = function (t) {
    t = S.norm(t).toLowerCase().replace(/[\s　()（）]+/g, '');
    CANON.forEach(function (r) { t = t.split(r[0]).join(r[1]); });
    return t;
  };
  function words(q) { return S.norm(q).split(/[\s　,，、]+/).map(S.canon).filter(Boolean); }

  var places = null;  // 縣市、鄉鎮市區去掉最後一個字（高雄市→高雄、大寮區→大寮），長的先比
  function prep() {
    if (places) return;
    var p = {};
    S.schools.forEach(function (s) {
      s._k = S.canon(s.n) + '|' + S.canon(s.sn || '') + '|' + S.canon(ALIAS[s.id] || '') + '|' + s.id;
      s._p = S.canon(s.c + s.d);
      s._core = S.canon(s.sn || s.n).replace(/^(市立|縣立|私立|國立)/, '');
      [s.c, s.d].forEach(function (x) { x = S.canon(x).slice(0, -1); if (x.length >= 2) p[x] = 1; });
    });
    places = Object.keys(p).sort(function (a, b) { return b.length - a.length; });
  }
  function split(w) {
    for (var i = 0; i < places.length; i++) {
      var x = places[i];
      if (w.length > x.length && w.indexOf(x) === 0) return [x].concat(split(w.slice(x.length)));
    }
    return [w];
  }
  function pass(list, ws, floor) {
    return list.filter(function (s) {
      var inName = true;
      for (var i = 0; i < ws.length; i++) {
        if (s._k.indexOf(ws[i]) >= 0) continue;
        if (s._p.indexOf(ws[i]) < 0) return false;
        inName = false;
      }
      s._t = Math.max(floor, !inName ? 2 : s._core.indexOf(ws[0]) === 0 || (' ' + S.canon(ALIAS[s.id] || '')).indexOf(ws[0]) >= 0 ? 0 : 1);
      s._g = 0;
      return true;
    });
  }
  function subseq(list, w) {
    if (w.length < 2) return [];
    return list.filter(function (s) {
      var k = s._p + s._k, j = -1, first = -1;
      for (var i = 0; i < w.length; i++) {
        j = k.indexOf(w[i], j + 1);
        if (j < 0) return false;
        if (first < 0) first = j;
      }
      s._t = 3; s._g = j - first + 1 - w.length;
      return s._g <= 8;  // 中間夾太多字的不算，免得什麼都對到
    });
  }

  // 回傳符合的學校（未排序）；沒有輸入就原樣回傳
  S.search = function (list, q) {
    var ws = words(q || '');
    if (!ws.length) return list;
    prep();
    var r = pass(list, ws, 0);
    if (!r.length) {
      var ws2 = [].concat.apply([], ws.map(split));
      if (ws2.length > ws.length) r = pass(list, ws2, 1);
    }
    return r.length ? r : subseq(list, ws.join(''));
  };
  // 依吻合程度排序，同一級再依 tie（預設學生數多的在前）
  S.byMatch = function (tie) {
    tie = tie || function (a, b) { return b.cur - a.cur; };
    return function (a, b) { return (a._t || 0) - (b._t || 0) || (a._g || 0) - (b._g || 0) || tie(a, b); };
  };
  // 校名裡出現的搜尋詞標黃（正式全名換過的詞對不到原字，就不標）
  S.mark = function (name, q) {
    var ws = S.norm(q || '').split(/[\s　,，、]+/).filter(Boolean).map(function (w) { return w.toLowerCase(); });
    var n = S.norm(name).toLowerCase(), on = new Array(name.length);
    ws.forEach(function (w) { for (var i = n.indexOf(w); i >= 0; i = n.indexOf(w, i + 1)) for (var k = 0; k < w.length; k++) on[i + k] = 1; });
    var out = '', open = false;
    for (var i = 0; i < name.length; i++) {
      if (on[i] && !open) { out += '<mark>'; open = true; }
      if (!on[i] && open) { out += '</mark>'; open = false; }
      out += S.esc(name[i]);
    }
    return out + (open ? '</mark>' : '');
  };
})(window.SS);
