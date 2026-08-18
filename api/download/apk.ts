import type { VercelRequest, VercelResponse } from '@vercel/node';

const APK_RELEASE_URL =
  'https://github.com/henry597-astronomy/Ethio-cosmos-learning-community-5/releases/download/v1.9.2/ethiocosmos-v1.9.2-tiktok-fix.apk';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="ethiocosmos-v1.9.2-tiktok-fix.apk"');

  if (req.method === 'GET' || req.method === 'HEAD') {
    res.statusCode = 302;
    res.setHeader('Location', APK_RELEASE_URL);
    return res.end();
  }

  res.setHeader('Allow', 'GET, HEAD');
  return res.status(405).json({ error: 'Method not allowed' });
}
