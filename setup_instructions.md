# Galaxy Codex Setup Instructions

Please perform the following setup steps on the target server (Raspberry Pi 5 / Linux):

## 1. System Dependencies
Ensure Node.js (v18+) and Nginx are installed.

```bash
sudo apt update
sudo apt install -y nodejs npm nginx
```

## 2. Project Scaffolding
Initialize the Vite project and install dependencies.

```bash
# Create project if it doesn't exist
npm create vite@latest galaxy-codex -- --template react

cd galaxy-codex

# Install frontend dependencies
npm install
npm install three @react-three/fiber @react-three/drei react-force-graph-3d zustand axios react-markdown

# Install backend dependencies
npm install express cors dotenv @google/generative-ai
```

## 3. Nginx Configuration
Configure Nginx to serve the frontend and reverse proxy the backend API.

Create/Edit `/etc/nginx/sites-available/galaxy-codex`:

```nginx
server {
    listen 80;
    server_name galaxy.local; # Or your IP/Domain

    location / {
        proxy_pass http://localhost:5173; # Vite Dev Server
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001; # Express Backend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/galaxy-codex /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## 4. Running the App
You will need two terminal sessions (or PM2):
1. Frontend: `npm run dev -- --host`
2. Backend: `node server.js`

