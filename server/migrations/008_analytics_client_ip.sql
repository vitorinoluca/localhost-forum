-- IP por visita (dedupe por ventana configurable en el servidor)
alter table analytics_visits add column if not exists client_ip inet;

create index if not exists analytics_visits_client_ip_created_idx
  on analytics_visits (client_ip, created_at desc);
