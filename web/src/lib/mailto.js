import { htmlToPlainText } from './clipboard.js';
import { parseTemplateVariables } from './templates.js';

export function openGmailCompose(subjectRaw, htmlContent, ctx) {
  const parsedSubject = parseTemplateVariables(subjectRaw, ctx).replace(/<[^>]+>/g, '');
  const plainTextBody = htmlToPlainText(htmlContent);
  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=${encodeURIComponent(parsedSubject)}&body=${encodeURIComponent(plainTextBody)}`;
  window.open(url, '_blank');
}
