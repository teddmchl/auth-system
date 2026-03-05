# Auth/Sys — Production JWT Auth System

Full-stack authentication with access tokens, refresh token rotation, RBAC, and a race-condition-safe Axios interceptor queue.

**Stack:** React + Vite · Express · MongoDB · JWT · IBM Plex Mono

---

## Features

| Feature | Detail |
|---|---|
| Register / Login / Logout | Bcrypt password hashing, rate limiting on auth routes |
| Access tokens | Short-lived JWT (15m), sent in `Authorization` header |
| Refresh tokens | Long-lived JWT (7d), stored in **httpOnly cookie** + DB |
| Token rotation | Each refresh issues a new refresh token, old one deleted |
| Reuse detection | Reused refresh token revokes *all* sessions for that user |
| Race-condition-safe refresh | Promise queue — N simultaneous 401s produce exactly 1 `/refresh` call |
| RBAC | `user` · `moderator` · `admin` with hierarchy middleware |
| Password reset | Email link with hashed token, 1-hour expiry |
| Logout all devices | Wipes every refresh token for the user from DB |
| Session restore | Silent refresh on page load via cookie |

---

## Project Structure

```
auth-system/
├── server/
│   ├── models/
│   │   ├── User.js           # bcrypt pre-save, password hidden by default
│   │   └── RefreshToken.js   # TTL index for auto-expiry in MongoDB
│   ├── middleware/
│   │   ├── auth.js           # requireAuth — verifies access token
│   │   └── requireRole.js    # requireRole / requireMinRole — RBAC
│   ├── routes/
│   │   ├── auth.js           # register, login, logout, refresh, forgot/reset
│   │   └── protected.js      # demo routes gated by role
│   ├── utils/
│   │   ├── tokens.js         # generateAccessToken, generateRefreshToken, etc.
│   │   └── email.js          # Nodemailer wrapper for password reset
│   └── server.js
│
└── client/
    └── src/
        ├── api/
        │   └── axios.js      # ⭐ Race-condition-safe interceptor queue
        ├── contexts/
        │   └── AuthContext.jsx  # Global auth state + login/logout/register
        ├── components/
        │   └── ProtectedRoute.jsx  # ProtectedRoute, RoleGate, RequireRole
        └── pages/
            ├── Login.jsx
            ├── Register.jsx       # with live password strength meter
            ├── ForgotPassword.jsx
            ├── ResetPassword.jsx
            ├── Dashboard.jsx      # shows role gates, token, session info
            ├── AdminPanel.jsx     # user list + live role editing
            └── ModeratorPanel.jsx
```

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally (or Atlas URI)
- SMTP credentials (Mailtrap.io works for dev — free tier)

### Server

```bash
cd server
npm install
cp .env.example .env
# Fill in MONGODB_URI, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, SMTP_*

npm run dev   # http://localhost:4000
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Client

```bash
cd client
npm install
npm run dev   # http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:4000` automatically.

---

## API Reference

### Auth endpoints

```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login → access token + cookie
POST   /api/auth/refresh           Rotate refresh token (cookie) → new access token
POST   /api/auth/logout            Revoke current refresh token
POST   /api/auth/logout-all        Revoke ALL refresh tokens for user (requires auth)
GET    /api/auth/me                Get current user (requires auth)
POST   /api/auth/forgot-password   Send reset email
POST   /api/auth/reset-password/:token   Set new password
```

### Protected demo endpoints

```
GET    /api/protected/dashboard           any authenticated user
GET    /api/protected/moderator           moderator+
GET    /api/protected/admin               admin only
GET    /api/protected/admin/users         admin only — list all users
PATCH  /api/protected/admin/users/:id/role  admin only — change role
```

---

## The Race Condition Problem

### What breaks without the queue

Access tokens expire every 15 minutes. When a user's token expires mid-session, every in-flight request gets a 401. Without the queue:

```
Request A  → 401  → calls /refresh  → gets new token
Request B  → 401  → calls /refresh  → FAILS (old refresh token already rotated)
Request C  → 401  → calls /refresh  → FAILS
```

Result: the user gets randomly logged out even though their session was valid.

### How the queue fixes it

```
Request A  → 401  → isRefreshing = true  → calls /refresh
Request B  → 401  → isRefreshing = true  → pushed to failedQueue (waiting)
Request C  → 401  → isRefreshing = true  → pushed to failedQueue (waiting)

/refresh succeeds → new token stored
→ flushQueue(null, newToken)  → B and C retry with new token  ✓
→ isRefreshing = false
```

Only **one** refresh call ever happens per expiry cycle, regardless of how many requests were in flight.

### Key implementation detail

```js
// client/src/api/axios.js

if (isRefreshing) {
  // Don't call /refresh — queue this request instead
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  }).then(token => {
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return api(originalRequest);
  });
}
```

---

## RBAC Architecture

### Server — two middleware options

```js
// Exact role match
requireRole("admin")                    // admin only
requireRole("admin", "moderator")       // either role

// Hierarchical (user < moderator < admin)
requireMinRole("moderator")             // moderator AND admin pass
```

### Client — two component options

```jsx
// Full-page redirect if insufficient role
<RequireRole minRole="moderator">
  <ModeratorPanel />
</RequireRole>

// Render alternative content inline
<RoleGate minRole="admin" fallback={<LockedZone />}>
  <AdminLink />
</RoleGate>
```

---

## Deployment

### Frontend → Vercel
```bash
cd client
npm run build
vercel --prod
```
Set `VITE_API_URL` in Vercel env vars if not using the proxy.

### Backend → Render
1. Connect GitHub repo
2. Build command: `npm install`
3. Start command: `node server.js`
4. Add all env vars from `.env.example`
5. Set `CLIENT_URL` to your Vercel frontend URL

---

## Dev Log Talking Points

**"Token refresh race conditions and how I solved them"**

1. Describe the problem — user gets logged out randomly after 15 minutes
2. Why naive implementations fail — multiple 401s → multiple /refresh calls → token rotation kills them
3. The promise queue pattern — one refresh, many waiters
4. Why refresh tokens need DB storage (not just JWT verification) — enables revocation
5. The reuse detection trap — if someone steals your refresh token and uses it, the legitimate user's next request triggers a full session wipe
6. httpOnly cookie vs localStorage — cookies aren't accessible to XSS, localStorage is
7. Token rotation vs sliding sessions — rotation gives you a clear audit trail
