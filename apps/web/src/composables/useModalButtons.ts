export const useModalButtons = () => {
  const cancelButton = ref({
    color: 'negative',
    label: 'Annuler',
    push: true,
  })

  const saveButton = ref({
      color: 'positive',
      label: 'Enregistrer',
      push: true,
  })

  const cancelDeleteButton = ref({
      color: 'positive',
      label: 'Annuler',
      push: true,
  })

  const deleteButton = ref({
      color: 'negative',
      label: 'Supprimer',
      push: true,
  })

  const confirmButton = ref({
      color: 'orange-8',
      label: 'Ok !',
      push: true,
  })

  return {
    cancelButton,
    saveButton,
    cancelDeleteButton,
    deleteButton,
    confirmButton,
  }
}