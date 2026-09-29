export function writeRichTextToClipboard(htmlContent) {
  const blobHtml = new Blob([htmlContent], { type: 'text/html' });
  const plainText = htmlContent.replace(/<br\s*[/]?>/gi, '\n').replace(/<[^>]+>/g, '');
  const blobText = new Blob([plainText], { type: 'text/plain' });
  const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
  return navigator.clipboard.write(data);
}

export function htmlToPlainText(htmlContent) {
  return htmlContent.replace(/<br\s*[/]?>/gi, '\n').replace(/<[^>]+>/g, '');
}
