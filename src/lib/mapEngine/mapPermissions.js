export function canEditParking(access) {
  return Boolean(access?.isProgramador || access?.can?.('parking.manage'));
}

export function canEditLandingMaps(access) {
  return Boolean(
    access?.isProgramador ||
    access?.can?.('landing.manage') ||
    access?.can?.('admin.panel') ||
    access?.can?.('dashboard.manage')
  );
}

