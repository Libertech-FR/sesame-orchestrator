import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import pugPlugin from 'vite-plugin-pug'
import openapiTS from 'openapi-typescript'
import { defineNuxtConfig } from 'nuxt/config'
import { parse } from 'yaml'
import * as consola from 'consola'
import setupApp from './src/server/extension.setup'

const SESAME_APP_API_URL = process.env.SESAME_APP_API_URL || 'http://localhost:4002'
const SESAME_ALLOWED_HOSTS = process.env.SESAME_ALLOWED_HOSTS ? process.env.SESAME_ALLOWED_HOSTS.split(',') : []

if (SESAME_ALLOWED_HOSTS.length === 0 && !/localhost/.test(SESAME_APP_API_URL) && process.env.NODE_ENV === 'development') {
  SESAME_ALLOWED_HOSTS.push(new URL(SESAME_APP_API_URL).hostname)
}

consola.info(`[Nuxt] SESAME_APP_API_URL: ${SESAME_APP_API_URL}`)
consola.info(`[Nuxt] SESAME_ALLOWED_HOSTS: ${SESAME_ALLOWED_HOSTS}`)

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
  devServer: {
    port: 3000,
    ...sslCfg,
  },
  devtools: {
    enabled: process.env.NODE_ENV === 'development',
    timeline: {
      enabled: true,
    },
  },
  css: ['~/assets/sass/global.sass'],
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
  modules: [
    '@nuxt-alt/auth',
    '@nuxt-alt/proxy',
    '@nuxt-alt/http',
    '@pinia/nuxt',
    'nuxt-quasar-ui',
    '@vueuse/nuxt',
    'dayjs-nuxt',
    '@nuxt/devtools',
    'nuxt-monaco-editor',
    ...setupApp(),
  ],
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
        redirect: {
          logout: '/login',
          login: '/',
        },
        tokenType: 'Bearer',
        autoRefresh: true,
      },
    },
    stores: {
      pinia: {
        enabled: true,
      },
    },
  },
  proxy: {
    https: false,
    proxies: {
      '/api': {
        rewrite: (path: string) => path.replace(/^\/api/, ''),
        target: SESAME_APP_API_URL,
        secure: false,
        changeOrigin: true,
        xfwd: true,
      }
    },
    cors: false,
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
    plugins: ['Notify', 'Dialog'],
    config: {
      dark: SESAME_APP_DARK_MODE,
      notify: {
        timeout: 2500,
        position: 'top-right',
        actions: [{ icon: 'mdi-close', color: 'white' }],
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
    },
    define: {
      'process.env.DEBUG': process.env.NODE_ENV === 'development',
    },
    plugins: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pugPlugin(<any>{
        pretty: true,
        compilerOptions: {},
      }),
    ],
  },
  alias: {
    cookie: resolve(__dirname, '../node_modules/cookie'),
  },
  future: {
    typescriptBundlerResolution: true,
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
      try {
        const menus = parse(readFileSync('./config/menus.yml', 'utf8') || '{}')
        nuxt.options.appConfig.menus = { ...menus || {} }
      } catch (error) {
        console.debug('[Nuxt] Error while reading menus.yml', error)
      }

      try {
        const identitiesColumns = parse(readFileSync('./config/identities-columns.yml', 'utf8') || '{}')
        nuxt.options.appConfig.identitiesColumns = { ...identitiesColumns || {} }
      } catch (error) {
        console.debug('[Nuxt] Error while reading identities-columns.yml', error)
      }

      console.log('[OpenapiTS] Generating .nuxt/types/service-api.d.ts...')
      try {
        const fileData = await openapiTS(`${SESAME_APP_API_URL}/swagger/json`)
        writeFileSync('.nuxt/types/service-api.d.ts', fileData)
        console.log('[OpenapiTS] Generated .nuxt/types/service-api.d.ts !')
      } catch (error) {
        console.debug('[OpenapiTS] Error while generating .nuxt/types/service-api.d.ts', error)
      }
    },
  },
})
