import crypto from 'crypto';
import express from 'express';

const router = express.Router();

const COOKIE_NAME = 'judge_admin_auth';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getAdminPassword() {
  return requireEnv('ADMIN_PASSWORD');
}

function getSessionSecret() {
  return requireEnv('ADMIN_SESSION_SECRET');
}

function sign(value) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(value)
    .digest('hex');
}

function createToken() {
  const payload = JSON.stringify({
    ok: true,
    issuedAt: Date.now()
  });

  const encoded = Buffer.from(payload).toString('base64url');
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return false;

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return false;

  const expected = sign(encoded);
  if (signature !== expected) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload?.ok === true;
  } catch {
    return false;
  }
}

router.post('/login', express.json(), (req, res) => {
  const { password } = req.body ?? {};

  if (!password || password !== getAdminPassword()) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = createToken();

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 1000 * 60 * 60 * 8
  });

  return res.json({ ok: true, authenticated: true });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, {
    path: '/'
  });

  return res.json({ ok: true });
});

router.get('/session', (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (!verifyToken(token)) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({ authenticated: true });
});

export function requireAdminSession(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

export default router;