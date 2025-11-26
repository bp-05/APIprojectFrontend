# Guía de Despliegue Frontend en AWS EC2

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                         VPC                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │    Subred Pública       │  │    Subred Privada       │   │
│  │                         │  │                         │   │
│  │  ┌─────────────────┐    │  │  ┌─────────────────┐    │   │
│  │  │  EC2 Frontend   │    │  │  │   RDS MySQL     │    │   │
│  │  │  (t2.micro)     │    │  │  │                 │    │   │
│  │  │                 │    │  │  └─────────────────┘    │   │
│  │  │  - Nginx        │    │  │                         │   │
│  │  │  - React SPA    │    │  │                         │   │
│  │  └────────┬────────┘    │  │                         │   │
│  │           │             │  │                         │   │
│  │  ┌────────▼────────┐    │  │                         │   │
│  │  │  EC2 Backend    │────┼──┼──►                      │   │
│  │  │  (t2.micro)     │    │  │                         │   │
│  │  └─────────────────┘    │  │                         │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Requisitos Previos

1. Backend ya desplegado y funcionando
2. Cuenta de AWS con capa gratuita
3. Security Group con puertos 22 y 80 abiertos

---

## Paso 1: Crear EC2 para Frontend

### 1.1 Ir a EC2 Console
- Servicio: **EC2** → **Launch instance**

### 1.2 Configuración
| Campo | Valor |
|-------|-------|
| Name | `apiproject-frontend` |
| AMI | Ubuntu Server 22.04 LTS |
| Instance type | `t2.micro` (Free tier) |
| Key pair | Tu par de claves |
| VPC | Tu VPC |
| Subnet | **Subred pública** |
| Auto-assign public IP | Enable |
| Security group | `frontend-sg` |

### 1.3 Security Group del Frontend (`frontend-sg`)
| Type | Protocol | Port | Source |
|------|----------|------|--------|
| SSH | TCP | 22 | Tu IP |
| HTTP | TCP | 80 | 0.0.0.0/0 |
| HTTPS | TCP | 443 | 0.0.0.0/0 |

### 1.4 User Data
1. Abre `scripts/deploy_ec2_userdata.sh`
2. Modifica la variable `BACKEND_URL` con la IP de tu backend:
   ```bash
   BACKEND_URL="http://3.144.4.226"  # IP de tu EC2 backend
   ```
3. Copia todo el contenido al campo "User Data"
4. Launch instance

---

## Paso 2: Verificación

### 2.1 Esperar despliegue
El script tarda ~3-5 minutos en completarse.

### 2.2 Acceder al frontend
```
http://<IP-PUBLICA-FRONTEND>/
```

### 2.3 Verificar conexión con backend
- Intenta hacer login
- Si hay errores, revisa la consola del navegador (F12)

---

## Configuración de CORS en Backend

**IMPORTANTE**: El backend debe permitir peticiones desde el frontend.

En el archivo `api_backend/settings.py` del backend, asegúrate de tener:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://<IP-FRONTEND>",  # Agregar IP del frontend
]

# O para desarrollo/testing:
CORS_ALLOW_ALL_ORIGINS = True
```

---

## Actualizar Frontend

Si necesitas actualizar el código:

```bash
ssh -i tu-clave.pem ubuntu@<IP-FRONTEND>

cd /home/ubuntu/APIprojectFrontend
git pull origin prod
npm ci
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo systemctl restart nginx
```

---

## Troubleshooting

### Error: "Network Error" al conectar con backend
1. Verificar que el backend está corriendo
2. Verificar CORS en el backend
3. Verificar Security Group del backend permite puerto 80

### Error: Página en blanco
1. Revisar build: `ls /var/www/html/`
2. Revisar logs: `sudo tail -f /var/log/nginx/error.log`

### Error 502 Bad Gateway
1. Nginx no está sirviendo correctamente
2. Verificar: `sudo nginx -t`
3. Reiniciar: `sudo systemctl restart nginx`

---

## Comandos Útiles

```bash
# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Verificar configuración de Nginx
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver archivos servidos
ls -la /var/www/html/

# Rebuild manual
cd /home/ubuntu/APIprojectFrontend
npm run build
sudo cp -r dist/* /var/www/html/
```

---

## Costos Estimados

| Servicio | Free Tier | Después |
|----------|-----------|---------|
| EC2 t2.micro | 750 hrs/mes | ~$8/mes |
| **Total Frontend** | **$0** (12 meses) | **~$8/mes** |

---

## Próximos Pasos

1. [ ] Configurar dominio con Route 53
2. [ ] Instalar certificado SSL con Let's Encrypt
3. [ ] Configurar CloudFront como CDN (opcional)
4. [ ] Configurar CI/CD con GitHub Actions
