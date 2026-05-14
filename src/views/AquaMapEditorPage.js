import { mountAquaMapEditor } from '../react/aquaMapMount.tsx';

let destroy = () => {};

export default {
  render() {
    return `
      <div class="aquamap-editor-route w-full overflow-hidden bg-slate-950">
        <div id="aquamap-editor-root" class="h-[calc(100vh-4rem)] w-full"></div>
      </div>
    `;
  },
  mount() {
    const host = document.getElementById('aquamap-editor-root');
    if (!host) return;
    destroy = mountAquaMapEditor(host);
  },
  unmount() {
    try {
      destroy();
    } catch (_) {
      /* ignore */
    }
    destroy = () => {};
  }
};
