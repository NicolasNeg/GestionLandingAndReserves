import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

/**
 * Abre un modal de recorte con Cropper.js.
 * @param {object} opts
 * @param {File} opts.file
 * @param {number} [opts.aspectRatio] - NaN o undefined = libre
 * @param {string} [opts.title]
 * @returns {Promise<Blob>} JPEG
 */
export function openImageCropModal({ file, aspectRatio = NaN, title = 'Recortar imagen' }) {
  if (!(file instanceof File)) {
    return Promise.reject(new Error('Archivo no valido.'));
  }

  return new Promise((resolve, reject) => {
    const root = document.createElement('div');
    root.className =
      'fixed inset-0 z-[250] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-slate-900/55 backdrop-blur-sm';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', title);

    const panel = document.createElement('div');
    panel.className =
      'flex max-h-[min(92vh,900px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl';

    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.alt = '';
    img.src = url;
    img.className = 'block max-h-[50vh] w-full bg-slate-100 sm:max-h-[55vh]';

    const cropWrap = document.createElement('div');
    cropWrap.className = 'max-h-[50vh] overflow-hidden bg-slate-100 sm:max-h-[55vh]';

    const footer = document.createElement('div');
    footer.className =
      'flex flex-shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]';

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className =
      'rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50';
    btnCancel.textContent = 'Cancelar';

    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.className =
      'rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-black text-white hover:bg-teal-800';
    btnOk.textContent = 'Usar recorte';

    const head = document.createElement('div');
    head.className = 'flex items-center justify-between border-b border-slate-200 px-4 py-3';
    head.innerHTML = `<h2 class="text-lg font-black text-slate-900">${title}</h2>`;

    cropWrap.appendChild(img);
    panel.appendChild(head);
    panel.appendChild(cropWrap);
    footer.appendChild(btnCancel);
    footer.appendChild(btnOk);
    panel.appendChild(footer);
    root.appendChild(panel);
    document.body.appendChild(root);

    let cropper = null;
    let done = false;

    const finish = (fn) => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      fn();
    };

    const cleanup = () => {
      try {
        cropper?.destroy();
      } catch {
        /* noop */
      }
      cropper = null;
      URL.revokeObjectURL(url);
      root.remove();
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(() => {
          cleanup();
          reject(new DOMException('User cancelled', 'AbortError'));
        });
      }
    };
    document.addEventListener('keydown', onKey);

    const closeReject = () => {
      finish(() => {
        cleanup();
        reject(new DOMException('User cancelled', 'AbortError'));
      });
    };

    btnCancel.addEventListener('click', closeReject);
    root.addEventListener('click', (e) => {
      if (e.target === root) closeReject();
    });

    btnOk.addEventListener('click', () => {
      if (!cropper) return;
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 2048,
        maxHeight: 2048,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });
      if (!canvas) {
        closeReject();
        return;
      }
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            closeReject();
            return;
          }
          finish(() => {
            cleanup();
            resolve(blob);
          });
        },
        'image/jpeg',
        0.9
      );
    });

    img.addEventListener('load', () => {
      if (done) return;
      cropper = new Cropper(img, {
        aspectRatio: Number.isFinite(aspectRatio) ? aspectRatio : NaN,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.92,
        responsive: true,
        background: false,
        movable: true,
        zoomable: true
      });
    });

    img.addEventListener('error', () => {
      finish(() => {
        cleanup();
        reject(new Error('No se pudo cargar la imagen.'));
      });
    });
  });
}
