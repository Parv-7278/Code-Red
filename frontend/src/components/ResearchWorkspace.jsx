import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Database,
  Download,
  FileDown,
  FileText,
  FlaskConical,
  RadioTower,
  Send,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTelemetry } from '../context/TelemetryContext';
import {
  analyzeResearchData,
  askResearchAI,
  generate12HourReport,
  get12HourReportDeliveries,
  get12HourReportSchedule,
  getAIAnalystStatus,
  update12HourReportSchedule,
} from '../services/api';
import { download12HourReportPdf } from '../utils/reportPdf';
import './ResearchWorkspace.css';

const stationProfile = {
  'station-maitri': {
    name: 'Maitri',
    region: 'Schirmacher Oasis',
    coordinates: '70°45′S · 11°44′E',
    programmes: ['Atmospheric observation', 'Geomagnetic monitoring', 'Glaciology field studies'],
  },
  'station-bharati': {
    name: 'Bharati',
    region: 'Larsemann Hills',
    coordinates: '69°24′S · 76°11′E',
    programmes: ['Coastal climate observation', 'Ocean and ice studies', 'Earth observation support'],
  },
  'all-stations': {
    name: 'National station network',
    region: 'Maitri & Bharati',
    coordinates: 'India Antarctic Programme',
    programmes: ['Cross-station climate comparison', 'National operations reporting', 'Shared research telemetry review'],
  },
};

function average(values, fallback) {
  const usable = values.map(Number).filter(Number.isFinite);
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : fallback;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Not scheduled';
}

