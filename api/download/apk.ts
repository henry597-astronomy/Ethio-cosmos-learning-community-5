import type { VercelRequest, VercelResponse } from '@vercel/node';

// Force redeploy timestamp: 2026-08-19T21:40:00Z
const APK_RELEASE_URL =
  'https://github.com/henry597-astronomy/Ethio-cosmos-learning-community-5/releases/download/v1.10.0/ethiocosmos-v1.10.0.apk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const upstreamRes = await fetch(APK_RELEASE_URL, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'EthioCosmos-AppDownloader/1.0',
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="ethiocosmos-v1.10.0.apk"');
      res.statusCode = 302;
      res.setHeader('Location', APK_RELEASE_URL);
      return res.end();
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="ethiocosmos-v1.10.0.apk"');
    
    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    if (req.method === 'HEAD') {
      return res.end();
    }

    const reader = upstreamRes.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(value);
        }
      } catch (err) {
        console.error('Streaming error:', err);
        if (!res.headersSent) {
          res.status(500).end();
        } else {
          res.end();
        }
      }
    };

    await pump();
  } catch (err) {
    console.error('Proxy download error:', err);
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 302;
    res.setHeader('Location', APK_RELEASE_URL);
    return res.end();
  }
}
