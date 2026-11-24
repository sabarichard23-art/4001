// Server side of Tarneeb 400. Two jobs, both triggered by a new record in the database:
// 1. a table invite   -> notify the invited friend's phone
// 2. a friend request -> notify the person who received it
//
// Phones register with Apple and save Apple's device address ("APNs token") on the account.
// Firebase sends the notification, so each Apple address is first exchanged for a Firebase one.
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

const BUNDLE_ID = 'com.richardsaba.tarneeb400';

function clean(name, fallback) {
  const s = String(name == null ? '' : name).replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 12);
  return s || fallback;
}

// Exchanges Apple device addresses for Firebase ones. App Store and TestFlight builds are
// "production"; a build run straight from Xcode is "sandbox". Both are tried.
async function firebaseTokens(apnsTokens) {
  const { access_token: accessToken } = await applicationDefault().getAccessToken();
  const out = [];
  for (const sandbox of [false, true]) {
    const res = await fetch('https://iid.googleapis.com/iid/v1:batchImport', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, access_token_auth: 'true', 'Content-Type': 'application/json' },
      body: JSON.stringify({ application: BUNDLE_ID, sandbox, apns_tokens: apnsTokens }),
    });
    const text = await res.text();
    if (!res.ok) { console.error('token exchange failed', sandbox ? 'sandbox' : 'production', res.status, text.slice(0, 300)); continue; }
    let body = {};
    try { body = JSON.parse(text); } catch (e) { console.error('token exchange: unreadable reply', text.slice(0, 200)); }
    for (const r of body.results || []) {
      if (r.status === 'OK' && r.registration_token) out.push(r.registration_token);
      else console.warn('token exchange skipped one', sandbox ? 'sandbox' : 'production', r.status);
    }
  }
  return [...new Set(out)];
}

// Sends one notification to every phone saved on an account.
async function notify(uid, body, data) {
  if (typeof uid !== 'string' || !uid) return;
  const snap = await getFirestore().doc(`users/${uid}/private/push`).get();
  const d = snap.exists ? snap.data() : {};
  const apns = (Array.isArray(d.apns) ? d.apns : []).filter((t) => typeof t === 'string' && /^[0-9a-fA-F]{32,200}$/.test(t)).slice(-10);
  const direct = (Array.isArray(d.tokens) ? d.tokens : []).filter((t) => typeof t === 'string' && t);
  if (!apns.length && !direct.length) { console.log('no phone saved for', uid); return; }
  const tokens = direct.concat(apns.length ? await firebaseTokens(apns) : []);
  if (!tokens.length) { console.error('no usable address for', uid); return; }
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: 'Tarneeb 400', body },
    data,
    apns: { payload: { aps: { sound: 'default' } } },
  });
  console.log('sent to', uid, 'ok', res.successCount, 'failed', res.failureCount, res.responses.filter((r) => !r.success).map((r) => r.error && r.error.code));
}

exports.inviteCreated = onDocumentCreated('invites/{id}', async (event) => {
  const d = event.data && event.data.data();
  if (!d) return;
  await notify(d.to, `${clean(d.fromName, 'A friend')} invited you to a table`, { kind: 'invite' });
});

exports.friendRequested = onDocumentCreated('friendships/{id}', async (event) => {
  const d = event.data && event.data.data();
  if (!d || d.status !== 'pending' || !Array.isArray(d.users)) return;
  const to = d.users.find((u) => u !== d.from);
  const from = await getFirestore().doc(`users/${d.from}`).get();
  await notify(to, `${clean(from.exists && from.data().name, 'Someone')} sent you a friend request`, { kind: 'friend' });
});
