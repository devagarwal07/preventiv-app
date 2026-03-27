#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="/tmp/prevntiv-${TIMESTAMP}.sql.gz"

pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"
mc cp "${BACKUP_FILE}" "local/backups/prevntiv-${TIMESTAMP}.sql.gz"

mc ls local/backups | awk '{print $6}' | sort | head -n -7 | while read -r old_file; do
  if [[ -n "${old_file}" ]]; then
    mc rm "local/backups/${old_file}"
  fi
done

echo "Backup completed: ${BACKUP_FILE}"
