.PHONY: install dev build start db-push db-migrate db-generate lint

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm start

db-push:
	npx prisma db push

db-migrate:
	npx prisma migrate dev

db-generate:
	npx prisma generate

lint:
	npm run lint
