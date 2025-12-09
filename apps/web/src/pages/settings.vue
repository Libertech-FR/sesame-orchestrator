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
              <q-item clickable @click="$router.push('/settings/agents')">
                <q-item-section avatar>
                  <q-icon name="mdi-account" />
                </q-item-section>
                <q-item-section> Utilisateurs </q-item-section>
              </q-item>
            </q-list>
            <q-list>
              <q-item clickable @click="$router.push('/settings/password-policy')">
                <q-item-section avatar>
                  <q-icon name="mdi-form-textbox-password" />
                </q-item-section>
                <q-item-section> Politique de mot de passe </q-item-section>
              </q-item>
            </q-list>
            <q-list>
              <q-item clickable @click="$router.push('/settings/smtp')">
                <q-item-section avatar>
                  <q-icon name="mdi-mail" />
                </q-item-section>
                <q-item-section> Serveur SMTP </q-item-section>
              </q-item>
            </q-list>
            <q-list>
              <q-item clickable @click="$router.push('/settings/sms')">
                <q-item-section avatar>
                  <q-icon name="mdi-message-processing" />
                </q-item-section>
                <q-item-section> Serveur SMS </q-item-section>
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
</script>
