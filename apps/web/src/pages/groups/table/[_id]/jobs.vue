<template lang="pug">
identities-jobs
</template>

<script lang="ts">
// Même journal que pour les identités : les jobs GROUP_* sont rattachés au groupe via `concernedTo.id`
import IdentitiesJobs from '~/pages/identities/table/[_id]/jobs.vue'

export default defineNuxtComponent({
  name: 'GroupsTableIdJobsPage',
  components: { IdentitiesJobs },
})
</script>
