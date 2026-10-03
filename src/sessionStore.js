const session = require('express-session');

class TtlStore extends session.Store {
  constructor(ttlMs, maxItems = 5000) {
    super();
    this.ttlMs = ttlMs;
    this.maxItems = maxItems;
    this.items = new Map();
    this.timer = setInterval(() => this.prune(), 10 * 60 * 1000);
    this.timer.unref();
  }

  expiry(sess) {
    const exp = sess && sess.cookie && sess.cookie.expires;
    return exp ? new Date(exp).getTime() : Date.now() + this.ttlMs;
  }

  prune() {
    const now = Date.now();
    for (const [sid, entry] of this.items) {
      if (entry.exp <= now) this.items.delete(sid);
    }
  }

  get(sid, cb) {
    const entry = this.items.get(sid);
    if (!entry) return cb(null, null);
    if (entry.exp <= Date.now()) {
      this.items.delete(sid);
      return cb(null, null);
    }
    cb(null, JSON.parse(entry.data));
  }

  set(sid, sess, cb) {
    if (!this.items.has(sid) && this.items.size >= this.maxItems) {
      this.prune();
      if (this.items.size >= this.maxItems) this.items.delete(this.items.keys().next().value);
    }
    this.items.set(sid, { data: JSON.stringify(sess), exp: this.expiry(sess) });
    if (cb) cb(null);
  }

  touch(sid, sess, cb) {
    const entry = this.items.get(sid);
    if (entry) entry.exp = this.expiry(sess);
    if (cb) cb(null);
  }

  destroy(sid, cb) {
    this.items.delete(sid);
    if (cb) cb(null);
  }
}

module.exports = TtlStore;
