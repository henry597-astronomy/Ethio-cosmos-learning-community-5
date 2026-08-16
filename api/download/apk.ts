import type { VercelRequest, VercelResponse } from '@vercel/node';

const APK_RELEASE_URL =
  'https://github.com/henry597-astronomy/Ethio-cosmos-learning-community-5/releases/download/v1.8.0/ethiocosmos-v1.8-hardened.apk';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'GET' || req.method === 'HEAD') {
    res.statusCode = 302;
    res.setHeader('Location', APK_RELEASE_URL);
    return res.end();
  }

  res.setHeader('Allow', 'GET, HEAD');
  return res.status(405).json({ error: 'Method not allowed' });
}
