/**
 * POLARIS authentication and station-scope authorization.
 *
 * Development/demo mode accepts explicit role headers. Production mode only
 * trusts a verified Supabase access token and a server-side user_profiles row.
 */

const { supabase, isConfigured } = require('../config/supabase');
const crypto = require('crypto');

const ALLOWED_ROLES = new Set(['india_operator', 'station_operator']);

function isDemoMode() {
  if (process.env.DEMO_MODE !== undefined) return process.env.DEMO_MODE === 'true';
  return process.env.NODE_ENV !== 'production';
}

function sendAuthError(res, status, errorCode, message) {
  return res.status(status).json({ success: false, error_code: errorCode, message });
}

async function resolveAuthentication(req, res) {
  if (isDemoMode()) {
    const role = req.headers['x-user-role'];
    const stationId = req.headers['x-station-id'] || null;
    if (!ALLOWED_ROLES.has(role)) {
      sendAuthError(res, 401, 'DEMO_ROLE_REQUIRED', "A valid demo role header is required: 'india_operator' or 'station_operator'.");
      return null;
    }
    if (role === 'station_operator' && !stationId) {
      sendAuthError(res, 403, 'STATION_ASSIGNMENT_REQUIRED', 'Station operators must include their assigned station.');
      return null;
    }
    return { userId: null, role, stationId, mode: 'DEMO' };
  }

  if (!isConfigured()) {
    sendAuthError(res, 503, 'PRODUCTION_AUTH_NOT_CONFIGURED', 'Supabase authentication is not configured on this server.');
    return null;
  }

  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    sendAuthError(res, 401, 'BEARER_TOKEN_REQUIRED', 'A valid Bearer access token is required.');
    return null;
  }

  const resolved = await resolveSupabaseToken(token);
  if (!resolved) {
    sendAuthError(res, 401, 'INVALID_ACCESS_TOKEN', 'The supplied access token is invalid, expired, or has no authorized operator profile.');
    return null;
  }
  return resolved;
}

async function resolveSupabaseToken(token) {
  if (!token || !isConfigured()) return null;
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, role, station_id, full_name')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile || !ALLOWED_ROLES.has(profile.role)) {
    return null;
  }

  return {
    userId: userData.user.id,
    role: profile.role,
    stationId: profile.station_id || null,
    fullName: profile.full_name || userData.user.email,
    mode: 'SUPABASE_JWT',
  };
}

async function requireAuthenticated(req, res, next) {
  try {
    const auth = await resolveAuthentication(req, res);
    if (!auth) return;
    req.auth = auth;

    // Preserve compatibility with existing controllers while ensuring these
    // values now come from the verified profile in production.
    req.headers['x-user-role'] = auth.role;
    if (auth.stationId) req.headers['x-station-id'] = auth.stationId;
    if (auth.fullName) req.headers['x-operator-name'] = auth.fullName;
    return next();
  } catch (error) {
    console.error('[Auth] Verification failed:', error);
    return sendAuthError(res, 503, 'AUTH_SERVICE_UNAVAILABLE', 'Authentication could not be verified.');
  }
}

function requireDeviceIngestAccess(req, res, next) {
  if (isDemoMode()) return next();
  const expectedKey = process.env.DEVICE_INGEST_API_KEY;
  const suppliedKey = req.headers['x-device-api-key'];
  if (!expectedKey) {
    return sendAuthError(res, 503, 'DEVICE_AUTH_NOT_CONFIGURED', 'Device ingestion authentication is not configured.');
  }
  const suppliedBuffer = Buffer.from(String(suppliedKey || ''));
  const expectedBuffer = Buffer.from(String(expectedKey));
  const valid = suppliedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
  if (!valid) {
    return sendAuthError(res, 401, 'INVALID_DEVICE_CREDENTIAL', 'A valid device ingestion credential is required.');
  }
  return next();
}

function requestedStationFrom(req) {
  return req.params.stationId || req.query.stationId || req.query.station_id || req.body?.stationId || req.body?.station_id || null;
}

async function validateStationAccess(req, res, next) {
  return requireAuthenticated(req, res, () => {
    const { role, stationId: assignedStation } = req.auth;
    const requestedStation = requestedStationFrom(req);

    if (role === 'india_operator') return next();

    // A station operator asking for an unfiltered collection is constrained to
    // their assigned station rather than receiving cross-station data.
    if (!requestedStation) {
      req.query.stationId = assignedStation;
      return next();
    }

    const normAssigned = assignedStation.toLowerCase();
    const normRequested = String(requestedStation).toLowerCase();
    const matches = normAssigned === normRequested
      || (normAssigned.includes('maitri') && normRequested.includes('maitri'))
      || (normAssigned.includes('bharati') && normRequested.includes('bharati'));

    if (matches) return next();
    return sendAuthError(
      res,
      403,
      'ACCESS_FORBIDDEN_STATION_ISOLATION',
      `Station operator assigned to '${assignedStation}' cannot access '${requestedStation}'.`,
    );
  });
}

module.exports = {
  isDemoMode,
  resolveSupabaseToken,
  requireAuthenticated,
  requireDeviceIngestAccess,
  validateStationAccess,
};
