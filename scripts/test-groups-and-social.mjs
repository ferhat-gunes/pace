import test from 'node:test';
import assert from 'node:assert/strict';

// Helper mock database in-memory simulating D1 schema for groups and social
function createSocialDB() {
  const groups = new Map();
  const members = new Map(); // key: groupId:userId
  const invites = new Map(); // key: code
  const habits = new Map(); // key: id
  const checkins = new Map(); // key: groupId:habitId:userId:date

  function maskEmail(email) {
    if (!email || !email.includes('@')) return email || '';
    const [user, domain] = email.split('@');
    return user.slice(0, 2) + '***@' + domain;
  }

  return {
    maskEmail,
    createGroup(userId, name, description = '') {
      if (!name || !name.trim()) throw new Error('Grup adı gerekli.');
      if (name.length > 60) throw new Error('Grup adı en fazla 60 karakter olabilir.');
      const id = 'grp_' + crypto.randomUUID().slice(0, 8);
      const group = { id, name: name.trim(), description: description.trim(), created_at: new Date().toISOString() };
      groups.set(id, group);
      members.set(`${id}:${userId}`, { group_id: id, user_id: userId, role: 'owner', joined_at: new Date().toISOString() });
      return group;
    },
    getGroup(groupId, requestingUserId) {
      const g = groups.get(groupId);
      if (!g) throw Object.assign(new Error('Grup bulunamadı.'), { status: 404 });
      const m = members.get(`${groupId}:${requestingUserId}`);
      if (!m) throw Object.assign(new Error('Bu gruba erişim yetkin yok.'), { status: 403 });
      const groupMembers = [...members.values()].filter(x => x.group_id === groupId);
      const groupHabits = [...habits.values()].filter(x => x.group_id === groupId);
      const groupCheckins = [...checkins.values()].filter(x => x.group_id === groupId);
      return { group: { ...g, role: m.role }, members: groupMembers, habits: groupHabits, checkins: groupCheckins };
    },
    createInvite(groupId, inviterId, type, target = null) {
      const m = members.get(`${groupId}:${inviterId}`);
      if (!m) throw Object.assign(new Error('Yetkisiz işlem.'), { status: 403 });
      if (!['link', 'username', 'email'].includes(type)) throw new Error('Geçersiz davet tipi.');
      if (type !== 'link' && (!target || !target.trim())) throw new Error('Davet hedefi gerekli.');
      const code = 'inv_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      const invite = { code, group_id: groupId, inviter_id: inviterId, type, target: target?.trim() || null, status: 'pending', expires_at: expiresAt };
      invites.set(code, invite);
      return invite;
    },
    getInvitePreview(code) {
      const inv = invites.get(code);
      if (!inv) throw Object.assign(new Error('Davet bulunamadı.'), { status: 404 });
      if (new Date(inv.expires_at).getTime() < Date.now()) {
        inv.status = 'expired';
        throw Object.assign(new Error('Davetin süresi dolmuş.'), { status: 410 });
      }
      if (inv.status !== 'pending') throw Object.assign(new Error('Davet daha önce kullanılmış veya reddedilmiş.'), { status: 400 });
      const g = groups.get(inv.group_id);
      return { code: inv.code, group_id: inv.group_id, group_name: g?.name, type: inv.type, expires_at: inv.expires_at };
    },
    respondInvite(code, userId, action) {
      const inv = invites.get(code);
      if (!inv) throw Object.assign(new Error('Davet bulunamadı.'), { status: 404 });
      if (new Date(inv.expires_at).getTime() < Date.now()) throw Object.assign(new Error('Davet süresi dolmuş.'), { status: 410 });
      if (inv.status !== 'pending') throw Object.assign(new Error('Davet artık geçerli değil.'), { status: 400 });
      if (action === 'accept') {
        inv.status = 'accepted';
        members.set(`${inv.group_id}:${userId}`, { group_id: inv.group_id, user_id: userId, role: 'member', joined_at: new Date().toISOString() });
        return { ok: true, group_id: inv.group_id };
      } else if (action === 'decline') {
        inv.status = 'declined';
        return { ok: true };
      }
      throw new Error('Geçersiz eylem.');
    },
    createHabit(groupId, userId, habitData) {
      const m = members.get(`${groupId}:${userId}`);
      if (!m || m.role !== 'owner') throw Object.assign(new Error('Yalnızca grup lideri alışkanlık ekleyebilir.'), { status: 403 });
      if (!habitData.name || !habitData.name.trim()) throw new Error('Alışkanlık adı gerekli.');
      const id = 'gh_' + crypto.randomUUID().slice(0, 8);
      const h = { id, group_id: groupId, name: habitData.name.trim(), tracking: habitData.tracking || 'quantity', direction: 'at_least', target: Number(habitData.target || 1), unit: habitData.unit?.trim() || '' };
      habits.set(id, h);
      return h;
    },
    setCheckin(groupId, habitId, userId, date, value, expectedRevision = 0) {
      const m = members.get(`${groupId}:${userId}`);
      if (!m) throw Object.assign(new Error('Grup üyesi değilsin.'), { status: 403 });
      const h = habits.get(habitId);
      if (!h || h.group_id !== groupId) throw Object.assign(new Error('Alışkanlık bulunamadı.'), { status: 404 });
      const key = `${groupId}:${habitId}:${userId}:${date}`;
      const existing = checkins.get(key);
      const currentRev = existing ? existing.revision : 0;
      if (expectedRevision > 0 && currentRev !== expectedRevision) {
        throw Object.assign(new Error('Kayıt başka bir cihazda değişmiş.'), { status: 409 });
      }
      const entry = {
        id: existing?.id || 'gc_' + crypto.randomUUID().slice(0, 8),
        group_id: groupId,
        habit_id: habitId,
        user_id: userId,
        habit_date: date,
        value: Number(value),
        deleted: Number(value) === 0 ? 1 : 0,
        revision: currentRev + 1
      };
      checkins.set(key, entry);
      return entry;
    },
    leaveGroup(groupId, userId) {
      const m = members.get(`${groupId}:${userId}`);
      if (!m) throw Object.assign(new Error('Üye değilsin.'), { status: 404 });
      if (m.role === 'owner') throw Object.assign(new Error('Grup lideri gruptan ayrılamaz; grubu silmeli veya liderliği devretmeli.'), { status: 400 });
      members.delete(`${groupId}:${userId}`);
      return { ok: true };
    },
    kickMember(groupId, actorId, targetUserId) {
      const actor = members.get(`${groupId}:${actorId}`);
      if (!actor || actor.role !== 'owner') throw Object.assign(new Error('Yalnızca lider üye çıkarabilir.'), { status: 403 });
      if (actorId === targetUserId) throw Object.assign(new Error('Lider kendini çıkaramaz.'), { status: 400 });
      const target = members.get(`${groupId}:${targetUserId}`);
      if (!target) throw Object.assign(new Error('Üye bulunamadı.'), { status: 404 });
      members.delete(`${groupId}:${targetUserId}`);
      for (const [k, c] of checkins.entries()) if (c.group_id === groupId && c.user_id === targetUserId) checkins.delete(k);
      return { ok: true };
    },
    transferLeadership(groupId, actorId, newOwnerId) {
      const actor = members.get(`${groupId}:${actorId}`);
      if (!actor || actor.role !== 'owner') throw Object.assign(new Error('Yalnızca lider devredebilir.'), { status: 403 });
      const target = members.get(`${groupId}:${newOwnerId}`);
      if (!target) throw Object.assign(new Error('Hedef kullanıcı grup üyesi değil.'), { status: 404 });
      actor.role = 'member';
      target.role = 'owner';
      return { ok: true };
    },
    deleteGroup(groupId, userId) {
      const m = members.get(`${groupId}:${userId}`);
      if (!m || m.role !== 'owner') throw Object.assign(new Error('Yalnızca lider grubu silebilir.'), { status: 403 });
      groups.delete(groupId);
      for (const [k, mem] of members.entries()) if (mem.group_id === groupId) members.delete(k);
      for (const [k, inv] of invites.entries()) if (inv.group_id === groupId) invites.delete(k);
      for (const [k, h] of habits.entries()) if (h.group_id === groupId) habits.delete(k);
      for (const [k, c] of checkins.entries()) if (c.group_id === groupId) checkins.delete(k);
      return { ok: true };
    }
  };
}

