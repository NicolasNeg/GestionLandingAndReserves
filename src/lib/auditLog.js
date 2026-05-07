import { getCurrentUser } from './authProvider.js';
import {
  createAuditEvent,
  listAuditEvents as listAuditEventsData,
  listAuditEventsForEntity as listAuditEventsForEntityData
} from './supabaseData.js';

export async function logAuditEvent(event = {}) {
  try {
    const user = getCurrentUser();
    await createAuditEvent({
      actorUserId: event.actorUserId || user?.id || user?.uid || null,
      actorEmail: event.actorEmail || user?.email || '',
      eventType: event.eventType || 'system_event',
      entityType: event.entityType || null,
      entityId: event.entityId || null,
      severity: event.severity || 'info',
      title: event.title || 'Evento',
      description: event.description || '',
      metadata: event.metadata || {}
    });
  } catch (error) {
    console.warn('[audit-log]', error?.message || error);
  }
}

export async function listAuditEvents(filters = {}) {
  return listAuditEventsData(filters);
}

export async function listAuditEventsForEntity(entityType, entityId, limit = 30) {
  return listAuditEventsForEntityData({ entityType, entityId, limit });
}

export function formatAuditEventHuman(event = {}) {
  const title = String(event.title || 'Evento');
  const description = String(event.description || '').trim();
  const actor = String(event.actor_email || event.actorEmail || '').trim();
  const when = event.created_at || event.createdAt;
  return {
    title,
    description: description || 'Sin descripción.',
    actor: actor || 'Sistema',
    whenLabel: when ? new Date(when).toLocaleString('es-MX') : 'Ahora',
    severity: String(event.severity || 'info')
  };
}

