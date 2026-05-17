import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ParkingWorkerApp } from '../aquamap/ParkingWorkerApp';

export function mountParkingWorkerApp(host: HTMLElement, options: { onBack?: () => void } = {}) {
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      <StrictMode>
        <ParkingWorkerApp onBack={options.onBack} />
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
