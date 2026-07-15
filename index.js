/**
 * Postman Lite — Express Backend Server
 * Acts as a proxy to forward API requests from the browser,
 * bypassing CORS restrictions that browsers enforce.
 */

const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());                          // allow frontend origin
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve the frontend (index.html, style.css, app.js) from parent folder
app.use(express.static(path.join(__dirname, '..')));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Postman Lite server running', time: new Date().toISOString() });
});

// ── Main Proxy Route ──────────────────────────────────────────
/**
 * POST /api/proxy
 * Body: { url, method, headers, body, bodyType }
 * Forwards the request to the target URL and returns the response.
 */
app.post('/api/proxy', async (req, res) => {
  const { url, method = 'GET', headers = {}, body, bodyType } = req.body;

  // Validate URL
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // QUERY is a newer HTTP method — treat like GET with body support
  const httpMethod = method.toUpperCase() === 'QUERY' ? 'QUERY' : method.toUpperCase();

  try {
    const startTime = Date.now();

    const config = {
      url,
      method: httpMethod,
      headers: { ...headers },
      validateStatus: () => true,
      responseType: 'text',
      timeout: 30000,
      maxRedirects: 5,
    };

    // Attach request body for methods that support it
    if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
      if (bodyType === 'json') {
        config.data = body;
        config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';
      } else if (bodyType === 'urlencoded') {
        config.data = body;
        config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (bodyType === 'formdata') {
        // body is an object of key-value pairs
        const FormData = require('form-data');
        const fd = new FormData();
        Object.entries(body).forEach(([k, v]) => fd.append(k, v));
        config.data = fd;
        Object.assign(config.headers, fd.getHeaders());
      } else {
        // raw text / xml / html
        config.data = body;
      }
    }

    const response = await axios(config);
    const elapsed  = Date.now() - startTime;

    // Collect response headers as plain object
    const responseHeaders = {};
    Object.entries(response.headers).forEach(([k, v]) => {
      responseHeaders[k] = v;
    });

    // Send back everything the frontend needs
    res.json({
      status:      response.status,
      statusText:  response.statusText,
      headers:     responseHeaders,
      body:        response.data,
      time:        elapsed,
      size:        Buffer.byteLength(String(response.data), 'utf8'),
    });

  } catch (err) {
    // Network-level error (DNS fail, timeout, etc.)
    res.status(500).json({
      error:   err.message,
      code:    err.code || 'NETWORK_ERROR',
      details: err.response ? {
        status:     err.response.status,
        statusText: err.response.statusText,
      } : null,
    });
  }
});

// ── Collections stored in-memory (no DB allowed) ─────────────
let collections = [];

app.get('/api/collections', (req, res) => {
  res.json(collections);
});

app.post('/api/collections', (req, res) => {
  const col = { id: 'col_' + Date.now(), ...req.body, requests: [] };
  collections.push(col);
  res.status(201).json(col);
});

app.delete('/api/collections/:id', (req, res) => {
  collections = collections.filter(c => c.id !== req.params.id);
  res.json({ success: true });
});

// ── Saved Requests ────────────────────────────────────────────
app.post('/api/collections/:colId/requests', (req, res) => {
  const col = collections.find(c => c.id === req.params.colId);
  if (!col) return res.status(404).json({ error: 'Collection not found' });
  const reqItem = { id: 'req_' + Date.now(), ...req.body };
  col.requests.push(reqItem);
  res.status(201).json(reqItem);
});

app.delete('/api/collections/:colId/requests/:reqId', (req, res) => {
  const col = collections.find(c => c.id === req.params.colId);
  if (!col) return res.status(404).json({ error: 'Collection not found' });
  col.requests = col.requests.filter(r => r.id !== req.params.reqId);
  res.json({ success: true });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════╗');
  console.log('  ║     🚀 Postman Lite Server             ║');
  console.log(`  ║     Running on http://localhost:${PORT}  ║`);
  console.log('  ║     Open browser and start testing!   ║');
  console.log('  ╚═══════════════════════════════════════╝');
  console.log('');
});
