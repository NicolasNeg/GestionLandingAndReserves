/**
 * Recuperación de contraseña / enlaces de auth: mode y oobCode suelen ir en query o en el hash.
 */
export function getAuthActionParams() {
    const q = new URLSearchParams(window.location.search);
    let mode = q.get('mode');
    let oobCode = q.get('oobCode');

    if (!oobCode && window.location.hash && window.location.hash.length > 1) {
        const raw = window.location.hash.slice(1);
        const queryPart = raw.includes('?') ? raw.split('?')[1] : raw;
        if (queryPart && queryPart.includes('=')) {
            const hq = new URLSearchParams(queryPart);
            mode = mode || hq.get('mode');
            oobCode = oobCode || hq.get('oobCode');
        }
    }

    return { mode, oobCode };
}
