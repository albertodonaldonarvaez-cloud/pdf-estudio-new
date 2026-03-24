# 📄 PDF Studio - Editor Profesional de PDFs

Un sistema completo y moderno para editar, crear y convertir documentos PDF con una interfaz elegante y responsive, sistema de autenticación de usuarios y panel de administración.

![PDF Studio](https://img.shields.io/badge/PDF%20Studio-Next.js%2016-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Características Principales

### 📝 Editor de Documentos (Estilo Word)
- Crea PDFs desde cero con editor visual
- Carga PDFs existentes para editarlos
- **Preservación exacta de PDFs con imágenes**
- Soporte para títulos H1, H2, H3, párrafos y listas
- Agrega imágenes y ajusta su posición
- Vista previa de página con márgenes visibles
- Configuración de tamaño de página (A4, Carta, Legal, A5)
- Orientación vertical/horizontal
- Márgenes personalizables
- Formato de texto: negrita, cursiva, subrayado
- Alineación: izquierda, centro, derecha, justificado

### 🔍 OCR (Reconocimiento Óptico de Caracteres)
- Extrae texto de imágenes y PDFs escaneados
- Alta precisión usando Vision Language Model (VLM)
- Streaming en tiempo real del progreso
- Copiar y descargar texto extraído

### 📤 PDF → Word
- Convierte PDFs a documentos Word (.docx)
- Extrae estructura y formato automáticamente
- Mantiene títulos, párrafos y listas

### 🖼️ Imágenes → PDF
- Convierte múltiples imágenes a un solo PDF
- Drag & drop para reordenar páginas
- Configura tamaño de página (A4, Carta, Legal, A5)
- Orientación: vertical, horizontal o automática

### 📑 Organizador de PDFs
- Reordena páginas con drag & drop
- Rota páginas 90° en cualquier dirección
- Elimina páginas individuales o seleccionadas

### 🔗 Combinar PDFs
- Une múltiples PDFs en uno solo
- Arrastra para cambiar el orden
- Muestra resumen de páginas y tamaño total

### 🎨 Navegación Estilo Apple
- Barra inferior con efecto "Liquid Glass"
- Iconos representativos para cada función
- Tooltips informativos al pasar el mouse
- Animaciones fluidas y modernas

## 👥 Sistema de Usuarios

### Roles de Usuario
- **Administrador (ADMIN)**: Acceso total al panel de administración, puede crear/editar/eliminar usuarios
- **Usuario (USER)**: Acceso a las herramientas de edición con límites de almacenamiento

### Características de Usuarios
- Almacenamiento limitado por usuario
- Panel de administración para gestionar usuarios
- Activar/desactivar usuarios
- Ajustar límites de almacenamiento individuales
- Crear nuevos usuarios desde el panel admin

---

## 📦 Instalación por Sistema Operativo

### 🐧 Ubuntu Server (Recomendado para Producción)

#### Opción 1: Instalación con Bun (Recomendado)

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias necesarias
sudo apt install -y curl git unzip

# 3. Instalar Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 4. Verificar instalación
bun --version

# 5. Clonar repositorio
git clone https://github.com/albertodonaldonarvaez-cloud/pdf-estudio-new.git
cd pdf-estudio-new

# 6. Crear directorio para la base de datos
mkdir -p db

# 7. Copiar archivo de configuración
cp .env.example .env

# 8. Instalar dependencias
bun install

# 9. Configurar base de datos
bun run db:push

# 10. Crear usuarios iniciales
bun run prisma/seed.ts

# 11. Compilar para producción (incluye copiar db y .env)
bun run build

# 12. Ejecutar en producción
bun run start
```

> ⚠️ **IMPORTANTE**: Si ya clonaste el repositorio antes, actualiza primero:
> ```bash
> cd ~/pdf-estudio-new
> git pull origin main
> rm -rf node_modules .next
> bun install
> mkdir -p db
> cp .env.example .env
> bun run db:push
> bun run prisma/seed.ts
> bun run build
> bun run start
> ```

#### Opción 2: Con PM2 (Producción Robusta)

```bash
# 1. Seguir pasos 1-8 de la Opción 1

# 2. Instalar PM2 globalmente
sudo npm install -g pm2

# 3. Crear archivo de configuración PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'pdf-studio',
    script: 'bun',
    args: 'run start',
    cwd: '/home/usuario/pdf-estudio-new',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# 4. Iniciar con PM2
pm2 start ecosystem.config.js

# 5. Guardar configuración de PM2
pm2 save

# 6. Configurar inicio automático
pm2 startup
# Ejecuta el comando que te muestre

# 7. Verificar estado
pm2 status
pm2 logs pdf-studio
```

#### Opción 3: Con Systemd (Servicio Nativo)

```bash
# 1. Seguir pasos 1-9 de la Opción 1

# 2. Crear servicio systemd
sudo nano /etc/systemd/system/pdf-studio.service
```

Contenido del archivo:
```ini
[Unit]
Description=PDF Studio - Editor de PDFs
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/pdf-estudio-new
ExecStart=/home/www-data/.bun/bin/bun run start
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=pdf-studio
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
# 3. Configurar permisos
sudo chown -R www-data:www-data /var/www/pdf-estudio-new

# 4. Activar e iniciar servicio
sudo systemctl daemon-reload
sudo systemctl enable pdf-studio
sudo systemctl start pdf-studio

# 5. Verificar estado
sudo systemctl status pdf-studio

# 6. Ver logs
sudo journalctl -u pdf-studio -f
```

#### Configurar Nginx como Proxy Inverso

```bash
# 1. Instalar Nginx
sudo apt install -y nginx

# 2. Crear configuración
sudo nano /etc/nginx/sites-available/pdf-studio
```

Contenido:
```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # Aumentar límite para archivos PDF grandes
        client_max_body_size 100M;
    }
}
```

```bash
# 3. Activar sitio
sudo ln -s /etc/nginx/sites-available/pdf-studio /etc/nginx/sites-enabled/

