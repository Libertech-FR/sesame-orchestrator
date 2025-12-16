<template>
  <q-dialog :model-value="true" full-width persistent>
    <div class="q-pa-md">
      <q-layout view="hHh Lpr lff" container style="height: 800px" class="shadow-2 rounded-borders">
        <q-header elevated class="bg-primary">
          <q-toolbar>
            <q-btn flat @click="drawer = !drawer" round dense icon="mdi-menu" />
            <q-toolbar-title>Paramètres</q-toolbar-title>
            <q-btn icon="mdi-close" flat round dense @click="$router.push('/')" />
          </q-toolbar>
        </q-header>
        <q-drawer v-model="drawer" show-if-above :width="200" :breakpoint="500" bordered :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-3'">
          <q-scroll-area class="fit">
            <q-list>
              <q-item v-for="item in navItems" :key="item.route" clickable @click="$router.push(item.route)" :active="$route.path === item.route">
                <q-item-section avatar>
                  <q-icon :name="item.icon" />
                </q-item-section>
                <q-item-section> {{ item.label }} </q-item-section>
              </q-item>
            </q-list>
          </q-scroll-area>
        </q-drawer>

        <q-page-container>
          <q-page padding :class="$q.dark.isActive ? 'bg-black' : 'bg-white'">
            <nuxt-page></nuxt-page>
          </q-page>
        </q-page-container>
      </q-layout>
    </div>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'
const drawer = ref(false)

const navItems = [
  { route: '/settings/agents', icon: 'mdi-account', label: 'Utilisateurs' },
  { route: '/settings/password-policy', icon: 'mdi-form-textbox-password', label: 'Politique de mot de passe' },
  { route: '/settings/smtp', icon: 'mdi-mail', label: 'Serveur SMTP' },
  { route: '/settings/sms', icon: 'mdi-message-processing', label: 'Serveur SMS' },
  { route: '/settings/cron', icon: 'mdi-clipboard-list', label: 'Tâches planifiés' },
]
</script>
