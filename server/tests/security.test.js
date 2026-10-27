import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Set test environment configuration
process.env.ADMIN_USERNAME = 'secadmin';
process.env.ADMIN_PASSWORD = 'SecAdminPassword#2026';
process.env.JWT_SECRET     = 'super_secure_jwt_test_secret_for_ci_pipeline';
process.env.DB_PATH        = ':memory:';
process.env.NODE_ENV       = 'test';

// HTTP request helper using standard fetch
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
      body: body !== null ? JSON.stringify(body) : undefined,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        resolve({ status: res.status, headers: res.headers, body: data });
      })
      .catch(reject);
  });
};

describe('Software Security Engineering Test Suite - CIA Triad & Control Techniques', () => {
  let server;
  let db;
  let jwt;
  let adminToken;
  let lockedServerId;
  let unlockedServerId;
  let lockedNoPassServerId;
  const CARD_PASSWORD = 'ProtectedCardSecret123!';
  const REAL_LOCKED_IP = '198.51.100.42:25565';
  const REAL_UNLOCKED_IP = 'play.unlocked-mc.net';

  before(async () => {
    // Import real app and modules
    const appModule = await import('../index.js');
    const app = appModule.app || appModule.default;
    db = (await import('../db.js')).default;
    jwt = (await import('jsonwebtoken')).default;
    const bcrypt = (await import('bcrypt')).default;

    // Seed test servers for security validation
    const salt = bcrypt.genSaltSync(10);
    const hashedCardPassword = bcrypt.hashSync(CARD_PASSWORD, salt);

    // 1. Locked server with password
    const insertLocked = db.prepare(
      'INSERT INTO servers (name, ip, fallbackDesc, isBedrock, isLocked, lockPassword) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const lockedRes = insertLocked.run(
      'Secure Vault Server',
      REAL_LOCKED_IP,
      'Confidential IP Server',
      0,
      1,
      hashedCardPassword
    );
    lockedServerId = lockedRes.lastInsertRowid;

    // 2. Unlocked server
    const unlockedRes = insertLocked.run(
      'Public Sandbox Server',
      REAL_UNLOCKED_IP,
      'Open to everyone',
      0,
      0,
      null
    );
    unlockedServerId = unlockedRes.lastInsertRowid;

    // 3. Locked server with corrupted/missing password in DB (fail-safe test)
    const noPassRes = insertLocked.run(
      'Misconfigured Locked Server',
      '198.51.100.99',
      'Locked without password',
      0,
      1,
      null
    );
    lockedNoPassServerId = noPassRes.lastInsertRowid;

    // Start server on a random port
    server = app.listen(0);
    await new Promise((resolve) => server.on('listening', resolve));

    // Obtain legitimate admin token for authorization tests
    const loginRes = await request(server, 'POST', '/api/login', {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    });
    adminToken = loginRes.body?.token;
    assert.ok(adminToken, 'Admin setup token must be generated');
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  // =========================================================================
  // 1. CONFIDENTIALITY (Confidencialidad)
  // =========================================================================
  describe('CIA: Confidentiality Controls', () => {
    it('[Data Masking] Public GET /api/servers must NEVER expose IP for locked servers', async () => {
      const res = await request(server, 'GET', '/api/servers');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));

      const lockedServer = res.body.find((s) => s.id === lockedServerId);
      assert.ok(lockedServer, 'Locked server must be in the list');
      assert.equal(
        lockedServer.ip,
        null,
        'Confidentiality breach: IP must be null for locked servers without authorization'
      );
    });

    it('[Secret Redaction] GET /api/servers must NEVER leak lockPassword hash to public or admin', async () => {
      // Public request
      const pubRes = await request(server, 'GET', '/api/servers');
      for (const s of pubRes.body) {
        assert.equal(
          s.lockPassword,
          null,
          `Public response leaked lockPassword for server ${s.id}`
        );
      }

      // Admin request
      const admRes = await request(server, 'GET', '/api/servers', null, {
        Authorization: `Bearer ${adminToken}`,
      });
      for (const s of admRes.body) {
        assert.equal(
          s.lockPassword,
          null,
          `Admin response leaked lockPassword hash for server ${s.id}`
        );
      }
    });

    it('[User Enumeration Prevention] Login returns identical 401 response for non-existent vs wrong password', async () => {
      // Case A: User exists, wrong password
      const wrongPassRes = await request(server, 'POST', '/api/login', {
        username: process.env.ADMIN_USERNAME,
        password: 'DefinitivelyIncorrectPassword!999',
      });

      // Case B: User does not exist
      const ghostUserRes = await request(server, 'POST', '/api/login', {
        username: 'non_existent_user_account_xyz',
        password: 'AnyPassword123!',
      });

      assert.equal(wrongPassRes.status, 401);
      assert.equal(ghostUserRes.status, 401);
      assert.deepEqual(
        wrongPassRes.body,
        ghostUserRes.body,
        'Error response must be identical to mitigate username enumeration (CWE-204)'
      );
    });

    it('[Card Unlocking - Correct Secret] Returns real IP when correct password is provided', async () => {
      const res = await request(
        server,
        'POST',
        `/api/servers/${lockedServerId}/unlock`,
        { password: CARD_PASSWORD }
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.ip, REAL_LOCKED_IP);
    });

    it('[Card Unlocking - Incorrect Secret] Denies access (401) and does not reveal the IP', async () => {
      const res = await request(
        server,
        'POST',
        `/api/servers/${lockedServerId}/unlock`,
        { password: 'WrongAttackerPassword' }
      );
      assert.equal(res.status, 401);
      assert.equal(res.body.ip, undefined, 'IP must not be leaked on failed unlock');
      assert.equal(res.body.error, 'Incorrect password');
    });

    it('[Token Confidentiality] Tampered JWT token payload or signature is rejected (403)', async () => {
      const tamperedToken = adminToken.slice(0, -6) + 'ABCDEF';
      const res = await request(server, 'POST', '/api/servers', {
        name: 'Exploit Server',
        ip: '10.0.0.1',
      }, {
        Authorization: `Bearer ${tamperedToken}`,
      });
      assert.equal(res.status, 403);
    });

    it('[Token Confidentiality] Token signed with unauthorized secret is rejected (403)', async () => {
      const rogueToken = jwt.sign(
        { id: 999, username: 'attacker' },
        'rogue_attacker_private_secret_key',
        { expiresIn: '1h' }
      );
      const res = await request(server, 'POST', '/api/servers', {
        name: 'Exploit Server 2',
        ip: '10.0.0.2',
      }, {
        Authorization: `Bearer ${rogueToken}`,
      });
      assert.equal(res.status, 403);
    });
  });

  // =========================================================================
  // 2. INTEGRITY (Integridad)
  // =========================================================================
  describe('CIA: Integrity Controls', () => {
    it('[SQL Injection in Login] Neutralizes SQLi payloads in username without authentication bypass', async () => {
      const sqliPayloads = [
        `' OR '1'='1`,
        `admin' --`,
        `' UNION SELECT 1, 'admin', 'hash' --`,
        `admin' /*`,
      ];

      for (const payload of sqliPayloads) {
        const res = await request(server, 'POST', '/api/login', {
          username: payload,
          password: 'arbitrary_password',
        });
        assert.equal(
          res.status,
          401,
          `SQL injection payload "${payload}" must not bypass login`
        );
        assert.equal(res.body?.token, undefined);
      }
    });

    it('[Type Confusion & Input Sanitization] Rejects non-string types in login credentials (400)', async () => {
      const malformedPayloads = [
        { username: 12345, password: 'valid_string_password' },
        { username: process.env.ADMIN_USERNAME, password: 99999 },
        { username: process.env.ADMIN_USERNAME, password: ['array', 'injection'] },
        { username: true, password: false },
        { username: { $ne: null }, password: { $gt: '' } }, // NoSQL-style injection attempt
      ];

      for (const payload of malformedPayloads) {
        const res = await request(server, 'POST', '/api/login', payload);
        assert.equal(
          res.status,
          400,
          `Non-string input in login must return 400 Bad Request, got ${res.status}`
        );
        assert.equal(res.body?.error, 'Username and password are required');
      }
    });

    it('[Type Confusion & Input Sanitization] Rejects non-string types in card unlock password (400)', async () => {
      const malformedPasswords = [
        123456,
        true,
        ['pass'],
        { secret: 'val' },
        null,
      ];

      for (const badPass of malformedPasswords) {
        const res = await request(
          server,
          'POST',
          `/api/servers/${lockedServerId}/unlock`,
          { password: badPass }
        );
        assert.equal(
          res.status,
          400,
          `Card unlock must return 400 Bad Request for non-string password, got ${res.status}`
        );
      }
    });

    it('[Access Control & Integrity] Mutating operations require valid JWT (Principle of Least Privilege)', async () => {
      // POST without auth
      const postRes = await request(server, 'POST', '/api/servers', {
        name: 'Unauthorized Server',
        ip: '10.0.0.1',
      });
      assert.equal(postRes.status, 401, 'POST /api/servers must require authentication');

      // PUT without auth
      const putRes = await request(server, 'PUT', `/api/servers/${unlockedServerId}`, {
        name: 'Tampered Name',
        ip: '10.0.0.2',
      });
      assert.equal(putRes.status, 401, 'PUT /api/servers/:id must require authentication');

      // DELETE without auth
      const delRes = await request(server, 'DELETE', `/api/servers/${unlockedServerId}`);
      assert.equal(delRes.status, 401, 'DELETE /api/servers/:id must require authentication');
    });

    it('[State Consistency] Unlocked server returns IP directly upon unlock query', async () => {
      const res = await request(
        server,
        'POST',
        `/api/servers/${unlockedServerId}/unlock`,
        { password: 'AnyPasswordSinceItsUnlocked' }
      );
      assert.equal(res.status, 200);
      assert.equal(res.body.ip, REAL_UNLOCKED_IP);
    });
  });

  // =========================================================================
  // 3. AVAILABILITY & RESILIENCE (Disponibilidad y Resiliencia)
  // =========================================================================
  describe('CIA: Availability & Control Techniques', () => {
    it('[Crash Prevention / DoS] Empty or missing request body does not cause 500 error', async () => {
      const loginEmpty = await request(server, 'POST', '/api/login', {});
      assert.equal(loginEmpty.status, 400);

      const unlockEmpty = await request(
        server,
        'POST',
        `/api/servers/${lockedServerId}/unlock`,
        {}
      );
      assert.equal(unlockEmpty.status, 400);
    });

    it('[Fail-Safe Default] Locked server with unconfigured/corrupt password denies unlock (403)', async () => {
      const res = await request(
        server,
        'POST',
        `/api/servers/${lockedNoPassServerId}/unlock`,
        { password: 'TestPassword' }
      );
      // Must fail closed (deny), never throw 500 or expose IP
      assert.equal(res.status, 403);
      assert.equal(res.body?.ip, undefined);
      assert.equal(res.body?.error, 'Server lock password is not configured');
    });

    it('[Non-Existent Resource Handling] Unlock on invalid/non-existent server ID returns 404', async () => {
      const res = await request(
        server,
        'POST',
        '/api/servers/99999999/unlock',
        { password: 'DoesNotMatter' }
      );
      assert.equal(res.status, 404);
      assert.equal(res.body?.error, 'Server not found');
    });

    it('[Brute-Force Attack Resistance] Consecutive failed unlock attempts fail predictably without server degradation', async () => {
      const attempts = 15;
      for (let i = 0; i < attempts; i++) {
        const res = await request(
          server,
          'POST',
          `/api/servers/${lockedServerId}/unlock`,
          { password: `brute_guess_${i}` }
        );
        assert.equal(res.status, 401);
        assert.equal(res.body.ip, undefined);
      }

      // Check server health afterwards to ensure no memory leak or hanging thread
      const healthRes = await request(server, 'GET', '/api/health');
      assert.equal(healthRes.status, 200);
      assert.equal(healthRes.body.status, 'ok');
    });

    it('[Expired Token Handling] Expired JWT tokens are strictly rejected (403)', async () => {
      const expiredToken = jwt.sign(
        { id: 1, username: process.env.ADMIN_USERNAME },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Expired 1 second ago
      );

      const res = await request(server, 'POST', '/api/servers', {
        name: 'Expired Token Test',
        ip: '127.0.0.1',
      }, {
        Authorization: `Bearer ${expiredToken}`,
      });

      assert.equal(res.status, 403);
    });
  });
});
