import { Router, Request, Response } from 'express';
import { listThreeMfFiles, listImages, getThreeMfSignedUrl, getImageSignedUrl, deleteThreeMf, deleteOutputFolder, renameThreeMf, deleteImage, listOutputFolders, getOrCreateThumbnailSignedUrl } from '../services/gcs.js'
import { ApiResponse, FileInfo } from '../types/index.js';

const router = Router();
const listCache = new Map<string, { data: FileInfo[], timestamp: number }>();
const CACHE_TTL = 60_000;

export function invalidateFileCache(): void {
  listCache.delete('3mf');
  listCache.delete('images');
}

function getCachedList(key: string): FileInfo[] | null {
  const entry = listCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCachedList(key: string, data: FileInfo[]): void {
  listCache.set(key, { data, timestamp: Date.now() });
}

router.get('/3mf', async (req: Request, res: Response<ApiResponse<FileInfo[]>>) => {
  try {
    const session = res.locals.session as { email: string; accessToken: string};
    if (!session) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const cached = getCachedList('3mf');
    if (cached) {
      res.json({ success: true, data: cached });
      return
      }

    const [files, groupedFolders] = await Promise.all([
      listThreeMfFiles(),
      listOutputFolders(),
    ]);

    const groupedSet = new Set(groupedFolders);
    const ungrouped = files.filter((file) => {
      const folderName = file.name.replace(/\.3mf$/i, '');
      return !groupedSet.has(folderName);
    })

    setCachedList('3mf', ungrouped);
    res.json({ success: true, data: ungrouped });
  } catch (error) {
    console.error('Error listing 3MF files:', error);
    res.status(500).json({ success: false, error: 'Failed to list 3MF files' });
  }
});

router.get('/3mf/:name', async (req: Request, res: Response) => {
  try {
    const session = res.locals.session as { email: string; accessToken: string};
    if (!session) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const url = await getThreeMfSignedUrl(req.params.name);
    res.redirect(url);
  } catch (error) {
    console.error('Error streaming 3MF file:', error);
    res.status(500).json({ success: false, error: 'Failed to stream file' });
  }
});

router.get('/images', async (req: Request, res: Response<ApiResponse<FileInfo[]>>) => {
  try {
    const session = res.locals.session as { email: string; accessToken: string};
    if (!session) {
      res.status(401).json({ success: false, error: 'Unauthorized'});
      return;
    }

    const cached = getCachedList('images');
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }

    const files = await listImages();
    setCachedList('images', files);
    res.json({ success: true, data: files });
  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({ success: false, error: 'Failed to list images' });
  }
});

router.get('/image/:name(*)/thumbnail', async (req: Request, res: Response) => {
  try {
    const session = res.locals.session as { email: string; accessToken: string};
    if (!session) {
      res.status(401).json({ success: false, error: "Unauthorized"});
      return;
    }

    const url = await getOrCreateThumbnailSignedUrl(req.params.name);
    res.redirect(url);
  } catch (error) {
    console.error('Error streaming thumbnail:', error);
    res.status(500).json({ success: false, error: 'Failed to stream thumbnail' });
  }
});

router.get('/image/:name(*)', async (req: Request, res: Response) => {
  try {
    const session = res.locals.session as { email: string; accessToken: string};
    if (!session) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const url = await getImageSignedUrl(req.params.name);
    res.redirect(url);
  } catch (error) {
    console.error('Error stream image:', error);
    res.status(500).json({ success: false, error: 'Failed to stream image' });
  }
});

router.delete('/image/:name(*)', async (req: Request, res: Response<ApiResponse<string>>) => {
  try {
    const session = res.locals.session as { email: string; accessToken: string};
    if (!session) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return
    }

    const fileName = req.params.name;
    await deleteImage(fileName);
    listCache.delete('images');

    res.json({ success: true, data: `Deleted ${fileName}` });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: 'Failed to delete image' });
  }
});

router.delete('/3mf/:name', async (req: Request, res: Response<ApiResponse<string>>) => {
  try {
    const session = res.locals.session as { email: string, accessToken: string };
    if (!session) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const fileName = req.params.name;
    const folderName = fileName.replace(/\.3mf$/i, '');

    await Promise.all([deleteThreeMf(fileName), deleteOutputFolder(folderName)]);

    listCache.delete('3mf');

    res.json({ success: true, data: `Deleted ${fileName}` });
  } catch (error) {
    console.error('Error deleting 3MF file:', error);
    res.status(500).json({ success: false, error: 'Failed to delete 3MF file' });
  }
});

router.patch('/3mf/:name', async (req: Request, res: Response<ApiResponse<string>>) => {
  try {
    const session = res.locals.session as { email: string; accessToken: string };
    if (!session) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const oldName = req.params.name;
    const { newName } = req.body;

    if (!newName) {
      res.status(400).json({ success: false, error: "New name is required" });
      return
    }

    await renameThreeMf(oldName, newName);

    listCache.delete('3mf');

    res.json({ success: true, data: `Renamed ${oldName} to ${newName}` })
  } catch (error) {
    console.error('Error renaming 3MF file:', error);
    res.status(500).json({ success: false, error: 'Failed to rename 3MF file' });
  }
});

export default router;
