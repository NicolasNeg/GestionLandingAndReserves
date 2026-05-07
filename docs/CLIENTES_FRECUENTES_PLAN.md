# Clientes Frecuentes — Plan Base

## 1) Definición
Cliente frecuente es el usuario que regresa de forma recurrente y acumula visitas/compras verificables.

## 2) Niveles sugeridos
- **Visitante**: 0–1 visitas
- **Frecuente**: 2–4 visitas
- **VIP**: 5–9 visitas
- **Embajador**: 10+ visitas

## 3) Beneficios futuros
- Descuentos exclusivos por nivel
- Acceso rápido en entrada
- Promociones de cumpleaños
- Prioridad en mesas/zonas
- Paquetes especiales para recurrentes

## 4) Datos disponibles hoy
- Tickets comprados (`tickets`)
- Tickets usados / escaneados (`estado_ticket`, `fecha_escaneo`)
- Reservas de mesa (`mesa_reservas`)
- Gasto aproximado por usuario (sumatoria de `precio_total`)

## 5) Datos futuros recomendados
- Fecha de cumpleaños
- Preferencias de compra
- Tamaño/frecuencia de visitas familiares
- Historial de productos/servicios adicionales

## 6) Features potenciales
- Cupones automáticos por hitos
- Sistema de puntos y canje
- Membresías mensuales/anuales
- Referidos con recompensa
- Ranking VIP / Embajador con perks progresivos

## 7) Riesgos y consideraciones
- Privacidad y minimización de datos personales
- Reglas de descuentos (evitar doble beneficio involuntario)
- Prevención de fraude/abuso en acumulación
- Revisión de RLS para lecturas y agregados

