# Plan por fases: mapa en vivo, ventas, landing

Documento de referencia acordado con el negocio. Avanzar fase a fase solo cuando los **criterios de prueba** de la fase actual estén cumplidos.

## Fase A — Fundamentos: reservas por día + calendario

**Objetivo:** Modelo único: cada reserva de mesa va ligada a una **fecha** (día/mes/año). El calendario selecciona el día; el mapa y listados leen **ese** día.

**Incluye:** entidad `MesaReserva` en Data Connect, consultas por `fechaDia` (ISO `YYYY-MM-DD`, zona `America/Mexico_City` en app), UI en `/reservar` con selector de fecha y mapa alineado al editor.

**Criterios para pasar a B:** varias reservas el mismo día; cambiar de día no mezcla datos; prueba límite de medianoche con la zona acordada.

## Fase B — Mapa en vivo (WebSocket / tiempo real)

**Objetivo:** Sincronizar cambios de reservas (y del editor) en tiempo real entre clientes.

**Criterios:** dos navegadores, misma fecha, una reserva actualiza al otro sin recargar.

## Fase C — Ciclo de vida por día (escaneo → ocupada → vencida)

**Objetivo:** Escaneo marca ocupación; cierre del día vence reservas no usadas.

**Criterios:** escanear actualiza estado; día siguiente archiva/vence las de ayer.

## Fase D — Panel de ventas (caja rápida)

**Objetivo:** Rol de ventas, POS, métodos efectivo / transferencia / terminal.

**Criterios:** solo permisos correctos; venta registrada end-to-end.

## Fase E — `/home` sin mensajes internos para el público

**Objetivo:** Textos tipo “editable desde panel” solo para admin / jefe / programador.

---

## Estado de implementación

| Fase | Estado |
|------|--------|
| A | Modelo `MesaReserva` + UI `/reservar` (calendario por día, mapa coloreado). Validar contra Postgres en Supabase (`mesa_reservas` + RLS). |
| B–E | Pendiente |
