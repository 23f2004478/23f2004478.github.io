/* Harness efficiency dashboard. Reads /data/metrics.json (rebuilt every 6 hours by script, no AI). */
(function () {
  'use strict';
  var root = document.getElementById('hd-root');
  if (!root) return;

  var HCOL = { hermes: 'var(--hd-h1)', claude_code_vps: 'var(--hd-h2)', claude_code_mac: 'var(--hd-h3)' };
  var RANGES = [['7d', 7], ['14d', 14], ['30d', 30], ['All time', 0]];
  var D = null;
  var S = { h: 'all', range: 0, metric: 'total', sort: 'total', dir: -1, q: '', sel: null, all: false };
  var tip = null;

  /* ---------- formatting ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v) {
    v = Number(v) || 0;
    var a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(a >= 1e10 ? 1 : 2) + ' B';
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e8 ? 0 : 1) + ' M';
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e5 ? 0 : 1) + ' k';
    return String(Math.round(v));
  }
  function int(v) { return (Math.round(Number(v) || 0)).toLocaleString('en-IN'); }
  function pc(v, d) { return (100 * (Number(v) || 0)).toFixed(d == null ? 1 : d) + '%'; }
  function usd(v) { return v ? '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'n/a'; }

  /* ---------- aggregation ---------- */
  function dayList() {
    var set = {};
    D.harnesses.forEach(function (h) { Object.keys(h.by_day).forEach(function (d) { set[d] = 1; }); });
    return Object.keys(set).filter(function (d) { return /^\d{4}-/.test(d); }).sort();
  }
  function rangeDays() {
    var all = dayList();
    return S.range ? all.slice(-S.range) : all;
  }
  function inRange(d, set) { return !set || set[d]; }
  function daySet() {
    if (!S.range) return null;
    var set = {};
    rangeDays().forEach(function (d) { set[d] = 1; });
    return set;
  }
  function zero() { return { f: 0, c: 0, w: 0, o: 0, k: 0 }; }
  function addDay(a, v) { a.f += v[0]; a.c += v[1]; a.w += v[2]; a.o += v[3]; a.k += v[4]; return a; }
  function modelAgg(m) {
    if (!S.range) {
      var c = m.components;
      return { f: c.fresh_input, c: c.cached_read, w: c.cache_write, o: c.output, k: m.calls };
    }
    var set = daySet(), a = zero();
    Object.keys(m.by_day).forEach(function (d) { if (set[d]) addDay(a, m.by_day[d]); });
    return a;
  }
  function harnessAgg(h) {
    var a = zero();
    Object.keys(h.by_model).forEach(function (k) {
      var x = modelAgg(h.by_model[k]);
      a.f += x.f; a.c += x.c; a.w += x.w; a.o += x.o; a.k += x.k;
    });
    return a;
  }
  function derive(a) {
    var inp = a.f + a.c + a.w, tot = inp + a.o;
    return {
      inp: inp, tot: tot, k: a.k,
      hit: inp ? a.c / inp : 0, write: inp ? a.w / inp : 0, out: tot ? a.o / tot : 0,
      tpc: a.k ? tot / a.k : 0, opc: a.k ? a.o / a.k : 0, fpc: a.k ? a.f / a.k : 0
    };
  }
  function dailySeries(h, set) {
    var out = {};
    Object.keys(h.by_day).forEach(function (d) { if (!set || set[d]) out[d] = h.by_day[d]; });
    return out;
  }
  function selectedHarnesses() {
    return D.harnesses.filter(function (h) { return S.h === 'all' || h.id === S.h; });
  }

  /* ---------- tooltip ---------- */
  function showTip(ev, html) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'hd-tip'; tip.setAttribute('role', 'status'); root.appendChild(tip); }
    tip.innerHTML = html;
    var x = Math.min(window.innerWidth - 300, ev.clientX + 14), y = ev.clientY + 14;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = y + 'px';
    tip.classList.add('on');
  }
  function hideTip() { if (tip) tip.classList.remove('on'); }
  function bindTips(scope) {
    scope.querySelectorAll('[data-tip]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) { showTip(e, el.getAttribute('data-tip')); });
      el.addEventListener('mouseleave', hideTip);
      el.addEventListener('focus', function () { var r = el.getBoundingClientRect(); showTip({ clientX: r.left, clientY: r.top - 40 }, el.getAttribute('data-tip')); });
      el.addEventListener('blur', hideTip);
    });
  }

  /* ---------- charts ---------- */
  var W = 640, H = 240, PL = 46, PR = 10, PT = 10, PB = 26;
  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }
  function axisY(max, fmt, ticks) {
    var s = '';
    for (var i = 0; i <= ticks; i++) {
      var v = max * i / ticks, y = H - PB - (H - PB - PT) * i / ticks;
      s += '<line class="hd-grid" x1="' + PL + '" x2="' + (W - PR) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (PL - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + fmt(v) + '</text>';
    }
    return s;
  }
  function axisX(days) {
    var s = '', step = Math.max(1, Math.ceil(days.length / 8)), bw = (W - PL - PR) / Math.max(1, days.length);
    days.forEach(function (d, i) {
      if (i % step === 0) s += '<text x="' + (PL + bw * i + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + d.slice(5) + '</text>';
    });
    return s;
  }
  function stacked(days, series, fmt) {
    var max = 0;
    days.forEach(function (d, i) { var t = 0; series.forEach(function (s) { t += s.vals[i]; }); if (t > max) max = t; });
    max = niceMax(max);
    var bw = (W - PL - PR) / Math.max(1, days.length), g = '';
    days.forEach(function (d, i) {
      var y = H - PB, tipLines = '<b>' + d + '</b>';
      series.forEach(function (s) {
        var h = (H - PB - PT) * s.vals[i] / max;
        if (s.vals[i] > 0) {
          g += '<rect x="' + (PL + bw * i + bw * .12) + '" y="' + (y - h) + '" width="' + (bw * .76) + '" height="' + Math.max(0, h) + '" fill="' + s.color + '" data-tip="' + esc('<b>' + d + '</b><br>' + s.name + ': ' + fmt(s.vals[i])) + '"/>';
          y -= h;
        }
      });
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + axisY(max, fmt, 4) + g + axisX(days) + '</svg>';
  }
  function lines(days, series, fmt, max) {
    var bw = (W - PL - PR) / Math.max(1, days.length), g = '';
    series.forEach(function (s) {
      var d = '', started = false;
      s.vals.forEach(function (v, i) {
        if (v == null) { started = false; return; }
        var x = PL + bw * i + bw / 2, y = H - PB - (H - PB - PT) * v / max;
        d += (started ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
        started = true;
      });
      g += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round"/>';
      s.vals.forEach(function (v, i) {
        if (v == null) return;
        var x = PL + bw * i + bw / 2, y = H - PB - (H - PB - PT) * v / max;
        g += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5" fill="' + s.color + '" data-tip="' + esc('<b>' + days[i] + '</b><br>' + s.name + ': ' + fmt(v)) + '"/>';
      });
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img">' + axisY(max, fmt, 4) + g + axisX(days) + '</svg>';
  }
  function legend(items) {
    return '<div class="hd-leg">' + items.map(function (i) { return '<span><i style="background:' + i.color + '"></i>' + esc(i.name) + '</span>'; }).join('') + '</div>';
  }

  /* ---------- sections ---------- */
  function controls() {
    var hs = [['all', 'All harnesses']].concat(D.harnesses.map(function (h) { return [h.id, h.label]; }));
    return '<div class="hd-bar" role="group" aria-label="Filters">' +
      '<div class="hd-seg" role="group" aria-label="Harness">' + hs.map(function (x) { return '<button type="button" data-h="' + x[0] + '" aria-pressed="' + (S.h === x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>' +
      '<div class="hd-seg" role="group" aria-label="Date range">' + RANGES.map(function (r) { return '<button type="button" data-r="' + r[1] + '" aria-pressed="' + (S.range === r[1]) + '">' + r[0] + '</button>'; }).join('') + '</div>' +
      '<span class="hd-lab">Built ' + esc(D.built_at.replace('T', ' ').slice(0, 16)) + ' IST, refreshed every 6 hours</span></div>';
  }

  function kpis() {
    var sel = selectedHarnesses(), a = zero(), completed = 0, hours = 0;
    sel.forEach(function (h) { var x = harnessAgg(h); a.f += x.f; a.c += x.c; a.w += x.w; a.o += x.o; a.k += x.k; completed += h.completed; hours += h.active_hours; });
    var d = derive(a);
    var items = [
      [n(d.tot), 'tokens' + (S.range ? ' in range' : '')], [pc(d.hit), 'cache hit rate'], [pc(d.out), 'output share'],
      [int(d.tpc), 'tokens per call'], [int(d.k), 'model calls'], [int(completed), 'completed units, all time'],
      [hours.toFixed(1) + ' h', 'active hours, all time'], [completed ? n(d.tot / completed) : 'n/a', 'tokens per completed unit']
    ];
    return '<div class="hd-kpis">' + items.map(function (i) { return '<div class="hd-kpi"><b>' + i[0] + '</b><span>' + i[1] + '</span></div>'; }).join('') + '</div>';
  }

  function cards() {
    return '<div class="hd-cards">' + D.harnesses.map(function (h) {
      var d = derive(harnessAgg(h)), set = daySet(), ser = dailySeries(h, set), days = Object.keys(ser).sort();
      var vals = days.map(function (k) { return ser[k][0] + ser[k][1] + ser[k][2] + ser[k][3]; }), mx = Math.max.apply(null, vals.concat([1]));
      var pts = vals.map(function (v, i) { return (i * 200 / Math.max(1, vals.length - 1)).toFixed(1) + ',' + (34 - 32 * v / mx).toFixed(1); }).join(' ');
      return '<button type="button" class="hd-card" data-card="' + h.id + '" style="--c:' + HCOL[h.id] + '" aria-pressed="' + (S.h === h.id) + '">' +
        '<h3>' + esc(h.label) + '</h3><p>' + esc(h.carries) + '</p>' +
        '<svg viewBox="0 0 200 36" aria-hidden="true" style="height:36px"><polyline points="' + pts + '" fill="none" stroke="' + HCOL[h.id] + '" stroke-width="2"/></svg>' +
        '<dl><dt>Tokens</dt><dd>' + n(d.tot) + '</dd><dt>Cache hit rate</dt><dd>' + pc(d.hit) + '</dd><dt>Output share</dt><dd>' + pc(d.out) + '</dd>' +
        '<dt>Tokens per call</dt><dd>' + int(d.tpc) + '</dd><dt>Completed (' + esc(h.efficiency.completed_unit) + ')</dt><dd>' + int(h.completed) + '</dd>' +
        '<dt>Active hours</dt><dd>' + h.active_hours.toFixed(1) + ' h</dd><dt>Models used</dt><dd>' + Object.keys(h.by_model).length + '</dd></dl></button>';
    }).join('') + '</div>';
  }

  function compare() {
    var rows = D.harnesses.map(function (h) { var d = derive(harnessAgg(h)); return { h: h, d: d }; });
    var cols = [
      ['Tokens', function (r) { return n(r.d.tot); }], ['Calls', function (r) { return int(r.d.k); }],
      ['Cache hit', function (r) { return pc(r.d.hit); }], ['Cache write', function (r) { return pc(r.d.write); }],
      ['Output share', function (r) { return pc(r.d.out, 2); }], ['Tokens / call', function (r) { return int(r.d.tpc); }],
      ['Output / call', function (r) { return int(r.d.opc); }], ['Fresh in / call', function (r) { return int(r.d.fpc); }],
      ['Completed', function (r) { return int(r.h.completed); }], ['Tokens / completed', function (r) { return r.h.completed ? n(r.d.tot / r.h.completed) : 'n/a'; }],
      ['Active hours', function (r) { return r.h.active_hours.toFixed(1); }]
    ];
    var best = {}; // best cache hit marker
    var maxHit = Math.max.apply(null, rows.map(function (r) { return r.d.hit; }));
    return '<div class="hd-tbl-wrap"><table><caption>One row per harness. Figures follow the date range; completed and hours are all-time.</caption><thead><tr><th scope="col">Harness</th>' +
      cols.map(function (c) { return '<th scope="col">' + c[0] + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><th scope="row" style="background:var(--paper)"><i class="hd-mini" style="background:' + HCOL[r.h.id] + ';width:10px;height:10px"></i>' + esc(r.h.label) + '</th>' +
          cols.map(function (c, i) { var v = c[1](r); return '<td' + (i === 2 && r.d.hit === maxHit ? ' style="font-weight:700"' : '') + '>' + v + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function trends() {
    var all = rangeDays(), set = daySet();
    var metricFns = {
      total: ['Total tokens', function (v) { return v[0] + v[1] + v[2] + v[3]; }, n],
      cached: ['Cache read', function (v) { return v[1]; }, n],
      output: ['Output', function (v) { return v[3]; }, n],
      calls: ['Calls', function (v) { return v[4]; }, int]
    };
    var m = metricFns[S.metric];
    var sel = selectedHarnesses();
    var series = sel.map(function (h) { return { name: h.label, color: HCOL[h.id], vals: all.map(function (d) { return h.by_day[d] ? m[1](h.by_day[d]) : 0; }) }; });
    var hitSeries = sel.map(function (h) {
      return { name: h.label, color: HCOL[h.id], vals: all.map(function (d) { var v = h.by_day[d]; if (!v) return null; var inp = v[0] + v[1] + v[2]; return inp ? v[1] / inp : null; }) };
    });
    var seg = '<div class="hd-seg" role="group" aria-label="Metric">' + Object.keys(metricFns).map(function (k) { return '<button type="button" data-m="' + k + '" aria-pressed="' + (S.metric === k) + '">' + metricFns[k][0] + '</button>'; }).join('') + '</div>';
    return '<div class="hd-bar">' + seg + '</div><div class="hd-two"><figure><h3 style="font-size:1rem;margin:0 0 6px">Daily ' + m[0].toLowerCase() + ' by harness</h3>' +
      stacked(all, series, m[2]) + legend(series) + '<figcaption>Stacked per day, IST. Hover a bar for the value.</figcaption></figure>' +
      '<figure><h3 style="font-size:1rem;margin:0 0 6px">Daily cache hit rate</h3>' + lines(all, hitSeries, function (v) { return pc(v, 0); }, 1) + legend(hitSeries) +
      '<figcaption>Cache read as a share of all input tokens. Gaps are days with no calls.</figcaption></figure></div>';
  }

  function modelRows() {
    var out = [];
    selectedHarnesses().forEach(function (h) {
      Object.keys(h.by_model).forEach(function (k) {
        var m = h.by_model[k], a = modelAgg(m), d = derive(a);
        if (!d.tot && !d.k) return;
        out.push({ key: h.id + '/' + k, h: h, m: m, d: d, a: a });
      });
    });
    var q = S.q.trim().toLowerCase();
    if (q) out = out.filter(function (r) { return (r.m.model + ' ' + r.m.via + ' ' + r.m.group + ' ' + r.h.label).toLowerCase().indexOf(q) >= 0; });
    var getters = {
      model: function (r) { return r.m.model.toLowerCase(); }, total: function (r) { return r.d.tot; }, calls: function (r) { return r.d.k; },
      hit: function (r) { return r.d.hit; }, write: function (r) { return r.d.write; }, out: function (r) { return r.d.out; },
      tpc: function (r) { return r.d.tpc; }, opc: function (r) { return r.d.opc; }, cost: function (r) { return r.m.cost_usd || 0; },
      turns: function (r) { return r.m.turns_completed || 0; }
    };
    var g = getters[S.sort] || getters.total;
    out.sort(function (a, b) { var x = g(a), y = g(b); return (x < y ? -1 : x > y ? 1 : 0) * S.dir; });
    return out;
  }
  function modelTable() {
    var rows = modelRows(), total = rows.reduce(function (s, r) { return s + r.d.tot; }, 0) || 1;
    var shown = S.all ? rows : rows.slice(0, 15);
    var cols = [['model', 'Model'], ['total', 'Tokens'], ['calls', 'Calls'], ['hit', 'Cache hit'], ['write', 'Cache write'], ['out', 'Output share'], ['tpc', 'Tokens / call'], ['opc', 'Output / call'], ['turns', 'Turns done'], ['cost', 'List cost']];
    var head = cols.map(function (c) {
      var as = S.sort === c[0] ? (S.dir < 0 ? 'descending' : 'ascending') : 'none';
      return '<th scope="col" aria-sort="' + as + '"><button type="button" data-sort="' + c[0] + '">' + c[1] + '</button></th>';
    }).join('');
    var body = shown.map(function (r) {
      var sel = S.sel === r.key;
      return '<tr tabindex="0" data-key="' + esc(r.key) + '" aria-selected="' + sel + '"><td><i class="hd-mini" style="background:' + HCOL[r.h.id] + ';width:8px;height:8px"></i>' + esc(r.m.model) + '<span class="hd-via">' + esc(r.m.via) + '</span></td>' +
        '<td><span class="hd-mini" style="width:' + Math.max(1, 60 * r.d.tot / total) + 'px;background:' + HCOL[r.h.id] + '"></span>' + n(r.d.tot) + '</td><td>' + int(r.d.k) + '</td>' +
        '<td data-tip="' + esc('Cache read ' + n(r.a.c) + ' of ' + n(r.d.inp) + ' input tokens') + '">' + pc(r.d.hit) + '</td><td>' + pc(r.d.write) + '</td><td>' + pc(r.d.out, 2) + '</td>' +
        '<td>' + int(r.d.tpc) + '</td><td>' + int(r.d.opc) + '</td><td>' + (r.m.turns_completed ? int(r.m.turns_completed) : '') + '</td><td>' + usd(r.m.cost_usd) + '</td></tr>';
    }).join('');
    var more = rows.length > 15 ? '<button type="button" class="hd-seg" style="padding:8px 14px;background:transparent;color:var(--ink);cursor:pointer;margin-top:10px" data-more="1">' + (S.all ? 'Show top 15' : 'Show all ' + rows.length + ' models') + '</button>' : '';
    return '<div class="hd-bar"><input type="search" id="hd-q" placeholder="Filter models, e.g. gemini, opus, 9router" aria-label="Filter models" value="' + esc(S.q) + '"><span class="hd-lab">' + rows.length + ' models in view</span></div>' +
      '<div class="hd-tbl-wrap"><table><caption>Click a column to sort, a row to drill into that model.</caption><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' + more +
      '<div id="hd-detail"></div>';
  }
  function detail() {
    var el = document.getElementById('hd-detail');
    if (!el) return;
    if (!S.sel) { el.innerHTML = ''; return; }
    var hit = null;
    D.harnesses.forEach(function (h) { Object.keys(h.by_model).forEach(function (k) { if (h.id + '/' + k === S.sel) hit = { h: h, m: h.by_model[k] }; }); });
    if (!hit) { el.innerHTML = ''; return; }
    var m = hit.m, all = rangeDays(), d = derive(modelAgg(m));
    var tok = { name: 'Tokens', color: HCOL[hit.h.id], vals: all.map(function (x) { var v = m.by_day[x]; return v ? v[0] + v[1] + v[2] + v[3] : 0; }) };
    var hr = { name: 'Cache hit rate', color: HCOL[hit.h.id], vals: all.map(function (x) { var v = m.by_day[x]; if (!v) return null; var i = v[0] + v[1] + v[2]; return i ? v[1] / i : null; }) };
    var noDays = !Object.keys(m.by_day).length;
    el.innerHTML = '<div class="hd-detail"><h3>' + esc(m.model) + ' <span class="hd-via">' + esc(m.via) + '</span> <span class="hd-via">' + esc(m.group) + '</span> <span class="hd-via">' + esc(hit.h.label) + '</span></h3>' +
      '<div class="hd-kpis">' + [[n(d.tot), 'tokens'], [pc(d.hit), 'cache hit'], [pc(d.write), 'cache write'], [pc(d.out, 2), 'output share'], [int(d.tpc), 'tokens per call'], [int(d.opc), 'output per call'], [int(d.fpc), 'fresh input per call'], [usd(m.cost_usd), 'list cost, all time']]
        .map(function (i) { return '<div class="hd-kpi"><b>' + i[0] + '</b><span>' + i[1] + '</span></div>'; }).join('') + '</div>' +
      (noDays ? '<p class="hd-note">This row carries usage that the source did not tag to a model, so it has no daily series.</p>' :
        '<div class="hd-two" style="margin-top:14px"><figure>' + stacked(all, [tok], n) + '<figcaption>Daily tokens</figcaption></figure><figure>' + lines(all, [hr], function (v) { return pc(v, 0); }, 1) + '<figcaption>Daily cache hit rate</figcaption></figure></div>') + '</div>';
    bindTips(el);
  }

  function bubbles() {
    var rows = modelRows().filter(function (r) { return r.d.k > 0 && r.d.inp > 0; });
    if (!rows.length) return '<p class="hd-note">No models in range.</p>';
    var xs = rows.map(function (r) { return Math.log10(Math.max(1, r.d.tpc)); }), x0 = Math.floor(Math.min.apply(null, xs)), x1 = Math.ceil(Math.max.apply(null, xs));
    if (x1 === x0) x1 = x0 + 1;
    var maxT = Math.max.apply(null, rows.map(function (r) { return r.d.tot; })), g = '';
    for (var i = 0; i <= 4; i++) {
      var y = H - PB - (H - PB - PT) * i / 4;
      g += '<line class="hd-grid" x1="' + PL + '" x2="' + (W - PR) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (PL - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + (i * 25) + '%</text>';
    }
    for (var e = x0; e <= x1; e++) {
      var x = PL + (W - PL - PR) * (e - x0) / (x1 - x0);
      g += '<line class="hd-grid" x1="' + x + '" x2="' + x + '" y1="' + PT + '" y2="' + (H - PB) + '"/><text x="' + x + '" y="' + (H - 8) + '" text-anchor="middle">' + n(Math.pow(10, e)) + '</text>';
    }
    rows.sort(function (a, b) { return b.d.tot - a.d.tot; }).forEach(function (r) {
      var cx = PL + (W - PL - PR) * (Math.log10(Math.max(1, r.d.tpc)) - x0) / (x1 - x0), cy = H - PB - (H - PB - PT) * r.d.hit, rad = 4 + 20 * Math.sqrt(r.d.tot / maxT);
      var tipHtml = '<b>' + r.m.model + '</b> (' + r.m.via + ')<br>' + r.h.label + '<br>' + n(r.d.tot) + ' tokens, ' + int(r.d.k) + ' calls<br>cache hit ' + pc(r.d.hit) + ', ' + int(r.d.tpc) + ' tokens/call';
      g += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rad.toFixed(1) + '" fill="' + HCOL[r.h.id] + '" fill-opacity=".55" stroke="' + HCOL[r.h.id] + '" tabindex="0" data-key="' + esc(r.key) + '" data-tip="' + esc(tipHtml) + '" style="cursor:pointer"/>';
    });
    return '<figure><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Each bubble is a model: tokens per call across, cache hit rate up, size is total tokens">' + g + '</svg>' +
      legend(selectedHarnesses().map(function (h) { return { name: h.label, color: HCOL[h.id] }; })) +
      '<figcaption>Across: tokens per call (log scale). Up: cache hit rate. Size: total tokens. Click a bubble to open the model. A model at 0% usually means its provider does not report cache reads, not that nothing was cached.</figcaption></figure>';
  }

  function matrix() {
    var groups = {};
    D.harnesses.forEach(function (h) {
      Object.keys(h.by_model).forEach(function (k) {
        var m = h.by_model[k], a = modelAgg(m), grp = m.group || 'Other';
        groups[grp] = groups[grp] || {};
        var c = groups[grp][h.id] = groups[grp][h.id] || zero();
        c.f += a.f; c.c += a.c; c.w += a.w; c.o += a.o; c.k += a.k;
      });
    });
    var names = Object.keys(groups).filter(function (g) {
      return D.harnesses.some(function (h) { var c = groups[g][h.id]; return c && (c.f + c.c + c.w + c.o) > 0; });
    }).sort(function (a, b) {
      function t(g) { var s = 0; D.harnesses.forEach(function (h) { var c = groups[g][h.id]; if (c) s += c.f + c.c + c.w + c.o; }); return s; }
      return t(b) - t(a);
    });
    return '<div class="hd-tbl-wrap hd-heat"><table><caption>Cache hit rate by model family and harness, with token volume beneath. Darker is a higher hit rate. A dash means the family was not used there.</caption><thead><tr><th scope="col">Model family</th>' +
      D.harnesses.map(function (h) { return '<th scope="col">' + esc(h.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      names.map(function (g) {
        return '<tr><th scope="row" style="background:var(--paper)">' + esc(g) + '</th>' + D.harnesses.map(function (h) {
          var c = groups[g][h.id], d = c ? derive(c) : null;
          if (!d || !d.tot) return '<td>&ndash;</td>';
          return '<td style="background:color-mix(in srgb,var(--accent) ' + Math.round(70 * d.hit) + '%,transparent)" data-tip="' + esc(esc(g) + ' on ' + h.label + '<br>' + n(d.tot) + ' tokens, ' + int(d.k) + ' calls') + '"><b>' + pc(d.hit) + '</b><br><span class="hd-lab">' + n(d.tot) + '</span></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function tasks() {
    return '<div class="hd-two">' + D.harnesses.map(function (h) {
      var t = h.tasks, rows = Object.keys(t).map(function (k) {
        var v = t[k], isRate = /rate/.test(k);
        return '<tr><td>' + esc(k.replace(/_/g, ' ')) + '</td><td>' + (v == null ? 'n/a' : isRate ? pc(v) : typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : int(v)) + '</td></tr>';
      }).join('');
      return '<div class="hd-detail" style="margin:0;border-top:4px solid ' + HCOL[h.id] + '"><h3>' + esc(h.label) + '</h3><div class="hd-def"><b>' + int(h.completed) + '</b> completed ' + esc(h.efficiency.completed_unit) + 's. ' + esc(h.tasks_note) + '.</div>' +
        '<div class="hd-tbl-wrap"><table><tbody>' + rows + '</tbody></table></div></div>';
    }).join('') + '</div>';
  }

  /* ---------- render ---------- */
  function render() {
    root.innerHTML =
      controls() +
      '<section class="hd-sec" aria-labelledby="hd-s1"><h2 id="hd-s1">Overview</h2><p class="hd-sub">The selection below drives every chart and table on this page. Pick a harness card to focus on it.</p>' + kpis() + '<div style="height:16px"></div>' + cards() + '</section>' +
      '<section class="hd-sec" aria-labelledby="hd-s2"><h2 id="hd-s2">Harness against harness</h2><p class="hd-sub">Same measures for every harness: how much of the input is served from cache, how much of the traffic is output, how heavy each call is, and how much work finishes per token.</p>' + compare() + '</section>' +
      '<section class="hd-sec" aria-labelledby="hd-s3"><h2 id="hd-s3">Over time</h2><p class="hd-sub">Volume and cache efficiency per day, so a regression shows up as a dip.</p>' + trends() + '</section>' +
      '<section class="hd-sec" aria-labelledby="hd-s4"><h2 id="hd-s4">Model efficiency map</h2><p class="hd-sub">Where each model sits on call weight and cache efficiency.</p>' + bubbles() + '</section>' +
      '<section class="hd-sec" aria-labelledby="hd-s5"><h2 id="hd-s5">Models in depth</h2><p class="hd-sub">Every model that served calls under the selected harness. Sort, filter, and open one for its daily history.</p>' + modelTable() + '</section>' +
      '<section class="hd-sec" aria-labelledby="hd-s6"><h2 id="hd-s6">Same model family, different harness</h2><p class="hd-sub">Holds the model constant to show what the harness changes.</p>' + matrix() + '</section>' +
      '<section class="hd-sec" aria-labelledby="hd-s7"><h2 id="hd-s7">Work completed and how it is counted</h2><p class="hd-sub">There is no single task unit across harnesses, so each one uses the strongest completion signal it records.</p>' + tasks() + '</section>';
    bindTips(root);
    detail();
  }

  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-h],[data-r],[data-m],[data-sort],[data-card],[data-key],[data-more]');
    if (!t) return;
    if (t.hasAttribute('data-h')) { S.h = t.getAttribute('data-h'); S.sel = null; }
    else if (t.hasAttribute('data-card')) { S.h = S.h === t.getAttribute('data-card') ? 'all' : t.getAttribute('data-card'); S.sel = null; }
    else if (t.hasAttribute('data-r')) { S.range = Number(t.getAttribute('data-r')); }
    else if (t.hasAttribute('data-m')) { S.metric = t.getAttribute('data-m'); }
    else if (t.hasAttribute('data-sort')) { var k = t.getAttribute('data-sort'); if (S.sort === k) S.dir = -S.dir; else { S.sort = k; S.dir = k === 'model' ? 1 : -1; } }
    else if (t.hasAttribute('data-more')) { S.all = !S.all; }
    else if (t.hasAttribute('data-key')) {
      S.sel = t.getAttribute('data-key');
      var keep = window.scrollY; render(); window.scrollTo(0, keep);
      var d = document.getElementById('hd-detail'); if (d && d.firstChild) d.firstChild.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      return;
    }
    var y = window.scrollY; render(); window.scrollTo(0, y);
  });
  root.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-key], circle[data-key]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  root.addEventListener('input', function (e) {
    if (e.target.id === 'hd-q') {
      S.q = e.target.value;
      var pos = e.target.selectionStart; render();
      var q = document.getElementById('hd-q'); q.focus(); q.setSelectionRange(pos, pos);
    }
  });

  var SRC = /(^|\.)krishnendu\.me$/.test(location.hostname) ? '/data/metrics.json' : 'https://krishnendu.me/data/metrics.json';
  fetch(SRC, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) {
    if (!j.harnesses || !j.harnesses.length) throw new Error('metrics.json has no harness block yet');
    D = j; render();
  }).catch(function (err) {
    root.innerHTML = '<div class="hd-err" role="alert"><b>The dashboard data did not load.</b> ' + esc(err.message) + '. The numbers come from /data/metrics.json, rebuilt every 6 hours.</div>';
  });
})();
