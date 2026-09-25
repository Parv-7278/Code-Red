const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const encoder = new TextEncoder();

const color = {
  navy: [0.055, 0.145, 0.216],
  ink: [0.102, 0.196, 0.278],
  slate: [0.31, 0.4, 0.47],
  muted: [0.45, 0.52, 0.57],
  line: [0.82, 0.87, 0.9],
  pale: [0.95, 0.97, 0.98],
  teal: [0.071, 0.404, 0.482],
  green: [0.13, 0.43, 0.31],
  amber: [0.58, 0.38, 0.07],
  red: [0.63, 0.2, 0.18],
  white: [1, 1, 1],
};

function safe(value) {
  return String(value ?? '')
    .replace(/\u00b0/g, ' deg')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escaped(value) {
  return safe(value).replace(/([\\()])/g, '\\$1');
}

function number(value) {
  return Number(value).toFixed(2).replace(/\.00$/, '');
}

function rgb(value, stroke = false) {
  return `${value.map(number).join(' ')} ${stroke ? 'RG' : 'rg'}`;
}

function textWidth(value, size, mono = false) {
  return safe(value).length * size * (mono ? 0.6 : 0.52);
}

function wrap(value, maxWidth, size = 10) {
  const words = safe(value).split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || textWidth(candidate, size) <= maxWidth) current = candidate;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

function statusColor(status) {
  const value = safe(status).toUpperCase();
  if (value === 'CRITICAL') return color.red;
  if (value === 'WATCH' || value === 'WARNING') return color.amber;
  return color.green;
}

function metricValue(metric, suffix) {
  return metric?.current === null || metric?.current === undefined
    ? 'Unavailable'
    : `${metric.current}${suffix}`;
}

function makeContent(report) {
  const commands = [];
  const drawText = (x, y, value, { size = 10, font = 'F1', fill = color.ink, align = 'left' } = {}) => {
    const finalX = align === 'right' ? x - textWidth(value, size, font === 'F3') : x;
    commands.push(`BT /${font} ${number(size)} Tf ${rgb(fill)} ${number(finalX)} ${number(PAGE_HEIGHT - y)} Td (${escaped(value)}) Tj ET`);
  };
  const drawRect = (x, y, width, height, { fill, stroke, lineWidth = 1 } = {}) => {
    const parts = ['q', `${number(lineWidth)} w`];
    if (fill) parts.push(rgb(fill));
    if (stroke) parts.push(rgb(stroke, true));
    parts.push(`${number(x)} ${number(PAGE_HEIGHT - y - height)} ${number(width)} ${number(height)} re`);
    parts.push(fill && stroke ? 'B' : fill ? 'f' : 'S', 'Q');
    commands.push(parts.join(' '));
  };
  const drawLine = (x1, y1, x2, y2, stroke = color.line) => {
    commands.push(`q 1 w ${rgb(stroke, true)} ${number(x1)} ${number(PAGE_HEIGHT - y1)} m ${number(x2)} ${number(PAGE_HEIGHT - y2)} l S Q`);
  };
  const drawLabel = (x, y, value) => drawText(x, y, value, { size: 7.5, font: 'F2', fill: color.muted });

  drawRect(0, 0, PAGE_WIDTH, 94, { fill: color.navy });
  drawRect(0, 90, PAGE_WIDTH, 4, { fill: color.teal });
  drawText(MARGIN, 36, 'POLARIS', { size: 22, font: 'F2', fill: color.white });
  drawText(MARGIN + 104, 36, 'ANTARCTIC OPERATIONS', { size: 8, font: 'F2', fill: [0.45, 0.82, 0.88] });
  drawText(MARGIN, 62, '12-HOUR STATION OPERATIONS BRIEF', { size: 10, fill: [0.79, 0.88, 0.92] });
  drawText(PAGE_WIDTH - MARGIN, 38, report.executive_summary?.overall_status || 'NOMINAL', { size: 10, font: 'F2', fill: color.white, align: 'right' });
  drawText(PAGE_WIDTH - MARGIN, 61, `RISK ${report.executive_summary?.overall_risk_score ?? 0}/100`, { size: 9, font: 'F3', fill: [0.79, 0.88, 0.92], align: 'right' });

  const innerWidth = PAGE_WIDTH - (MARGIN * 2);
  const boxWidth = (innerWidth - 20) / 3;
  const startY = 116;
  const metadata = [
    ['REPORT ID', report.report_id || 'Unavailable'],
    ['REPORTING WINDOW', `${new Date(report.reporting_period?.start || report.generated_at).toLocaleString()} - ${new Date(report.reporting_period?.end || report.generated_at).toLocaleString()}`],
    ['DESTINATION', `${report.recipient?.name || 'India Control Centre'} / ${report.recipient?.organisation || 'NCPOR Goa'}`],
  ];
  metadata.forEach(([label, value], index) => {
    const x = MARGIN + (index * (boxWidth + 10));
    drawRect(x, startY, boxWidth, 64, { fill: color.pale, stroke: color.line });
    drawLabel(x + 11, startY + 18, label);
    wrap(value, boxWidth - 22, 8.5).slice(0, 3).forEach((line, lineIndex) => {
      drawText(x + 11, startY + 37 + (lineIndex * 11), line, { size: 8.5, font: index === 0 ? 'F3' : 'F1' });
    });
  });

  drawLabel(MARGIN, 207, 'EXECUTIVE SUMMARY');
  wrap(report.executive_summary?.ai_summary || 'No executive summary was supplied.', innerWidth, 10).slice(0, 5).forEach((line, index) => {
    drawText(MARGIN, 227 + (index * 14), line, { size: 10, fill: color.slate });
  });
  drawLine(MARGIN, 302, PAGE_WIDTH - MARGIN, 302);
  drawLabel(MARGIN, 327, 'STATION DETAIL');

  Object.values(report.station_reports || {}).slice(0, 2).forEach((station, stationIndex) => {
    const y = 344 + (stationIndex * 166);
    drawRect(MARGIN, y, innerWidth, 150, { fill: color.white, stroke: color.line });
    drawRect(MARGIN, y, 5, 150, { fill: statusColor(station.status) });
    drawRect(MARGIN + 5, y, innerWidth - 5, 33, { fill: color.pale });
    drawText(MARGIN + 17, y + 22, station.station_name || station.station_id, { size: 11, font: 'F2' });
    drawText(PAGE_WIDTH - MARGIN - 13, y + 22, `${station.samples_analyzed ?? 0} SAMPLES / ${station.status || 'NOMINAL'}`, { size: 7.5, font: 'F2', fill: statusColor(station.status), align: 'right' });

    const metrics = [
      ['GENERATOR', metricValue(station.telemetry?.generator_temperature_c, ' deg C')],
      ['DEMAND', metricValue(station.telemetry?.demand_kw, ' kW')],
      ['BATTERY', metricValue(station.telemetry?.battery_reserve_pct, '%')],
      ['WIND', metricValue(station.telemetry?.wind_speed_kmh, ' km/h')],
    ];
    const metricWidth = (innerWidth - 24) / 4;
    metrics.forEach(([label, value], metricIndex) => {
      const x = MARGIN + 12 + (metricIndex * metricWidth);
      drawLabel(x, y + 57, label);
      drawText(x, y + 77, value, { size: 10, font: 'F3' });
      if (metricIndex < 3) drawLine(x + metricWidth - 8, y + 46, x + metricWidth - 8, y + 84);
    });
    wrap(station.summary || '', innerWidth - 28, 8.5).slice(0, 3).forEach((line, index) => {
      drawText(MARGIN + 13, y + 105 + (index * 12), line, { size: 8.5, fill: color.slate });
    });
    const warnings = Array.isArray(station.warnings) ? station.warnings : [];
    if (warnings.length) drawText(MARGIN + 13, y + 141, `Warnings: ${warnings.join('; ')}`, { size: 7.5, font: 'F2', fill: color.red });
  });

  drawRect(MARGIN, 686, innerWidth, 60, { fill: [0.965, 0.975, 0.98], stroke: color.line });
  drawLabel(MARGIN + 12, 706, 'DATA PROVENANCE & DELIVERY');
  wrap(report.provenance || 'Generated from the telemetry retained by this POLARIS instance.', innerWidth - 120, 8.5).slice(0, 2).forEach((line, index) => {
    drawText(MARGIN + 12, 725 + (index * 11), line, { size: 8.5, fill: color.slate });
  });
  drawText(PAGE_WIDTH - MARGIN - 12, 707, report.delivery?.status || 'READY', { size: 8, font: 'F2', fill: statusColor(report.delivery?.status), align: 'right' });

  drawLine(MARGIN, 795, PAGE_WIDTH - MARGIN, 795);
  drawText(MARGIN, 817, `Generated ${new Date(report.generated_at || Date.now()).toLocaleString()} / POLARIS operational prototype`, { size: 7.5, fill: color.muted });
  drawText(PAGE_WIDTH - MARGIN, 817, 'PAGE 1 OF 1', { size: 7.5, font: 'F3', fill: color.muted, align: 'right' });
  return `${commands.join('\n')}\n`;
}

function buildDocument(report) {
  const stream = makeContent(report);
  const objects = [
    null,
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [6 0 R] /Count 1 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${number(PAGE_WIDTH)} ${number(PAGE_HEIGHT)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents 7 0 R >>`,
    `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = encoder.encode(pdf).length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(pdf);
}

export function create12HourReportPdf(report) {
  if (!report) throw new Error('Generate a briefing before downloading its PDF.');
  return buildDocument(report);
}

export function download12HourReportPdf(report) {
  const blob = new Blob([create12HourReportPdf(report)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const station = safe(report.station_id || 'report').replace(/[^A-Za-z0-9_-]/g, '_');
  anchor.href = url;
  anchor.download = `POLARIS_12H_${station}_${new Date(report.generated_at || Date.now()).toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