# 4. Verificar configuración
sudo nginx -t

# 5. Reiniciar Nginx
sudo systemctl restart nginx

# 6. Configurar SSL con Let's Encrypt (opcional pero recomendado)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

---

### 🐳 Docker (Universal - Recomendado)

La forma más fácil de desplegar PDF Studio en cualquier servidor.

#### Instalación Rápida con Docker

```bash
# 1. Clonar repositorio
git clone https://github.com/albertodonaldonarvaez-cloud/pdf-estudio-new.git
cd pdf-estudio-new

# 2. Construir y ejecutar con Docker Compose
docker compose up -d --build

# 3. Verificar que está corriendo
docker compose logs -f
```

¡Listo! La aplicación estará disponible en `http://localhost:3000`

#### Comandos Docker Útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Detener la aplicación
docker compose down

# Reiniciar la aplicación
docker compose restart

# Reconstruir después de actualizar
git pull origin main
docker compose up -d --build

# Ver estado de los contenedores
docker compose ps

# Entrar al contenedor (para debugging)
docker compose exec pdf-studio sh
```

#### Dockerfile incluido

El proyecto incluye un `Dockerfile` optimizado multi-stage que:
- Usa Bun como runtime ultrarrápido
- Inicializa la base de datos automáticamente
- Ejecuta el seed para crear usuarios iniciales
- Optimiza el tamaño de la imagen

#### Con Nginx Proxy (Producción)

Para usar con un dominio y SSL:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  pdf-studio:
    build: .
    container_name: pdf-studio
    restart: unless-stopped
    expose:
      - "3000"
    volumes:
      - pdf-studio-db:/app/db
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./db/custom.db

  nginx:
    image: nginx:alpine
    container_name: pdf-studio-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - pdf-studio

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot

volumes:
  pdf-studio-db:
```

---

### 🪟 Windows

#### Opción 1: Con PowerShell

```powershell
# 1. Abrir PowerShell como Administrador

# 2. Instalar Bun (si no tienes Node.js)
powershell -c "irm bun.sh/install.ps1 | iex"

# 3. O instalar Node.js desde https://nodejs.org

# 4. Clonar repositorio
git clone https://github.com/albertodonaldonarvaez-cloud/pdf-estudio-new.git
cd pdf-estudio-new

# 5. Instalar dependencias
bun install
# O con npm: npm install

# 6. Configurar base de datos
bun run db:push

# 7. Crear usuarios iniciales
bun run prisma/seed.ts

# 8. Ejecutar
bun run dev
```

