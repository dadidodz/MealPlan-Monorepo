#!/bin/sh
# One-shot migration job (the `migrate` image): dumps the database when migrations are pending, then applies them.
# Needs DATABASE_URL, and a /backups volume for the dumps. Exits non-zero on any failure, so compose doesn't start
# the API (`depends_on: condition: service_completed_successfully`).
set -eu

KEEP_DUMPS=5
PRISMA=node_modules/.bin/prisma

if "$PRISMA" migrate status > /tmp/migrate-status.txt 2>&1; then
    echo "Database schema is up to date: nothing to migrate."
    exit 0
fi

# Non-zero status = pending migrations, or the database can't be read: show why, the dump or the deploy will fail
# loudly in the second case
cat /tmp/migrate-status.txt

if [ ! -d /backups ]; then
    echo "No /backups volume mounted: refusing to migrate without a dump." >&2
    exit 1
fi
if [ ! -w /backups ]; then
    echo "/backups is not writable by uid $(id -u) (the image runs as 'node'): chown the host folder to $(id -u)." >&2
    exit 1
fi

# Prisma URLs may carry `?schema=...`, which pg_dump rejects
dump_url="${DATABASE_URL%%\?*}"
dump_file="/backups/pre-migration-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
echo "Dumping the database to $dump_file"
# A failed dump leaves no partial file behind (it would count among the dumps kept)
if ! pg_dump --no-owner --compress=gzip --dbname="$dump_url" --file="$dump_file"; then
    rm -f "$dump_file"
    exit 1
fi

# Keep the newest dumps only
ls -1t /backups/pre-migration-*.sql.gz | tail -n +$((KEEP_DUMPS + 1)) | xargs -r rm --

"$PRISMA" migrate deploy
