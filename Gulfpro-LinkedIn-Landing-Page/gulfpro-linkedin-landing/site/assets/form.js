/* Landing page: validate the lead form, save it, then go to the thank-you page. */
(function () {
  'use strict';
  var GP = window.GP;
  var cfg = GP.cfg;
  var form = document.getElementById('lead-form');
  if (!form) return;
  var button = form.querySelector('button[type="submit"]');
  var label = button.querySelector('.label');
  var status = document.getElementById('form-status');
  var params = new URLSearchParams(window.location.search);

  var FIELDS = ['name', 'company', 'mobile', 'email', 'emirate', 'employees', 'service'];
  var MESSAGES = {
    name: 'Please enter your name.',
    company: 'Please enter your company name.',
    mobile: 'Please enter a valid mobile number, e.g. +971 50 123 4567.',
    email: 'Please enter a valid email address.',
    emirate: 'Please choose an emirate.',
    employees: 'Please choose the number of employees.',
    service: 'Please choose a service.',
  };

  if (cfg.privacyUrl) {
    var holder = document.getElementById('privacy-link');
    var a = document.createElement('a');
    a.href = cfg.privacyUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Privacy policy';
    holder.appendChild(document.createTextNode(' '));
    holder.appendChild(a);
    holder.appendChild(document.createTextNode('.'));
  }

  function valid(name, value) {
    var v = String(value || '').trim();
    switch (name) {
      case 'name': case 'company': return v.length >= 2;
      case 'mobile': return /^\+?[0-9]{7,15}$/.test(v.replace(/[\s\-().]/g, ''));
      case 'email': return /^[A-Za-z0-9][^\s@]*@[^\s@]+\.[A-Za-z]{2,}$/.test(v);
      default: return v.length > 0;
    }
  }

  function setError(name, message) {
    var input = form.elements[name];
    var wrap = input.closest('.field');
    wrap.classList.toggle('has-error', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    document.getElementById(name + '-error').textContent = message || '';
  }

  function validateAll() {
    var bad = [];
    FIELDS.forEach(function (n) {
      var ok = valid(n, form.elements[n].value);
      setError(n, ok ? '' : MESSAGES[n]);
      if (!ok) bad.push(n);
    });
    return bad;
  }

  // Clear an error as soon as the field is fixed.
  FIELDS.forEach(function (n) {
    var el = form.elements[n];
    var check = function () {
      if (el.closest('.field').classList.contains('has-error') && valid(n, el.value)) setError(n, '');
    };
    el.addEventListener('input', check);
    el.addEventListener('change', check);
  });

  function setBusy(busy) {
    button.disabled = busy;
    var spin = button.querySelector('.spinner');
    if (busy && !spin) {
      spin = document.createElement('span');
      spin.className = 'spinner';
      spin.setAttribute('aria-hidden', 'true');
      button.insertBefore(spin, label);
    } else if (!busy && spin) {
      spin.remove();
    }
    label.textContent = busy ? 'Submitting…' : 'Submit';
  }

  function showStatus(kind, text) {
    status.className = 'form-status ' + kind;
    status.textContent = text;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (button.disabled) return;
    showStatus('', '');
    var bad = validateAll();
    if (bad.length) {
      form.elements[bad[0]].focus();
      return;
    }

    var data = {};
    FIELDS.forEach(function (n) { data[n] = form.elements[n].value.trim(); });
    data.website = form.elements.website.value;
    ['utm_source', 'utm_campaign', 'utm_content'].forEach(function (k) { data[k] = params.get(k) || ''; });

    setBusy(true);
    var request = GP.connected ? GP.post(data) : Promise.resolve({ ok: true, preview: true });
    request.then(function (res) {
      if (res && res.ok) {
        GP.store.set('gp_lead', {
          first: data.name.split(' ')[0],
          service: data.service,
          preview: !!res.preview,
          tracked: false,
        });
        var spin = button.querySelector('.spinner');
        if (spin) spin.remove();
        label.textContent = 'Submitted';
        showStatus('ok', 'Your details have been submitted successfully.');
        setTimeout(function () { window.location.href = 'thank-you.html'; }, 900);
        return;
      }
      if (res && res.error === 'invalid' && res.fields) {
        var first = null;
        Object.keys(res.fields).forEach(function (n) {
          if (FIELDS.indexOf(n) >= 0) { setError(n, res.fields[n]); first = first || n; }
        });
        setBusy(false);
        showStatus('err', 'Please check the highlighted fields.');
        if (first) form.elements[first].focus();
        return;
      }
      throw new Error((res && res.error) || 'failed');
    }).catch(function () {
      setBusy(false);
      var phone = (cfg.phones && cfg.phones[0]) || '';
      showStatus('err', "We couldn't send your details just now. Please try again" +
        (phone ? ', or call or WhatsApp us on ' + phone + '.' : '.'));
    });
  });
})();
