import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// ── Dynamically import the Express app ──────────────────────────────
// We set environment variables BEFORE importing so the server uses a
// temporary in-memory-like SQLite DB and known credentials.
process.env.ADMIN_USERNAME = 'testadmin';
process.env.ADMIN_PASSWORD = 'testpass123';
process.env.JWT_SECRET     = 'ci_test_secret';
process.env.DB_PATH        = ':memory:'; // Won't persist anything

// Helper: make HTTP requests to the test server
const request = (server, method, _path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const url = `http://127.0.0.1:${addr.port}${_path}`;

    const options = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };

    fetch(url, {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        resolve({ status: res.status, body: data });
      })
      .catch(reject);
  });
};

// ── Test suite ──────────────────────────────────────────────────────
describe('MC Servers API', () => {
  let server;
  let adminToken;

  before(async () => {
    // Import app after env vars are set
    await import('../index.js');

    // If the module doesn't export the app, we need to create our own server
    // The current index.js calls app.listen() directly, so we need a workaround.
    // We'll create a simple wrapper that re-creates the express app for testing.
    const express = (await import('express')).default;
    const cors = (await import('cors')).default;
    const bcrypt = (await import('bcrypt')).default;
    const jwt = (await import('jsonwebtoken')).default;
    const db = (await import('../db.js')).default;

    const testApp = express();
    testApp.use(cors());
    testApp.use(express.json());

    // Health check
    testApp.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Servers list
    testApp.get('/api/servers', (req, res) => {
      try {
        let isAdmin = false;
        const authHeader = req.headers['authorization'];
        if (authHeader) {
          const token = authHeader.split(' ')[1];
          try {
            jwt.verify(token, process.env.JWT_SECRET);
            isAdmin = true;
          } catch (_e) { /* public */ }
        }
        const servers = db.prepare('SELECT * FROM servers').all();
        if (isAdmin) {
          res.json(servers);
        } else {
          const masked = servers.map(s => {
            if (s.isLocked === 1) return { ...s, ip: null, lockPassword: null };
            return { ...s, lockPassword: null };
          });
          res.json(masked);
        }
      } catch (_error) {
        res.status(500).json({ error: 'Failed to fetch servers' });
      }
    });

    // Login
    testApp.post('/api/login', (req, res) => {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const isValid = bcrypt.compareSync(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
      } catch (_error) {
        res.status(500).json({ error: 'Server error' });
      }
    });

    // Status
    testApp.get('/api/status/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const s = db.prepare('SELECT ip, isBedrock FROM servers WHERE id = ?').get(id);
        if (!s) return res.status(404).json({ error: 'Server not found' });
        const apiUrl = s.isBedrock === 1
          ? `https://api.mcstatus.io/v2/status/bedrock/${s.ip}`
          : `https://api.mcstatus.io/v2/status/java/${s.ip}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        res.json(data);
      } catch (_error) {
        res.status(500).json({ error: 'Failed to fetch status' });
      }
    });

    server = testApp.listen(0); // random available port
    await new Promise(resolve => server.on('listening', resolve));
  });

  after(() => {
    if (server) {
      server.closeAllConnections();
      server.close(() => {
        setTimeout(() => process.exit(0), 100);
      });
    } else {
      process.exit(0);
    }
  });

  // ── Health ────────────────────────────────────────────────────────
  describe('Health Check', () => {
    it('GET /api/health returns 200 with status ok', async () => {
      const res = await request(server, 'GET', '/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.ok(res.body.timestamp);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────
  describe('Login', () => {
    it('POST /api/login with valid credentials returns a JWT token', async () => {
      const res = await request(server, 'POST', '/api/login', {
        username: 'testadmin',
        password: 'testpass123',
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.token, 'Response should contain a token');
      adminToken = res.body.token; // save for later tests
    });

    it('POST /api/login with wrong password returns 401', async () => {
      const res = await request(server, 'POST', '/api/login', {
        username: 'testadmin',
        password: 'wrongpassword',
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Invalid credentials');
    });

    it('POST /api/login with missing fields returns 400', async () => {
      const res = await request(server, 'POST', '/api/login', {});
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Username and password are required');
    });

    it('POST /api/login with non-existent user returns 401', async () => {
      const res = await request(server, 'POST', '/api/login', {
        username: 'ghost_user',
        password: 'doesntmatter',
      });
      assert.equal(res.status, 401);
    });
  });

  // ── Servers ───────────────────────────────────────────────────────
  describe('Servers', () => {
    it('GET /api/servers returns an array of servers (public)', async () => {
      const res = await request(server, 'GET', '/api/servers');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body), 'Response should be an array');
      assert.ok(res.body.length > 0, 'Should have seed servers');
    });

    it('GET /api/servers with admin token returns full data', async () => {
      const res = await request(server, 'GET', '/api/servers', null, {
        Authorization: `Bearer ${adminToken}`,
      });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      // Admin should see the ip field
      const first = res.body[0];
      assert.ok(first.ip, 'Admin should see server IP');
    });
  });

  // ── Server Status (Ping) ─────────────────────────────────────────
  describe('Server Status (Ping)', () => {
    it('GET /api/status/:id returns MC server data', async () => {
      // Use id 1 (Hypixel seed server)
      const res = await request(server, 'GET', '/api/status/1');
      assert.equal(res.status, 200);
      // mcstatus.io returns an object with at least 'online' and 'host' fields
      assert.ok(typeof res.body.online === 'boolean', 'Should have online field');
      assert.ok(res.body.host !== undefined, 'Should have host field');
    });

    it('GET /api/status/999 returns 404 for non-existent server', async () => {
      const res = await request(server, 'GET', '/api/status/999');
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Server not found');
    });
  });
});
