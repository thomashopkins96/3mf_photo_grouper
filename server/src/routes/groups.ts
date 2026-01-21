import { Router, Request, Response } from 'express';
import { copyImageToOutput, copyThreeMfToOutput, deleteImage } from '../services/gcs.js'
import { getSession } from './auth.js';
import { ApiResponse, GroupRequest } from '../types/index.js'

const router = Router();

router.post('/', async (
  req: Request<{}, ApiResponse<string>, GroupRequest>,
  res: Response<ApiResponse<string>>
  ) => {
  try {
    const session = getSession(req);
    if (!session) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }

    const { threeMfName, images } = req.body;
    const folderName = threeMfName.replace(/\.3mf$/i, '');
    await copyThreeMfToOutput(session.accessToken, threeMfName, folderName);

    for (const image of images) {
      const ext = image.originalName.match(/\.[^.]+$/)?.[0] || '.jpg';
      const destFileName = image.newName + ext;

      await copyImageToOutput(session.accessToken, image.originalName, folderName, destFileName);
      await deleteImage(session.accessToken, image.originalName);
    }

    res.json({ success: true, data: `Created group: ${folderName}` });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ success: false, error: 'Failed to create group' });
  }
});

export default router;