test('Group Creation: creates group and assigns creator as owner', () => {
  const db = createSocialDB();
  const group = db.createGroup('user_1', 'Sabah Kulübü', 'Güne erken başlayalım');
  assert.equal(group.name, 'Sabah Kulübü');
  assert.equal(group.description, 'Güne erken başlayalım');
  const details = db.getGroup(group.id, 'user_1');
  assert.equal(details.group.role, 'owner');
  assert.equal(details.members.length, 1);
  assert.equal(details.members[0].user_id, 'user_1');
  assert.equal(details.members[0].role, 'owner');
});

test('Group Creation: validates empty name and name length', () => {
  const db = createSocialDB();
  assert.throws(() => db.createGroup('user_1', ''), /Grup adı gerekli/);
  assert.throws(() => db.createGroup('user_1', '   '), /Grup adı gerekli/);
  assert.throws(() => db.createGroup('user_1', 'A'.repeat(61)), /en fazla 60 karakter/);
});

test('Invite via Link: creates unique token with 7-day expiration', () => {
  const db = createSocialDB();
  const group = db.createGroup('user_1', 'Kitap Grubu');
  const inv = db.createInvite(group.id, 'user_1', 'link');
  assert.match(inv.code, /^inv_[0-9a-f]{16}$/);
  assert.equal(inv.type, 'link');
  assert.equal(inv.status, 'pending');
  const diffDays = (new Date(inv.expires_at) - Date.now()) / (86400000);
  assert(diffDays >= 6.9 && diffDays <= 7.1);
});