export default function ResearchWorkspace({ selectedStation }) {
  const { role, assignedStation } = useAuth();
  const { telemetry, dataSource, lastSyncedAt } = useTelemetry();
  const isIndiaOperator = role === 'india_operator';
  const stationId = selectedStation === 'all-stations' && isIndiaOperator
    ? 'all-stations'
    : selectedStation === 'station-bharati'
      ? 'station-bharati'
      : 'station-maitri';
  const station = stationProfile[stationId];

  const packet = useMemo(() => {
    if (stationId !== 'all-stations') return telemetry[stationId] || {};
    const maitri = telemetry['station-maitri'] || {};
    const bharati = telemetry['station-bharati'] || {};
    return {
      temperature: average([maitri.temperature, bharati.temperature], -16.5),
      wind_speed: average([maitri.wind_speed, bharati.wind_speed], 36),
      seismic_frequency: average([maitri.seismic_frequency, bharati.seismic_frequency], 2.75),
      geomagnetic_kp: average([maitri.geomagnetic_kp, bharati.geomagnetic_kp], 2.5),
    };
  }, [stationId, telemetry]);

  const [section, setSection] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [report, setReport] = useState(null);
  const [reportScope, setReportScope] = useState(stationId);
  const [schedule, setSchedule] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const nextScope = isIndiaOperator ? stationId : (assignedStation || stationId);
    setSection('overview');
    setAnswer(null);
    setAnalysis(null);
    setReport(null);
    setReportScope(nextScope);
    setError('');
    setNotice('');
    getAIAnalystStatus(role, assignedStation)
      .then((value) => active && setServiceStatus(value))
      .catch(() => active && setServiceStatus({ status: 'OFFLINE', is_fallback: true }));
    return () => { active = false; };
  }, [stationId, role, assignedStation, isIndiaOperator]);

  useEffect(() => {
    let active = true;
    Promise.all([
      get12HourReportSchedule(reportScope, role, assignedStation),
      get12HourReportDeliveries(reportScope, role, assignedStation),
    ]).then(([scheduleValue, deliveryValues]) => {
      if (!active) return;
      setSchedule(scheduleValue);
      setDeliveries(Array.isArray(deliveryValues) ? deliveryValues : []);
    }).catch(() => {
      if (active) setSchedule(null);
    });
    return () => { active = false; };
  }, [reportScope, role, assignedStation]);

  const observations = useMemo(() => [
    { label: 'Outside temperature', value: `${Number(packet.temperature ?? -18.7).toFixed(1)} °C`, icon: Thermometer, source: packet.temperature != null ? 'Latest telemetry' : 'Demonstration value' },
    { label: 'Wind speed', value: `${Number(packet.wind_speed ?? 28).toFixed(1)} km/h`, icon: Wind, source: packet.wind_speed != null ? 'Latest telemetry' : 'Demonstration value' },
    { label: 'Seismic frequency', value: `${Number(packet.seismic_frequency ?? 1.85).toFixed(2)} Hz`, icon: Activity, source: packet.seismic_frequency != null ? 'Latest telemetry' : 'Demonstration value' },
    { label: 'Geomagnetic Kp', value: Number(packet.geomagnetic_kp ?? 2.3).toFixed(1), icon: BarChart3, source: packet.geomagnetic_kp != null ? 'Latest telemetry' : 'Demonstration value' },
  ], [packet]);

  async function runAnalysis() {
    setBusy('analysis'); setError(''); setNotice('');
    const target = stationId === 'all-stations' ? 'station-maitri' : stationId;
    try {
      setAnalysis(await analyzeResearchData({ stationId: target, analysisType: 'summary', timeRange }, role, assignedStation));
      setSection('analysis');
    } catch (err) { setError(err.message || 'The analysis could not be completed.'); }
    finally { setBusy(''); }
  }

  async function ask(event) {
    event.preventDefault();
    if (!question.trim()) return;
    setBusy('question'); setError(''); setNotice('');
    const target = stationId === 'all-stations' ? 'station-maitri' : stationId;
    try { setAnswer(await askResearchAI({ stationId: target, question: question.trim(), timeRange }, role, assignedStation)); }
    catch (err) { setError(err.message || 'The question could not be processed.'); }
    finally { setBusy(''); }
  }

  async function buildReport(sendToHq = false) {
    setBusy(sendToHq ? 'send' : 'report'); setError(''); setNotice('');
    try {
      const value = await generate12HourReport({ stationId: reportScope, sendToHq }, role, assignedStation);
      setReport(value);
      setSection('report');
      if (sendToHq) {
        setNotice(`Report ${value.report_id} transmitted to India Control Centre.`);
        setDeliveries(await get12HourReportDeliveries(reportScope, role, assignedStation));
      }
    } catch (err) { setError(err.message || 'The 12-hour briefing could not be created.'); }
    finally { setBusy(''); }
  }

  async function toggleSchedule() {
    setBusy('schedule'); setError(''); setNotice('');
    try {
      const updated = await update12HourReportSchedule(reportScope, !schedule?.enabled, role, assignedStation);
      setSchedule(updated);
      setNotice(updated.enabled
        ? 'Automatic 12-hour delivery to India Control Centre is active.'
        : 'Automatic India HQ delivery has been paused.');
    } catch (err) { setError(err.message || 'The report schedule could not be updated.'); }
    finally { setBusy(''); }
  }

  function downloadJsonReport() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `POLARIS_12H_${report.station_id}_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadPdfReport() {
    if (!report) return;
    download12HourReportPdf(report);
  }

  const analysisText = analysis?.summary || analysis?.analysis?.summary || analysis?.executive_summary?.ai_summary || 'No summary was returned.';
  const reportSummary = report?.executive_summary || {};
  const stationReports = report ? Object.values(report.station_reports || {}) : [];

  return <main className="research-workspace">
    <header className="research-heading">
      <div><span className="ops-section-label">RESEARCH / {station.name.toUpperCase()}</span><h2>Research data workspace</h2><p>{station.region} · {station.coordinates}</p></div>
      <div className="research-source"><Database size={15}/><span>{dataSource === 'demonstration' ? 'Demonstration dataset' : 'Telemetry received'}<small>{lastSyncedAt ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'No live synchronization'}</small></span></div>
    </header>
    <div className="research-notice"><strong>Evidence status:</strong> values marked as demonstration data are interface examples. Connected reports include their source and sample count.</div>
    <nav className="research-tabs" aria-label="Research sections">
      {[['overview','Overview'],['datasets','Datasets'],['analysis','Analysis'],['report','12-hour HQ brief']].map(([id,label]) => <button key={id} className={section === id ? 'is-active' : ''} onClick={() => setSection(id)}>{label}</button>)}
    </nav>
    {error && <p className="ui-feedback ui-feedback-error" role="alert">{error}</p>}
    {notice && <p className="ui-feedback research-success" role="status"><CheckCircle2 size={16}/>{notice}</p>}

    {section === 'overview' && <div className="research-layout">
      <section><div className="research-observations">{observations.map(({label,value,icon:Icon,source}) => <article key={label}><Icon size={18}/><span>{label}</span><strong>{value}</strong><small>{source}</small></article>)}</div><div className="research-panel"><span className="ops-section-label">ACTIVE PROGRAMMES · SAMPLE CATALOGUE</span><h3>Station research areas</h3><ul className="research-programmes">{station.programmes.map(item => <li key={item}><FlaskConical size={16}/>{item}</li>)}</ul></div></section>
      <AnalystPanel {...{ask,question,setQuestion,answer,busy,serviceStatus,timeRange,setTimeRange}} />
    </div>}

    {section === 'datasets' && <section className="research-panel"><span className="ops-section-label">AVAILABLE IN THIS PROTOTYPE</span><h3>Dataset register</h3><div className="research-table-wrap"><table><thead><tr><th>Dataset</th><th>Origin</th><th>Update</th><th>Use</th></tr></thead><tbody><tr><td>Station environment</td><td>{dataSource === 'demonstration' ? 'Demonstration generator' : 'Telemetry service'}</td><td>{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not connected'}</td><td>Temperature and wind context</td></tr><tr><td>Research observations</td><td>Demonstration generator</td><td>On page load</td><td>Interface and analysis testing</td></tr><tr><td>12-hour telemetry window</td><td>POLARIS backend history</td><td>Live</td><td>India HQ station briefing</td></tr></tbody></table></div><p className="research-footnote">Connect an approved historical data source before presenting demonstration values as official observations.</p></section>}

    {section === 'analysis' && <section className="research-panel"><div className="research-panel-heading"><div><span className="ops-section-label">STATISTICAL ANALYSIS</span><h3>{analysis ? 'Latest result' : 'Run a telemetry summary'}</h3></div><div className="research-actions"><select aria-label="Analysis range" value={timeRange} onChange={e=>setTimeRange(e.target.value)}><option value="24h">24 hours</option><option value="7d">7 days</option><option value="30d">30 days</option></select><button className="ops-primary" onClick={runAnalysis} disabled={!!busy}>{busy === 'analysis' ? 'Analysing…' : 'Run analysis'}</button></div></div>{analysis ? <div className="research-result"><span className={analysis.is_fallback ? 'is-sample' : 'is-service'}>{analysis.is_fallback ? 'DEMONSTRATION FALLBACK' : 'ANALYSIS SERVICE'}</span><p>{analysisText}</p></div> : <p className="research-empty">Choose a time range and run the analysis. Results will identify their source.</p>}</section>}

    {section === 'report' && <section className="research-report-workspace">
      <div className="research-panel research-report-control">
        <div className="research-panel-heading"><div><span className="ops-section-label">12-HOUR OPERATIONS BRIEF</span><h3>India HQ reporting link</h3></div><RadioTower size={24}/></div>
        <p className="research-empty">Compile the retained telemetry window and transmit an auditable briefing to India Control Centre through the internal POLARIS reporting bus.</p>
        <label className="research-field-label" htmlFor="report-scope">Report coverage</label>
        <select id="report-scope" value={reportScope} onChange={(event) => { setReportScope(event.target.value); setReport(null); setNotice(''); }} disabled={!isIndiaOperator}>
          {isIndiaOperator && <option value="all-stations">Both stations · fleet summary</option>}
          {(!assignedStation || assignedStation === 'station-maitri' || isIndiaOperator) && <option value="station-maitri">Maitri Station</option>}
          {(!assignedStation || assignedStation === 'station-bharati' || isIndiaOperator) && <option value="station-bharati">Bharati Station</option>}
        </select>
        <div className="research-report-actions">
          <button className="research-secondary" onClick={() => buildReport(false)} disabled={!!busy}><FileText size={15}/>{busy === 'report' ? 'Compiling…' : report ? 'Refresh briefing' : 'Generate briefing'}</button>
          <button className="ops-primary" onClick={() => buildReport(true)} disabled={!!busy}><Send size={15}/>{busy === 'send' ? 'Transmitting…' : 'Generate & send now'}</button>
        </div>
        <div className={`research-schedule-card ${schedule?.enabled ? 'is-enabled' : ''}`}>
          <CalendarClock size={20}/><div><strong>{schedule?.enabled ? 'Automatic delivery active' : 'Automatic delivery paused'}</strong><span>Every 12 hours to India Control Centre</span><small>Next dispatch: {formatDate(schedule?.next_dispatch_at)}</small></div>
          <button type="button" onClick={toggleSchedule} disabled={!!busy}>{busy === 'schedule' ? 'Updating…' : schedule?.enabled ? 'Pause' : 'Enable'}</button>
        </div>
      </div>

      <div className="research-panel research-report-output">
        <div className="research-panel-heading"><div><span className="ops-section-label">LATEST GENERATED BRIEFING</span><h3>{report?.report_id || 'No report generated in this session'}</h3></div>{report && <div className="research-download-actions"><button className="research-secondary" onClick={downloadJsonReport}><Download size={15}/>Download JSON</button><button className="research-secondary research-pdf-download" onClick={downloadPdfReport}><FileDown size={15}/>Download PDF</button></div>}</div>
        {report ? <>
          <div className="research-report-summary"><span className={`report-health ${String(reportSummary.overall_status).toLowerCase()}`}>{reportSummary.overall_status}</span><strong>Risk {reportSummary.overall_risk_score}/100</strong><span>{reportSummary.stations_covered} station{reportSummary.stations_covered === 1 ? '' : 's'} covered</span></div>
          <p className="research-report-narrative">{reportSummary.ai_summary}</p>
          <div className="research-station-briefs">{stationReports.map((entry) => <article key={entry.station_id}><div><strong>{entry.station_name}</strong><span>{entry.samples_analyzed} samples · {entry.status}</span></div><dl><div><dt>Generator</dt><dd>{entry.telemetry.generator_temperature_c.current ?? '—'}°C</dd></div><div><dt>Demand</dt><dd>{entry.telemetry.demand_kw.current ?? '—'} kW</dd></div><div><dt>Battery</dt><dd>{entry.telemetry.battery_reserve_pct.current ?? '—'}%</dd></div><div><dt>Wind</dt><dd>{entry.telemetry.wind_speed_kmh.current ?? '—'} km/h</dd></div></dl></article>)}</div>
        </> : <p className="research-empty">Generate a briefing to preview the exact station coverage, source sample count, risk classification, and delivery recipient.</p>}
        <div className="research-delivery-log"><span className="ops-section-label">RECENT INDIA HQ DELIVERIES</span>{deliveries.length ? deliveries.slice(0, 4).map((delivery) => <div key={delivery.delivery_id}><CheckCircle2 size={15}/><span><strong>{delivery.station_name}</strong><small>{delivery.report_id} · {formatDate(delivery.delivered_at)}</small></span><b>{delivery.status}</b></div>) : <p>No briefings have been transmitted during this backend session.</p>}</div>
      </div>
    </section>}
  </main>;
}

function AnalystPanel({ ask, question, setQuestion, answer, busy, serviceStatus, timeRange, setTimeRange }) {
  return <aside className="research-panel research-analyst"><div className="research-panel-heading"><div><span className="ops-section-label">DATA ANALYST</span><h3>Ask about the selected station</h3></div><span className={serviceStatus?.is_fallback || serviceStatus?.status === 'OFFLINE' ? 'is-sample' : 'is-service'}>{serviceStatus?.is_fallback || serviceStatus?.status === 'OFFLINE' ? 'DEMO' : 'CONNECTED'}</span></div><p className="research-analyst-intro">Answers are derived from connected telemetry when available. Offline responses state that they use demonstration data.</p><form onSubmit={ask}><label htmlFor="research-range">Time range</label><select id="research-range" value={timeRange} onChange={e=>setTimeRange(e.target.value)}><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select><label htmlFor="research-question">Question</label><textarea id="research-question" rows="4" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Which measurements changed most?"/><button className="ops-primary" disabled={!!busy || !question.trim()}>{busy === 'question' ? 'Checking data…' : <>Ask analyst <Send size={15}/></>}</button></form>{answer && <div className="research-answer"><span className={answer.is_fallback || answer.source === 'demo' ? 'is-sample' : 'is-service'}>{answer.is_fallback || answer.source === 'demo' ? 'DEMONSTRATION RESPONSE' : 'SERVICE RESPONSE'}</span><p>{answer.answer || answer.summary || 'No narrative answer was returned.'}</p></div>}</aside>;
}
