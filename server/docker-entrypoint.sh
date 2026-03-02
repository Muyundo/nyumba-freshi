#!/bin/sh
set -e

if [ -n "${DB_HOST}" ]; then
  echo "Waiting for DB at ${DB_HOST}:${DB_PORT:-3306}..."
  while ! nc -z "$DB_HOST" "${DB_PORT:-3306}"; do
    echo "Waiting for DB..."
    sleep 1
  done
fi

exec node src/index.js
