#!/usr/bin/env bash
set -e

echo "==> Applying migrations"
python manage.py makemigrations core documents onlineforms --noinput || true
python manage.py migrate --noinput

echo "==> Collecting static files"
python manage.py collectstatic --noinput || true

echo "==> Ensuring superuser exists"
python manage.py shell <<'PY'
import os
from django.contrib.auth import get_user_model
U = get_user_model()
u = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
e = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@example.com")
p = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin")
if not U.objects.filter(username=u).exists():
    U.objects.create_superuser(u, e, p)
    print(f"   created superuser {u}")
else:
    print("   superuser already present")
PY

echo "==> Seeding demo data (idempotent)"
python manage.py seed_demo || true

echo "==> Starting server on :8000"
if [ "${DJANGO_DEBUG:-1}" = "1" ]; then
    exec python manage.py runserver 0.0.0.0:8000
else
    exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
fi
