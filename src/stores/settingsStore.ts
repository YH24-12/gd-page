import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const doubaoApiKey = ref<string>('')
  const amapApiKey = ref<string>('')
  const enableAIGenerate = ref(true)
  const enableRouteOptimize = ref(true)
  const enableWeatherAlert = ref(true)
  const enableTrafficAlert = ref(true)

  function loadFromStorage() {
    const stored = localStorage.getItem('calendar_settings')
    if (stored) {
      const settings = JSON.parse(stored)
      doubaoApiKey.value = settings.doubaoApiKey || ''
      amapApiKey.value = settings.amapApiKey || ''
      enableAIGenerate.value = settings.enableAIGenerate ?? true
      enableRouteOptimize.value = settings.enableRouteOptimize ?? true
      enableWeatherAlert.value = settings.enableWeatherAlert ?? true
      enableTrafficAlert.value = settings.enableTrafficAlert ?? true
    }
  }

  function saveToStorage() {
    localStorage.setItem('calendar_settings', JSON.stringify({
      doubaoApiKey: doubaoApiKey.value,
      amapApiKey: amapApiKey.value,
      enableAIGenerate: enableAIGenerate.value,
      enableRouteOptimize: enableRouteOptimize.value,
      enableWeatherAlert: enableWeatherAlert.value,
      enableTrafficAlert: enableTrafficAlert.value
    }))
  }

  function updateSettings(settings: Partial<{
    doubaoApiKey: string; amapApiKey: string;
    enableAIGenerate: boolean; enableRouteOptimize: boolean;
    enableWeatherAlert: boolean; enableTrafficAlert: boolean
  }>) {
    if (settings.doubaoApiKey !== undefined) doubaoApiKey.value = settings.doubaoApiKey
    if (settings.amapApiKey !== undefined) amapApiKey.value = settings.amapApiKey
    if (settings.enableAIGenerate !== undefined) enableAIGenerate.value = settings.enableAIGenerate
    if (settings.enableRouteOptimize !== undefined) enableRouteOptimize.value = settings.enableRouteOptimize
    if (settings.enableWeatherAlert !== undefined) enableWeatherAlert.value = settings.enableWeatherAlert
    if (settings.enableTrafficAlert !== undefined) enableTrafficAlert.value = settings.enableTrafficAlert
    saveToStorage()
  }

  loadFromStorage()
  return { doubaoApiKey, amapApiKey, enableAIGenerate, enableRouteOptimize, enableWeatherAlert, enableTrafficAlert, updateSettings }
})
