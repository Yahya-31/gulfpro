/**
 * @OnlyCurrentDoc
 *
 * Gulfpro Accountants: LinkedIn landing page leads.
 * Saves each form submission as a new row on the "Leads" tab of this Google Sheet,
 * and sends the leads to the admin page when the right passcode is given.
 *
 * Setup steps are in SETUP.md. After any change to this file, publish it again:
 * Deploy > Manage deployments > pencil icon > Version: New version > Deploy.
 */

// The admin page asks for this passcode. You can change it to any long phrase.
const ADMIN_PASSCODE = 'W4HZZ-PjunX-KTkem-k3f6j';

const SHEET_NAME = 'Leads';
const HEADERS = ['Submitted', 'Name', 'Company', 'Mobile', 'Email', 'Emirate', 'Employees',
  'Service', 'Status', 'Notes', 'Source', 'Campaign', 'Ad', 'Lead ID'];
const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];
const EMPLOYEES = ['0–2', '3–10', '11–50', 'More than 50'];
const SERVICES = ['Monthly accounting & bookkeeping', 'VAT registration & filing', 'Corporate Tax query',
  'E-invoicing setup', 'Just exploring'];
const TIME_ZONE = 'Asia/Dubai';

/** The landing page and the admin page both POST JSON here. */
function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return reply({ ok: false, error: 'bad_request' });
  }
  if (body && body.action === 'list') return listLeads(body.key);
  return saveLead(body || {});
}

/** Opening the web app URL in a browser shows this, which confirms it is live. */
function doGet() {
  return reply({ ok: true, service: 'Gulfpro Accountants lead form' });
}

function saveLead(body) {
  // Bots fill the hidden "website" field; accept quietly and store nothing.
  if (clean(body.website, 200)) return reply({ ok: true });

  const lead = {
    name: clean(body.name, 120),
    company: clean(body.company, 160),
    mobile: clean(body.mobile, 30),
    email: clean(body.email, 160).toLowerCase(),
    emirate: clean(body.emirate, 40),
    employees: clean(body.employees, 40),
    service: clean(body.service, 80),
    source: tag(body.utm_source),
    campaign: tag(body.utm_campaign),
    ad: tag(body.utm_content),
  };

  const errors = {};
  if (lead.name.length < 2) errors.name = 'Please enter your name.';
  if (lead.company.length < 2) errors.company = 'Please enter your company name.';
  if (!/^\+?[0-9]{7,15}$/.test(lead.mobile.replace(/[\s\-().]/g, ''))) errors.mobile = 'Please enter a valid mobile number.';
  if (!/^[a-z0-9][^\s@]*@[^\s@]+\.[a-z]{2,}$/.test(lead.email)) errors.email = 'Please enter a valid email address.';
  if (EMIRATES.indexOf(lead.emirate) < 0) errors.emirate = 'Please choose an emirate.';
  if (EMPLOYEES.indexOf(lead.employees) < 0) errors.employees = 'Please choose the number of employees.';
  if (SERVICES.indexOf(lead.service) < 0) errors.service = 'Please choose a service.';
  if (Object.keys(errors).length) return reply({ ok: false, error: 'invalid', fields: errors });

  const now = new Date();
  const id = 'GP-' + Utilities.formatDate(now, TIME_ZONE, 'yyMMdd') + '-' +
    Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  const row = [now, lead.name, lead.company, lead.mobile, lead.email, lead.emirate, lead.employees,
    lead.service, 'New', '', lead.source, lead.campaign, lead.ad, id];

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet();
    const r = sheet.getLastRow() + 1;
    // Text cells are stored exactly as typed, so "+971 ..." stays a phone number
    // and nothing a visitor types can run as a formula.
    sheet.getRange(r, 2, 1, HEADERS.length - 1).setNumberFormat('@');
    sheet.getRange(r, 1).setNumberFormat('dd mmm yyyy, hh:mm');
    sheet.getRange(r, 1, 1, HEADERS.length).setValues([row]);
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true, id: id });
}

function listLeads(key) {
  if (!passcodeMatches(key)) {
    Utilities.sleep(1200); // slows down guessing
    return reply({ ok: false, error: 'unauthorised' });
  }
  const sheet = getSheet();
  const last = sheet.getLastRow();
  const rows = last < 2 ? [] : sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const leads = rows
    .filter(function (r) { return r.some(function (v) { return v !== '' && v !== null; }); })
    .map(function (r) {
      return {
        submitted: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
        name: String(r[1]), company: String(r[2]), mobile: String(r[3]), email: String(r[4]),
        emirate: String(r[5]), employees: String(r[6]), service: String(r[7]),
        status: String(r[8] || 'New'), notes: String(r[9]),
        source: String(r[10]), campaign: String(r[11]), ad: String(r[12]), id: String(r[13]),
      };
    });
  return reply({ ok: true, leads: leads, sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl() });
}

/** Run this once from the editor (Run > checkSetup) to approve access and check the sheet. */
function checkSetup() {
  const sheet = getSheet();
  if (ADMIN_PASSCODE.length < 12) throw new Error('Set ADMIN_PASSCODE to at least 12 characters.');
  Logger.log('Ready. Leads go to the "%s" tab (%s rows so far).', sheet.getName(), Math.max(0, sheet.getLastRow() - 1));
}

function getSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Plain single-line text, trimmed, length-capped, with no leading formula characters. */
function clean(value, max) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[=@]+/, '')
    .slice(0, max);
}

/** Campaign tags from the ad link: letters, numbers and simple punctuation only. */
function tag(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/[^A-Za-z0-9 _.\-|/]/g, '')
    .replace(/^[\-+]+/, '')
    .trim()
    .slice(0, 100);
}

function passcodeMatches(key) {
  if (typeof key !== 'string' || ADMIN_PASSCODE.length < 12 || ADMIN_PASSCODE.indexOf('__') === 0) return false;
  if (key.length !== ADMIN_PASSCODE.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ ADMIN_PASSCODE.charCodeAt(i);
  return diff === 0;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
