// Server side (Vercel Serverless). Users and students are managed here with the Firebase Admin SDK.
const admin = require('firebase-admin');
const crypto = require('crypto');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
const hash = (p, s) => crypto.pbkdf2Sync(p, s, 60000, 32, 'sha256').toString('hex');
const mk = p => { const salt = crypto.randomBytes(12).toString('hex'); return { salt, hash: hash(p, salt) }; };
const err = (status, message) => Object.assign(new Error(message), { status });
const uid = s => String(s || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
const str = s => String(s ?? '').trim();
const tshift = v => (v === 'AM' || v === 'PM') ? v : 'BOTH';
const clsFor = (c, sh) => [].concat(c || []).map(String).filter(k => k.split('|').length === 2 || sh === 'BOTH' || k.startsWith(sh + '|'));
const shiftOf = v => { v = str(v).toLowerCase(); if (/^(am|m|morning|boy|boys|b)$/.test(v)) return 'AM'; if (/^(pm|a|afternoon|girl|girls|g)$/.test(v)) return 'PM'; return ''; };
// A class (e.g. 1-B Morning) can have only ONE active class teacher. Blocked or deleted teachers free their classes. Incharges are not limited.
const kLabel = k => { const p = String(k).split('|'); return p.length === 3 ? p[1] + '-' + p[2] + ' (' + (p[0] === 'AM' ? 'Morning' : 'Afternoon') + ')' : p.join('-'); };
async function noClash(self, classes) {
  const mine = [].concat(classes || []); if (!mine.length) return;
  const m = {};
  (await db.collection('users').where('role', '==', 'teacher').get()).docs.forEach(d => { const x = d.data(); if (d.id === self || x.blocked || x.inc) return; (x.classes || []).forEach(k => { if (!m[k]) m[k] = d.id; }); });
  const bad = mine.filter(k => m[k]);
  if (bad.length) throw err(400, 'Already assigned to another teacher: ' + bad.slice(0, 4).map(k => kLabel(k) + ' (' + m[k] + ')').join(', ') + '. Block or delete that teacher first, or remove the class from them.');
}
async function who(req) {
  let t;
  try { t = await admin.auth().verifyIdToken((req.headers.authorization || '').replace('Bearer ', '')); }
  catch { throw err(401, 'Please log in again'); }
  if (Date.now() / 1000 - (t.auth_time || 0) > 28800) throw err(401, 'Session expired. Please log in again');
  return t;
}
async function A(req) { const t = await who(req); if (t.role !== 'admin') throw err(403, 'Admin access only'); return t; }
const okPw = p => { if (String(p || '').length < 4) throw err(400, 'Password must be at least 4 characters'); return String(p); };
const BG = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const dobOk = d => { d = str(d); if (!d) return ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > new Date().toISOString().slice(0, 10) || d < '1950-01-01') throw err(400, 'Enter a valid date'); return d; };
const emOk = e => { e = str(e); if (e && !/^\S+@\S+\.\S+$/.test(e)) throw err(400, 'Enter a valid email address'); return e.slice(0, 120); };
const logAct = async (t, type, text, meta) => { // audit trail: written only by the server, readable only by the main admin
  try { await db.collection('logs').add({ ts: Date.now(), user: t.uid || '', name: t.name || '', role: t.title || t.role || '', type, text: str(text).slice(0, 400), ...(meta ? { meta } : {}) }); } catch {}
};
const ipOf = req => str(((req && req.headers && req.headers['x-forwarded-for']) || '').split(',')[0]).slice(0, 45);
const act = {
  async login(b, req) {
    const u = uid(b.username);
    let d = await db.doc('users/' + u).get();
    if (!d.exists && u === 'admin') {
      if (!process.env.ADMIN_PASSWORD) throw err(500, 'ADMIN_PASSWORD is not configured on the server'); // admin account is created on first login
      await db.doc('users/admin').set({ role: 'admin', name: 'Admin', blocked: false, classes: [], ...mk(process.env.ADMIN_PASSWORD) });
      d = await db.doc('users/admin').get();
    }
    const x = d.data(), rl = db.doc('rl/' + u), rs = (await rl.get()).data() || {};
    const lg = (type, text) => (x && x.role !== 'parent') ? logAct({ uid: u, name: x.name, title: x.title || x.role }, type, text, { ip: ipOf(req) }) : null;
    if (rs.until && rs.until > Date.now()) { await lg('login_fail', 'Login refused: too many failed attempts (locked for 15 minutes)'); throw err(429, 'Too many failed attempts. Please try again in 15 minutes.'); }
    const master = u === 'admin' && process.env.ADMIN_PASSWORD && String(b.password || '') === process.env.ADMIN_PASSWORD;
    if (!x || (!master && x.hash !== hash(String(b.password || ''), x.salt))) {
      if (x) { const n = (rs.until && rs.until <= Date.now() ? 0 : (rs.n || 0)) + 1; await rl.set({ n, until: n >= 5 ? Date.now() + 900000 : 0 }); }
      await lg('login_fail', 'Failed login: wrong password' + (((rs.n || 0) + 1) >= 5 ? ' (account locked for 15 minutes)' : ''));
      throw err(401, 'Incorrect username or password');
    }
    if (rs.n) await rl.delete();
    if (master && x.hash !== hash(process.env.ADMIN_PASSWORD, x.salt)) await db.doc('users/admin').update(mk(process.env.ADMIN_PASSWORD));
    if (x.blocked) { await lg('login_fail', 'Login refused: account is blocked'); throw err(403, 'Your account is blocked. Please contact the admin'); }
    if (b.portal === 'admin' && x.role === 'parent') throw err(403, 'This login is for management and teachers only. Parents please use the main login page');
    if (b.portal !== 'admin' && x.role !== 'parent') throw err(403, 'Staff must log in from the Management Console');
    if (b.portal === 'admin' && b.as) { // the role tab chosen on the login page must match the real account
      const kind = x.role === 'admin' ? (/principal/i.test(x.title || '') ? 'principal' : 'admin') : (x.inc ? 'incharge' : 'teacher');
      if (kind !== str(b.as)) { await lg('login_fail', 'Login refused: wrong role tab (' + b.as + ' chosen, account is ' + kind + ')'); throw err(403, 'This account is not a ' + ({ admin: 'Admin', principal: 'Principal', teacher: 'Teacher', incharge: 'Incharge' }[str(b.as)] || str(b.as)) + '. Please choose the correct tab (' + ({ admin: 'Admin', principal: 'Principal', teacher: 'Teachers', incharge: 'Incharges' }[kind]) + ').'); }
    }
    await lg('login', 'Logged in');
    const st = x.role === 'parent' ? await db.doc('students/' + u).get() : null;
    return { token: await admin.auth().createCustomToken(u, { role: x.role, title: x.title || x.role, name: x.name || u, gr: x.role === 'parent' ? u : '', classes: x.classes || [], inc: !!x.inc, mc: !!x.mustChange, ck: st && st.exists ? st.data().key : '' }) };
  },
  async changePassword(b, req) {
    const t = await who(req), ref = db.doc('users/' + t.uid), x = (await ref.get()).data();
    if (!x || x.hash !== hash(String(b.oldPassword || ''), x.salt)) throw err(400, 'Current password is incorrect');
    const np = String(b.newPassword || '');
    if (np.length < 6 || np === '1234') throw err(400, 'New password must be at least 6 characters and not 1234');
    await ref.update({ ...mk(np), mustChange: false });
  },
  async saveStudentProfile(b, req) {
    const t = await who(req), g = uid(b.gr), f = b.f || {};
    const ref = db.doc('students/' + g), snap = await ref.get(); if (!snap.exists) throw err(404, 'Student not found');
    const old = snap.data(), isT = t.role === 'teacher' && !t.inc && (t.classes || []).includes(old.key); // class teacher: only students of own assigned class
    if (!(t.role === 'admin' || (t.role === 'parent' && t.uid === g) || isT)) throw err(403, 'You can only edit students of your own class');
    const d = { name: str(f.name).slice(0, 80), father: str(f.father).slice(0, 80), dob: dobOk(f.dob), bg: BG.includes(str(f.bg)) ? str(f.bg) : '', phone: str(f.phone).slice(0, 20), email: emOk(f.email), addr: str(f.addr).slice(0, 250) };
    if (!d.name) throw err(400, 'Student name is required');
    if (isT) for (const k of ['father', 'dob', 'bg', 'phone', 'email', 'addr']) { if (!d[k] && old[k] && !/^(null|n\/a|na|none|nil|-+)$/i.test(String(old[k]).trim())) d[k] = old[k]; } // a teacher can fill or correct details but not wipe existing ones
    await ref.update({ ...d, pfAt: Date.now(), pfBy: t.uid });
    const u = await db.doc('users/' + g).get(); if (u.exists && u.data().role === 'parent') await u.ref.update({ name: 'Parent of ' + d.name });
  },
  async saveUserProfile(b, req) {
    const t = await who(req), u = t.role === 'admin' && b.username ? uid(b.username) : t.uid, f = b.f || {};
    if (u !== t.uid && t.role !== 'admin') throw err(403, 'Not allowed');
    const d = await db.doc('users/' + u).get(); if (!d.exists) throw err(404, 'User not found');
    if (d.data().role === 'parent') throw err(400, 'Use the student profile for parents');
    const name = str(f.name).slice(0, 80); if (!name) throw err(400, 'Name is required');
    const pf = { desig: str(f.desig).slice(0, 80), dob: dobOk(f.dob), gender: ['Male', 'Female'].includes(str(f.gender)) ? str(f.gender) : '', phone: str(f.phone).slice(0, 20), email: emOk(f.email), addr: str(f.addr).slice(0, 250), qual: str(f.qual).slice(0, 120), joined: str(f.joined).slice(0, 10) };
    await d.ref.update({ name, pf });
  },
  async setHold(b, req) {
    await A(req); const g = uid(b.gr), ref = db.doc('students/' + g);
    if (!(await ref.get()).exists) throw err(404, 'Student not found');
    await ref.update({ hold: !!b.hold, holdAt: Date.now() });
  },
  async promoteStudents(b, req) {
    const t = await A(req), to = str(b.to).slice(0, 30); if (!to) throw err(400, 'Choose the new class');
    const grs = [...new Set([].concat(b.grs || []).map(uid).filter(Boolean))]; if (!grs.length) throw err(400, 'No students selected');
    let n = 0;
    for (let i = 0; i < grs.length; i += 200) {
      const part = grs.slice(i, i + 200), docs = await db.getAll(...part.map(g => db.doc('students/' + g))), bt = db.batch();
      docs.forEach(d => { if (!d.exists) return; const x = d.data(); n++;
        bt.update(d.ref, { cls: to, key: x.shift + '|' + to + '|' + (x.sec || 'A'), ...(b.rolls && b.rolls[d.id] !== undefined ? { roll: str(b.rolls[d.id]).slice(0, 10) } : {}), hist: admin.firestore.FieldValue.arrayUnion({ from: x.cls || '', to, year: str(b.year), at: Date.now(), by: t.uid }) }); });
      if (to === 'Passed Out') { // student has left school: shut the parent login
        const us = await db.getAll(...part.map(g => db.doc('users/' + g)));
        us.forEach(u => { if (u.exists && u.data().role === 'parent') bt.update(u.ref, { blocked: true, passedOut: true }); });
      }
      await bt.commit();
    }
    return { promoted: n };
  },
  async setPositions(b, req) { // admin: save class position / highest / lowest percentage on Final Term results
    await A(req);
    const items = [].concat(b.items || []).filter(x => x && /^[\w\-]{3,80}$/.test(String(x.id))).slice(0, 200); if (!items.length) return { saved: 0 };
    const num = v => { v = Number(v); return isFinite(v) ? Math.max(0, Math.min(100, Math.round(v * 10) / 10)) : 0; };
    const docs = await db.getAll(...items.map(x => db.doc('results/' + x.id))), bt = db.batch(); let n = 0;
    docs.forEach((d, i) => { if (!d.exists || d.data().term !== 'T3') return; const x = items[i];
      bt.update(d.ref, { pos: [0, 1, 2, 3].includes(+x.pos) ? +x.pos : 0, hi: num(x.hi), lo: num(x.lo), cn: Math.max(0, Math.min(500, parseInt(x.cn) || 0)) }); n++; });
    await bt.commit(); return { saved: n };
  },
  async listUsers(b, req) {
    await A(req);
    return { users: (await db.collection('users').get()).docs.map(d => { const { hash, salt, ...x } = d.data(); return { username: d.id, ...x }; }) };
  },
  async createTeacher(b, req) {
    await A(req);
    const u = uid(b.username); if (!u) throw err(400, 'Enter a username');
    if ((await db.doc('users/' + u).get()).exists) throw err(400, 'This username already exists');
    const staff = b.role === 'principal' || b.role === 'admin';   // principal and admin both get full admin rights
    const inc = b.role === 'incharge';
    const title = b.role === 'principal' ? 'Principal' : b.role === 'admin' ? 'Admin' : inc ? 'Incharge' : 'Teacher';
    const sh = tshift(b.shift);
    if (!staff && !inc) await noClash(u, clsFor(b.classes, sh));
    await db.doc('users/' + u).set(staff
      ? { role: 'admin', title, name: str(b.name) || u, blocked: false, mustChange: true, shift: 'BOTH', classes: [], ...mk(okPw(b.password)) }
      : { role: 'teacher', title, inc, name: str(b.name) || u, blocked: false, mustChange: true, shift: sh, classes: clsFor(b.classes, sh), ...mk(okPw(b.password)) });
  },
  async updateTeacher(b, req) {
    await A(req);
    const sh = tshift(b.shift), id = uid(b.username), tx = await db.doc('users/' + id).get();
    if (!tx.exists) throw err(404, 'User not found');
    const cl = clsFor(b.classes, sh);
    if (tx.data().role === 'teacher' && !tx.data().inc) await noClash(id, cl);
    await db.doc('users/' + id).update({ name: str(b.name), shift: sh, classes: cl });
  },
  async setPassword(b, req) { await A(req); await db.doc('users/' + uid(b.username)).update({ ...mk(okPw(b.password)), mustChange: true }); },
  async resetPassword(b, req) { await A(req); await db.doc('users/' + uid(b.username)).update({ ...mk('1234'), mustChange: true }); },
  async blockUser(b, req) {
    await A(req); const u = uid(b.username); if (u === 'admin') throw err(400, 'Admin cannot be blocked');
    if (!b.blocked) { const tx = await db.doc('users/' + u).get(); if (tx.exists && tx.data().role === 'teacher' && !tx.data().inc) await noClash(u, tx.data().classes); }
    await db.doc('users/' + u).update({ blocked: !!b.blocked });
  },
  async deleteUser(b, req) {
    await A(req); const u = uid(b.username); if (u === 'admin') throw err(400, 'Admin cannot be deleted');
    await db.doc('users/' + u).delete();
  },
  async importStudents(b, req) {
    await A(req);
    const rows = (b.rows || []).map(r => {
      const cls = str(r.cls), sec = (str(r.sec) || 'A').toUpperCase(), shift = shiftOf(r.shift) || shiftOf(b.shift);
      const o = { id: uid(r.id), ref: str(r.ref).slice(0, 30), name: str(r.name), father: str(r.father), cls, sec, shift, key: shift + '|' + cls + '|' + sec, roll: str(r.roll), phone: str(r.phone) };
      const dob = str(r.dob), bg = str(r.bg), em = str(r.email), ad = str(r.addr);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) o.dob = dob; if (BG.includes(bg)) o.bg = bg; if (/^\S+@\S+\.\S+$/.test(em)) o.email = em.slice(0, 120); if (ad) o.addr = ad.slice(0, 250);
      return o;
    }).filter(r => r.name && r.cls && r.shift);
    const skipped = (b.rows || []).length - rows.length, def = mk('1234');
    // existing students (needed to match duplicates and to keep roll numbers free of clashes)
    const all = (await db.collection('students').get()).docs.map(d => ({ id: d.id, ...d.data() }));
    const byId = {}, byName = {}, used = {}, nk = r => [r.shift, r.cls, r.sec, str(r.name).toLowerCase(), str(r.father).toLowerCase()].join('|');
    all.forEach(x => { byId[x.id] = x; byName[nk(x)] = x.id; if (x.key && str(x.roll)) (used[x.key] = used[x.key] || {})[str(x.roll)] = x.id; });
    // 1) decide which rows are updates and which are new students
    const plan = [], seen = {}; let nNew = 0;
    rows.forEach(r => {
      let id = r.id && byId[r.id] ? r.id : (byName[nk(r)] || '');
      if (!id && seen[nk(r)]) id = seen[nk(r)].tmp;
      if (id) { plan.push({ r, id, isNew: false }); return; }
      const p = { r, id: '', isNew: true, tmp: '#' + (++nNew) }; seen[nk(r)] = p; plan.push(p);
    });
    // 2) explicit roll numbers must not clash with anyone already in that class / section / shift
    const bad = [];
    plan.forEach(p => {
      const ro = str(p.r.roll); if (!ro) return;
      const u = (used[p.r.key] = used[p.r.key] || {}), who = u[ro];
      if (who && who !== p.id && !(p.isNew && who === p.tmp)) bad.push('Roll ' + ro + ' in ' + p.r.cls + p.r.sec + ' (' + p.r.name + ')');
      else u[ro] = p.isNew ? p.tmp : p.id;
    });
    if (bad.length) throw err(400, 'Roll number already used in the same class, section and shift: ' + bad.slice(0, 4).join('; ') + (bad.length > 4 ? ' and ' + (bad.length - 4) + ' more' : '') + '. Fix the file or leave Roll empty for automatic numbering.');
    // 3) automatic roll numbers for new students with an empty Roll (next number after the highest in that section)
    plan.forEach(p => {
      if (!p.isNew || str(p.r.roll)) return;
      const u = (used[p.r.key] = used[p.r.key] || {}), mx = Object.keys(u).reduce((a, k) => Math.max(a, +k || 0), 0);
      p.r.roll = String(mx + 1); u[p.r.roll] = p.tmp;
    });
    // 4) allocate Student IDs (SAJ-0001, SAJ-0002 ...) from one counter, inside a transaction so two admins can never get the same number
    let start = 0;
    if (nNew) await db.runTransaction(async tx => {
      const cr = db.doc('meta/studentCounter'), cs = await tx.get(cr), cur = cs.exists ? (cs.data().n || 0) : 0;
      let top = cur; all.forEach(x => { const m = /^saj-(\d+)$/.exec(x.id); if (m) top = Math.max(top, +m[1]); });
      start = top; tx.set(cr, { n: top + nNew });
    });
    const real = {}; let k = 0;
    plan.forEach(p => { if (p.isNew) { const id = 'saj-' + String(start + (++k)).padStart(4, '0'); real[p.tmp] = id; p.id = id; } });
    plan.forEach(p => { if (!p.isNew && real[p.id]) p.id = real[p.id]; });
    // 5) write
    let added = 0, updated = 0; const ids = [];
    for (let i = 0; i < plan.length; i += 150) {
      const part = plan.slice(i, i + 150);
      const ux = await db.getAll(...part.map(p => db.doc('users/' + p.id)));
      const batch = db.batch();
      part.forEach((p, j) => {
        const r = p.r, d = { ...r, gr: p.id }; delete d.id;
        if (!p.isNew && !str(r.roll)) delete d.roll;
        if (!p.isNew && !str(r.ref)) delete d.ref;
        p.isNew ? added++ : updated++; ids.push(p.id);
        batch.set(db.doc('students/' + p.id), d, { merge: true });
        if (!ux[j].exists) batch.set(db.doc('users/' + p.id), { role: 'parent', name: 'Parent of ' + r.name, blocked: false, classes: [], mustChange: true, ...def });
        else if (ux[j].data().role === 'parent') batch.update(db.doc('users/' + p.id), { name: 'Parent of ' + r.name });
      });
      await batch.commit();
    }
    return { added, updated, skipped, ids: ids.slice(0, 5) };
  },
  async wipeAll(b, req) {
    await A(req);
    if (String(b.confirm || '') !== 'DELETE') throw err(400, 'Type DELETE to confirm');
    const ax = (await db.doc('users/admin').get()).data(), pw = String(b.password || '');
    if (!ax || !(ax.hash === hash(pw, ax.salt) || (process.env.ADMIN_PASSWORD && pw === process.env.ADMIN_PASSWORD))) throw err(400, 'Admin password is incorrect');
    let deleted = 0; const gone = [];
    for (const c of ['students', 'att', 'attlock', 'hw', 'notices', 'pnotices', 'results', 'rl', 'meta', 'users']) {
      const refs = (await db.collection(c).listDocuments()).filter(r => !(c === 'users' && r.id === 'admin'));
      if (c === 'users') refs.forEach(r => gone.push(r.id));
      for (let i = 0; i < refs.length; i += 400) { const bt = db.batch(); refs.slice(i, i + 400).forEach(r => bt.delete(r)); await bt.commit(); }
      deleted += refs.length;
    }
    for (let i = 0; i < gone.length; i += 900) { try { await admin.auth().deleteUsers(gone.slice(i, i + 900)); } catch {} }
    return { deleted };
  },
  async markLeft(b, req) { // student left school: keep the record, remove from class lists, block parent login
    const t = await A(req), g = uid(b.gr), ref = db.doc('students/' + g);
    if (!(await ref.get()).exists) throw err(404, 'Student not found');
    const at = /^\d{4}-\d{2}-\d{2}$/.test(str(b.date)) ? str(b.date) : new Date().toISOString().slice(0, 10), reason = str(b.reason).slice(0, 200);
    if (!reason) throw err(400, 'Write the reason for leaving');
    await ref.update({ left: { at, reason, tc: str(b.tc).slice(0, 40), by: t.uid, ts: Date.now() } });
    const u = await db.doc('users/' + g).get(); if (u.exists && u.data().role === 'parent') await u.ref.update({ blocked: true, leftSchool: true });
  },
  async readmit(b, req) {
    await A(req); const g = uid(b.gr), ref = db.doc('students/' + g);
    if (!(await ref.get()).exists) throw err(404, 'Student not found');
    await ref.update({ left: admin.firestore.FieldValue.delete() });
    const u = await db.doc('users/' + g).get(); if (u.exists && u.data().role === 'parent' && u.data().leftSchool) await u.ref.update({ blocked: false, leftSchool: admin.firestore.FieldValue.delete() });
  },
  async logEvent(b, req) { // events reported by the app (attendance confirmed, homework posted...). Identity always comes from the verified token.
    const t = await who(req); if (t.role === 'parent') return;
    const ty = str(b.type); if (!['att_confirm', 'att_lock', 'att_edit', 'hw_add', 'hw_del', 'result_save', 'logout'].includes(ty)) throw err(400, 'Unknown event');
    let meta = b.meta && typeof b.meta === 'object' ? b.meta : null; if (meta && JSON.stringify(meta).length > 6000) meta = null;
    await logAct(t, ty, b.text, meta);
  },
  async getLogs(b, req) {
    const t = await who(req); if (t.uid !== 'admin') throw err(403, 'Only the main admin can view activity logs');
    const day = /^\d{4}-\d{2}-\d{2}$/, f = day.test(str(b.from)) ? str(b.from) : new Date(Date.now() + 18000000).toISOString().slice(0, 10), to = day.test(str(b.to)) ? str(b.to) : f;
    const a = Date.parse(f + 'T00:00:00+05:00'), z = Date.parse(to + 'T23:59:59.999+05:00'); if (!(a <= z)) throw err(400, 'Choose a valid date range');
    const q = await db.collection('logs').where('ts', '>=', a).where('ts', '<=', z).orderBy('ts', 'desc').limit(500).get();
    return { logs: q.docs.map(d => d.data()), more: q.size >= 500 };
  },
  async clearLogs(b, req) {
    const t = await who(req); if (t.uid !== 'admin') throw err(403, 'Only the main admin can reset activity logs');
    if (String(b.confirm || '') !== 'DELETE') throw err(400, 'Type DELETE to confirm');
    const refs = await db.collection('logs').listDocuments();
    for (let i = 0; i < refs.length; i += 400) { const bt = db.batch(); refs.slice(i, i + 400).forEach(r => bt.delete(r)); await bt.commit(); }
    await logAct(t, 'danger', 'Reset all activity logs (' + refs.length + ' entries removed)');
    return { deleted: refs.length };
  },
  async deleteStudent(b, req) {
    await A(req); const g = uid(b.gr);
    await db.doc('students/' + g).delete();
    const u = await db.doc('users/' + g).get(); if (u.exists && u.data().role === 'parent') await u.ref.delete();
    const at = await db.collection('att').where('gr', '==', g).get();
    for (let i = 0; i < at.docs.length; i += 400) { const bt = db.batch(); at.docs.slice(i, i + 400).forEach(d => bt.delete(d.ref)); await bt.commit(); }
  }
};
const AUDIT = {
  changePassword: () => ['password', 'Changed own password'],
  setPassword: b => ['password', 'Set a new password for ' + uid(b.username)],
  resetPassword: b => ['password', 'Reset password to default for ' + uid(b.username)],
  createTeacher: b => ['users', 'Created ' + (str(b.role) || 'teacher') + ' login ' + uid(b.username)],
  updateTeacher: b => ['users', 'Updated user ' + uid(b.username) + ' (name, shift or classes)'],
  blockUser: b => ['users', (b.blocked ? 'Blocked ' : 'Unblocked ') + uid(b.username)],
  deleteUser: b => ['users', 'Deleted user ' + uid(b.username)],
  saveUserProfile: b => ['users', 'Edited profile of ' + (uid(b.username) || 'own account')],
  importStudents: (b, o) => ['students', 'Student import/add: ' + (o.added || 0) + ' added, ' + (o.updated || 0) + ' updated' + ('')],
  saveStudentProfile: b => ['students', 'Edited profile of student GR ' + uid(b.gr)],
  markLeft: b => ['students', 'Marked student GR ' + uid(b.gr) + ' as Left: ' + str(b.reason).slice(0, 120)],
  readmit: b => ['students', 'Re-admitted student GR ' + uid(b.gr)],
  deleteStudent: b => ['students', 'Deleted student GR ' + uid(b.gr)],
  setHold: b => ['students', (b.hold ? 'Put result on hold for GR ' : 'Released result hold for GR ') + uid(b.gr)],
  promoteStudents: (b, o) => ['students', 'Promoted ' + (o.promoted || 0) + ' student(s) to ' + str(b.to)],
  wipeAll: () => ['danger', 'Reset ALL data']
};
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!act[b.action]) throw err(400, 'Unknown action');
    const out = await act[b.action](b, req);
    if (AUDIT[b.action]) { try { const t = await who(req); const [ty, tx] = AUDIT[b.action](b, out || {}); await logAct(t, ty, tx); } catch {} }
    res.status(200).json(out || { ok: true });
  } catch (x) { res.status(x.status || 500).json({ error: x.message || 'Server error' }); }
};
