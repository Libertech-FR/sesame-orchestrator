<template>
  <q-page class="container q-px-md">
      <sesame-searchfilters :fields="fieldsList"></sesame-searchfilters>
    <q-table
      flat bordered
      title="Identités"
      dense
      :rows="rows1"
      :columns="fieldsName"
      row-key="_id"
      :rows-per-page-options="[20,50,0]"
    >
      <template v-slot:top-left>

        <q-select outlined v-model="typeExport" :options="optionsExport" label="Format d'export" dense  style="width:150px;"/>
        <q-btn color="positive" icon="mdi-cloud-download" size="md" flat @click="exportData" dense>
          Exporter

        </q-btn>
      </template>
    </q-table>
  </q-page>
</template>

<script lang="ts" setup>
import {computed, onMounted, provide, ref} from "vue";
import {useRoute} from "nuxt/app";
const route = useRoute()
const { columns, visibleColumns, columnsType } = useColumnsIdentites()
const typeExport=ref('CSV')
const optionsExport=ref(['CSV','JSON'])
let rowsData=null

// prise de la requete qui est dans l'url mise par le filtre
const queryWithoutRead = computed(() => {
  const { read, ...rest } = route.query
  return {
    limit: 9999,
    ...rest,
  }
})
const { data: fieldsName, pending1, error1} = await useHttp('/management/identities/validation', {
  method: 'GET',
  transform: (result)=>{
    const allFields=result.data.flatMap((enr)=>{
      return Object.keys(enr[enr.name].properties)
    })

    return allFields.map((enr)=>{
      return {name:enr,field:enr,label:enr,align: 'left',format: (value) => {return Array.isArray(value) ? value?.join(', ') : value}}
    })
  }
});

const { data: rows1, pending, error, refresh } = await useHttp('/management/identities?sort[inetOrgPerson.cn]=asc', {
    method: 'GET',
    query:queryWithoutRead,
    transform: (result)=>{
      rowsData=result
      const allFields=result.data.map((enr)=>{
        let addF={}
        for (const [key, value] of Object.entries(enr?.additionalFields?.attributes||{})) {
          addF = {...addF, ...value}
        }
        const step1={...enr.inetOrgPerson,...addF}
        return step1
      })
      return allFields
    }
  });



const fieldsList = computed(() => {
  return columns.value!.reduce((acc: { name: string; label: string; type?: string }[], column) => {
    if (visibleColumns.value!.includes(column.name) && column.name !== 'actions' && column.name !== 'states') {
      const type = columnsType.value.find((type) => type.name === column.name)?.type
      acc.push({
        name: column.name,
        label: column.label,
        type,
      })
    }
    return acc
  }, [])
})

async function exportData(){
  if (typeExport.value === 'CSV'){
    const csv=toCsv(fieldsName,rows1)
    let blob=new Blob([csv],{type:'text/csv'})
    let link=document.createElement('a')
    link.href=window.URL.createObjectURL(blob)
    link.download="sesame-export.csv"
    link.click()
  }else if(typeExport.value === 'JSON'){
    let blob=new Blob([JSON.stringify(rowsData)],{type:'text/json'})
    let link=document.createElement('a')
    link.href=window.URL.createObjectURL(blob)
    link.download="sesame-export.json"
    link.click()

  }

}
function toCsv(fields,rows){
  const f=[]
  const fString=[]
  for (const [key,value] of Object.entries(fields.value)){
    f.push(value.name )
    fString.push('"' +value.name + '"')
  }
  let csv=f.join(';')
  debugger
  const tabCsv=[]
  for (const [key,value] of Object.entries(rows.value)){
    const ligne=f.map((k)=>{
      if (typeof value[k] === 'string' || typeof value[k] === 'number'){
        return '"' + value[k] +'"'
      }else if (Array.isArray( value[k])){
        return   value[k].join(',')
      }else{
        return ""
      }
    })
    tabCsv.push(ligne.join(';'))
  }
  tabCsv.unshift(fString.join(';'))
  return tabCsv.join("\r\n")
}

provide('fieldsList', fieldsList.value)

</script>
