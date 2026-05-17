import { navigateTo } from '../router.js';
import { getUserAccess } from '../lib/accessControl.js';
import { getCurrentUser } from '../lib/authProvider.js';
import { mountParkingWorkerApp } from '../react/parkingWorkerMount.tsx';

let destroyWorker = null;

const ParkingOperacion = {
  render: () => `
    <div class="flex min-h-[calc(100vh-92px)] flex-col bg-[#0f172a]">
      <div id="parking-worker-root" class="min-h-0 flex-1"></div>
    </div>
  `,

  mount: async () => {
    const host = document.getElementById('parking-worker-root');
    if (!host) return;

    const access = await getUserAccess(getCurrentUser());
    if (!access.can('parking.manage') && !access.can('admin.panel') && !access.isProgramador) {
      host.innerHTML =
        '<p class="p-6 text-center text-sm text-rose-300">Sin permiso de estacionamiento.</p>';
      return;
    }

    const mounted = mountParkingWorkerApp(host, {
      onBack: () => navigateTo('/operacion')
    });
    destroyWorker = mounted.destroy;
  },

  unmount: () => {
    if (destroyWorker) {
      destroyWorker();
      destroyWorker = null;
    }
  }
};

export default ParkingOperacion;
