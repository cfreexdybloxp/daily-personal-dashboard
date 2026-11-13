# Daily — Centro Personal de Información Diaria

**Daily** es una aplicación web progresiva (PWA) personal, ultraligera, elegante y completamente funcional construida bajo la filosofía **Mobile First** y diseño **Dark Editorial**.

Diseñada para consultarse cada mañana, integra información meteorológica en tiempo real, agregador de noticias verificado, citas filosóficas con fuentes académicas y reflexiones prácticas, conocimiento diario comprobado y un sistema de notificaciones **Web Push reales en segundo plano** ejecutadas por un Cloudflare Worker y Cron Triggers sin coste alguno.

---

## Características Principales

1. **Meteorología en Tiempo Real (Open-Meteo):**
   - Configurada inicialmente para **La Paz, Bolivia** (modificable a otras capitales bolivianas o coordenadas personalizadas desde Ajustes).
   - Datos reales: temperatura actual, sensación térmica, máxima y mínima, probabilidad de precipitación, velocidad del viento y descripción del estado del cielo.
   - Desglose visual en **4 momentos del día**: Mañana (08:00), Mediodía (12:00), Tarde (16:00) y Noche (20:00).
   - Caché local con actualización inteligente y modo resiliente ante fallos de red con insignia de datos previos (*offline*).

2. **Agregador de Noticias Verificadas:**
   - 5 categorías temáticas:
     - **Bolivia y Local:** Información nacional, La Paz, El Alto, economía y sociedad.
     - **Tecnología e IA:** Avances en modelos, herramientas y tecnología.
     - **Internacional:** Acontecimientos mundiales de agencias de referencia.
     - **Ciencia y Descubrimientos:** Divulgación científica, astronomía y salud.
     - **Cultura y Curiosidades:** Historia, literatura y pensamiento.
   - Entre 5 y 8 noticias seleccionadas, identificando claramente la fuente original, fecha relativa y enlace directo al artículo completo.
   - Pestaña de **Artículos Guardados** con almacenamiento local para lectura diferida.

3. **Pensamiento Filosófico Auténtico del Día:**
   - Citas verificadas de pensadores clásicos y modernos (Marco Aurelio, Séneca, Epicteto, Aristóteles, Sócrates, Confucio, Nietzsche, Dostoyevski, Saint-Exupéry).
   - Identificación rigurosa de autor, obra (libro y capítulo) y traducción/editorial.
   - **Reflexión práctica explicativa** claramente diferenciada de las palabras del autor para aplicar en la jornada cotidiana.
   - Sin generación por IA de pago.

4. **Una Idea para Hoy:**
   - Píldora diaria de conocimiento científico, histórico, psicológico o urbano con fuente de respaldo verificable (PNAS, St Andrews, Termodinámica Andina, APA, NASA, USDA/Nature).

5. **Notificaciones Push Reales en Segundo Plano:**
   - Arquitectura estándar **PWA + Service Worker + Web Push API + VAPID + Cloudflare Worker + Cron Triggers**.
   - Funcionan incluso con el navegador y la aplicación completamente cerrados.
   - Horarios personalizables desde los Ajustes:
     - **07:00:** Saludo, clima matutino, titular destacado y frase del día.
     - **12:30:** Actualización meteorológica y noticias destacadas.
     - **19:00:** Resumen de la jornada e idea para reflexionar.
   - Botón para enviar una notificación de prueba inmediata con verificación del dispositivo.

6. **Diseño Mobile-First y Estilo Dark Editorial:**
   - Paleta grafito profundo (`#0c1017`, `#141a23`), tipografía moderna (*Plus Jakarta Sans* y *Newsreader*), acentos cálidos ámbar (`#f59e0b`) e iconografía SVG integrada.
   - Barra de navegación inferior fija para acceso rápido con una sola mano en pantallas de teléfonos.

---

## Arquitectura y Tecnologías

