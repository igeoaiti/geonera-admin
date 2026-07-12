/**
 * Centralised external-service URL config.
 *
 * All values come from Vite env vars (prefix VITE_) so they are bundled
 * at build time and safe to expose in the browser.  Each falls back to
 * the canonical public domain if the env var is not set.
 *
 * To override for local LAN access create a .env file (see .env.example).
 */

export const JAEGER_URL =
  import.meta.env.VITE_JAEGER_URL ?? 'https://geonera-jaeger.sanjari.my.id'

export const GRAFANA_URL =
  import.meta.env.VITE_GRAFANA_URL ?? 'https://geonera-grafana.sanjari.my.id'

export const PROMETHEUS_URL =
  import.meta.env.VITE_PROMETHEUS_URL ?? 'https://geonera-prometheus.sanjari.my.id'

export const RABBITMQ_URL =
  import.meta.env.VITE_RABBITMQ_URL ?? 'https://geonera-rabbitmq.sanjari.my.id'

/** MinIO web console (port 9001). */
export const MINIO_URL =
  import.meta.env.VITE_MINIO_URL ?? 'https://geonera-minio.sanjari.my.id'

/** MinIO S3 API endpoint (port 9000) — used for direct bucket/object access. */
export const MINIO_API_URL =
  import.meta.env.VITE_MINIO_API_URL ?? 'https://geonera-minio-api.sanjari.my.id'

export const PORTAINER_URL =
  import.meta.env.VITE_PORTAINER_URL ?? 'https://portainer.sanjari.my.id'

/** Public URL of the admin frontend itself (for sharing deep-links). */
export const ADMIN_URL =
  import.meta.env.VITE_ADMIN_URL ?? 'https://geonera.sanjari.my.id'
