import { Router, Request, Response } from 'express';
import { listThreeMfFiles, listImages, getThreeMfStream, getImageStream } from '../services/gcs.js'
import { getSession } from './auth.js';
import { ApiResponse, FileInfo } from '../types/index.js';

const router = Router();

router.get('/3mf', async (req: Request, res: Response<ApiResponse<FileInfo[]>>) => {
  try {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const files = await listThreeMfFiles(session.accessToken);
    res.json({ success: true, data: files });
  } catch (error) {
    console.error('Error listing 3MF files:', error);
    res.status(500).json({ success: false, error: 'Failed to list 3MF files' });
  }
});

router.get('/3mf/:name', async (req: Request, res: Response) => {
  try {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const stream = getThreeMfStream(session.accessToken, req.params.name);
    res.setHeader('Content-Type', 'application/octet-stream');
    stream.pipe(res)
  } catch (error) {
    console.error('Error streaming 3MF file:', error);
    res.status(500).json({ success: false, error: 'Failed to stream file' });
  }
});

router.get('/images', async (req: Request, res: Response<ApiResponse<FileInfo[]>>) => {
  try {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ success: false, error: 'Unauthorized'});
      return;
    }

    const files = await listImages(session.accessToken);
    res.json({ success: true, data: files });
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ success: false, error: 'Failed to list images' });
  }
});

router.get('/image/:name(*)', async (req: Request, res: Response) => {
  try {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const stream = getImageStream(session.accessToken, req.params.name);
    stream.pipe(res);
  } catch (error) {
    console.error('Error stream image:', error);
    res.status(500).json({ success: false, error: 'Failed to stream image' });
  }
});

export default router;
