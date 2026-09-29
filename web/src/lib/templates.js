export const defaultTemplates = [
  {
    id: 'tpl-1',
    title: 'Active User Return',
    subject: 'ACME Asset Return ([ticketRef])',
    body: 'Ahoy [NAME],\n\nWe can see that your replacement laptop was delivered on [DELIVERY_DATE]. Here are the instructions on how to send your old device back.\n\nPlease use the packaging provided to pack your old device(s) securely into the box. There is a return label which should be stuck onto the front of the box, this is a door-to-door service and CourierA will be the courier who collects the return box at a time/date that you choose by replying to the email sent by the team.\n\nShipping Instructions\nStep 1: Find the return shipping label which is included in this box prepaid and pre-populated with the ("Ship to") address.\nStep 2: Attach the new return shipping label to the outside of the box making sure to cover the existing label.\nStep 3: After the equipment has been packed inside the box, the box should be sealed and will then be ready for collection. Please provide the time/date that suits you best for the pick-up by CourierA by answering this email sent by the ITAM Team\n\nThank you for your prompt attention to this matter. Should you have any further questions please reach out to [returns mailbox]',
  },
  {
    id: 'tpl-2',
    title: 'Offboarding Return',
    subject: 'ACME Offboarding Asset Return ([ticketRef])',
    body: 'Hi [NAME],\n\nWe are happy to let you know that we have processed and shipped your return box which contains an instruction sheet and a return label (tracking # [RETURN_TRACKING]) so that you can return your old laptop (serial no. [SERIAL_NUMBER]), employee badge and YubiKeys, if you still have them. Please see the tracking details in the comments below.\n\nOnce you have received the return box, please reply to this email with a date and time that is convenient for you, so I can organize the carrier to pick it up from your address.\n\n• Courier - CourierA\n• Tracking Number - [RETURN_TRACKING]\n\nETA: [DELIVERY_DATE]\n\nIf you have any questions regarding this shipment please do not hesitate to contact me.',
  },
  {
    id: 'tpl-3',
    title: 'Pickup Confirmed',
    subject: 'Pickup Scheduled: ACME Asset Return ([ticketRef])',
    body: 'Hi [NAME],\n\nThanks for getting back to me.\n\nI have scheduled a CourierA collection for [DAY], [PICKUP_DATE] between [TIME_RANGE]. If there are any issues please let me know.\n\n[INSERT SCREENSHOT OF CONFIRMATION]',
  },
  {
    id: 'tpl-4',
    title: 'Return Box Delivered',
    subject: 'Return Box Delivered: ACME Asset Return ([ticketRef])',
    body: "Hi [NAME],\n\nI hope you're having a good week.\n\nAccording to the tracking updates, your return box has been successfully delivered.\n\nWhenever you have a moment to pack your equipment (laptops, employee badge, and YubiKeys), please reply to this email with a convenient date and time for the collection. Once I have those details, I will go ahead and schedule the CourierA carrier to pick it up directly from your address.\n\nIf you need any assistance or have any questions about the process, please let me know.",
  },
];

export const getFormattedDay = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' }) : '[DAY]';

export const getFormattedDate = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '[DATE]';

export function buildTemplateContext({ row, selectedTask, deliveryDate, pickupDate, serialNumber, timeRange }) {
  const firstName = (row?.name || 'Customer').split(' ')[0];
  const returnTrkStr = row?.returnTrk && row.returnTrk !== '-' ? row.returnTrk : '[RETURN TRACKING]';
  const outboundTrkStr = row?.outboundTrk && row.outboundTrk !== '-' ? row.outboundTrk : '[OUTBOUND TRACKING]';
  return { firstName, returnTrkStr, outboundTrkStr, selectedTask, deliveryDate, pickupDate, serialNumber, timeRange };
}

export function parseTemplateVariables(rawString, ctx) {
  let res = rawString || '';
  res = res.replace(/\[NAME\]/gi, `<b>${ctx.firstName}</b>`);
  res = res.replace(/\[ticketRef\]/gi, ctx.selectedTask || '[ticketRef]');
  res = res.replace(/\[DELIVERY_DATE\]/gi, `<b>${getFormattedDate(ctx.deliveryDate)}</b>`);
  res = res.replace(/\[PICKUP_DATE\]/gi, `<b>${getFormattedDate(ctx.pickupDate)}</b>`);
  res = res.replace(/\[DAY\]/gi, `<b>${getFormattedDay(ctx.pickupDate)}</b>`);
  res = res.replace(/\[SERIAL_NUMBER\]/gi, `<b>${ctx.serialNumber || '[SERIAL_NUMBER]'}</b>`);
  res = res.replace(/\[TIME_RANGE\]/gi, `<b>${ctx.timeRange || '[TIME_RANGE]'}</b>`);
  res = res.replace(/\[RETURN_TRACKING\]/gi, `<b>${ctx.returnTrkStr}</b>`);
  res = res.replace(/\[OUTBOUND_TRACKING\]/gi, `<b>${ctx.outboundTrkStr}</b>`);
  res = res.replace(/\[DATE\]/gi, `<b>${getFormattedDate(ctx.date || new Date())}</b>`);
  res = res.replace(/\[USER\]/gi, `<b>${ctx.operatorName || 'Operator'}</b>`);
  return res;
}

/* Formatting tags: [B]x[/B] [I] [U] [S] [HL] [H2] [H3] [LIST]a|b[/LIST]
   [LINK=url]x[/LINK] [HR] — rendered after variables so they wrap them too. */
export function renderTemplateFormatting(html) {
  let s = html || '';
  const wrap = (tag, el) => s = s.replace(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[/${tag}\\]`, 'gi'), (_, x) => `<${el}>${x}</${el}>`);
  wrap('B', 'b'); wrap('I', 'i'); wrap('U', 'u'); wrap('S', 's');
  wrap('HL', 'mark'); wrap('H2', 'h2'); wrap('H3', 'h3');
  s = s.replace(/\[LIST\]([\s\S]*?)\[\/LIST\]/gi, (_, x) =>
    '<ul>' + x.split('|').map((li) => `<li>${li.trim()}</li>`).join('') + '</ul>');
  s = s.replace(/\[LINK=([^\]]+)\]([\s\S]*?)\[\/LINK\]/gi, (_, u, x) => `<a href="${u}">${x}</a>`);
  s = s.replace(/\[HR\]/gi, '<hr/>');
  return s;
}

export const formatTextToRichHtml = (text, ctx) =>
  renderTemplateFormatting(parseTemplateVariables(text, ctx)).replace(/\n/g, '<br/>');
