/* Shared helpers for the Gulfpro landing, thank-you and admin pages. */
(function () {
  'use strict';
  var cfg = window.GULFPRO_CONFIG || {};
  var GP = (window.GP = { cfg: cfg });

  GP.connected = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(String(cfg.formEndpoint || '').trim());

  GP.waLink = function (text) {
    var n = String(cfg.whatsappNumber || '').replace(/\D/g, '');
    return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
  };
  GP.telHref = function (phone) { return 'tel:' + String(phone).replace(/[^\d+]/g, ''); };

  /* Session storage that never throws (private mode, blocked storage). */
  GP.store = {
    get: function (k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    remove: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} },
  };

  /* POST JSON to the Google Apps Script web app. Sent as text/plain so the browser
     makes a simple request that Apps Script accepts without a preflight. */
  GP.post = function (payload, timeoutMs) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 20000) : null;
    return fetch(String(cfg.formEndpoint).trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (r) {
      if (!r.ok) throw new Error('http_' + r.status);
      return r.json();
    }).finally(function () { if (timer) clearTimeout(timer); });
  };

  /* Fill contact links from the config so they are edited in one place. */
  function fillContacts() {
    var phones = Array.isArray(cfg.phones) ? cfg.phones : [];
    document.querySelectorAll('[data-phone]').forEach(function (a) {
      var p = phones[Number(a.getAttribute('data-phone'))];
      if (!p) { a.hidden = true; return; }
      a.href = GP.telHref(p);
      if (a.hasAttribute('aria-label')) a.setAttribute('aria-label', 'Call Gulfpro Accountants on ' + p);
    });
    document.querySelectorAll('[data-phone-text]').forEach(function (s) {
      var p = phones[Number(s.getAttribute('data-phone-text'))];
      if (p) s.textContent = p;
    });
    if (cfg.email) {
      document.querySelectorAll('[data-email]').forEach(function (a) { a.href = 'mailto:' + cfg.email; });
      document.querySelectorAll('[data-email-text]').forEach(function (s) { s.textContent = cfg.email; });
    }
    if (cfg.website) {
      document.querySelectorAll('[data-website]').forEach(function (a) {
        a.href = cfg.website;
        a.textContent = cfg.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      });
    }
  }

  /* LinkedIn Insight Tag, only when a partner ID is configured (never on the admin page). */
  function loadLinkedIn() {
    var id = String(cfg.linkedinPartnerId || '').trim();
    if (!/^\d+$/.test(id) || document.body.hasAttribute('data-no-tracking')) return;
    window._linkedin_partner_id = id;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(id);
    if (!window.lintrk) {
      window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); };
      window.lintrk.q = [];
    }
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    document.head.appendChild(s);
  }
  GP.trackConversion = function () {
    var cid = String(cfg.linkedinConversionId || '').trim();
    if (window.lintrk && /^\d+$/.test(cid)) window.lintrk('track', { conversion_id: Number(cid) });
  };

  fillContacts();
  loadLinkedIn();
  var note = document.getElementById('preview-note');
  if (note && !GP.connected && !document.body.hasAttribute('data-no-tracking')) note.hidden = false;
})();
