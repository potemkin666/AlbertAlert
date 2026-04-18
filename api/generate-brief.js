import { applyCorsHeaders } from './_lib/admin-session.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = 'gpt-4.1-mini';
const GENERATE_BRIEF_TIMEOUT_MS = 55_000;
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_BURST = 10;

const recentRequests = [];

function isRateLimited() {
  const now = Date.now();
  while (recentRequests.length > 0 && now - recentRequests[0] > RATE_LIMIT_WINDOW_MS) {
    recentRequests.shift();
  }
  if (recentRequests.length >= RATE_LIMIT_BURST) {
    return true;
  }
  recentRequests.push(now);
  return false;
}

function parseBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string' && request.body.trim()) {
    try {
      return JSON.parse(request.body);
    } catch {
      return null;
    }
  }
  return null;
}

function buildUserMessage(payload) {
  const parts = [
    `Headline: ${payload.headline || 'Unknown'}`,
    `Source: ${payload.sourceName || 'Unknown'}`,
    `Geography: ${payload.geography || 'Unknown'}`,
    `Lane: ${payload.lane || 'Unknown'}`,
    `Confidence: ${payload.confidenceLabel || 'Unknown'}`,
    `Timestamp: ${payload.timestamp || 'Unknown'}`,
    `Original URL: ${payload.originalUrl || 'Unavailable'}`,
    payload.corroborationStatus ? `Corroboration: ${payload.corroborationStatus}` : '',
    payload.recencyText ? `Recency: ${payload.recencyText}` : '',
    payload.sourceExtract ? `\nSource extract:\n${payload.sourceExtract}` : ''
  ].filter(Boolean);
  return parts.join('\n');
}

function extractBrief(data) {
  if (typeof data === 'string') return data.trim();
  return String(
    data?.output_text
    ?? data?.output?.[0]?.content?.[0]?.text
    ?? data?.choices?.[0]?.message?.content
    ?? ''
  ).trim();
}

export default async function handler(request, response) {
  applyCorsHeaders(request, response, 'POST,OPTIONS');
  if (request.method === 'OPTIONS') {
    response.setHeader('Allow', 'POST,OPTIONS');
    return response.status(204).end();
  }
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST,OPTIONS');
    return response.status(405).json({
      ok: false,
      error: 'method-not-allowed',
      message: 'Only POST is supported.'
    });
  }

  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return response.status(503).json({
      ok: false,
      error: 'misconfigured-backend',
      message: 'Backend is missing OPENAI_API_KEY configuration.'
    });
  }

  if (isRateLimited()) {
    return response.status(429).json({
      ok: false,
      error: 'rate-limited',
      message: 'Too many brief requests. Please wait a few seconds before trying again.'
    });
  }

  const body = parseBody(request);
  if (!body || typeof body !== 'object') {
    return response.status(400).json({
      ok: false,
      error: 'invalid-body',
      message: 'Request body must be valid JSON.'
    });
  }

  const headline = String(body.headline || '').trim();
  const sourceExtract = String(body.sourceExtract || '').trim();
  if (!headline && !sourceExtract) {
    return response.status(400).json({
      ok: false,
      error: 'invalid-payload',
      message: 'Payload must include headline or source extract.'
    });
  }

  const instructions = String(body.instructions || '').trim();
  const userMessage = buildUserMessage(body);

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    try { controller.abort(); } catch { /* ignore */ }
  }, GENERATE_BRIEF_TIMEOUT_MS);

  try {
    const openaiPayload = {
      model: OPENAI_MODEL,
      input: userMessage,
      tools: [{ type: 'web_search_preview' }]
    };
    if (instructions) {
      openaiPayload.instructions = instructions;
    }

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(openaiPayload),
      signal: controller.signal
    });

    if (!openaiResponse.ok) {
      const status = openaiResponse.status;
      const errorText = await openaiResponse.text().catch(() => '');
      let detail = `OpenAI API returned HTTP ${status}`;
      try {
        const parsed = JSON.parse(errorText);
        detail = parsed?.error?.message || detail;
      } catch { /* use default */ }
      return response.status(502).json({
        ok: false,
        error: 'upstream-error',
        message: detail
      });
    }

    const result = await openaiResponse.json();
    const brief = extractBrief(result);

    if (!brief) {
      return response.status(502).json({
        ok: false,
        error: 'empty-response',
        message: 'Upstream model returned an empty brief.'
      });
    }

    return response.status(200).json({ ok: true, brief });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return response.status(504).json({
        ok: false,
        error: 'timeout',
        message: 'Brief generation timed out.'
      });
    }
    return response.status(500).json({
      ok: false,
      error: 'internal-error',
      message: 'An unexpected error occurred during brief generation.'
    });
  } finally {
    clearTimeout(timeout);
  }
}
