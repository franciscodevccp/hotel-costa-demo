# Instructivo de Despliegue — MiHostal en VPS Hostinger
**Servidor:** 187.77.60.110 | Ubuntu 24.04 LTS | KVM 1

---

## ✅ PASO 1 — Preparación del servidor (YA HECHO)

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# Instalar dependencias
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql postgresql-contrib nginx
npm install -g pnpm pm2
```

---

## ✅ PASO 2 — Configurar PostgreSQL (EN PROGRESO)

```bash
# Entrar a PostgreSQL
sudo -u postgres psql
```

Dentro de psql, ejecutar **un comando a la vez** (cada uno debe terminar en **punto y coma** y Enter; esperar a ver `postgres=#` antes del siguiente):

```sql
CREATE USER hotelcosta WITH PASSWORD 'TuContraseña';
```
*(Verás CREATE ROLE si salió bien. Si olvidas el ; al final, psql mostrará postgres-# y dará error al escribir el siguiente comando.)*

```sql
CREATE DATABASE hotelcosta_db OWNER hotelcosta;
```

```sql
GRANT ALL PRIVILEGES ON DATABASE hotelcosta_db TO hotelcosta;
```

```sql
\q
```

> ⚠️ Guarda bien el usuario (`hotelcosta`), nombre de base (`hotelcosta_db`) y contraseña.
> Se usarán en la variable `DATABASE_URL` del `.env`

---

## PASO 3 — Subir el proyecto al servidor

### Opción A: Usando Git (recomendado)

En tu máquina local, sube el proyecto a GitHub (repositorio privado):

```bash
# En tu PC local
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/tuusuario/mihotel.git
git push -u origin main
```

En el servidor, clona el repositorio:

```bash
# En el servidor VPS
cd /var/www
git clone https://github.com/tuusuario/mihotel.git
cd mihotel
```

### Opción B: Subir archivos con SCP (alternativa sin Git)

```bash
# En tu PC local
scp -r /ruta/a/tu/proyecto root@187.77.60.110:/var/www/mihotel
```

---

## PASO 4 — Configurar variables de entorno

```bash
# En el servidor, dentro de /var/www/mihotel
nano .env
```

Contenido del archivo `.env`:

```env
DATABASE_URL="postgresql://hotelcosta:TuContraseña@localhost:5432/hotelcosta_db"
NEXTAUTH_SECRET="una-clave-secreta-de-minimo-32-caracteres-aqui"
NEXTAUTH_URL="http://187.77.60.110"
```

> 💡 Para generar un NEXTAUTH_SECRET seguro:
> ```bash
> openssl rand -base64 32
> ```

---

## PASO 5 — Instalar dependencias y compilar

```bash
cd /var/www/mihotel

# Instalar dependencias
pnpm install

# Ejecutar migraciones de Prisma
pnpm prisma migrate deploy

# Generar cliente de Prisma
pnpm prisma generate

# Compilar la aplicación
pnpm build
```

---

## PASO 6 — Configurar PM2 (mantener la app corriendo)

```bash
# Iniciar la app con PM2
pm2 start pnpm --name "mihotel" -- start

# Guardar configuración para que arranque automático al reiniciar el servidor
pm2 startup
pm2 save
```

Comandos útiles de PM2:

```bash
pm2 status          # Ver estado de la app
pm2 logs mihotel    # Ver logs en tiempo real
pm2 restart mihotel # Reiniciar la app
pm2 stop mihotel    # Detener la app
```

---

## PASO 7 — Configurar Nginx (reverse proxy)

```bash
# Crear configuración de Nginx
nano /etc/nginx/sites-available/mihotel
```

Pegar este contenido:

```nginx
server {
    listen 80;
    server_name 187.77.60.110;  # Reemplazar por dominio si tienes uno

    # Límite de tamaño de archivos subidos (fotos de boletas)
    client_max_body_size 30M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Servir archivos estáticos directamente
    location /_next/static/ {
        alias /var/www/mihotel/.next/static/;
        expires 1y;
        access_log off;
    }

    # Servir uploads de fotos
    location /uploads/ {
        alias /var/www/mihotel/public/uploads/;
        expires 7d;
        access_log off;
    }
}
```

```bash
# Activar la configuración
ln -s /etc/nginx/sites-available/mihotel /etc/nginx/sites-enabled/

# Eliminar el sitio por defecto
rm /etc/nginx/sites-enabled/default

# Verificar que la configuración es correcta
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

---

## PASO 8 — SSL con Certbot (solo si tienes dominio)

> Si accedes por IP directamente, omite este paso.

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obtener certificado (reemplazar con tu dominio)
certbot --nginx -d tudominio.cl

# Renovación automática (ya viene configurada, pero puedes verificar)
certbot renew --dry-run
```

Actualizar `.env` con el dominio:

```env
NEXTAUTH_URL="https://tudominio.cl"
```

---

## PASO 9 — Configurar backups de la base de datos

```bash
# Crear carpeta de backups
mkdir -p /var/backups/mihotel

# Crear script de backup
nano /var/backups/mihotel/backup.sh
```

Contenido del script:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mihotel"
PGPASSWORD="TuContraseña" pg_dump -U hotelcosta hotelcosta_db > $BACKUP_DIR/backup_$DATE.sql

# Mantener solo los últimos 7 backups
ls -t $BACKUP_DIR/backup_*.sql | tail -n +8 | xargs rm -f
```

```bash
# Dar permisos al script
chmod +x /var/backups/mihotel/backup.sh

# Programar backup diario a las 3am
crontab -e
# Agregar esta línea:
0 3 * * * /var/backups/mihotel/backup.sh
```

---

## PASO 10 — Actualizar la app (cuando hagas cambios)

Cada vez que hagas cambios en el código y quieras actualizar el servidor:

```bash
cd /var/www/mihotel

# Traer los últimos cambios
git pull origin main

# Instalar nuevas dependencias si las hay
pnpm install

# Ejecutar migraciones nuevas si las hay
pnpm prisma migrate deploy

# Recompilar
pnpm build

# Reiniciar la app
pm2 restart mihotel
```

---

## 🔧 Comandos útiles de mantenimiento

```bash
# Ver uso de disco
df -h

# Ver uso de RAM
free -h

# Ver logs de Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Ver logs de la app
pm2 logs mihotel

# Reiniciar Nginx
systemctl restart nginx

# Estado de servicios
systemctl status nginx
systemctl status postgresql

# Conectarse a la base de datos
sudo -u postgres psql -d hotelcosta_db
```

---

## 🗂️ Estructura de carpetas en el servidor

```
/var/www/mihotel/          → Proyecto Next.js
/var/backups/mihotel/      → Backups de la base de datos
/etc/nginx/sites-available/ → Configuración de Nginx
```

---

## ⚠️ Checklist antes de dar acceso al hotel

- [ ] PostgreSQL configurado con usuario y base de datos
- [ ] Proyecto subido y compilado sin errores
- [ ] PM2 corriendo y configurado para arranque automático
- [ ] Nginx funcionando como reverse proxy
- [ ] SSL configurado (si hay dominio)
- [ ] Backups automáticos programados
- [ ] `.env` con variables correctas (no subir a Git)
- [ ] Usuario admin del sistema creado con `pnpm prisma db seed`
- [ ] Probado el login y las funcionalidades principales