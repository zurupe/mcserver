import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Set test environment configuration
process.env.ADMIN_USERNAME = 'testadmin';
process.env.ADMIN_PASSWORD = 'testpass123';
process.env.JWT_SECRET     = 'ci_test_secret';
process.env.DB_PATH        = ':memory:';
process.env.NODE_ENV       = 'test';

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

// ── Functional API Test Suite ───────────────────────────────────────
describe('MC Servers Functional API Tests', () => {
  let server;
  let adminToken;
  let createdServerId;

  before(async () => {
    // Import the REAL express application
    const appModule = await import('../index.js');
    const app = appModule.app || appModule.default;

    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  // ── Health Check ──────────────────────────────────────────────────
  describe('Health Check Endpoint', () => {
    it('GET /api/health returns 200 with status ok and timestamp', async () => {
      const res = await request(server, 'GET', '/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.ok(res.body.timestamp);
    });
  });

  // ── Login Flow ────────────────────────────────────────────────────
  describe('Authentication Flow', () => {
    it('POST /api/login with valid credentials returns a JWT token', async () => {
      const res = await request(server, 'POST', '/api/login', {
        username: 'testadmin',
        password: 'testpass123',
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.token, 'Response should contain a JWT token');
      adminToken = res.body.token;
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
      assert.equal(res.body.error, 'Invalid credentials');
    });
  });

  // ── Servers CRUD ──────────────────────────────────────────────────
  describe('Servers CRUD Operations', () => {
    it('GET /api/servers returns an array of seed servers publicly', async () => {
      const res = await request(server, 'GET', '/api/servers');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body), 'Response should be an array');
      assert.ok(res.body.length >= 2, 'Should have seed servers');
    });

    it('POST /api/servers with admin token creates a new server', async () => {
      const newServerData = {
        name: 'Survival Vanilla',
        ip: 'survival.mine.test',
        fallbackDesc: 'Servidor survival 1.20',
        isBedrock: false,
        isLocked: false,
      };

      const res = await request(
        server,
        'POST',
        '/api/servers',
        newServerData,
        { Authorization: `Bearer ${adminToken}` }
      );

      assert.equal(res.status, 201);
      assert.equal(res.body.name, 'Survival Vanilla');
      assert.equal(res.body.ip, 'survival.mine.test');
      assert.ok(res.body.id);
      createdServerId = res.body.id;
    });

    it('PUT /api/servers/:id updates server details', async () => {
      const updateData = {
        name: 'Survival Vanilla Updated',
        ip: 'survival-updated.mine.test',
        fallbackDesc: 'Servidor survival actualizado',
        isBedrock: false,
        isLocked: false,
      };

      const res = await request(
        server,
        'PUT',
        `/api/servers/${createdServerId}`,
        updateData,
        { Authorization: `Bearer ${adminToken}` }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'Survival Vanilla Updated');
      assert.equal(res.body.ip, 'survival-updated.mine.test');
    });

    it('DELETE /api/servers/:id removes the server', async () => {
      const res = await request(
        server,
        'DELETE',
        `/api/servers/${createdServerId}`,
        null,
        { Authorization: `Bearer ${adminToken}` }
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.message, 'Server deleted successfully');
    });

    it('GET /api/servers with admin token returns servers without leaking lockPassword', async () => {
      const res = await request(
        server,
        'GET',
        '/api/servers',
        null,
        { Authorization: `Bearer ${adminToken}` }
      );
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      const first = res.body[0];
      assert.ok(first.ip, 'Admin should see server IP');
      assert.equal(first.lockPassword, null, 'lockPassword must be redacted');
    });
  });

  // ── Server Status (Ping / Proxy) ─────────────────────────────────
  describe('Server Status (Ping Endpoint)', () => {
    it('GET /api/status/:id returns 404 for non-existent server', async () => {
      const res = await request(server, 'GET', '/api/status/999');
      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Server not found');
    });

    it('GET /api/status/1 calls external ping or returns status structure', async () => {
      const res = await request(server, 'GET', '/api/status/1');
      // Either returns 200 with online boolean from mcstatus.io or 500 if external network is unavailable
      if (res.status === 200) {
        assert.ok(typeof res.body.online === 'boolean');
      } else {
        assert.equal(res.status, 500);
      }
    });
  });
});
