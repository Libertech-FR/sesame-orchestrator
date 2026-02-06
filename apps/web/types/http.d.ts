import type { FetchInstance } from '@refactorjs/ofetch'

declare global {
  var $http: FetchInstance
  namespace NodeJS {
    interface Global {
      $http: FetchInstance
    }
  }
}

declare module '#app' {
  interface NuxtApp {
    $http: FetchInstance
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $http: FetchInstance
  }
}

export { }
