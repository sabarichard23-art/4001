// Server side of Tarneeb 400. Two jobs, both triggered by a new record in the database:
// 1. a table invite  -> notify the invited friend's phone
// 2. a friend request -> notify the person who received it
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

const GONE = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];

function clean(name, fallback) {
  const s = String(name == null ? '' : name).replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 12);
  return s || fallback;
}

// Sends one notification to every phone saved on an account, and forgets phones that no longer exist.
async function notify(uid, body, data) {
  if (typeof uid !== 'string' || !uid) return;
  const ref = getFirestore().doc(`users/${uid}/private/push`);
  const snap = await ref.get();
  const tokens = snap.exists && Array.isArray(snap.data().tokens) ? snap.data().tokens.filter((t) => typeof t === 'string' && t) : [];
  if (!tokens.length) return;
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: 'Tarneeb 400', body },
    data,
    apns: { payload: { aps: { sound: 'default' } } },
  });
  const dead = tokens.filter((t, i) => !res.responses[i].success && res.responses[i].error && GONE.includes(res.responses[i].error.code));
  if (dead.length) await ref.update({ tokens: FieldValue.arrayRemove(...dead) });
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
