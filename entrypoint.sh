#!/bin/sh

# Wait for the database to be ready
echo "Waiting for PostgreSQL to start..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "PostgreSQL started"

# Initialize the database if needed
echo "Initializing database if needed..."
python -c "
from main import app, initialize_default_data
with app.app_context():
    initialize_default_data()
"

# Start the application
echo "Starting application..."
exec "$@"