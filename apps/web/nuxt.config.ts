import { resolve } from 'path'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript'
import { defineNuxtConfig } from 'nuxt/config'
import * as consola from 'consola'
import setupApp from './src/server/extension.setup'
import { loadingBarHijackFilter } from './src/composables/useLoadingBarHijackFilter'

const SESAME_APP_API_URL = process.env.SESAME_APP_API_URL || 'http://127.0.0.1:4000'
const SESAME_ALLOWED_HOSTS = process.env.SESAME_ALLOWED_HOSTS ? process.env.SESAME_ALLOWED_HOSTS.split(',') : []
const API_PROXY_TARGET = SESAME_APP_API_URL.replace(/\/$/, '')
const IS_DEV = process.env.NODE_ENV === 'development'
/** Port vu par le navigateur (ex. 3002 via `make dev`) quand Nuxt tourne derrière un mapping Docker. */
const WEB_HMR_CLIENT_PORT = process.env.SESAME_WEB_HMR_CLIENT_PORT ? Number(process.env.SESAME_WEB_HMR_CLIENT_PORT) : undefined
/**
 * Polling seul si true (dev). Surcharges runtime (sans rebuild) : NUXT_PUBLIC_SOCKET_IO_POLLING_ONLY.
 * Build : SESAME_SOCKET_IO_POLLING_ONLY ou défaut IS_DEV.
 */
const SOCKET_IO_POLLING_ONLY = (() => {
  const fromNuxtPublic = process.env.NUXT_PUBLIC_SOCKET_IO_POLLING_ONLY
  if (fromNuxtPublic !== undefined) {
    return /^(1|true|yes|on)$/i.test(fromNuxtPublic)
  }
  if (process.env.SESAME_SOCKET_IO_POLLING_ONLY !== undefined) {
    return /^(1|true|yes|on)$/i.test(process.env.SESAME_SOCKET_IO_POLLING_ONLY)
  }
  return IS_DEV
})()

if (SESAME_ALLOWED_HOSTS.length === 0 && !/localhost/.test(SESAME_APP_API_URL) && IS_DEV) {
  SESAME_ALLOWED_HOSTS.push(new URL(SESAME_APP_API_URL).hostname)
}

consola.info(`[Nuxt] SESAME_APP_API_URL: ${SESAME_APP_API_URL}`)
consola.info(`[Nuxt] Socket.IO polling only: ${SOCKET_IO_POLLING_ONLY}`)
consola.info(`[Nuxt] SESAME_ALLOWED_HOSTS: ${SESAME_ALLOWED_HOSTS}`)
if (IS_DEV && WEB_HMR_CLIENT_PORT) {
  consola.info(`[Nuxt] Vite HMR clientPort: ${WEB_HMR_CLIENT_PORT}`)
}

let SESAME_APP_DARK_MODE: 'auto' | boolean = false
if (process.env.SESAME_APP_DARK_MODE) {
  if (process.env.SESAME_APP_DARK_MODE === 'auto') {
    SESAME_APP_DARK_MODE = 'auto'
  } else {
    SESAME_APP_DARK_MODE = /true|on|yes|1/i.test(process.env.SESAME_APP_DARK_MODE)
  }
}

