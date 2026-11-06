/* Admin page: sign in with the passcode, then list, filter and export leads. */
(function () {
  'use strict';
  var GP = window.GP;
  var KEY = 'gp_admin_key';
  var SERVICES = ['Monthly accounting & bookkeeping', 'VAT registration & filing', 'Corporate Tax query', 'E-invoicing setup', 'Just exploring'];
  var EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];
  var STATUSES = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];
  var TZ = 'Asia/Dubai';

  var $ = function (id) { return document.getElementById(id); };
  var login = $('login'), dash = $('dashboard'), signout = $('signout');
  var leads = [], timer = null;

  var dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  var fmtDate = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' });
  var fmtTime = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

  function fillSelect(sel, values) {
    values.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      sel.appendChild(o);
    });
  }
  fillSelect($('f-service'), SERVICES);
  fillSelect($('f-emirate'), EMIRATES);
  fillSelect($('f-status'), STATUSES);

  function status(el, kind, text) { el.className = 'form-status ' + kind + (el.id === 'dash-status' ? ' admin-msg' : ''); el.textContent = text; }

  function showDashboard(on) {
    login.hidden = on; dash.hidden = !on; signout.hidden = !on;
  }

  function fetchLeads(key) {
    if (!GP.connected) return Promise.reject(new Error('not_connected'));
    return GP.post({ action: 'list', key: key }, 30000);
  }

  function load(key, fromLogin) {
    return fetchLeads(key).then(function (res) {
      if (!res || !res.ok) throw new Error((res && res.error) || 'failed');
      leads = (res.leads || []).slice().sort(function (a, b) { return String(b.submitted).localeCompare(String(a.submitted)); });
      if (res.sheetUrl) $('sheet-link').href = res.sheetUrl;
      GP.store.set(KEY, key);
      showDashboard(true);
      status($('dash-status'), '', '');
      $('updated').textContent = 'Updated ' + fmtTime.format(new Date()) + ' (Dubai time)';
      render();
      schedule();
    }).catch(function (err) {
      var msg = err && err.message === 'unauthorised' ? 'That passcode is not correct.'
        : err && err.message === 'not_connected' ? 'The admin is not connected yet. Add the Google Apps Script URL to assets/config.js (see the setup guide).'
        : "Couldn't load leads. Check your connection and try again.";
      if (fromLogin || dash.hidden || (err && err.message === 'unauthorised')) {
        GP.store.remove(KEY);
        showDashboard(false);
        status($('login-status'), 'err', msg);
      } else {
        status($('dash-status'), 'err', msg);
      }
    });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var key = GP.store.get(KEY);
      if (key && document.visibilityState === 'visible') load(key, false); else schedule();
    }, 120000);
  }

  function filtered() {
    var q = $('f-search').value.trim().toLowerCase();
    var svc = $('f-service').value, emi = $('f-emirate').value, st = $('f-status').value;
    return leads.filter(function (l) {
      if (svc && l.service !== svc) return false;
      if (emi && l.emirate !== emi) return false;
      if (st && (l.status || 'New') !== st) return false;
      if (q) {
        var hay = [l.name, l.company, l.mobile, l.email, l.id].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  /* UAE numbers typed locally (050…) or with 00 become 971… for WhatsApp links. */
  function waNumber(mobile) {
    var d = String(mobile).replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    else if (d.charAt(0) === '0') d = '971' + d.slice(1);
    return d;
  }
  function cell(label) { var td = el('td'); td.setAttribute('data-label', label); return td; }

  function render() {
    var today = dayKey.format(new Date());
    var weekAgo = Date.now() - 7 * 864e5;
    $('t-total').textContent = leads.length;
    $('t-today').textContent = leads.filter(function (l) { var d = new Date(l.submitted); return !isNaN(d) && dayKey.format(d) === today; }).length;
    $('t-week').textContent = leads.filter(function (l) { var d = new Date(l.submitted); return !isNaN(d) && d.getTime() >= weekAgo; }).length;
    $('t-new').textContent = leads.filter(function (l) { return (l.status || 'New') === 'New'; }).length;

    var list = filtered();
    var body = $('rows');
    body.textContent = '';
    list.forEach(function (l) {
      var tr = el('tr');
      var d = new Date(l.submitted);
      var td = cell('Submitted');
      td.appendChild(el('span', 'strong nowrap', isNaN(d) ? l.submitted : fmtDate.format(d)));
      if (!isNaN(d)) td.appendChild(el('span', 'small', fmtTime.format(d)));
      tr.appendChild(td);

      td = cell('Lead');
      td.appendChild(el('span', 'strong', l.name));
      td.appendChild(el('span', 'small', l.company));
      tr.appendChild(td);

      td = cell('Contact');
      var tel = el('a', 'nowrap', l.mobile); tel.href = GP.telHref(l.mobile); td.appendChild(tel);
      var wa = el('a', 'small', 'WhatsApp'); wa.href = 'https://wa.me/' + waNumber(l.mobile); wa.target = '_blank'; wa.rel = 'noopener';
      var mail = el('a', 'small', l.email); mail.href = 'mailto:' + l.email;
      td.appendChild(mail); td.appendChild(wa);
      tr.appendChild(td);

      td = cell('Emirate'); td.textContent = l.emirate; tr.appendChild(td);
      td = cell('Employees'); td.textContent = l.employees; td.className = 'nowrap'; tr.appendChild(td);
      td = cell('Service'); td.textContent = l.service; tr.appendChild(td);

      td = cell('Status');
      var s = l.status || 'New';
      td.appendChild(el('span', 'badge' + (s === 'New' ? ' new' : s === 'Won' ? ' won' : ''), s));
      tr.appendChild(td);

      td = cell('Campaign');
      td.appendChild(el('span', null, [l.source, l.campaign].filter(Boolean).join(' / ') || '–'));
      if (l.ad) td.appendChild(el('span', 'small', l.ad));
      tr.appendChild(td);
      body.appendChild(tr);
    });
    $('empty').hidden = list.length > 0;
    $('empty').textContent = leads.length ? 'No leads match these filters.' : 'No leads yet. New submissions appear here.';
  }

  /* CSV of the filtered leads. Values that a spreadsheet could read as a formula get a leading apostrophe. */
  function exportCsv() {
    var cols = [['Submitted (Dubai)', function (l) { var d = new Date(l.submitted); return isNaN(d) ? l.submitted : fmtDate.format(d) + ' ' + fmtTime.format(d); }],
      ['Name', 'name'], ['Company', 'company'], ['Mobile', 'mobile'], ['Email', 'email'], ['Emirate', 'emirate'],
      ['Employees', 'employees'], ['Service', 'service'], ['Status', 'status'], ['Notes', 'notes'],
      ['Source', 'source'], ['Campaign', 'campaign'], ['Ad', 'ad'], ['Lead ID', 'id']];
    var esc = function (v) {
      var s = String(v === undefined || v === null ? '' : v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    var lines = [cols.map(function (c) { return esc(c[0]); }).join(',')];
    filtered().forEach(function (l) {
      lines.push(cols.map(function (c) { return esc(typeof c[1] === 'function' ? c[1](l) : l[c[1]]); }).join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gulfpro-leads-' + dayKey.format(new Date()) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var key = $('passcode').value.trim();
    if (!key) { status($('login-status'), 'err', 'Please enter the passcode.'); return; }
    var btn = this.querySelector('button');
    btn.disabled = true;
    btn.querySelector('.label').textContent = 'Checking…';
    status($('login-status'), '', '');
    load(key, true).finally(function () {
      btn.disabled = false;
      btn.querySelector('.label').textContent = 'Open leads';
      $('passcode').value = '';
    });
  });

  $('refresh').addEventListener('click', function () {
    var key = GP.store.get(KEY);
    if (!key) return showDashboard(false);
    $('updated').textContent = 'Refreshing…';
    load(key, false);
  });
  $('export').addEventListener('click', exportCsv);
  ['f-search', 'f-service', 'f-emirate', 'f-status'].forEach(function (id) {
    $(id).addEventListener(id === 'f-search' ? 'input' : 'change', render);
  });
  signout.addEventListener('click', function () {
    GP.store.remove(KEY);
    clearTimeout(timer);
    leads = [];
    $('rows').textContent = '';
    showDashboard(false);
    status($('login-status'), '', '');
  });

  var saved = GP.store.get(KEY);
  if (saved) load(saved, true);
  else if (!GP.connected) status($('login-status'), 'err', 'The admin is not connected yet. Add the Google Apps Script URL to assets/config.js (see the setup guide).');
})();
