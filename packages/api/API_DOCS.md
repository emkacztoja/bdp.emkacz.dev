# API Endpoints

Base: /api

Auth
- POST /api/auth/login
  - body: { email, password }
  - sets HttpOnly cookie `__session`
- POST /api/auth/logout
  - clears cookie

Users (ADMIN only)
- GET /api/users
- POST /api/users
  - body: { email, password, role }

Bots
- GET /api/bots
- POST /api/bots
  - body: { name, token }
  - creates bot, stores encrypted token
- GET /api/bots/:id
- DELETE /api/bots/:id

Messages
- POST /api/messages
  - body: { botId, channelId, content, guildId? }
  - enqueues a message job; creates MessageLog

Notes
- All endpoints require authentication (except health and login). Use cookie-based sessions (HttpOnly).
- Ensure `ENCRYPTION_KEY` and `JWT_SECRET` are set in environment.

