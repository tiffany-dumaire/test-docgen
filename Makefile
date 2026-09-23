.PHONY: venv deps env migrate data user backend frontend start

venv:
	python3 -m venv backend/.venv

deps:
	backend/.venv/bin/pip install -r backend/requirements.txt

env:
	cp backend/.env.example backend/.env

migrate:
	cd backend && .venv/bin/python manage.py migrate

data:
	cd backend && .venv/bin/python manage.py seed_data
	cd backend && .venv/bin/python manage.py seed_data --demo

user:
	cd backend && .venv/bin/python manage.py createsuperuser

backend: venv deps env migrate data
	cd backend && .venv/bin/python manage.py runserver

frontend:
	cd frontend && npm install
	cd frontend && npm start

start:
	make backend & make frontend & wait