let sslCfg = <any>{}
if (/yes|1|on|true/i.test(`${process.env.SESAME_HTTPS_ENABLED}`)) {
  try {
    sslCfg.https = {
      key: readFileSync(`${process.env.SESAME_HTTPS_PATH_KEY}`, 'utf8'),
      cert: readFileSync(`${process.env.SESAME_HTTPS_PATH_CERT}`, 'utf8'),
    };
    consola.info('[Nuxt] SSL certificates loaded successfully')
  } catch (error) {
    consola.warn('[Nuxt] Error while reading SSL certificates', error)
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  ssr: false,
  telemetry: false,
  pages: true,
  srcDir: 'src',
  debug: !!process.env.DEBUG,
  // Generate client sourcemaps for clearer stack traces in Sentry
  sourcemap: { client: 'hidden' },
  devServer: {
    host: IS_DEV ? '0.0.0.0' : undefined,
    port: 3000,
    ...sslCfg,
  },
  devtools: {
    enabled: IS_DEV,
    timeline: {
      enabled: IS_DEV,
    },
  },
  css: [
    // Keep framework CSS first, then app overrides.
    'quasar/src/css/index.sass',
    '~/assets/sass/global.sass',
  ],
  plugins: [/* { src: '~/plugins/ofetch' } */],
  components: {
    global: true,
    dirs: [{ path: '~/components', prefix: 'sesame' }],
  },
  appConfig: {
    baseUrl: SESAME_APP_API_URL,
    appManagerVersion: process.env.npm_package_version,
    customSlots: {},
  },
  runtimeConfig: {
    public: {
      release: process.env.npm_package_name + '@' + process.env.npm_package_version,
      socketIoPollingOnly: SOCKET_IO_POLLING_ONLY,
      sentry: {
        dsn: process.env.SESAME_SENTRY_DSN,
      },
    },
  },
  modules: [
    '@sentry/nuxt/module',
    '@nuxt-alt/proxy',
    '@nuxt-alt/auth',
    '@nuxt-alt/http',
    '@pinia/nuxt',
    'nuxt-quasar-ui',
    '@vueuse/nuxt',
    'dayjs-nuxt',
    ...(IS_DEV ? ['@nuxt/devtools'] : []),
    'nuxt-monaco-editor',
    ...setupApp(),
  ],
  proxy: {
    debug: IS_DEV,
    experimental: {
      listener: true,
    },
    proxies: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        ws: true,
        xfwd: true,
        rewrite: (path: string) => path.replace(/^\/api/, ''),
      },
    },
  },
  sentry: {
    autoInjectServerSentry: "top-level-import",
  },
  auth: {
    globalMiddleware: true,
    rewriteRedirects: true,
    watchLoggedIn: true,
    strategies: {
      local: {
        scheme: 'refresh',
        token: {
          property: 'access_token',
          maxAge: 60 * 5,
        },
        refreshToken: {
          property: 'refresh_token',
          data: 'refresh_token',
          maxAge: 60 * 60 * 4,
        },
        user: {
          property: 'user',
          autoFetch: true,
        },
        endpoints: {
          login: {
            url: `/api/core/auth/local`,
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
          },
          refresh: {
            url: `/api/core/auth/refresh`,
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
          },
          logout: { url: `/api/core/auth/logout`, method: 'post' },
          user: { url: `/api/core/auth/session`, method: 'get' },
        },
        autoRefresh: true,
      } as any,
    },
    stores: {
      pinia: {
        enabled: true,
      },
    },
  },
  http: {
    debug: /true|on|yes|1/i.test(`${process.env.DEBUG}`),
    browserBaseURL: '/api',
    baseURL: '/api',
  },
  dayjs: {
    locales: ['fr', 'en'],
    defaultLocale: 'fr',
    defaultTimezone: 'Paris',
    plugins: ['timezone', 'relativeTime'],
  },
  quasar: {
    iconSet: 'mdi-v7',
    plugins: ['Notify', 'Dialog', 'LoadingBar'],
    config: {
      dark: SESAME_APP_DARK_MODE,
      brand: {
        primary: '#1976d2',
        secondary: '#3FC6B5',
        accent: '#9C27B0',
        dark: '#1E1E1E',
        'dark-page': '#121417',
        positive: '#4CAF7A',
        negative: '#E5533D',
        info: '#6B8BA4',
        warning: '#F6C453',
      },
      notify: {
        timeout: 2500,
        position: 'top-right',
        actions: [{ icon: 'mdi-close', color: 'white' }],
      },
      loadingBar: {
        color: 'primary',
        size: '3px',
        position: 'top',
        /** Exclut Socket.IO (`/api/socket.io`) et le polling de synchro / daemon. */
        hijackFilter: loadingBarHijackFilter,
      },
    },
    extras: {
      animations: 'all',
    },
  },
  monacoEditor: {
    locale: 'fr',
    removeSourceMaps: false,
    componentName: {
      codeEditor: 'MonacoEditor',
      diffEditor: 'MonacoDiffEditor',
    },
  },
  vite: {
    server: {
      allowedHosts: ['localhost', ...SESAME_ALLOWED_HOSTS],
      ...(IS_DEV && WEB_HMR_CLIENT_PORT
        ? {
            hmr: {
              clientPort: WEB_HMR_CLIENT_PORT,
            },
          }
        : {}),
    },
    build: {
      // Avoid per-chunk CSS ordering differences between dev/prod.
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (!id.includes('node_modules')) return

            if (id.includes('monaco-editor') || id.includes('nuxt-monaco-editor')) {
              return 'vendor-monaco'
            }

            if (id.includes('@jsonforms/') || id.includes('@tacxou/jsonforms_builder')) {
              return 'vendor-jsonforms'
            }

            if (id.includes('@sentry/')) {
              return 'vendor-sentry'
            }
          },
        },
      },
    },
    define: {
      'process.env.DEBUG': process.env.NODE_ENV === 'development',
    },
    vue: {
      template: {
        preprocessOptions: {
          pug: {
            pretty: IS_DEV,
          },
        },
      },
    },
  },
  alias: {
    cookie: resolve(__dirname, '../node_modules/cookie'),
  },
  build: {
    transpile: [
      'quasar',
    ],
  },
  future: {
    typescriptBundlerResolution: true,
  },
  nitro: {
    experimental: {
      /** Requis par @nuxt-alt/proxy pour ne pas intercepter les upgrades WS. */
      websocket: false,
    },
  },
  experimental: {
    appManifest: false,
  },
  typescript: {
    // typeCheck: 'build,
    shim: false,
    // typeCheck: true,
    // strict: true,
  },
  pinia: {
    storesDirs: ['~/stores'],
  },
  hooks: {
    ready: async (nuxt) => {
      // Nuxt (Nitro) en SPA (`ssr:false`) peut parfois importer un client manifest absent en dev,
      // ce qui casse toutes les requêtes. On crée un stub si nécessaire.
      try {
        const clientManifestPath = resolve(process.cwd(), '.nuxt/dist/server/client.manifest.mjs')
        if (!existsSync(clientManifestPath)) {
          mkdirSync(resolve(process.cwd(), '.nuxt/dist/server'), { recursive: true })
          writeFileSync(clientManifestPath, 'export default {}\\n')
          consola.info('[Nuxt] Created missing client.manifest.mjs stub')
        }
      } catch (error) {
        consola.warn('[Nuxt] Unable to ensure client.manifest.mjs stub', error)
      }

      const forceOpenapiRefresh = /true|on|yes|1/i.test(`${process.env.SESAME_FORCE_OPENAPI_TYPES_REFRESH}`)
      const openapiTypesPath = '.nuxt/types/service-api.d.ts'
      const maxOpenapiTypesAgeMs = 1000 * 60 * 15

      if (!forceOpenapiRefresh && existsSync(openapiTypesPath)) {
        const ageMs = Date.now() - statSync(openapiTypesPath).mtimeMs
        if (ageMs < maxOpenapiTypesAgeMs) {
          console.log('[OpenapiTS] Skip generation (cache still fresh).')
          return
        }
      }

      console.log('[OpenapiTS] Generating .nuxt/types/service-api.d.ts...')
      try {
        const fileData = await openapiTS(`${SESAME_APP_API_URL}/swagger/json`)
        writeFileSync(openapiTypesPath, `${COMMENT_HEADER}${astToString(fileData)}`)
        console.log('[OpenapiTS] Generated .nuxt/types/service-api.d.ts !')
      } catch (error) {
        console.debug('[OpenapiTS] Error while generating .nuxt/types/service-api.d.ts', error)
      }
    },
  },
})
