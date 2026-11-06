/* Thank-you page: personalise the message, set the booking and WhatsApp buttons. */
(function () {
  'use strict';
  var GP = window.GP;
  var cfg = GP.cfg;
  var lead = GP.store.get('gp_lead') || {};

  if (lead.first) {
    document.getElementById('thanks-msg').textContent =
      'Thank you, ' + lead.first + '. Our team will review your details and get in touch.';
  }

  var book = document.getElementById('book-link');
  if (cfg.calendlyUrl) book.href = cfg.calendlyUrl; else book.hidden = true;

  var text = lead.service && lead.service !== 'Just exploring'
    ? "Hello Gulfpro Accountants, I've just submitted my details on your website. I'm interested in: " + lead.service + '.'
    : 'Hello Gulfpro Accountants, I would like help with accounting, tax or business services for my business in the UAE. Could we discuss my requirements?';
  var wa = document.getElementById('wa-link');
  if (cfg.whatsappNumber) wa.href = GP.waLink(text); else wa.hidden = true;

  var note = document.getElementById('preview-note');
  if (note) note.hidden = !lead.preview;

  // Count the conversion once per submission, not on every reload.
  if (lead.first && !lead.tracked && !lead.preview) {
    GP.trackConversion();
    lead.tracked = true;
    GP.store.set('gp_lead', lead);
  }
})();
