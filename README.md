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
├── .env
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

2. Configure environment variables in `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/portal_node_app
```

3. Start the server:

```bash
npm start
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
- If MongoDB is not running, API routes will fail to connect.
- For production, add authentication, RBAC, validation, and pagination.
