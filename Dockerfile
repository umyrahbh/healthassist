FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV FLASK_APP=main.py
ENV FLASK_ENV=production

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev netcat-openbsd && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml first
COPY pyproject.toml .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir ".[all]" && \
    pip install --no-cache-dir gunicorn==23.0.0

# Copy project files
COPY . .

# Create directory for saving fallback emails
RUN mkdir -p emails && chmod 777 emails

# Create uploads directory for images
RUN mkdir -p uploads && chmod 777 uploads

# Make the entrypoint script executable
RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 5000

# Set the entrypoint script
ENTRYPOINT ["./entrypoint.sh"]

# Command to run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--reuse-port", "--workers", "4", "main:app"]