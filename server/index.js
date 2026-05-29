import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_me_in_production'; // Keep it simple for now

app.use(cors());
app.use(express.json());

// Health check endpoint (used by Docker HEALTHCHECK)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api/servers', (req, res) => {
  try {
    let isAdmin = false;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        jwt.verify(token, JWT_SECRET);
        isAdmin = true;
      } catch (e) {
        // invalid token, treat as public
      }
    }

    const servers = db.prepare('SELECT * FROM servers').all();
    
    if (isAdmin) {
      res.json(servers);
    } else {
      const maskedServers = servers.map(server => {
        if (server.isLocked === 1) {
          return { ...server, ip: null, lockPassword: null };
        }
        return { ...server, lockPassword: null };
      });
      res.json(maskedServers);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/api/servers', authenticateToken, (req, res) => {
  const { name, ip, fallbackDesc, isBedrock, isLocked, lockPassword } = req.body;
  
  if (!name || !ip) {
    return res.status(400).json({ error: 'Name and IP are required' });
  }

  try {
    // Hash the lock password if provided
    let hashedLockPassword = null;
    if (isLocked && lockPassword) {
      const salt = bcrypt.genSaltSync(10);
      hashedLockPassword = bcrypt.hashSync(lockPassword, salt);
    }

    const insert = db.prepare('INSERT INTO servers (name, ip, fallbackDesc, isBedrock, isLocked, lockPassword) VALUES (?, ?, ?, ?, ?, ?)');
    const result = insert.run(name, ip, fallbackDesc || '', isBedrock ? 1 : 0, isLocked ? 1 : 0, hashedLockPassword);
    
    const newServer = db.prepare('SELECT * FROM servers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newServer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add server' });
  }
});

app.put('/api/servers/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, ip, fallbackDesc, isBedrock, isLocked, lockPassword } = req.body;
  
  if (!name || !ip) {
    return res.status(400).json({ error: 'Name and IP are required' });
  }

  try {
    // Hash the lock password if provided
    let hashedLockPassword = null;
    if (isLocked && lockPassword) {
      const salt = bcrypt.genSaltSync(10);
      hashedLockPassword = bcrypt.hashSync(lockPassword, salt);
    }

    const update = db.prepare('UPDATE servers SET name = ?, ip = ?, fallbackDesc = ?, isBedrock = ?, isLocked = ?, lockPassword = ? WHERE id = ?');
    const result = update.run(name, ip, fallbackDesc || '', isBedrock ? 1 : 0, isLocked ? 1 : 0, hashedLockPassword, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const updatedServer = db.prepare('SELECT * FROM servers WHERE id = ?').get(id);
    res.json(updatedServer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update server' });
  }
});

app.delete('/api/servers/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  try {
    const remove = db.prepare('DELETE FROM servers WHERE id = ?');
    const result = remove.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

app.get('/api/status/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const server = db.prepare('SELECT ip, isBedrock FROM servers WHERE id = ?').get(id);
    if (!server) return res.status(404).json({ error: 'Server not found' });
    
    const apiUrl = server.isBedrock === 1 
      ? `https://api.mcstatus.io/v2/status/bedrock/${server.ip}`
      : `https://api.mcstatus.io/v2/status/java/${server.ip}`;
      
    const response = await fetch(apiUrl);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

app.post('/api/servers/:id/unlock', (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  
  try {
    const server = db.prepare('SELECT ip, lockPassword, isLocked FROM servers WHERE id = ?').get(id);
    if (!server) return res.status(404).json({ error: 'Server not found' });
    if (server.isLocked !== 1) return res.json({ ip: server.ip });
    
    const isValid = bcrypt.compareSync(password, server.lockPassword);
    if (isValid) {
      res.json({ ip: server.ip });
    } else {
      res.status(401).json({ error: 'Incorrect password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve frontend if in production (Docker environment)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
