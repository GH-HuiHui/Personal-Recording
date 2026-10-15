// Call directly from a user click; iOS requires that gesture for file sharing.
export async function saveFile(file, { directDownload = false, browser = globalThis.window, nav = globalThis.navigator, doc = globalThis.document, urls = globalThis.URL } = {}) {
  if (!directDownload && typeof browser.showSaveFilePicker === 'function') {
    const handle = await browser.showSaveFilePicker({ suggestedName: file.name });
    const stream = await handle.createWritable();
    await stream.write(file);
    await stream.close();
    return 'saved';
  }
  if (!directDownload && typeof nav.canShare === 'function' && nav.canShare({ files: [file] }) && typeof nav.share === 'function') {
    await nav.share({ files: [file], title: '成长雷达备份' });
    return 'shared';
  }
  const url = urls.createObjectURL(file);
  const link = doc.createElement('a');
  // Framework7 must leave this browser download alone.
  link.className = 'external';
  link.href = url;
  link.download = file.name;
  doc.body.append(link);
  try { link.click(); }
  finally {
    link.remove();
    browser.setTimeout(() => urls.revokeObjectURL(url), 60_000);
  }
  return 'downloaded';
}
