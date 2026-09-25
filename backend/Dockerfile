# Image de développement pour le backend Django (DocuGen)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Dépendances système : compilation éventuelle + client PostgreSQL (psql, pg_isready)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        postgresql-client \
        git \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation des dépendances Python (couche cachée tant que requirements ne bouge pas)
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Le code est monté en volume par docker-compose en développement.
COPY . .

EXPOSE 8000

# Attend PostgreSQL, applique les migrations puis démarre le serveur de dev.
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
