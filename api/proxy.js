import url from 'url';

export default async function handler(req, res) {
  const logMarker = `[VERCEL_PROXY_LOGGER_${Date.now()}]`;
  
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-token, x-target-base-url, x-request-timeout, Authorization'
  );
  res.setHeader('X-Proxy-Engine', 'Vercel-Serverless-Custom');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse subpath
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname || '';
  const subPath = pathname.replace(/^\/api\/proxy\/?/, '');
  
  const token = req.headers['x-api-token'] || parsedUrl.query.token;
  const targetBaseUrl = req.headers['x-target-base-url'] || 'https://api.indexjump.com';

  console.log(`${logMarker} >>> REQUEST RECEIVED`);
  console.log(`${logMarker} Method: ${req.method}`);
  console.log(`${logMarker} SubPath: "${subPath}"`);
  console.log(`${logMarker} Token (first 8 chars): "${token ? String(token).substring(0, 8) + '...' : 'none'}"`);
  console.log(`${logMarker} Target API Base: "${targetBaseUrl}"`);

  const stringToken = String(token || "");

  // Simulated fallback for testing / demonstration tokens
  if (stringToken.startsWith("mock_") || stringToken === "demo" || stringToken === "TEST_TOKEN") {
    console.log(`${logMarker} Handling simulated mock token: "${stringToken}"`);
    if (subPath === "balance") {
      return res.status(200).json({
        err: null,
        res: {
          balance: 1250,
          status: "ready",
          worker_health: "healthy",
          provider: "IndexJump (Vercel Serverless Mock)"
        }
      });
    }
    if (subPath === "index") {
      return res.status(200).json({
        err: null,
        res: {
          success: true,
          id: `mock_job_${Math.random().toString(36).substring(2, 10)}`,
          url: parsedUrl.query.url || "https://example.com"
        }
      });
    }
  }

  try {
    const cleanedBaseUrl = String(targetBaseUrl).replace(/\/$/, "");
    const fullUrl = `${cleanedBaseUrl}/${subPath}`;

    // Reconstruct query parameters
    const queryParams = new URLSearchParams();
    for (const [key, val] of Object.entries(parsedUrl.query)) {
      if (key !== 'token') {
        queryParams.append(key, String(val));
      }
    }
    if (token) {
      queryParams.append('token', String(token));
    }

    const finalUrl = `${fullUrl}?${queryParams.toString()}`;
    console.log(`${logMarker} Forwarding to Target: ${finalUrl}`);

    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "IndexJump Manager Pro Proxy/1.0 (Vercel Serverless)"
    };

    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    console.log(`${logMarker} Fetching target API...`);
    const startTime = Date.now();
    const response = await fetch(finalUrl, fetchOptions);
    const duration = Date.now() - startTime;
    console.log(`${logMarker} Target API responded in ${duration}ms with status: ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    let responseData;
    
    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      console.log(`${logMarker} Target returned non-JSON response:`, text);
      responseData = { message: text };
    }

    console.log(`${logMarker} RESPONSE DATA:`, JSON.stringify(responseData));
    return res.status(response.status).json(responseData);
  } catch (error) {
    console.error(`${logMarker} !!! PROXY EXCEPTION:`, error);
    return res.status(500).json({
      err: "Vercel Proxy Error",
      msg: error.message || "Unknown proxy serverless error",
      details: error.stack
    });
  }
}
