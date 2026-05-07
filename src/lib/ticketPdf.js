import QRCode from 'qrcode';
import html2pdf from 'html2pdf.js';

function methodLabel(metodoPago) {
  if (metodoPago === 'online') return 'En Línea';
  if (metodoPago === 'taquilla') return 'En Taquilla';
  return metodoPago || '—';
}

/**
 * Genera y descarga el PDF del ticket (sin diálogo de impresión).
 * @param {{
 *   ticketId: string,
 *   clienteNombre: string,
 *   clienteEmail: string,
 *   fechaCreacion?: string | Date,
 *   precioTotal?: number,
 *   metodoPago?: string,
 *   estadoPago: string,
 * }} opts
 */
/**
 * Igual que {@link downloadTicketPdf} pero con tope de tiempo para no bloquear la UI indefinidamente.
 * @param {Parameters<typeof downloadTicketPdf>[0]} opts
 * @param {{ timeoutMs?: number }} [cfg]
 */
export async function downloadTicketPdfBestEffort(opts, cfg = {}) {
  const timeoutMs = cfg.timeoutMs ?? 45000;
  return Promise.race([
    downloadTicketPdf(opts),
    new Promise((_, rej) =>
      setTimeout(() => rej(Object.assign(new Error('pdf_timeout'), { code: 'PDF_TIMEOUT' })), timeoutMs)
    )
  ]);
}

export async function downloadTicketPdf(opts) {
  const {
    ticketId,
    clienteNombre,
    clienteEmail,
    fechaCreacion = new Date(),
    precioTotal = 1000,
    metodoPago = 'online',
    estadoPago
  } = opts;

  const qrDataUrl = await QRCode.toDataURL(ticketId, {
    width: 300,
    margin: 2,
    color: { dark: '#000000FF', light: '#FFFFFFFF' }
  });

  const dateStr =
    fechaCreacion instanceof Date
      ? fechaCreacion.toLocaleDateString()
      : new Date(fechaCreacion).toLocaleDateString();

  const statusBlock =
    estadoPago === 'pagado'
      ? `<p style="font-weight: bold; margin: 10px 0 0 0; padding: 8px; border-radius: 5px; text-align: center; background: #dcfce7; color: #16a34a;">ESTADO: PAGADO 100%</p>`
      : `<p style="font-weight: bold; margin: 10px 0 0 0; padding: 8px; border-radius: 5px; text-align: center; background: #fef3c7; color: #d97706;">ESTADO: PAGO PENDIENTE EN TAQUILLA</p>`;

  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;left:-9999px;top:0;width:600px;padding:20px;font-family:sans-serif;background:#fff;color:#333;';
  el.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; background: #fff; width: 600px; color: #333;">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Balneario San Antonio</h1>
        <p style="margin: 5px 0; font-size: 16px; color: #666;">Ticket Oficial de Acceso</p>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
        <div>
          <h3 style="margin-bottom: 5px; color: #444;">Datos del Cliente:</h3>
          <p style="margin: 0; font-weight: bold;">${escapeAttr(clienteNombre)}</p>
          <p style="margin: 0; color: #666;">${escapeAttr(clienteEmail)}</p>
        </div>
        <div style="text-align: right;">
          <h3 style="margin-bottom: 5px; color: #444;">Detalles:</h3>
          <p style="margin: 0;">Fecha: <strong>${escapeAttr(dateStr)}</strong></p>
          <p style="margin: 0;">Método: <strong>${escapeAttr(methodLabel(metodoPago))}</strong></p>
        </div>
      </div>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; margin-bottom: 10px;">Resumen</h3>
        <p style="margin: 5px 0; font-size: 16px;">Total a Pagar: <strong>$${Number(precioTotal).toFixed(2)} MXN</strong></p>
        ${statusBlock}
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <p style="margin-bottom: 10px;">Muestra este código QR en la entrada:</p>
        <img src="${qrDataUrl}" alt="Código QR" style="width: 250px; height: 250px; margin: 0 auto; display: block;">
        <p style="font-size: 12px; color: #666; margin-top: 10px;">ID: ${escapeAttr(ticketId)}</p>
      </div>
    </div>
  `;

  document.body.appendChild(el);
  const inner = el.firstElementChild;
  const filename = `Ticket_Balneario_${String(ticketId).substring(0, 8)}.pdf`;

  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // html2canvas falla con funciones de color modernas (oklch) presentes en estilos globales.
  // Para evitarlo, desactivamos temporalmente hojas de estilo del documento y dejamos estilos inline del ticket.
  const styleNodes = [...document.querySelectorAll('style,link[rel="stylesheet"]')];
  const previousDisabled = styleNodes.map((n) => n.disabled === true);
  styleNodes.forEach((n) => {
    n.disabled = true;
  });

  try {
    await html2pdf().set(opt).from(inner).save();
  } finally {
    styleNodes.forEach((n, idx) => {
      n.disabled = previousDisabled[idx];
    });
    document.body.removeChild(el);
  }
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}
