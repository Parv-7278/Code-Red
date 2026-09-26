const AIAnalystService = require('../services/aiAnalystService');
const reportDispatchService = require('../services/reportDispatchService');

exports.getAIAnalystStatus = async (req, res) => {
  res.json({
    status: 'ONLINE',
    badge: 'AI ANALYSIS READY',
    engine: 'POLARIS Hybrid Python Analytics + AI Synthesis',
    supported_time_ranges: ['12h', '24h', '7d', '30d'],
    supported_analysis_types: [
      'trends',
      'anomalies',
      'correlations',
      'summary',
      'summary_24h',
      'operations_summary_12h',
      'compare',
      'forecast',
      'energy_env',
      'risk',
    ],
    station_security_enforced: true,
  });
};

exports.generate24hSummaryReport = async (req, res) => {
  try {
    const { station_id = 'station-maitri' } = req.body;
    const userRole = req.headers['x-user-role'] || 'india_operator';
    const userStation = req.headers['x-station-id'] || null;

    const result = await AIAnalystService.generate24hReport(station_id, userRole, userStation);
    res.json(result);
  } catch (err) {
    console.error('[24h Report Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate 24-hour operational report.',
      error: err.message,
    });
  }
};

exports.generate12hSummaryReport = async (req, res) => {
  try {
    const { station_id = req.query.stationId || 'station-maitri', send_to_hq = false } = req.body;
    const userRole = req.headers['x-user-role'] || 'india_operator';
    const report = await reportDispatchService.generate12HourReport(station_id, userRole);
    if (send_to_hq) {
      report.delivery = await reportDispatchService.transmitToIndiaHQ(report, userRole, 'MANUAL');
    }
    return res.json(report);
  } catch (err) {
    console.error('[12h Report Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate the 12-hour station report.', error: err.message });
  }
};

exports.get12hReportSchedule = async (req, res) => {
  const stationId = req.query.stationId || req.query.station_id || 'station-maitri';
  return res.json({ success: true, data: await reportDispatchService.getSchedule(stationId) });
};

exports.update12hReportSchedule = async (req, res) => {
  const stationId = req.body.station_id || req.body.stationId || 'station-maitri';
  const userRole = req.headers['x-user-role'] || 'india_operator';
  return res.json({ success: true, data: await reportDispatchService.updateSchedule(stationId, req.body.enabled, userRole) });
};

exports.get12hReportDeliveries = async (req, res) => {
  const stationId = req.query.stationId || req.query.station_id || null;
  return res.json({ success: true, data: await reportDispatchService.listDeliveries(stationId) });
};


exports.analyzeResearchData = async (req, res) => {
  try {
    const {
      station_id = 'station-maitri',
      analysis_type = 'summary',
      time_range = '7d',
      user_query = null,
    } = req.body;

    const result = await AIAnalystService.runFullAnalysis(station_id, analysis_type, time_range, user_query);
    res.json(result);
  } catch (err) {
    console.error('[AI Analyst Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI research analysis.',
      error: err.message,
    });
  }
};

exports.askResearchAI = async (req, res) => {
  try {
    const {
      station_id = 'station-maitri',
      question = '',
      time_range = '7d',
    } = req.body;

    let analysis_type = 'summary';
    const qLower = (question || '').toLowerCase();
    if (qLower.includes('compare') || qLower.includes('vs')) analysis_type = 'compare';
    else if (qLower.includes('anomal') || qLower.includes('unusual')) analysis_type = 'anomalies';
    else if (qLower.includes('trend') || qLower.includes('change')) analysis_type = 'trends';
    else if (qLower.includes('predict') || qLower.includes('forecast')) analysis_type = 'forecast';
    else if (qLower.includes('correlat') || qLower.includes('relation')) analysis_type = 'correlations';

    const result = await AIAnalystService.runFullAnalysis(station_id, analysis_type, time_range, question);
    res.json({
      answer: result.summary,
      ...result,
    });
  } catch (err) {
    console.error('[AI Analyst Question Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI question.',
      error: err.message,
    });
  }
};
