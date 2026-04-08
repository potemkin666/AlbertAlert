import {
  applyCorsHeaders,
  clearAdminSessionCookie
} from '../_lib/admin-session.js';

export default async function handler(request, response) {
  const corsAllowed = applyCorsHeaders(request, response, 'POST,OPTIONS');
  if (request.method === 'OPTIONS') {
    return corsAllowed
      ? response.status(204).end()
      : response.status(403).json({ ok: false, error: 'origin-not-allowed', message: 'Origin is not allowed.' });
  }
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST,OPTIONS');
    return response.status(405).json({
      ok: false,
      error: 'method-not-allowed',
      message: 'Only POST is supported.'
    });
  }

  clearAdminSessionCookie(request, response);
  return response.status(200).json({ ok: true });
}
