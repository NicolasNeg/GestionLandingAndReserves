import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ParkingLayoutEditorApp } from '../aquamap/ParkingLayoutEditorApp';

export function mountParkingLayoutEditorApp(host: HTMLElement) {
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      <StrictMode>
        <ParkingLayoutEditorApp />
      </StrictMode>
    );
  });
  return {
    destroy: () => {
      root.unmount();
      host.innerHTML = '';
    }
  };
}
