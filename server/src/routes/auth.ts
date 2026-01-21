import { Router, Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { ApiResponse } from '../types/index.js';

const router = Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const validSessions = new Map<string, { email: string; accessToken: string }>();

function generateSessionId(): string {
  return Buffer.from(Date.now().toString() + Math.random().toString()).toString('base64');
}

router.get('/login', (req: Request, res: Response) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/devstorage.read_write',
    ],
  });
  res.redirect(authUrl);
});

router.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    res.status(400).send('Missing authorization code');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token || '',
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email || 'unknown';

    const sessionId = generateSessionId();
    validSessions.set(sessionId, {
      email,
      accessToken: tokens.access_token || '',
    });

    res.cookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });

    const redirectUrl = process.env.NODE_ENV === 'production'
      ? '/'
      : 'http://localhost:5173';

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

router.post('/logout', (req: Request, res: Response<ApiResponse<string>>) => {
  const sessionId = req.cookies[COOKIE_NAME];
  if (sessionId) {
    validSessions.delete(sessionId);
  }
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true, data: 'Logged out' });
});

router.get('/check', (req: Request, res: Response<ApiResponse<{ authenticated: boolean; email?: string }>>) => {
  const sessionId = req.cookies[COOKIE_NAME];
  const session = sessionId ? validSessions.get(sessionId) : null;

  res.json({
    success: true,
    data: {
      authenticated: !!session,
      email: session?.email,
    },
  });
});

export function getSession(req: Request): { email: string; accessToken: string } | null {
  const sessionId = req.cookies[COOKIE_NAME];
  return sessionId ? validSessions.get(sessionId) || null : null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = getSession(req);

  if (session) {
    next();
  } else {
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
}


export default router;