#### Opción 2: Como Servicio Windows (NSSM)

```powershell
# 1. Descargar NSSM desde https://nssm.cc/download

# 2. Extraer y agregar al PATH

# 3. Compilar proyecto primero
bun run build

# 4. Instalar servicio
nssm install PDFStudio

# En el diálogo:
# - Path: C:\Users\TuUsuario\.bun\bin\bun.exe
# - Arguments: run start
# - Startup directory: C:\ruta\pdf-estudio-new

# 5. Iniciar servicio
nssm start PDFStudio
```

---

### 🍎 macOS

```bash
# 1. Instalar Homebrew (si no lo tienes)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Instalar Bun
brew tap oven-sh/bun
brew install bun

# 3. Clonar repositorio
git clone https://github.com/albertodonaldonarvaez-cloud/pdf-estudio-new.git
cd pdf-estudio-new

# 4. Instalar dependencias
bun install

# 5. Configurar base de datos
bun run db:push

# 6. Crear usuarios iniciales
bun run prisma/seed.ts

# 7. Ejecutar
bun run dev
```

#### Con Launchd (Inicio Automático)

```bash
# Crear archivo de servicio
nano ~/Library/LaunchAgents/com.pdfstudio.plist
```

Contenido:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pdfstudio</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/tuusuario/.bun/bin/bun</string>
        <string>run</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/tuusuario/pdf-estudio-new</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

```bash
# Cargar servicio
launchctl load ~/Library/LaunchAgents/com.pdfstudio.plist
```

---

### 🐧 CentOS / RHEL / Fedora

```bash
# 1. Actualizar sistema
sudo dnf update -y

# 2. Instalar dependencias
sudo dnf install -y curl git

# 3. Instalar Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 4. Clonar y configurar (igual que Ubuntu)
git clone https://github.com/albertodonaldonarvaez-cloud/pdf-estudio-new.git
cd pdf-estudio-new
bun install
bun run db:push
bun run prisma/seed.ts
bun run build
```

#### Con Systemd (CentOS/RHEL)

```bash
# Mismo proceso que Ubuntu Systemd
sudo nano /etc/systemd/system/pdf-studio.service
# ... (igual que Ubuntu)
```

---

### 🐧 Arch Linux

```bash
# 1. Actualizar sistema
sudo pacman -Syu

# 2. Instalar dependencias
sudo pacman -S --needed curl git

# 3. Instalar Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 4. Continuar con pasos normales
git clone https://github.com/albertodonaldonarvaez-cloud/pdf-estudio-new.git
cd pdf-estudio-new
bun install
bun run db:push
bun run prisma/seed.ts
```

---

## 🔑 Credenciales de Acceso

### Usuario Administrador
```
Email: admin@pdfstudio.com
Password: admin123
```

### Usuario Demo
```
Email: demo@pdfstudio.com
Password: demo123
```

⚠️ **IMPORTANTE**: Cambia estas credenciales después del primer inicio de sesión desde el panel de administración.

---

## 🔧 Variables de Entorno (Opcional)

Crea un archivo `.env` en la raíz del proyecto:

```env
# Puerto (default: 3000)
PORT=3000

# Entorno
NODE_ENV=production

# Sesión secreta (cambiar en producción)
SESSION_SECRET=tu-clave-secreta-muy-segura

# Base de datos (SQLite por defecto)
DATABASE_URL="file:./dev.db"
```

---

## 📱 Uso

### Panel Principal
1. Inicia sesión con tus credenciales
2. Usa la barra de navegación inferior estilo Apple:
   - **🔍 OCR**: Extrae texto de PDFs e imágenes
   - **✏️ Crear**: Editor estilo Word para crear documentos
   - **📤 Convertir**: Convierte PDFs a documentos Word
   - **🖼️ Imagen**: Convierte imágenes a PDF
   - **📑 Organizar**: Reordena páginas de PDFs
   - **🔗 Unir**: Une múltiples PDFs

### Panel de Administración (solo Admin)
1. Haz clic en tu avatar → "Panel Admin"
2. Ve y gestiona todos los usuarios
3. Crea nuevos usuarios con límites personalizados
4. Activa/desactiva usuarios existentes
5. Ajusta el almacenamiento asignado

