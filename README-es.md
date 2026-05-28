🇺🇸 [Read in English](README.md)

# MC Servers — Panel de Estado en Vivo
¡Bienvenido a **MC Servers**! Este es un proyecto completo (Frontend + Backend) diseñado para que cualquier persona pueda administrar y mostrar el estado de sus servidores de Minecraft en internet de forma comoda y simple.

## 🚀 Características Principales

- **Panel Público:** Muestra tus servidores de Minecraft (Java y Bedrock) con su estado en vivo, MOTD limpio, icono y número de jugadores conectados.
- **Panel de Administración:** Un dashboard protegido por contraseña para añadir, editar o eliminar servidores fácilmente.
- **Servidores Privados:** Posibilidad de ocultar la IP de un servidor detrás de una contraseña. ¡Ideal para servidores entre amigos!
- **Base de Datos Integrada:** Utiliza SQLite para almacenar la información, sin necesidad de configurar motores de bases de datos pesados.
- **Dockerizado:** Todo el proyecto (Frontend en React/Vite y Backend en Express) está dockerizado y listo para usar a travez de la imagen subida mi dockerhub, más adelante en el documento se especifica los links.

## 🐳 Despliegue con Docker

La forma más fácil de desplegar este proyecto es utilizando DockerCompose. 

### 1. Descargar la imagen
Puedes descargar la imagen preconstruida desde mi perfil en Docker Hub:
```bash
docker pull zurupe/mcservers:latest
```


### 2. Ejecutar con Docker Compose
Crea un archivo `docker-compose.yml` en tu servidor con el siguiente contenido:

```yaml
services:
  app:
    image: zurupe/mcservers:latest
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
Tu aplicación estará disponible en `http://localhost:3001`.

## 🛠️ Desarrollo Local

Si prefieres ejecutarlo o modificarlo localmente, puedes clonar el repositorio y ejecutarlo sin Docker:

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
## 📝 Licencia y Uso Comercial

Este proyecto está distribuido bajo la **PolyForm Noncommercial License 1.0.0**. Puedes consultar el archivo [LICENSE](LICENSE) para más detalles.

**Este proyecto es de uso libre para servidores personales, comunidades y sin fines de lucro.** 

Para usos comerciales, integración en empresas de hosting, reventa o cualquier forma de monetización directa del software, por favor contáctame para adquirir una licencia comercial.

---
*Desarrollado para la comunidad de Minecraft.*

**Att: ZhuruServices https://zurupe.github.io/LandingPage/**
