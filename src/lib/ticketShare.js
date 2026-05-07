import QRCode from 'qrcode';

function fallbackText(ticket) {
  const shortId = String(ticket?.id || '').slice(0, 8);
  const total = Number(ticket?.precioTotal || 0).toFixed(2);
  return `Te comparto mi ticket del balneario.\nCódigo: ${shortId}\nTotal: $${total} MXN\nPresenta este código al ingresar: ${ticket?.id || shortId}`;
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function dataUrlToFile(dataUrl, filename, type = 'image/png') {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || type });
}

export async function getTicketQrDataUrl(ticketId) {
  return QRCode.toDataURL(String(ticketId || ''), {
    width: 800,
    margin: 2,
    color: { dark: '#000000FF', light: '#FFFFFFFF' }
  });
}

export async function saveTicketQrImage({ ticketId, fileName }) {
  const shortId = String(ticketId || '').slice(0, 8);
  const finalName = fileName || `ticket-${shortId}-qr.png`;
  const dataUrl = await getTicketQrDataUrl(ticketId);
  downloadDataUrl(dataUrl, finalName);
  return { saved: true, dataUrl };
}

export async function copyTicketCode(ticketId) {
  const txt = String(ticketId || '');
  if (!txt) return { copied: false };
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(txt);
    return { copied: true };
  }
  const ta = document.createElement('textarea');
  ta.value = txt;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  return { copied: true };
}

export async function shareTicketViaWhatsApp({ ticket, preferQrFile = true }) {
  const text = fallbackText(ticket);
  const shortId = String(ticket?.id || '').slice(0, 8);
  const qrFileName = `ticket-${shortId}-qr.png`;

  if (preferQrFile && navigator.share) {
    try {
      const dataUrl = await getTicketQrDataUrl(ticket?.id);
      const file = await dataUrlToFile(dataUrl, qrFileName);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Ticket ${shortId}`,
          text,
          files: [file]
        });
        return { shared: true, mode: 'share_files' };
      }
    } catch {
      // fallback below
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Ticket ${shortId}`,
        text
      });
      return { shared: true, mode: 'share_text' };
    } catch {
      // fallback below
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  return { shared: true, mode: 'wa_me' };
}

