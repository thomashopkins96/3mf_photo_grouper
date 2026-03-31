import { Router, Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { ApiResponse } from '../types/index.js';
import { Firestore } from '@google-cloud/firestore';

const db = new Firestore();
const SESSIONS_COLLECTION = 'sessions';

const router = Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

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
    await db.collection(SESSIONS_COLLECTION).doc(sessionId).set({
      email,
      accessToken: tokens.access_token || '',
      expiresAt: new Date(Date.now() + COOKIE_MAX_AGE),
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

router.post('/logout', async (req: Request, res: Response<ApiResponse<string>>) => {
  const sessionId = req.cookies[COOKIE_NAME];
  if (sessionId) {
    await db.collection(SESSIONS_COLLECTION).doc(sessionId).delete();
  }
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true, data: 'Logged out' });
});

router.get('/check', async (req: Request, res: Response<ApiResponse<{ authenticated: boolean; email?: string }>>) => {
  const session = await getSession(req);
  res.json({
    success: true,
    data: {
      authenticated: !!session,
      email: session?.email,
    },
  });
});

export async function getSession(req: Request): Promise<{ email: string; accessToken: string } | null> {
  const sessionId = req.cookies[COOKIE_NAME];
  if (!sessionId) return null;

  const doc = await db.collection(SESSIONS_COLLECTION).doc(sessionId).get();
  if (!doc.exists) return null;

  const data = doc.data();
  return data ? { email: data.email, accessToken: data.accessToken } : null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await getSession(req);

  if (session) {
    res.locals.session = session;
    next();
  } else {
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
}


export default router;
