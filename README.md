🇪🇸 [Leer en Español](README-es.md)

# MC Servers — Live Status Panel

Welcome to **MC Servers**! This is a complete project (Frontend + Backend) designed so anyone can manage and display the status of their Minecraft servers on the internet in a comfortable and simple way.

## 🚀 Key Features

- **Public Panel:** Display your Minecraft servers (Java and Bedrock) with their live status, clean MOTD, icon, and online player count.
- **Admin Dashboard:** A password-protected dashboard to easily add, edit, or remove servers.
- **Private Servers:** Ability to hide a server's IP behind a password. Perfect for servers among friends!
- **Built-in Database:** Uses SQLite to store information, no need to configure heavy database engines.
- **Docker Ready:** The entire project (React/Vite Frontend and Express Backend) is Dockerized and ready to use via the image uploaded to my Docker Hub. Links are specified further down in this document.

## 🐳 Deployment with Docker

The easiest way to deploy this project is using Docker Compose.

### 1. Download the image
You can download the pre-built image from my Docker Hub profile:
```bash
docker pull zurupe/mcservers:latest
```

### 2. Run with Docker Compose
Create a `docker-compose.yml` file on your server with the following content:

```yaml
services:
  app:
    image: zurupe/mcservers:latest
    container_name: mcserver-app
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      # Credentials for the Admin Dashboard
      ADMIN_USERNAME: your_secure_username
      ADMIN_PASSWORD: your_secure_password
      # Secret for JWT (Change this to a long random string)
      JWT_SECRET: my_super_secure_secret_123
      # Database path inside the container
      DB_PATH: /app/data/database.sqlite
    volumes:
      # Volume to persist servers if the container restarts
      - mcserver-data:/app/data

volumes:
  mcserver-data:
```

Then, simply run:
```bash
docker compose up -d
```
Your application will be available at `http://localhost:3001`.

## 🛠️ Local Development

If you prefer to run or modify it locally, you can clone the repository and run it without Docker:

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the Backend server:**
   ```bash
   node server/index.js
   ```
3. **Start the Frontend server (in another terminal):**
   ```bash
   npm run dev
   ```

*Note: By default, the local admin username and password are `admin` / `admin`.*

## 🔒 Security
- **JWT Protection:** The API is protected using tokens.
- **Encryption:** Passwords (both for panel access and to unlock private server IPs) are hashed using `bcrypt`.
- **Container Health:** Includes a `/api/health` endpoint for Docker monitoring.

---
## 📝 License and Commercial Use

This project is distributed under the **PolyForm Noncommercial License 1.0.0**. You can check the [LICENSE](LICENSE) file for more details.

**This project is free to use for personal servers, communities, and non-profit purposes.**

For commercial uses, integration into hosting companies, resale, or any form of direct monetization of the software, please contact me to acquire a commercial license.

---
*Developed for the Minecraft community.*

**Att: ZhuruServices https://zurupe.github.io/LandingPage/**