test('Invite via Username & Email: requires valid targets', () => {
  const db = createSocialDB();
  const group = db.createGroup('user_1', 'Koşu Grubu');
  assert.throws(() => db.createInvite(group.id, 'user_1', 'username', ''), /Davet hedefi gerekli/);
  assert.throws(() => db.createInvite(group.id, 'user_1', 'email', '  '), /Davet hedefi gerekli/);
  const userInv = db.createInvite(group.id, 'user_1', 'username', 'ayse_k');
  assert.equal(userInv.target, 'ayse_k');
  const emailInv = db.createInvite(group.id, 'user_1', 'email', 'mehmet@example.com');
  assert.equal(emailInv.target, 'mehmet@example.com');
});

test('Invite Preview & Acceptance: adds user as member', () => {
  const db = createSocialDB();
  const group = db.createGroup('user_1', 'Su Grubu');
  const inv = db.createInvite(group.id, 'user_1', 'link');
  const preview = db.getInvitePreview(inv.code);
  assert.equal(preview.group_name, 'Su Grubu');
  const res = db.respondInvite(inv.code, 'user_2', 'accept');
  assert.equal(res.ok, true);
  assert.equal(res.group_id, group.id);
  const details = db.getGroup(group.id, 'user_2');
  assert.equal(details.members.length, 2);
  const newMember = details.members.find(m => m.user_id === 'user_2');
  assert.equal(newMember.role, 'member');
});

test('Invite Decline: marks declined without adding user', () => {
  const db = createSocialDB();
  const group = db.createGroup('user_1', 'Meditasyon');
  const inv = db.createInvite(group.id, 'user_1', 'link');
  const res = db.respondInvite(inv.code, 'user_3', 'decline');
  assert.equal(res.ok, true);
  assert.throws(() => db.getGroup(group.id, 'user_3'), /erişim yetkin yok/);
  assert.throws(() => db.respondInvite(inv.code, 'user_3', 'accept'), /artık geçerli değil/);
});

test('Shared Habit Management: only owner can add habits', () => {
  const db = createSocialDB();
  const group = db.createGroup('user_1', 'Ders Çalışma');
  const inv = db.createInvite(group.id, 'user_1', 'link');
  db.respondInvite(inv.code, 'user_2', 'accept');
  assert.throws(() => db.createHabit(group.id, 'user_2', { name: 'Soru çöz', target: 50 }), /Yalnızca grup lideri/);
  const habit = db.createHabit(group.id, 'user_1', { name: 'Soru çöz', target: 50, unit: 'soru' });
  assert.equal(habit.name, 'Soru çöz');
  assert.equal(habit.target, 50);
});

test('Group Checkin OCC & Isolation: tracks member logs without modifying other members', () => {
  const db = createSocialDB();
  const group = db.createGroup('user_1', 'Fitness');
  const inv = db.createInvite(group.id, 'user_1', 'link');
  db.respondInvite(inv.code, 'user_2', 'accept');
  const habit = db.createHabit(group.id, 'user_1', { name: 'Şınav', target: 30, unit: 'tekrar' });

  const c1 = db.setCheckin(group.id, habit.id, 'user_1', '2026-11-09', 30);
  assert.equal(c1.revision, 1);
  assert.equal(c1.value, 30);

  const c2 = db.setCheckin(group.id, habit.id, 'user_2', '2026-11-09', 20);
  assert.equal(c2.user_id, 'user_2');
  assert.equal(c2.value, 20);

  const updatedC1 = db.setCheckin(group.id, habit.id, 'user_1', '2026-11-09', 35, 1);
  assert.equal(updatedC1.revision, 2);
  assert.equal(updatedC1.value, 35);

  assert.throws(() => db.setCheckin(group.id, habit.id, 'user_1', '2026-11-09', 40, 1), /başka bir cihazda değişmiş/);
});

