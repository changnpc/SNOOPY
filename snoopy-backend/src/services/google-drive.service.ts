import { Readable } from 'stream';
import { driveClient } from '../config/sheets.config';

// ─── Folder IDs (loaded from env, with sub-folder cache) ────
const ROOT_FOLDER_ID = () => process.env['GOOGLE_DRIVE_ROOT_FOLDER_ID'] ?? '';

const SUBFOLDER_NAMES = {
  avatars:                  'avatars',
  'leave-evidence':         'leave-evidence',
  'activity-images':        'activity-images',
  'activity-attachments':   'activity-attachments',
} as const;

type SubfolderKey = keyof typeof SUBFOLDER_NAMES;

const subfolderCache = new Map<SubfolderKey, string>();

// ─── Get or Create Subfolder ─────────────────────────────────
async function getSubfolderId(key: SubfolderKey): Promise<string> {
  const cached = subfolderCache.get(key);
  if (cached) return cached;

  const name = SUBFOLDER_NAMES[key];
  const rootId = ROOT_FOLDER_ID();

  // Search for existing folder
  const res = await driveClient.files.list({
    q: `'${rootId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  let folderId: string;
  if (res.data.files && res.data.files.length > 0) {
    folderId = res.data.files[0].id!;
  } else {
    // Create subfolder
    const created = await driveClient.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootId],
      },
      fields: 'id',
      supportsAllDrives: true,
    });
    folderId = created.data.id!;
  }

  subfolderCache.set(key, folderId);
  return folderId;
}

// ─── Upload File ─────────────────────────────────────────────
export interface UploadOptions {
  buffer:   Buffer;
  mimeType: string;
  filename: string;
  folder:   SubfolderKey;
}

export interface UploadResult {
  fileId:      string;
  viewUrl:     string;
  downloadUrl: string;
}

export async function uploadFile(opts: UploadOptions): Promise<UploadResult> {
  const folderId = await getSubfolderId(opts.folder);

  const bufferStream = new Readable();
  bufferStream.push(opts.buffer);
  bufferStream.push(null);

  const file = await driveClient.files.create({
    requestBody: {
      name:    opts.filename,
      parents: [folderId],
    },
    media: {
      mimeType: opts.mimeType,
      body:     bufferStream,
    },
    fields: 'id, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  const fileId = file.data.id!;

  // Make file publicly readable
  await driveClient.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  return {
    fileId,
    // lh3.googleusercontent.com/d/{id} = Google's CDN for public files, embeds reliably in <img>
    viewUrl:     `https://lh3.googleusercontent.com/d/${fileId}`,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
  };
}

// ─── Get Direct View URL ─────────────────────────────────────
export function getViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function getDirectUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// ─── Delete File ─────────────────────────────────────────────
export async function deleteFile(fileId: string): Promise<void> {
  try {
    await driveClient.files.delete({ fileId, supportsAllDrives: true });
  } catch (err: any) {
    // Ignore 404 (file already deleted)
    if (err?.code !== 404) throw err;
  }
}

// ─── Extract File ID from Drive URL ──────────────────────────
export function extractFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ─── Multer file → Upload helper ─────────────────────────────
export async function uploadMulterFile(
  file: Express.Multer.File,
  folder: SubfolderKey,
  prefix: string
): Promise<UploadResult> {
  const ext = file.originalname.split('.').pop() ?? 'bin';
  const filename = `${prefix}_${Date.now()}.${ext}`;
  return uploadFile({
    buffer:   file.buffer,
    mimeType: file.mimetype,
    filename,
    folder,
  });
}
