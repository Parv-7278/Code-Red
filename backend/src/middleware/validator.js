/**
 * Input validation middleware for sensor data and alerts
 */

function validateSensorData(req, res, next) {
  const { 
    station_id, 
    temperature, 
    battery, 
    battery_level, 
    power_consumption, 
    generator_temperature, 
    generator_status, 
    wind_speed, 
    water_level 
  } = req.body;

  const errors = [];
  const allowedStations = new Set(['station-maitri', 'station-bharati']);
  const allowedSources = new Set(['SENSOR', 'MANUAL_TEST', 'EXTERNAL_REFERENCE', 'SIMULATION']);

  // Check required station_id
  if (!station_id || typeof station_id !== 'string' || station_id.trim() === '') {
    errors.push("Field 'station_id' is required and must be a non-empty string.");
  } else if (!allowedStations.has(station_id)) {
    errors.push("Field 'station_id' must be 'station-maitri' or 'station-bharati'.");
  }

  if (req.body.packet_id !== undefined && (typeof req.body.packet_id !== 'string' || req.body.packet_id.length > 150)) {
    errors.push("Field 'packet_id' must be a string of at most 150 characters.");
  }

  if (req.body.device_id !== undefined && (typeof req.body.device_id !== 'string' || req.body.device_id.length > 100)) {
    errors.push("Field 'device_id' must be a string of at most 100 characters.");
  }

  if (req.body.source !== undefined && !allowedSources.has(String(req.body.source).toUpperCase())) {
    errors.push(`Field 'source' must be one of: ${Array.from(allowedSources).join(', ')}.`);
  }

  // Check numeric sensor fields
  if (temperature === undefined || isNaN(Number(temperature))) {
    errors.push("Field 'temperature' is required and must be a valid number.");
  }

  const batt = battery_level !== undefined ? battery_level : battery;
  if (batt === undefined || isNaN(Number(batt))) {
    errors.push("Field 'battery' (or 'battery_level') is required and must be a valid number.");
  }

  if (power_consumption === undefined || isNaN(Number(power_consumption))) {
    errors.push("Field 'power_consumption' is required and must be a valid number.");
  }

  if (generator_temperature === undefined || isNaN(Number(generator_temperature))) {
    errors.push("Field 'generator_temperature' is required and must be a valid number.");
  }

  if (!generator_status || typeof generator_status !== 'string') {
    errors.push("Field 'generator_status' is required (e.g. 'RUNNING', 'WARNING', 'OVERHEAT').");
  }

  if (wind_speed === undefined || isNaN(Number(wind_speed))) {
    errors.push("Field 'wind_speed' is required and must be a valid number.");
  }

  if (water_level === undefined || isNaN(Number(water_level))) {
    errors.push("Field 'water_level' is required and must be a valid number.");
  }

  const numericRanges = [
    ['temperature', temperature, -100, 60],
    ['battery_level', batt, 0, 100],
    ['power_consumption', power_consumption, 0, 100000],
    ['generator_temperature', generator_temperature, -50, 180],
    ['wind_speed', wind_speed, 0, 400],
    ['water_level', water_level, 0, 100],
  ];

  for (const [field, value, min, max] of numericRanges) {
    if (value !== undefined && !isNaN(Number(value)) && (Number(value) < min || Number(value) > max)) {
      errors.push(`Field '${field}' must be between ${min} and ${max}.`);
    }
  }

  const observedAt = req.body.recorded_at || req.body.timestamp;
  if (observedAt && Number.isNaN(Date.parse(observedAt))) {
    errors.push("Field 'recorded_at' (or 'timestamp') must be a valid ISO date-time.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed for incoming sensor data.",
      errors,
    });
  }

  next();
}

function validateAlert(req, res, next) {
  const { station_id, priority, category, message } = req.body;
  const errors = [];

  if (!station_id || typeof station_id !== 'string') {
    errors.push("Field 'station_id' is required.");
  }

  const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  if (!priority || !validPriorities.includes(priority.toUpperCase())) {
    errors.push(`Field 'priority' must be one of: ${validPriorities.join(', ')}.`);
  }

  if (!category || typeof category !== 'string') {
    errors.push("Field 'category' is required (e.g. 'GENERATOR', 'POWER', 'WEATHER').");
  }

  if (!message || typeof message !== 'string' || message.trim() === '') {
    errors.push("Field 'message' is required and must be a non-empty string.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed for incoming alert.",
      errors,
    });
  }

  next();
}

module.exports = {
  validateSensorData,
  validateAlert,
};
