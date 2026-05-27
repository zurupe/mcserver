# MC Servers — Panel de Estado en Vivo

¡Bienvenido a **MC Servers**! Este es un proyecto completo (Frontend + Backend) diseñado para que cualquier persona pueda administrar y mostrar el estado de sus servidores de Minecraft en internet de forma elegante y segura.

## 🚀 Características Principales

- **Panel Público:** Muestra tus servidores de Minecraft (Java y Bedrock) con su estado en vivo, MOTD limpio, icono y número de jugadores conectados.
- **Panel de Administración:** Un dashboard protegido por contraseña para añadir, editar o eliminar servidores fácilmente.
- **Servidores Privados:** Posibilidad de ocultar la IP de un servidor detrás de una contraseña. ¡Ideal para servidores entre amigos!
- **Base de Datos Integrada:** Utiliza SQLite para almacenar la información, sin necesidad de configurar motores de bases de datos pesados.
- **Listo para Docker:** Todo el proyecto (Frontend en React/Vite y Backend en Express) está empaquetado en un entorno Docker multistage, listo para subir y desplegar en un solo comando.

## 🐳 Despliegue con Docker (Recomendado)

La forma más fácil de desplegar este proyecto es utilizando Docker. 

### 1. Descargar la imagen
Puedes descargar la imagen preconstruida desde Docker Hub usando la cuenta `zurupe`:
```bash
docker pull zurupe/mis-servidores:latest
```

### 2. Ejecutar con Docker Compose
Crea un archivo `docker-compose.yml` en tu servidor con el siguiente contenido:

```yaml
services:
  app:
    image: zurupe/mis-servidores:latest
    container_name: mcserver-app
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      # Credenciales para el Panel de Administración
      ADMIN_USERNAME: tu_usuario_seguro
      ADMIN_PASSWORD: tu_password_seguro
      # Secreto para JWT (Cámbialo por una cadena aleatoria larga)
      JWT_SECRET: mi_secreto_super_seguro_123
      # Ruta de la base de datos dentro del contenedor
      DB_PATH: /app/data/database.sqlite
    volumes:
      # Volumen para persistir los servidores si el contenedor se reinicia
      - mcserver-data:/app/data

volumes:
  mcserver-data:
```

Luego, simplemente ejecuta:
```bash
docker compose up -d
```
Tu aplicación estará disponible en `http://tu-ip:3001`.

## 🛠️ Desarrollo Local

Si prefieres ejecutarlo o modificarlo localmente sin Docker:

1. **Instala las dependencias:**
   ```bash
   npm install
   ```
2. **Inicia el servidor Backend:**
   ```bash
   node server/index.js
   ```
3. **Inicia el servidor Frontend (en otra terminal):**
   ```bash
   npm run dev
   ```

*Nota: Por defecto, el usuario y contraseña de administración local son `admin` / `admin`.*

## 🔒 Seguridad
- **Protección JWT:** La API está protegida mediante tokens.
- **Encriptación:** Las contraseñas (tanto de acceso al panel como contraseñas para desbloquear IPs de servidores privados) están hasheadas utilizando `bcrypt`.
- **Salud del contenedor:** Incluye un endpoint `/api/health` para el monitoreo de Docker.

---
*Desarrollado para la comunidad de Minecraft.*
