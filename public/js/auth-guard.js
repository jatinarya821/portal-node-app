import { requireAuth } from '/public/js/auth-client.js'

// This guard is async — it checks the server session, not just localStorage.
requireAuth()
