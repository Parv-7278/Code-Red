const stationService = require('../services/stationService');

/**
 * GET /api/stations/:stationId/status or /api/stations/:stationId/health
 */
function getStationStatus(req, res) {
  const { stationId } = req.params;
  const status = stationService.getStationStatus(stationId);

  if (!status) {
    return res.status(404).json({
      success: false,
      message: `Station '${stationId}' not found. Valid stations: 'station-bharati', 'station-maitri'.`,
    });
  }

  return res.json({
    success: true,
    data: status,
  });
}

/**
 * GET /api/stations/:stationId/research
 */
function getStationResearch(req, res) {
  const { stationId } = req.params;
  const researchData = stationService.getStationResearch(stationId);
  return res.json({
    success: true,
    data: researchData,
  });
}

/**
 * GET /api/stations/:stationId/remote-operations
 */
async function getRemoteOperations(req, res) {
  const { stationId } = req.params;
  const data = await stationService.getRemoteOperations(stationId);
  return res.json({
    success: true,
    data: data,
  });
}

/**
 * POST /api/stations/:stationId/remote-operations
 */
function postRemoteOperation(req, res) {
  const { stationId } = req.params;
  const operatorName = req.headers['x-operator-name'] || req.body.operator || 'Mission Controller';
  const result = stationService.executeRemoteOperation(stationId, req.body, operatorName);
  return res.status(201).json({
    success: true,
    message: 'Remote operation completed in simulation mode.',
    data: result,
  });
}

/**
 * GET /api/stations
 */
function listStations(req, res) {
  return res.json({
    success: true,
    data: Object.values(stationService.STATION_METADATA),
  });
}

module.exports = {
  getStationStatus,
  getStationResearch,
  getRemoteOperations,
  postRemoteOperation,
  listStations,
};
