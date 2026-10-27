// Run: node --test tests/engine.test.js
process.env.DB_PATH = '/tmp/bhivanta-team-test.db';
const fs = require('node:fs'); try { fs.unlinkSync('/tmp/bhivanta-team-test.db'); } catch {}
const test = require('node:test'); const assert = require('node:assert');
const { contentSafetyCheck, canPublish, ceoReportBody, db, TEAMS, EMPLOYEES } = require('../server.js');
test('5 teams seeded', () => { assert.equal(TEAMS.length, 5); assert.equal(db.prepare('SELECT COUNT(*) c FROM teams').get().c, 5); });
test('employee modules count matches plan (20)', () => { assert.equal(EMPLOYEES.length, 20); assert.equal(db.prepare('SELECT COUNT(*) c FROM employees').get().c, 20); });
test('each team has at least 2 employees', () => { for (let t = 1; t <= 5; t++) { const n = db.prepare('SELECT COUNT(*) c FROM employees WHERE team_id=?').get(t).c; assert.ok(n >= 2, 'team ' + t); } });
test('certified / guaranteed / price claims blocked', () => { assert.equal(contentSafetyCheck('certified organic hai').ok, false); assert.equal(contentSafetyCheck('Guaranteed result').ok, false); assert.equal(contentSafetyCheck('Price ₹499').ok, false); });
test('publish without URL refused, with URL + clean content passes', () => { assert.equal(canPublish({ title: 'x' }, '').ok, false); assert.equal(canPublish({ title: 'Better flowers' }, 'https://example.com/post/1').ok, true); });
test('CEO report structure + no invented performance', () => { const b = ceoReportBody('2026-10-27'); assert.match(b, /CEO Report to Founder/); assert.match(b, /Teams Summary/); assert.match(b, /Target vs Achievement/); assert.match(b, /Approvals Required/); assert.match(b, /Next-Day Action Plan/); assert.match(b, /TBD/); });
test('Day 1 work seeded per employee + manager + CEO', () => { const n = db.prepare('SELECT COUNT(*) c FROM work_items').get().c; assert.ok(n >= 20 + 5 + 1); });
test('manager approval items exist', () => { const n = db.prepare(`SELECT COUNT(*) c FROM work_items WHERE kind=?`).get('approval').c; assert.equal(n, 5); });