test('Matrix Calculations: accurately calculates completion percentage', () => {
  const db = createSocialDB();
  const group = db.createGroup('u1', 'Rutin');
  const inv = db.createInvite(group.id, 'u1', 'link');
  db.respondInvite(inv.code, 'u2', 'accept');
  const h1 = db.createHabit(group.id, 'u1', { name: 'Yürüyüş', target: 1, tracking: 'check' });
  const h2 = db.createHabit(group.id, 'u1', { name: 'Kitap', target: 20, tracking: 'quantity', unit: 'sayfa' });

  db.setCheckin(group.id, h1.id, 'u1', '2026-11-09', 1);
  db.setCheckin(group.id, h2.id, 'u1', '2026-11-09', 20);
  db.setCheckin(group.id, h1.id, 'u1', '2026-11-10', 1);

  const details = db.getGroup(group.id, 'u1');
  const u1Logs = details.checkins.filter(c => c.user_id === 'u1' && !c.deleted);
  assert.equal(u1Logs.length, 3);

  const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];
  let u1Done = 0;
  days.forEach(d => {
    details.habits.forEach(h => {
      const log = u1Logs.find(c => c.habit_id === h.id && c.habit_date === d);
      const val = Number(log?.value || 0);
      if (h.tracking === 'check' ? val >= 1 : val >= h.target) u1Done++;
    });
  });
  const totalPossible = days.length * details.habits.length; // 7 * 2 = 14
  const pct = Math.round((u1Done / totalPossible) * 100);
  assert.equal(u1Done, 3);
  assert.equal(pct, 21); // 3 / 14 = 21%
});

test('Member Leaving & Deletion: enforces role rules and cascades', () => {
  const db = createSocialDB();
  const group = db.createGroup('u1', 'Pilates');
  const inv = db.createInvite(group.id, 'u1', 'link');
  db.respondInvite(inv.code, 'u2', 'accept');

  assert.throws(() => db.leaveGroup(group.id, 'u1'), /Grup lideri gruptan ayrılamaz/);

  db.leaveGroup(group.id, 'u2');
  assert.throws(() => db.getGroup(group.id, 'u2'), /erişim yetkin yok/);

  assert.throws(() => db.deleteGroup(group.id, 'u2'), /Yalnızca lider/);
  db.deleteGroup(group.id, 'u1');
  assert.throws(() => db.getGroup(group.id, 'u1'), /Grup bulunamadı/);
});

test('Privacy: email masking protects member addresses', () => {
  const db = createSocialDB();
  assert.equal(db.maskEmail('ferhat@pace.app'), 'fe***@pace.app');
  assert.equal(db.maskEmail('ayse.kaya@gmail.com'), 'ay***@gmail.com');
  assert.equal(db.maskEmail('ali@domain.org'), 'al***@domain.org');
});

test('Group Leadership: transfer and kick permissions enforced', () => {
  const db = createSocialDB();
  const group = db.createGroup('u1', 'Koşu Grubu');
  const inv1 = db.createInvite(group.id, 'u1', 'link');
  db.respondInvite(inv1.code, 'u2', 'accept');
  const inv2 = db.createInvite(group.id, 'u1', 'link');
  db.respondInvite(inv2.code, 'u3', 'accept');

  // u2 (non-owner) cannot kick u3
  assert.throws(() => db.kickMember(group.id, 'u2', 'u3'), /Yalnızca lider/);

  // u1 (owner) kicks u3
  assert.equal(db.kickMember(group.id, 'u1', 'u3').ok, true);
  assert.throws(() => db.getGroup(group.id, 'u3'), /erişim yetkin yok/);

  // u1 transfers leadership to u2
  assert.equal(db.transferLeadership(group.id, 'u1', 'u2').ok, true);
  const details = db.getGroup(group.id, 'u2');
  const u2Member = details.members.find(m => m.user_id === 'u2');
  const u1Member = details.members.find(m => m.user_id === 'u1');
  assert.equal(u2Member.role, 'owner');
  assert.equal(u1Member.role, 'member');

  // Now u2 can kick u1
  assert.equal(db.kickMember(group.id, 'u2', 'u1').ok, true);
  assert.throws(() => db.getGroup(group.id, 'u1'), /erişim yetkin yok/);
});
