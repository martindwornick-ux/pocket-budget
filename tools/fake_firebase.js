/* Test-only stand-in for the Firebase "compat" SDK, used by tools/check.py. Never shipped to phones.
   In-memory Firestore with the same owner-only rule as firestore.rules (users/<uid>/... only for that uid),
   and an auth that is already signed in as the test user. Data persists across reloads in sessionStorage,
   so a test can reload the page. window.__fs exposes it to tests. */
(function () {
  if (window.firebase) return;
  const KEY = "__fakefs", UID = "test-user";
  let store = {};
  try { store = JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch (e) {}
  if (window.__FAKE_SEED && !Object.keys(store).length) store = JSON.parse(JSON.stringify(window.__FAKE_SEED));
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
  const listeners = new Set();
  const notify = () => { save(); listeners.forEach(l => { try { l(); } catch (e) {} }); };
  const denied = () => Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
  const allowed = path => { const m = path.match(/^users\/([^/]+)/); return !!(m && m[1] === UID); };
  let n = 0;
  const newId = () => "id" + Date.now().toString(36) + (n++).toString(36);
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  function docSnap(path) { const v = store[path]; return { id: path.split("/").pop(), exists: v !== undefined, data: () => clone(v) }; }
  function children(cpath) {
    const pre = cpath + "/";
    return Object.keys(store).filter(k => k.startsWith(pre) && !k.slice(pre.length).includes("/")).sort();
  }
  function qsnap(paths) { const docs = paths.map(docSnap); return { docs, size: docs.length, empty: !docs.length }; }
  function query(cpath, filters, order, lim) {
    const run = () => {
      let ps = children(cpath).filter(p => filters.every(([f, op, v]) => {
        const x = (store[p] || {})[f];
        return op === "==" ? x === v : op === "<=" ? x <= v : op === ">=" ? x >= v : op === "<" ? x < v : op === ">" ? x > v : true;
      }));
      if (order) ps.sort((a, b) => { const x = store[a][order[0]], y = store[b][order[0]]; return (x < y ? -1 : x > y ? 1 : 0) * (order[1] === "desc" ? -1 : 1); });
      if (lim) ps = ps.slice(0, lim);
      return qsnap(ps);
    };
    return {
      where: (f, op, v) => query(cpath, filters.concat([[f, op, v]]), order, lim),
      orderBy: (f, d) => query(cpath, filters, [f, d], lim),
      limit: k => query(cpath, filters, order, k),
      get: () => allowed(cpath) ? Promise.resolve(run()) : Promise.reject(denied()),
      onSnapshot(cb, err) {
        if (!allowed(cpath)) { setTimeout(() => err && err(denied())); return () => {}; }
        const l = () => cb(run()); listeners.add(l); setTimeout(l); return () => listeners.delete(l);
      },
    };
  }
  function docRef(path) {
    return {
      id: path.split("/").pop(), path,
      collection: c => collRef(path + "/" + c),
      get: () => allowed(path) ? Promise.resolve(docSnap(path)) : Promise.reject(denied()),
      set(v, o) { if (!allowed(path)) return Promise.reject(denied()); store[path] = o && o.merge ? Object.assign(store[path] || {}, clone(v)) : clone(v); notify(); return Promise.resolve(); },
      update(v) { if (!allowed(path)) return Promise.reject(denied()); if (store[path] === undefined) return Promise.reject(Object.assign(new Error("No document"), { code: "not-found" })); Object.assign(store[path], clone(v)); notify(); return Promise.resolve(); },
      delete() { if (!allowed(path)) return Promise.reject(denied()); delete store[path]; notify(); return Promise.resolve(); },
      onSnapshot(cb, err) {
        if (!allowed(path)) { setTimeout(() => err && err(denied())); return () => {}; }
        const l = () => cb(docSnap(path)); listeners.add(l); setTimeout(l); return () => listeners.delete(l);
      },
    };
  }
  function collRef(cpath) {
    return Object.assign(query(cpath, [], null, 0), {
      doc: id => docRef(cpath + "/" + (id || newId())),
      add(v) { const r = docRef(cpath + "/" + newId()); return r.set(v).then(() => r); },
    });
  }
  const fs = {
    settings() {}, enablePersistence: () => Promise.resolve(),
    collection: c => collRef(c),
    doc: p => docRef(p),
    batch() {
      const ops = [];
      return { set(ref, v) { ops.push(() => ref.set(v)); }, update(ref, v) { ops.push(() => ref.update(v)); }, delete(ref) { ops.push(() => ref.delete()); },
        commit: () => ops.reduce((p, f) => p.then(f), Promise.resolve()) };
    },
  };
  const user = { uid: UID, email: "test@example.com", displayName: "Test" };
  let signedIn = true;
  const auth = {
    get currentUser() { return signedIn ? user : null; },
    onAuthStateChanged(cb) { setTimeout(() => cb(signedIn ? user : null)); return () => {}; },
    signOut() { signedIn = false; return Promise.resolve(); },
    signInWithEmailAndPassword() { signedIn = true; return Promise.resolve({ user }); },
    createUserWithEmailAndPassword() { signedIn = true; return Promise.resolve({ user }); },
    sendPasswordResetEmail: () => Promise.resolve(),
  };
  const app = { name: "[DEFAULT]" };
  window.firebase = { apps: [], initializeApp() { this.apps.push(app); return app; }, app: () => app, auth: () => auth, firestore: () => fs };
  window.__fs = { store: () => store, set(p, v) { store[p] = v; notify(); }, del(p) { delete store[p]; notify(); }, uid: UID };
})();
