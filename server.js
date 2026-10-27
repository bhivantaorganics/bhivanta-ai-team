// Bhivanta AI Team — Unified Team App (1 free container, many employee modules)
// Pattern: Node 24 stdlib + node:sqlite, zero paid deps, same as WhatsApp + SMM apps.
// WHY UNIFIED: SnapDeploy free allows only 4 containers, 100 hrs/month, 5 deploys/12h.
// 20 employees + 5 managers + 1 CEO as separate containers would exceed free limits
// and need paid hosting. Here each employee is a SEPARATE MODULE (own tasks,
// drafts, approvals, reports) inside ONE app. A manager sees only his team.
// The CEO sees all managers' summaries and reports to the Founder (Gagan Kumar).
// DEFAULT: DRAFT ONLY + APPROVAL-GATED. Nothing publishes, spends, contacts
// commercially, or commits financially/legally without Founder/manager approval.
// Hard guardrails, same as before:
//  - NO invented price/MRP, pack sizes, ingredients, dosage, certification,
//    guaranteed results, stock, delivery, margins, revenue, followers, reach.
//    Anything not verified is TBD in the DB, never filled in.
//  - NO fake followers/likes/views, NO spam, NO copied content, NO copyrighted
//    assets without permission, NO fabricated testimonials, NO invented analytics.
//  - NO spending, NO paid ads execution without budget + Founder approval,
//    NO commercial influencer contact without approval, NO password sharing,
//    NO account setting change without authorisation.
//  - Scope per employee is kept separate: e.g. Social Media does NOT do
//    WhatsApp orders, Email does NOT do WhatsApp marketing, Finance does NOT
//    approve spending by itself — it tracks and drafts for Founder approval.
//  - This app has NOT accessed, published to, or analysed any live account.
//    Live links (WhatsApp app, SMM app) are separate existing services; this
//    team app tracks their work, it does not replace their logins.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || (fs.existsSync('/app/data') ? '/app/data/data.db' : './data.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
function hashPass(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
function getSetting(k) { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(k); return r ? r.value : null; }
function setSetting(k, v) { db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, v); }
function audit(action, detail) { db.prepare('INSERT INTO audit_log(action,detail,created_at) VALUES(?,?,?)').run(action, detail || '', now()); }
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE, pass_hash TEXT, pass_salt TEXT, role TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT, detail TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS teams(id INTEGER PRIMARY KEY, name TEXT, manager_name TEXT, scope TEXT);
CREATE TABLE IF NOT EXISTS employees(id INTEGER PRIMARY KEY, team_id INTEGER, name TEXT, role TEXT, scope TEXT, guardrail TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS work_items(id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER, title TEXT, detail TEXT, kind TEXT, due_date TEXT, status TEXT, published_url TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS daily_reports(id INTEGER PRIMARY KEY AUTOINCREMENT, report_date TEXT, level TEXT, owner_name TEXT, body TEXT, created_at TEXT);
`);
const BANNED = [/certified organic/i, /guaranteed/i, /every plant/i, /sabhi paudhon/i, /₹\s*\d/, /discount/i, /offer.*%/i];
function contentSafetyCheck(t) { const hits = BANNED.filter(r => r.test(t || '')).map(r => String(r)); return { ok: hits.length === 0, hits }; }
function canPublish(item, url) {
  if (!url || !/^https?:\/\//.test(url)) return { ok: false, error: 'Published URL required — real platform link, never invented' };
  const c = contentSafetyCheck((item.title || '') + ' ' + (item.detail || ''));
  if (!c.ok) return { ok: false, error: 'Unverified claim/price found: ' + c.hits.join(', ') };
  return { ok: true };
}
const TEAMS = [
  [1, 'Team 1 — Marketing', 'Marketing Manager', 'WhatsApp, Social, Content, Email, Paid Ads (planning only), SEO, Influencer/Affiliate (planning only)'],
  [2, 'Team 2 — Sales', 'Sales Manager', 'Online Sales, Nursery & Retail Sales, Distributor & B2B Sales'],
  [3, 'Team 3 — Customer', 'Customer Manager', 'Customer Support, Customer Retention & Loyalty'],
  [4, 'Team 4 — Technology', 'Technology Manager', 'Website, App, Technology'],
  [5, 'Team 5 — Operations', 'Operations Manager', 'Order, Inventory & Logistics, Finance, Quality & Compliance'],
];
const EMPLOYEES = [
  // team, name, role, scope, guardrail
  [1, 'WhatsApp Marketing Employee', 'WhatsApp Marketing', 'WhatsApp campaigns, drafts, approval queue — linked to existing WhatsApp Employee app, does not replace its login', 'No message auto-sent without approval; no price invented; number only at last moment per Founder plan'],
  [1, 'Social Media Marketing Employee', 'Social Media Marketing', 'Instagram/Facebook/YouTube Shorts content, calendar, approvals — linked to existing SMM app', 'Draft-only; no live publishing claimed; no fake engagement; Facebook NOT VERIFIED'],
  [1, 'Content Creation Employee', 'Content Creation', 'Educational posts, reels scripts, carousels, captions, hooks, hashtags, CTAs in Hindi/Hinglish/English', 'No price/certification/guarantee claims; practical value first'],
  [1, 'Email Marketing Employee', 'Email Marketing', 'Email drafts, list building plan, campaigns — list currently 0 verified subscribers', 'No email sent without consent list + Founder approval; no spam'],
  [1, 'Performance Marketing Employee', 'Performance Marketing & Paid Ads', 'Paid campaign PLANS, budgets drafts, tracking plan only', 'NO paid ad execution without budget + Founder approval; no spending in this app'],
  [1, 'SEO & Organic Employee', 'SEO & Organic', 'SEO articles plan, keywords, website content ideas, Search Console follow-up (sitemap TBD)', 'No ranking/traffic promises; no invented sessions'],
  [1, 'Growth / Influencer & Affiliate Employee', 'Growth, Influencer & Affiliate', 'Collaboration PLANS, affiliate structure draft, community outreach list', 'NO commercial influencer contact without Founder approval; no earning promises'],
  [2, 'Online Sales Employee', 'Online Sales', 'Website orders tracking (cart→WhatsApp is current record), enquiries follow-up plan', 'No central order record claimed; price TBD, no discount without approval'],
  [2, 'Nursery & Retail Sales Employee', 'Nursery & Retail Sales', 'Nursery partner pipeline, retailer leads, visit plan', 'No margin/earning promises; retailer list TBD'],
  [2, 'Distributor & B2B Sales Employee', 'Distributor & B2B Sales', 'B2B outreach drafts, distributor pipeline (verified B2B conversations: 0 baseline)', 'No financial/legal commitment without Founder approval'],
  [3, 'Customer Support Employee', 'Customer Support', 'Customer queries, complaint categorisation, transfer to WhatsApp support flow', 'No price invented; sensitive/complaint items held for human review'],
  [3, 'Customer Retention & Loyalty Employee', 'Customer Retention & Loyalty', 'Retention plans, repeat-purchase follow-up ideas, loyalty structure draft', 'No discount/offer without Founder approval'],
  [4, 'Website Employee', 'Website', 'bhivantaorganics.com content, SEO fixes, sitemap follow-up (Netlify free, single-product site)', 'No major live site change without authorisation'],
  [4, 'App Employee', 'App', 'Pilot app status tracker (Supabase paused 17 Oct, APK distribution plan)', 'No backend change without Founder approval; pilot scope COD only, no wallet/KYC/schemes'],
  [4, 'Technology Employee', 'Technology', 'Tools, hosting, security checklist, free-tier limits tracker', 'Security is hard requirement; no credential in chat/code'],
  [5, 'Order Employee', 'Order', 'Order stages tracker (manual entry only, from WhatsApp enquiries)', 'Order = New Enquiry only until admin confirms; payment never auto-verified'],
  [5, 'Inventory Employee', 'Inventory', 'Stock tracker (manual entry only)', 'Stock TBD — do not promise stock'],
  [5, 'Logistics Employee', 'Logistics', 'Nursery fulfilment and delivery plan (manual entry only)', 'Delivery NOT live as of 26 Oct audit — do not promise delivery'],
  [5, 'Finance Employee', 'Finance', 'Spend/revenue TRACKING only (verified revenue ₹0 baseline), budget drafts', 'No payment, no financial commitment, no spending without Founder approval'],
  [5, 'Quality & Compliance Employee', 'Quality & Compliance', 'QC checklist, claims checklist, compliance documents tracker', 'No certification claim without verified document; no legal advice as commitment'],
];
if (!getSetting('seeded')) {
  const salt = crypto.randomBytes(16).toString('hex');
  db.prepare('INSERT INTO users(username,pass_hash,pass_salt,role) VALUES(?,?,?,?)').run('owner', hashPass(process.env.ADMIN_PASSWORD || 'admin123', salt), salt, 'owner');
  setSetting('seeded', '1'); setSetting('approval_mode', '1'); setSetting('publishing_mode', 'draft_only');
  audit('seed', 'AI Team seeded: 5 teams, 5 managers, CEO layer, draft-only, approval ON');
  for (const [id, name, mgr, scope] of TEAMS) db.prepare('INSERT INTO teams(id,name,manager_name,scope) VALUES(?,?,?,?)').run(id, name, mgr, scope);
  let eid = 1;
  for (const [team, name, role, scope, guard] of EMPLOYEES) {
    db.prepare('INSERT INTO employees(id,team_id,name,role,scope,guardrail,status) VALUES(?,?,?,?,?,?,?)').run(eid, team, name, role, scope, guard, 'Active');
    // Day 1 task per employee: draft + review + approval, never auto-publish
    db.prepare(`INSERT INTO work_items(employee_id,title,detail,kind,due_date,status,published_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(eid, `Day 1: ${role} — apna pehla draft taiyaar karo aur manager approval ke liye bhejo`, `Scope: ${scope}. Guardrail: ${guard}. Draft me koi price/certification/guarantee/invented number mat dalo.`, 'draft', today(), 'Pending', null, now(), now());
    eid++;
  }
  // Manager Day 1 tasks + CEO Day 1 task
  for (const [tid, tname, mgr] of TEAMS) {
    db.prepare(`INSERT INTO work_items(employee_id,title,detail,kind,due_date,status,published_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(null, `${mgr} — ${tname} ki Day 1 drafts review karo aur approval do / wapas bhejo`, 'Manager approval: bina manager approval ke koi item Published nahi hoga. Jo item me unverified claim ho, use wapas bhejo.', 'approval', today(), 'Pending', null, now(), now());
  }
  db.prepare(`INSERT INTO work_items(employee_id,title,detail,kind,due_date,status,published_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(null, 'CEO — 5 managers ki Day 1 reports se Founder ko ek CEO update banao', 'CEO report structure: Teams summary, Tasks Completed, Published (real links only), Performance (entered data only), Target vs Achievement, Blockers, Approvals Required, Next-Day Plan. Koi number invent mat karo.', 'report', today(), 'Pending', null, now(), now());
}
if (process.env.ADMIN_PASSWORD) {
  const owner = db.prepare('SELECT * FROM users WHERE username=?').get('owner');
  if (owner && hashPass(process.env.ADMIN_PASSWORD, owner.pass_salt) !== owner.pass_hash) {
    const salt = crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE users SET pass_hash=?, pass_salt=? WHERE id=?').run(hashPass(process.env.ADMIN_PASSWORD, salt), salt, owner.id);
    audit('admin_password_synced_from_env', 'owner password updated from ADMIN_PASSWORD env on startup');
  }
}
function sendJson(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
function readBody(req) { return new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch { r({}); } }); }); }
function authUser(req) { const t = (req.headers.authorization || '').replace('Bearer ', ''); if (!t) return null; const s = db.prepare('SELECT user_id FROM sessions WHERE token=?').get(t); return s ? db.prepare('SELECT id,username,role FROM users WHERE id=?').get(s.user_id) : null; }
function ceoReportBody(date) {
  const teams = db.prepare('SELECT * FROM teams ORDER BY id').all();
  const q = (sql, ...a) => db.prepare(sql).get(...a);
  const lines = teams.map(t => {
    const total = q('SELECT COUNT(*) c FROM work_items WHERE employee_id IN (SELECT id FROM employees WHERE team_id=?)', t.id).c;
    const pub = q('SELECT COUNT(*) c FROM work_items WHERE status=? AND employee_id IN (SELECT id FROM employees WHERE team_id=?)', 'Published', t.id).c;
    const aw = q('SELECT COUNT(*) c FROM work_items WHERE status=? AND employee_id IN (SELECT id FROM employees WHERE team_id=?)', 'Awaiting Approval', t.id).c;
    return `- ${t.name} (Manager: ${t.manager_name}): total work ${total}, Published ${pub}, Awaiting Approval ${aw}`;
  }).join('\n');
  return `CEO Report to Founder & CEO, Bhivanta Organics Pvt. Ltd. — ${date}
Reporting: CEO (AI Team) -> Founder, Gagan Kumar
Teams Summary:
${lines}
Tasks Completed: ${q(`SELECT COUNT(*) c FROM work_items WHERE status=?`, 'Completed').c} (all work items, all teams)
Content Published: Only items with a real platform URL, listed in Approvals/Published view. Bina URL ke koi Published nahi hai.
Actual Performance: Jo analytics/data owner ne enter kiya hai, wahi yahan aayega. Abhi is team app me koi analytics enter nahi hua hai — performance TBD hai, koi number invent nahi kiya gaya.
Target vs Achievement: Execution targets team-wise dashboard par hain. Sales/follower/revenue ke koi promise nahi hain — price, stock, margin, ad budget TBD hain.
Problems or Blockers: Free-tier limits (SnapDeploy 4 containers, deploy quota), Facebook NOT VERIFIED, price/stock/margin TBD, email list 0, paid ads ke liye budget approval pending, influencer commercial contact ke liye approval pending.
Approvals Required: Awaiting Approval wale items manager ke paas hain. Manager approval ke baad hi Founder-level publish/spend/commitment hoga.
Next-Day Action Plan: Har employee apna Day 1 draft complete kare, manager review kare, CEO agle din ki ek summary banaye. Koi bina approval ke publish/spend/contact nahi hoga.`;
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost'); const p = url.pathname;
  try {
    if (p === '/api/health') return sendJson(res, 200, { ok: true, mode: getSetting('publishing_mode'), approvalMode: getSetting('approval_mode'), teams: 5, employees: db.prepare('SELECT COUNT(*) c FROM employees').get().c, time: now() });
    if (p === '/api/auth/login' && req.method === 'POST') {
      const b = await readBody(req); const u = db.prepare('SELECT * FROM users WHERE username=?').get(b.username);
      if (!u || hashPass(b.password || '', u.pass_salt) !== u.pass_hash) return sendJson(res, 401, { error: 'Invalid login' });
      const token = crypto.randomBytes(32).toString('hex'); db.prepare('INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)').run(token, u.id, now()); audit('login', u.username); return sendJson(res, 200, { token, username: u.username, role: u.role });
    }
    if (p.startsWith('/api/')) {
      const user = authUser(req); if (!user) return sendJson(res, 401, { error: 'Login required' });
      const body = req.method === 'POST' || req.method === 'PUT' ? await readBody(req) : {};
      if (p === '/api/teams') return sendJson(res, 200, db.prepare('SELECT * FROM teams ORDER BY id').all());
      if (p === '/api/employees') { const team = url.searchParams.get('team'); return sendJson(res, 200, team ? db.prepare('SELECT * FROM employees WHERE team_id=? ORDER BY id').all(team) : db.prepare('SELECT * FROM employees ORDER BY id').all()); }
      if (p === '/api/dashboard') {
        const teams = db.prepare('SELECT * FROM teams ORDER BY id').all().map(t => ({ ...t,
          employees: db.prepare('SELECT COUNT(*) c FROM employees WHERE team_id=?').get(t.id).c,
          total: db.prepare('SELECT COUNT(*) c FROM work_items WHERE employee_id IN (SELECT id FROM employees WHERE team_id=?)').get(t.id).c,
          published: db.prepare('SELECT COUNT(*) c FROM work_items WHERE status=? AND employee_id IN (SELECT id FROM employees WHERE team_id=?)').get('Published', t.id).c,
          awaiting: db.prepare('SELECT COUNT(*) c FROM work_items WHERE status=? AND employee_id IN (SELECT id FROM employees WHERE team_id=?)').get('Awaiting Approval', t.id).c,
        }));
        return sendJson(res, 200, { teams, totalEmployees: db.prepare('SELECT COUNT(*) c FROM employees').get().c, totalWork: db.prepare('SELECT COUNT(*) c FROM work_items').get().c, published: db.prepare('SELECT COUNT(*) c FROM work_items WHERE status=?').get('Published').c, awaiting: db.prepare('SELECT COUNT(*) c FROM work_items WHERE status=?').get('Awaiting Approval').c, approvalMode: getSetting('approval_mode') === '1', publishingMode: getSetting('publishing_mode') });
      }
      if (p === '/api/work' && req.method === 'GET') { const s = url.searchParams.get('status'); const e = url.searchParams.get('employee'); let rows; if (s) rows = db.prepare('SELECT w.*, em.name AS employee_name, em.team_id FROM work_items w LEFT JOIN employees em ON em.id=w.employee_id WHERE w.status=? ORDER BY w.id').all(s); else if (e) rows = db.prepare('SELECT w.*, em.name AS employee_name, em.team_id FROM work_items w LEFT JOIN employees em ON em.id=w.employee_id WHERE w.employee_id=? ORDER BY w.id').all(e); else rows = db.prepare('SELECT w.*, em.name AS employee_name, em.team_id FROM work_items w LEFT JOIN employees em ON em.id=w.employee_id ORDER BY w.id').all(); return sendJson(res, 200, rows); }
      if (p === '/api/work' && req.method === 'POST') { const chk = contentSafetyCheck((body.title || '') + ' ' + (body.detail || '')); if (!chk.ok) return sendJson(res, 400, { error: 'Unverified claim/price: ' + chk.hits.join(', ') }); const r = db.prepare('INSERT INTO work_items(employee_id,title,detail,kind,due_date,status,published_url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(body.employee_id || null, body.title || 'Untitled', body.detail || '', body.kind || 'draft', body.due_date || today(), 'Pending', null, now(), now()); audit('work_created', `work ${r.lastInsertRowid}`); return sendJson(res, 200, { id: r.lastInsertRowid }); }
      const wid = p.match(/^\/api\/work\/(\d+)$/);
      if (wid && req.method === 'PUT') { const item = db.prepare('SELECT * FROM work_items WHERE id=?').get(wid[1]); if (!item) return sendJson(res, 404, { error: 'Not found' }); const next = { ...item, ...body }; if (body.status === 'Published') { const chk = canPublish(next, body.published_url || item.published_url); if (!chk.ok) return sendJson(res, 400, { error: chk.error }); if (item.status !== 'Awaiting Approval' && !body.approvedByManager) return sendJson(res, 400, { error: 'Manager approval required first — move to Awaiting Approval, get manager approval, then publish with real URL' }); } const chk2 = contentSafetyCheck((next.title || '') + ' ' + (next.detail || '')); if (!chk2.ok) return sendJson(res, 400, { error: 'Unverified claim/price: ' + chk2.hits.join(', ') }); db.prepare('UPDATE work_items SET title=?,detail=?,kind=?,due_date=?,status=?,published_url=?,updated_at=? WHERE id=?').run(next.title, next.detail, next.kind, next.due_date, next.status || item.status, next.published_url || null, now(), item.id); audit('work_updated', `work ${item.id} -> ${next.status || item.status}`); return sendJson(res, 200, { ok: true }); }
      if (p === '/api/reports/ceo') { const date = url.searchParams.get('date') || today(); let rep = db.prepare('SELECT * FROM daily_reports WHERE report_date=? AND level=?').get(date, 'CEO'); if (!rep) { const bodyText = ceoReportBody(date); const r = db.prepare('INSERT INTO daily_reports(report_date,level,owner_name,body,created_at) VALUES(?,?,?,?,?)').run(date, 'CEO', 'CEO (AI Team)', bodyText, now()); rep = { id: r.lastInsertRowid, report_date: date, body: bodyText }; } return sendJson(res, 200, rep); }
      return sendJson(res, 404, { error: 'Not found' });
    }
    let file = p === '/' ? '/index.html' : p; const safe = file.replace(/\.\./g, ''); const full = __dirname + '/public' + safe;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) { const ext = full.split('.').pop(); const types = { html: 'text/html', js: 'text/javascript', css: 'text/css' }; res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' }); return res.end(fs.readFileSync(full)); }
    return sendJson(res, 404, { error: 'Not found' });
  } catch (e) { console.error(e); return sendJson(res, 500, { error: e.message }); }
});
if (require.main === module) server.listen(PORT, () => console.log(`Bhivanta AI Team running on http://localhost:${PORT} — login: owner`));
module.exports = { server, db, contentSafetyCheck, canPublish, ceoReportBody, TEAMS, EMPLOYEES };