- **Frontend:** HTML5 semántico, TypeScript moderno, CSS nativo optimizado con variables de diseño, Vite.
- **PWA:** `manifest.webmanifest`, Service Worker nativo (`sw.js`) con estrategia Stale-While-Revalidate y gestor de eventos `push` y `notificationclick`.
- **Backend / Edge API:** Cloudflare Workers (`worker/index.ts`) con WebCrypto nativo para cifrado VAPID RFC 8291 / RFC 8292.
- **Automatización:** Cloudflare Cron Triggers (`*/30 * * * *`).
- **Almacenamiento:** LocalStorage para preferencias y guardados en cliente; Cloudflare KV para almacenar suscripciones Push seguras.
- **Coste:** **$0.00 / mes (100% gratuito)** dentro de los límites generosos de Cloudflare Free y Open-Meteo.

---

## Estructura del Proyecto

```
pagPersonal/
├── index.html                   # Shell principal de la aplicación móvil
├── manifest.webmanifest         # Configuración PWA y metadatos
├── package.json                 # Dependencias y scripts de desarrollo
├── tsconfig.json                # Configuración TypeScript
├── vite.config.ts               # Optimizador Vite y proxy de desarrollo
├── wrangler.toml                # Configuración de Cloudflare Workers y Cron Triggers
│
├── public/
│   ├── favicon.ico
│   ├── icons/                   # Iconos PWA 192x192 y 512x512
│   └── sw.js                    # Service Worker (Caché offline y receptor Web Push)
│
├── src/
│   ├── main.ts                  # Orquestador de la aplicación
│   ├── style.css                # Sistema de diseño Dark Editorial
│   ├── api/
│   │   ├── weather.ts           # Cliente Open-Meteo con soporte de 4 momentos y caché
│   │   ├── news.ts              # Agregador de noticias y sincronización
│   │   └── push.ts              # Cliente de suscripción y prueba Web Push
│   ├── components/
│   │   ├── WeatherWidget.ts     # Tarjeta del clima y pronóstico
│   │   ├── QuoteWidget.ts       # Tarjeta de pensamiento y reflexión
│   │   ├── CuriosityWidget.ts   # Tarjeta de conocimiento diario
│   │   ├── NewsWidget.ts        # Tarjetas de noticias por categoría
│   │   ├── SavedArticlesView.ts # Vista de artículos guardados
│   │   ├── BottomNav.ts         # Barra de navegación inferior
│   │   └── SettingsModal.ts     # Panel modal de ajustes y horarios
│   ├── data/
│   │   ├── quotes.json          # Colección de citas filosóficas verificadas
│   │   ├── curiosities.json     # Curiosidades con fuentes científicas
│   │   └── defaultCities.json   # Coordenadas de ciudades bolivianas
│   ├── services/
│   │   └── storage.ts           # Almacenamiento local de preferencias y caché
│   └── types/
│       └── index.ts             # Definiciones de tipos TypeScript
│
└── worker/
    ├── index.ts                 # Enrutador API y disparador de Cron Triggers
    ├── newsAggregator.ts        # Parser y normalizador de canales RSS
    └── webPush.ts               # Cifrado Web Push VAPID RFC 8291/8292 con WebCrypto
```

---

## Ejecución Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Compilar y probar la aplicación web:**
   ```bash
   npm run build
   npm run preview
   ```
   Abre `http://localhost:3000` en tu navegador o mediante las herramientas de desarrollo en modo emulación móvil (p. ej. iPhone 14 o Pixel 7).

3. **Ejecutar el backend Worker localmente con Wrangler (opcional):**
   ```bash
   npm run worker:dev
   ```

---

## Guía de Despliegue en Cloudflare (Paso a Paso)

Todo el despliegue es **100% gratuito** en el plan Free de Cloudflare.

### Paso 1: Publicar el Frontend en Cloudflare Pages