---

## 🏗️ Estructura del Proyecto

```
├── prisma/
│   ├── schema.prisma      # Esquema de base de datos
│   └── seed.ts            # Datos iniciales (usuarios)
├── src/
│   ├── app/
│   │   ├── admin/         # Panel de administración
│   │   ├── api/           # Endpoints API
│   │   │   ├── admin/     # APIs de administración
│   │   │   ├── auth/      # APIs de autenticación
│   │   │   └── pdf/       # APIs de procesamiento PDF
│   │   ├── login/         # Página de login
│   │   └── page.tsx       # Página principal
│   ├── components/
│   │   ├── pdf/           # Componentes de edición PDF
│   │   └── ui/            # Componentes UI (shadcn)
│   └── lib/
│       ├── auth.ts        # Utilidades de autenticación
│       └── db.ts          # Cliente de base de datos
└── README.md
```

---

## 🔐 Seguridad

### Autenticación
- Sesiones con tokens seguros (cookies HTTP-only)
- Contraseñas hasheadas con SHA-256
- Expiración automática de sesiones (7 días)

### Autorización
- Control de acceso por roles
- Middleware de autenticación en APIs
- Protección de rutas administrativas

### Recomendaciones de Producción
1. ✅ Cambia las credenciales de administrador
2. ✅ Usa HTTPS en producción (Let's Encrypt)
3. ✅ Configura firewall (ufw en Ubuntu)
4. ✅ Realiza copias de seguridad de la base de datos
5. ✅ Configura SESSION_SECRET seguro

```bash
# Configurar firewall Ubuntu
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 🛠️ Comandos Disponibles

```bash
# Desarrollo
bun run dev          # Iniciar servidor de desarrollo

# Base de datos
bun run db:push      # Sincronizar esquema con BD
bun run db:generate  # Generar cliente Prisma

# Producción
bun run build        # Compilar para producción
bun run start        # Iniciar servidor producción

# Calidad
bun run lint         # Verificar código
```

---

## 🎨 Diseño

- **Mobile-first**: Optimizado para dispositivos móviles
- **Navegación Apple-style**: Barra inferior con "Liquid Glass"
- **Tema oscuro**: Soporte completo para dark mode
- **Animaciones suaves**: Transiciones fluidas con Framer Motion
- **Drag & drop**: Para subir archivos y reorganizar
- **Responsive**: Se adapta a cualquier tamaño de pantalla

---

## 🚀 Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 + shadcn/ui |
| Animaciones | Framer Motion |
| Base de datos | SQLite + Prisma ORM |
| PDF | pdf-lib |
| OCR | z-ai-web-dev-sdk (VLM) |
| Estado | Zustand + TanStack Query |

---

## 🔄 Actualizaciones

```bash
# Detener servicio
pm2 stop pdf-studio
# o
sudo systemctl stop pdf-studio

# Actualizar código
git pull origin main

# Instalar nuevas dependencias
bun install

# Actualizar base de datos
bun run db:push

# Recompilar
bun run build

# Reiniciar
pm2 restart pdf-studio
# o
sudo systemctl start pdf-studio
```

---

## 📞 Soporte y Contribución

### Reportar Problemas
Abre un [Issue](https://github.com/albertodonaldonarvaez-cloud/pdf-estudio-new/issues) en GitHub.

### Contribuir
1. Fork el repositorio
2. Crea tu rama (`git checkout -b feature/NuevaCaracteristica`)
3. Commit tus cambios (`git commit -m 'Agrega nueva característica'`)
4. Push a la rama (`git push origin feature/NuevaCaracteristica`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 🙏 Agradecimientos

- [shadcn/ui](https://ui.shadcn.com/) - Componentes de UI
- [pdf-lib](https://pdf-lib.js.org/) - Manipulación de PDFs
- [Framer Motion](https://www.framer.com/motion/) - Animaciones
- [Lucide Icons](https://lucide.dev/) - Iconos
- [Prisma](https://www.prisma.io/) - ORM
- [Bun](https://bun.sh/) - Runtime ultrarrápido

---

Desarrollado con ❤️ por Alberto Donaldo Narváez
