const net = require('net');

const TARGETS = [
  { host: 'smtp.gmail.com', port: 587 },
  { host: 'smtp.gmail.com', port: 465 },
];

const TIMEOUT_MS = 8000;

const probe = ({ host, port }) =>
  new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok, code) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch (_) {}
      resolve({ host, port, ok, code, ms: Date.now() - start });
    };

    socket.setTimeout(TIMEOUT_MS);
    socket.once('connect', () => finish(true, null));
    socket.once('timeout', () => finish(false, 'ETIMEDOUT'));
    socket.once('error', (err) => finish(false, err.code || 'UNKNOWN'));
    socket.connect(port, host);
  });

(async () => {
  for (const target of TARGETS) {
    const r = await probe(target);
    if (r.ok) {
      console.log(`CONNECT SUCCESS ${r.host}:${r.port} (${r.ms}ms)`);
    } else {
      console.log(`CONNECT FAILED ${r.host}:${r.port} code=${r.code} (${r.ms}ms)`);
    }
  }
})();