1. Sube tu código a un repositorio de GitHub (o utiliza la CLI de Wrangler).
2. Entra en tu panel de [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Selecciona tu repositorio y configura los parámetros de compilación:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Pulsa **Save and Deploy**. En menos de 1 minuto tendrás tu dominio gratuito `https://tu-proyecto.pages.dev` con HTTPS incluido.

### Paso 2: Publicar el Backend en Cloudflare Workers

1. Inicia sesión en Cloudflare desde tu terminal:
   ```bash
   npx wrangler login
   ```
2. Crea el espacio de nombres de Cloudflare KV para guardar las suscripciones:
   ```bash
   npx wrangler kv namespace create DAILY_KV
   ```
   Copia el `id` resultante y colócalo en tu archivo `wrangler.toml` en el bloque:
   ```toml
   [[kv_namespaces]]
   binding = "DAILY_KV"
   id = "PEGA_TU_ID_AQUI"
   ```
3. Genera o configura tus claves VAPID para Web Push seguro:
   Puedes generar un par de claves con Node.js o utilizar el par provisto. Guarda la clave privada como secreto seguro en Cloudflare:
   ```bash
   npx wrangler secret put VAPID_PRIVATE_KEY
   ```
4. Despliega el Worker y sus Cron Triggers:
   ```bash
   npx wrangler deploy worker/index.ts
   ```
5. En tu Cloudflare Pages, añade una regla de enrutamiento o vincula el Worker a la ruta `/api/*` de tu dominio, o actualiza la URL base de API para que el frontend se comunique con el Worker.

---

## Instalación en tu Celular Android (PWA)

1. Abre Google Chrome o Samsung Internet en tu teléfono Android y navega a la URL de tu aplicación (p. ej. `https://tu-proyecto.pages.dev`).
2. Aparecerá el mensaje **"Agregar Daily a la pantalla principal"** o puedes tocar el menú de tres puntos (⋮) de Chrome y seleccionar **"Instalar aplicación"**.
3. Pulsa **Instalar**.
4. La aplicación se colocará en el cajón de aplicaciones de tu teléfono con su propio icono, pantalla de carga y sin barra de direcciones del navegador (pantalla completa nativa).

---

## Activación de Notificaciones en Android

1. Abre la aplicación instalada en tu teléfono.
2. Toca la pestaña **Ajustes** en la barra inferior (o el icono de engranaje en la cabecera).
3. En el apartado **Notificaciones Push Automáticas**, pulsa el botón **"Activar Notificaciones en mi Teléfono"**.
4. Cuando el sistema Android te pregunte *"¿Daily quiere enviarte notificaciones?"*, pulsa **Permitir**.
5. Pulsa **"Enviar Notificación de Prueba"** para confirmar que tu dispositivo recibe alertas de inmediato.
6. Ajusta los horarios a tu conveniencia (07:00, 12:30, 19:00 u otros). El servidor Cloudflare se encargará de despacharlas puntualmente a través de los Cron Triggers en segundo plano.

---

## Tabla de Límites Gratuitos

| Servicio | Límite del Plan Gratuito | Uso Estimado de Daily | Estado |
| :--- | :--- | :--- | :--- |
| **Open-Meteo API** | 10.000 peticiones / día (Sin clave, libre acceso) | ~10 a 20 peticiones / día | Muy holgado (< 0.2%) |
| **Cloudflare Workers** | 100.000 peticiones / día | ~50 peticiones / día | Muy holgado (< 0.1%) |
| **Cloudflare KV** | 100.000 lecturas y 1.000 escrituras / día | < 5 escrituras / mes | Muy holgado (< 0.5%) |
| **Cloudflare Pages** | Ancho de banda ilimitado, 500 compilaciones / mes | 5 a 10 compilaciones / mes | Muy holgado (< 2%) |
| **Web Push (FCM / Mozilla)** | Sin límite de mensajes para uso estándar | 3 a 5 notificaciones / día | 100% Gratuito |
