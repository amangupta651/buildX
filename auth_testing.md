# Auth Testing Playbook

## MongoDB
mongosh; use virtual_startup_db; db.users.find({role: "admin"}).pretty()

## API
1. Register: POST /api/auth/register { email, password, name }
2. Login: POST /api/auth/login (sets access_token + refresh_token httpOnly cookies)
3. Me: GET /api/auth/me  (using cookie or Bearer token)
4. Logout: POST /api/auth/logout

Admin: admin@launchpad.dev / LaunchPad2026!
