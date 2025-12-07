# BetterDiscordPanel (bdp.emkacz.dev)

Minimal full-stack self-hosted dashboard to manage Discord bots, send messages, and view basic guild info.

Components
- API: packages/api (Express + TypeScript + Prisma)
- Worker: packages/worker (BullMQ + discord.js)
- Web: packages/web (React + Vite + TypeScript)
- Postgres, Redis via docker-compose
- Nginx Proxy Manager (external) to provide TLS for bdp.emkacz.dev and api.bdp.emkacz.dev

Quick start (local/dev)
1. Copy `.env.example` to `.env` and fill values. For quick dev you can use the example values.
2. Start services:

```bash
# from repo root
docker-compose up -d
# generate prisma client and run migrations if needed from api container
docker compose exec api npm run prisma:generate
# create admin
docker compose run --rm api npm run seed:admin
```

3. Open web UI: http://localhost:5173 (or configure Nginx Proxy Manager to serve https://bdp.emkacz.dev)

Nginx Proxy Manager setup
- Create Proxy Host for `bdp.emkacz.dev` -> forward to `web:80`, enable Websockets, block common exploits, request Let's Encrypt cert, enable Force SSL.
- Create Proxy Host for `api.bdp.emkacz.dev` -> forward to `api:3000`, enable Websockets (if using), request Let's Encrypt cert, enable Force SSL.
- Ensure NPM is attached to the same Docker `proxy` network so it can resolve container names.

Important env vars (see .env.example)
- ENCRYPTION_KEY: base64:... (must be 32 bytes when decoded)
- JWT_SECRET: for session signing
- DATABASE_URL: postgres connection string
- REDIS_URL: redis connection string
- SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD: used by the seed script

Security notes
- Bot tokens are encrypted at rest using AES-256-GCM with ENCRYPTION_KEY.
- Use strong, unique ENCRYPTION_KEY and JWT_SECRET in production.
- Do not expose API or worker ports publicly; let Nginx Proxy Manager handle public 80/443.

Next steps / TODOs
- Implement guilds/members caching endpoints and refresh logic.
- Implement frontend pages for adding bots, bot details, messaging composer.
- Add rate-limiting, login attempt throttling, and CSRF protections.
- Add tests for auth and messaging flows.


