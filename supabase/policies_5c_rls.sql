-- Fase 5C — Las políticas RLS y funciones `app_*` están integradas al final de `schema.sql`
-- para mantener una sola fuente de verdad. Si ya ejecutaste un `schema.sql` antiguo,
-- vuelve a correr el archivo completo actualizado en el SQL Editor o diff por secciones
-- (funciones, seeds, policies, trigger `tr_users_priv`).

select 1 as note_read_docs_in_schema_sql;
