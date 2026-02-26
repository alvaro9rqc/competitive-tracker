#!/bin/bash
cd "$(dirname "$0")"

if [ ! -f "upsolving.db" ]; then
    echo "Initializing database..."
    npm run init-db
    echo "Importing existing YAML data..."
    node src/db/import_yaml.js
fi

echo "Starting Upsolving System..."
npm run dev
