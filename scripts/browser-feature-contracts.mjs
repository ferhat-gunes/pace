/** Explicit optional endpoints introduced by preserved latest-main features. */
export async function fulfillFeatureRequest(route, state = null) {
  const req = route.request();
  const path = new URL(req.url()).pathname;
  const method = req.method();
  let data;

  if (method === 'GET' && path === '/api/auth/capabilities') {
    data = { email_code_enabled: false, push_enabled: false };
  } else if (method === 'GET' && path === '/api/social/inbox') {
    data = { items: state?.inboxItems || [] };
  } else if (method === 'GET' && path === '/api/push/public-key') {
    data = { public_key: null, enabled: false };
  } else if (method === 'GET' && path === '/api/gamification') {
    data = {
      gamification: state?.gamification || {
        xp: 0,
        gems: 10,
        streakFreezes: 1,
        claimedDates: {},
        usedFreezeDates: {},
        allDoneBonusDates: {},
      },
    };
  } else if (method === 'PUT' && path === '/api/gamification') {
    const value = req.postDataJSON();
    if (!Number.isFinite(value.xp) || !Number.isFinite(value.gems)) {
      throw new Error('Invalid gamification write contract');
    }
    if (state) state.gamification = value;
    data = { ok: true, gamification: value };
  } else if (method === 'POST' && path === '/api/social/react') {
    const body = req.postDataJSON() || {};
    if (state?.inboxItems) {
      const item = state.inboxItems.find((i) => i.id === body.itemId || i.id === body.id);
      if (item) {
        item.reactions = item.reactions || [];
        item.reactions.push({ emoji: body.emoji || '🔥', userId: state.user?.id || 'user-1' });
      }
    }
    data = { ok: true, reaction: body };
  } else {
    return false;
  }

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
  return true;
}
