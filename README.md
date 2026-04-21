# Portal Node App

A full-stack Case Management Portal built with Node.js, Express, MongoDB, and vanilla JavaScript.

The app supports case tracking, hearing scheduling, and document upload workflows with a judicial-style dashboard UI.

## Features

- Dashboard with live counts and recent activity
- Case management:
  - list, filter, search, create
- Hearing management:
  - list view and calendar view
  - add hearings from case detail
- Document management:
  - list, filter, upload by case
- Case detail view with tabs for:
  - case info
  - hearings
  - documents
- MongoDB-backed persistence (new records are saved)

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Multer (file uploads)
- Vanilla HTML/CSS/JS frontend modules

## Project Structure

```text
portal-node-app/
├── server.js
├── package.json
├── .env.example
├── pages/
├── public/
│   ├── css/
│   └── js/
├── server/
│   ├── config/
│   ├── models/
│   └── routes/
└── uploads/
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

- Copy `.env.example` to `.env`.
- Fill in a password-protected MongoDB connection string.

```env
PORT=3000
NODE_ENV=development
REQUIRE_MONGO_AUTH=true

# Local MongoDB with authentication enabled
# MONGODB_URI=mongodb://portal_user:REPLACE_WITH_STRONG_PASSWORD@127.0.0.1:27017/portal_node_app?authSource=admin

# Atlas / hosted MongoDB
MONGODB_URI=mongodb+srv://portal_user:REPLACE_WITH_STRONG_PASSWORD@cluster0.example.mongodb.net/portal_node_app?retryWrites=true&w=majority
```

3. Start the server:

```bash
npm run dev
```

For production:

```bash
npm start
```

5. Run a security scan before pushing code:

```bash
npm run security:scan
```

6. Enable the automatic pre-push hook (one-time local setup):

```bash
git config core.hooksPath .githooks
```

4. Open in browser:

```text
http://127.0.0.1:3000
```

## API Endpoints

### Cases

- `GET /api/cases`
- `POST /api/cases`
- `GET /api/cases/:id`

### Hearings

- `GET /api/hearings`
- `POST /api/hearings`

### Documents

- `GET /api/documents`
- `POST /api/documents`

## Screenshots

Add your screenshots to:

- `docs/screenshots/`

Then reference them here, for example:

```md
![Dashboard](docs/screenshots/dashboard.png)
![Cases](docs/screenshots/cases.png)
![Case Detail](docs/screenshots/case-detail.png)
```

## Notes

- `uploads/` is ignored by git in `.gitignore`.
- `.env` and `.env.*` are ignored; never commit secrets.
- Password-protected MongoDB is enforced by default via `REQUIRE_MONGO_AUTH=true`.
- If you intentionally run local MongoDB without auth for temporary testing, set `REQUIRE_MONGO_AUTH=false` only in local `.env`.
- If MongoDB is not running, API routes will fail to connect.
- For production, add authentication, RBAC, validation, and pagination.
