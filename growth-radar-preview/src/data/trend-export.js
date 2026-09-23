const HEADERS = ['日期', '阶段序号', '阶段', '方向序号', '方向', '次数'];

function csvCell(value, guardFormula = false) {
  let text = String(value);
  if (guardFormula && /^[\s\ufeff]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createTrendCsv(rows) {
  const lines = [HEADERS.join(',')];
  const sorted = rows.toSorted((a, b) => a.date.localeCompare(b.date)
    || a.stageOrder - b.stageOrder || a.dimensionOrder - b.dimensionOrder);
  for (const row of sorted) {
    lines.push([
      csvCell(row.date), csvCell(row.stageOrder), csvCell(row.stageName, true),
      csvCell(row.dimensionOrder), csvCell(row.dimensionName, true), csvCell(row.count)
    ].join(','));
  }
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try { link.click(); }
  finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

export function downloadTrendCsv(rows, monthKey) {
  const csv = createTrendCsv(rows);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `成长雷达数据-${monthKey}.csv`);
}

function svgImage(svg) {
  return new Promise((resolve, reject) => {
    const copy = svg.cloneNode(true);
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const blob = new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('趋势图渲染失败')); };
    image.src = url;
  });
}

export async function downloadTrendPng(svg, monthKey) {
  const box = svg.viewBox.baseVal;
  if (!box.width || !box.height) throw new Error('趋势图尺寸无效');
  const image = await svgImage(svg);
  const canvas = document.createElement('canvas');
  canvas.width = box.width * 2;
  canvas.height = box.height * 2;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器无法生成趋势图');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('趋势图导出失败');
  downloadBlob(blob, `成长雷达趋势-${monthKey}.png`);
}
