/**
 * Vercel Serverless Function - Health Check Endpoint
 */

export default function handler(req, res) {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Vending Stream Analytics',
    version: '2.0.0',
    environment: 'production',
    platform: 'vercel'
  };

  // Set headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Return health status
  res.status(200).json(healthData);
}