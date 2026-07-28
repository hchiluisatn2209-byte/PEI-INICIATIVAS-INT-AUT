# Iniciativas Proyectos Corporativos — Registro de Iniciativas de Automatización

Sistema interno para registrar, escalar y hacer seguimiento de iniciativas de automatización con IA hacia el equipo de **Automatizaciones**.

---

## Funcionalidades

| Funcionalidad | Solicitante | Automatizaciones |
|---|---|---|
| Registrar nueva iniciativa | ✅ | — |
| Guardar borrador | ✅ | — |
| Ver mis iniciativas y avances | ✅ | — |
| Cola de análisis priorizada | — | ✅ |
| Cambiar estado de iniciativa | — | ✅ |
| Agregar notas de avance | — | ✅ |
| Dashboard con métricas | — | ✅ |

**Campos capturados:**
- Nombre / Área del solicitante
- Título y descripción del proceso actual
- Resultado esperado
- Impacto estimado (Alto / Medio / Bajo)
- Frecuencia, horas por ejecución, personas involucradas
- Sistemas y herramientas actuales
- Notas adicionales

**Estados del ciclo de vida:**
`Borrador` → `Enviado` → `En análisis` → `En desarrollo` → `Completado` / `Rechazado`

---

## Despliegue en GitHub Pages

1. Sube los archivos a un repositorio en GitHub:
   ```
   index.html
   style.css
   app.js
   apps-script.js   ← solo referencia, no se sube a Pages
   README.md
   ```

2. Ve a **Settings → Pages** en tu repositorio

3. En **Source**, selecciona la rama `main` y carpeta `/ (root)`

4. GitHub Pages publicará la app en:
   ```
   https://tu-usuario.github.io/nombre-del-repo/
   ```

---

## Conectar con Google Sheets (opcional)

Los datos se guardan en `localStorage` del navegador por defecto. Para persistencia compartida entre usuarios, conecta un Google Sheet:

### 1. Crear la hoja
- Crea un Google Sheet nuevo
- Asegúrate de que haya una hoja (pestaña) llamada **`Iniciativas`** (se crea automáticamente al primer registro)

### 2. Configurar el Apps Script
1. Abre el Google Sheet
2. Ve a **Extensiones → Apps Script**
3. Borra el contenido y pega todo el código de `apps-script.js`
4. Guarda (Ctrl+S)

### 3. Publicar el script
1. Clic en **Implementar → Nueva implementación**
2. Tipo: **Aplicación web**
3. Ejecutar como: **Yo** (tu cuenta de Google)
4. Quién tiene acceso: **Cualquier persona**
5. Clic en **Implementar**
6. Copia la **URL de implementación**

### 4. Configurar la app
1. Abre la app en el navegador
2. Clic en **Configurar Sheets** (esquina inferior izquierda)
3. Pega la URL del Apps Script
4. Ingresa tu correo / usuario
5. Guardar

A partir de ahí, cada iniciativa enviada se sincroniza automáticamente al Google Sheet.

---

## Notas de implementación

- **Sin servidor requerido**: la app es 100% HTML/CSS/JS estático
- **Datos locales**: `localStorage` persiste entre sesiones en el mismo navegador
- **Multi-usuario real**: requiere Google Sheets como backend (ver arriba)
- **Roles**: el cambio de rol (Solicitante / Automatizaciones) es manual; para producción se puede integrar con autenticación de Google

---

## Estructura de archivos

```
├── index.html       # Estructura HTML principal
├── style.css        # Estilos y diseño
├── app.js           # Lógica de la aplicación
├── apps-script.js   # Código para Google Apps Script (backend)
└── README.md        # Este archivo
```
