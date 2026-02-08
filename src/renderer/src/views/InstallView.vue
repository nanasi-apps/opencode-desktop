<template>
  <div class="install-view">
    <div class="install-container">
      <h1 class="title">{{ t('install.title') }}</h1>
      <p class="subtitle">{{ t('install.subtitle') }}</p>

      <!-- Mode Selection -->
      <div v-if="currentStep === 'mode'" class="mode-selection">
        <div class="mode-cards">
          <button class="mode-card" @click="selectMode('auto')">
            <div class="mode-icon">🚀</div>
            <h3>{{ t('install.mode.auto.title') }}</h3>
            <p>{{ t('install.mode.auto.subtitle') }}</p>
            <ul class="mode-features">
              <li>{{ t('install.mode.auto.featureHomebrew') }}</li>
              <li>{{ t('install.mode.auto.featureOmoDefaults') }}</li>
              <li>{{ t('install.mode.auto.featureNoConfig') }}</li>
            </ul>
          </button>

          <button class="mode-card" @click="selectMode('advanced')">
            <div class="mode-icon">⚙️</div>
            <h3>{{ t('install.mode.advanced.title') }}</h3>
            <p>{{ t('install.mode.advanced.subtitle') }}</p>
            <ul class="mode-features">
              <li>{{ t('install.mode.advanced.featurePackageManager') }}</li>
              <li>{{ t('install.mode.advanced.featureSubscriptions') }}</li>
              <li>{{ t('install.mode.advanced.featureCustomization') }}</li>
            </ul>
          </button>
        </div>
      </div>

      <!-- Auto Configuration -->
      <div v-else-if="currentStep === 'auto-config'" class="advanced-config">
        <h2 class="section-title">{{ t('install.auto.title') }}</h2>

        <div class="config-section">
          <div class="option-group">
            <h3>{{ t('install.advanced.claudeSubscription') }}</h3>
            <label class="option-label">
              <input
                v-model="config.omoOptions.claude"
                type="radio"
                value="no"
              />
              <span class="radio-text">{{ t('install.advanced.noSubscription') }}</span>
            </label>
            <label class="option-label">
              <input
                v-model="config.omoOptions.claude"
                type="radio"
                value="yes"
              />
              <span class="radio-text">{{ t('install.advanced.proMaxSubscription') }}</span>
            </label>
            <label class="option-label">
              <input
                v-model="config.omoOptions.claude"
                type="radio"
                value="max20"
              />
              <span class="radio-text">{{ t('install.advanced.max20') }}</span>
            </label>
          </div>
          <div class="toggle-option">
            <span class="toggle-label">{{ t('install.advanced.googleGemini') }}</span>
            <Checkbox v-model:checked="geminiEnabled" />
          </div>
          <div class="toggle-option">
            <span class="toggle-label">{{ t('install.advanced.openCodeZen') }}</span>
            <Checkbox v-model:checked="opencodeZenEnabled" />
          </div>
          <div class="toggle-option">
            <span class="toggle-label">{{ t('install.advanced.zaiCodingPlan') }}</span>
            <Checkbox v-model:checked="zaiEnabled" />
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-secondary" @click="currentStep = 'mode'">{{ t('install.back') }}</button>
          <button class="btn btn-primary" @click="startAutoInstall">{{ t('install.startInstallation') }}</button>
        </div>
      </div>

      <!-- Advanced Configuration -->
      <div v-else-if="currentStep === 'advanced-config'" class="advanced-config">
        <h2 class="section-title">{{ t('install.advanced.title') }}</h2>

        <!-- Package Manager Selection -->
        <div class="config-section">
          <h3>{{ t('install.advanced.packageManager') }}</h3>
          <div class="option-group">
            <label class="option-label">
              <input
                v-model="config.packageManager"
                type="radio"
                value="brew"
              />
              <span class="radio-text">{{ t('install.advanced.homebrewRecommended') }}</span>
            </label>
            <label class="option-label">
              <input
                v-model="config.packageManager"
                type="radio"
                value="npm"
              />
              <span class="radio-text">{{ t('install.advanced.npm') }}</span>
            </label>
          </div>
        </div>

        <!-- Claude Configuration -->
        <div class="config-section">
          <h3>{{ t('install.advanced.claudeSubscription') }}</h3>
          <div class="option-group">
            <label class="option-label">
              <input
                v-model="config.omoOptions.claude"
                type="radio"
                value="no"
              />
              <span class="radio-text">{{ t('install.advanced.noSubscription') }}</span>
            </label>
            <label class="option-label">
              <input
                v-model="config.omoOptions.claude"
                type="radio"
                value="yes"
              />
              <span class="radio-text">{{ t('install.advanced.proMaxSubscription') }}</span>
            </label>
            <label class="option-label">
              <input
                v-model="config.omoOptions.claude"
                type="radio"
                value="max20"
              />
              <span class="radio-text">{{ t('install.advanced.max20') }}</span>
            </label>
          </div>
          <p v-if="config.omoOptions.claude === 'no'" class="warning-text">
            {{ t('install.advanced.warningNoClaudeSubscription') }}
          </p>
        </div>

        <!-- Other Providers -->
        <div class="config-section">
          <h3>{{ t('install.advanced.otherAiProviders') }}</h3>

          <div class="toggle-option">
            <span class="toggle-label">{{ t('install.advanced.googleGemini') }}</span>
            <Checkbox v-model:checked="geminiEnabled" />
          </div>

          <div class="toggle-option">
            <span class="toggle-label">{{ t('install.advanced.openCodeZen') }}</span>
            <Checkbox v-model:checked="opencodeZenEnabled" />
          </div>

          <div class="toggle-option">
            <span class="toggle-label">{{ t('install.advanced.zaiCodingPlan') }}</span>
            <Checkbox v-model:checked="zaiEnabled" />
          </div>
        </div>

        <div class="config-actions">
          <button class="btn btn-secondary" @click="currentStep = 'mode'">{{ t('install.back') }}</button>
          <button class="btn btn-primary" @click="startAdvancedInstall">{{ t('install.startInstallation') }}</button>
        </div>
      </div>

      <!-- Installation Progress -->
      <div v-else-if="currentStep === 'installing'" class="install-progress">
        <div class="progress-overview">
          <div class="progress-overview-row">
            <span>{{ t('install.progress.overall', { percent: overallProgressPercent }) }}</span>
            <span>{{ overallProgressPercent }}%</span>
          </div>
          <div class="overall-progress-bar" role="progressbar" :aria-valuenow="overallProgressPercent" aria-valuemin="0" aria-valuemax="100">
            <div class="overall-progress-fill" :style="{ width: `${overallProgressPercent}%` }" />
          </div>
          <div class="current-step-text">
            {{ t('install.progress.currentStep', { step: currentInstallingStepName }) }}
          </div>
        </div>

        <div class="progress-step" :class="{ active: installStep === 'homebrew', completed: homebrewInstalled || installStep !== 'homebrew' }">
          <StatusIndicator :status="homebrewStatus" />
          <span class="step-name">{{ t('install.steps.homebrew') }}</span>
          <span class="step-status">{{ homebrewStatusText }}</span>
        </div>

        <div class="progress-step" :class="{ active: installStep === 'opencode', completed: opencodeInstalled }">
          <StatusIndicator :status="opencodeStatus" />
          <span class="step-name">{{ t('install.steps.openCode') }}</span>
          <span class="step-status">{{ opencodeStatusText }}</span>
        </div>

        <div class="progress-step" :class="{ active: installStep === 'omo', completed: omoInstalled }">
          <StatusIndicator :status="omoStatus" />
          <span class="step-name">{{ t('install.steps.ohMyOpenCode') }}</span>
          <span class="step-status">{{ omoStatusText }}</span>
        </div>

        <div v-if="installError" class="error-message">
          {{ installError }}
        </div>
        <div v-if="installError" class="error-actions">
          <button class="btn btn-primary" @click="retryInstall">{{ t('install.retry') }}</button>
          <button class="btn btn-secondary" @click="currentStep = 'mode'">{{ t('install.back') }}</button>
        </div>

        <div class="live-output">
          <div class="live-output-header">
            <span>{{ t('install.progress.liveOutput') }}</span>
            <span v-if="liveInstallPercent !== null">{{ t('install.progress.downloadProgress', { percent: liveInstallPercent }) }}</span>
          </div>
          <pre ref="liveOutputBodyRef" class="live-output-body">{{ visibleInstallOutput }}</pre>
        </div>
      </div>

      <!-- Completion -->
      <div v-else-if="currentStep === 'complete'" class="install-complete">
        <div class="success-icon">✓</div>
        <h2>{{ t('install.complete.title') }}</h2>
        <p>{{ t('install.complete.subtitle') }}</p>
        <div class="startup-choice">
          <p class="startup-choice-title">{{ t('install.complete.autoLaunchQuestion') }}</p>
          <label class="startup-option">
            <input v-model="autoStartWeb" type="radio" :value="true" />
            <span>{{ t('install.complete.autoLaunchYes') }}</span>
          </label>
          <label class="startup-option">
            <input v-model="autoStartWeb" type="radio" :value="false" />
            <span>{{ t('install.complete.autoLaunchNo') }}</span>
          </label>
        </div>
        <button class="btn btn-primary" @click="goToMain">{{ t('install.complete.startUsing') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { clientReady } from '../rpc/client.js'
import StatusIndicator from '../components/StatusIndicator.vue'
import Checkbox from '../components/Checkbox.vue'
import type { InstallStatus } from '../../../shared/types.js'
import type { OmoInstallOptions, PackageManager, InstallConfig } from '../../../shared/types.js'

const router = useRouter()
const { t } = useI18n()

type Step = 'mode' | 'auto-config' | 'advanced-config' | 'installing' | 'complete'
type InstallStep = 'homebrew' | 'opencode' | 'omo'

const currentStep = ref<Step>('mode')
const installStep = ref<InstallStep>('homebrew')

const config = ref<InstallConfig>({
  mode: 'auto',
  packageManager: 'brew',
  omoOptions: {
    claude: 'no',
    openai: 'no',
    gemini: 'no',
    copilot: 'no',
    opencodeZen: 'no',
    zaiCodingPlan: 'no',
  },
})

const geminiEnabled = computed({
  get: () => config.value.omoOptions.gemini === 'yes',
  set: (v) => { config.value.omoOptions.gemini = v ? 'yes' : 'no' },
})

const opencodeZenEnabled = computed({
  get: () => config.value.omoOptions.opencodeZen === 'yes',
  set: (v) => { config.value.omoOptions.opencodeZen = v ? 'yes' : 'no' },
})

const zaiEnabled = computed({
  get: () => config.value.omoOptions.zaiCodingPlan === 'yes',
  set: (v) => { config.value.omoOptions.zaiCodingPlan = v ? 'yes' : 'no' },
})

const homebrewStatus = ref<InstallStatus>('idle')
const opencodeStatus = ref<InstallStatus>('idle')
const omoStatus = ref<InstallStatus>('idle')
const installError = ref<string | null>(null)
const autoStartWeb = ref(true)
const liveInstallOutput = ref('')
const liveInstallPercent = ref<number | null>(null)
const liveOutputBodyRef = ref<HTMLElement | null>(null)
let installProgressPollTimer: ReturnType<typeof setInterval> | null = null

const homebrewInstalled = computed(() => homebrewStatus.value === 'installed')
const opencodeInstalled = computed(() => opencodeStatus.value === 'installed')
const omoInstalled = computed(() => omoStatus.value === 'installed')

function installStatusToProgress(status: InstallStatus): number {
  switch (status) {
    case 'idle': return 0
    case 'checking': return 0.2
    case 'installing': return 0.6
    case 'installed':
    case 'error':
      return 1
  }
}

const overallProgressPercent = computed(() => {
  const total = installStatusToProgress(homebrewStatus.value)
    + installStatusToProgress(opencodeStatus.value)
    + installStatusToProgress(omoStatus.value)
  return Math.round((total / 3) * 100)
})

const currentInstallingStepName = computed(() => {
  switch (installStep.value) {
    case 'homebrew': return t('install.steps.homebrew')
    case 'opencode': return t('install.steps.openCode')
    case 'omo': return t('install.steps.ohMyOpenCode')
  }
})

const visibleInstallOutput = computed(() => {
  if (!liveInstallOutput.value) {
    return t('install.progress.waitingForOutput')
  }
  return liveInstallOutput.value
})

function inferPercentFromOutput(output: string): number | null {
  const percentMatches = [...output.matchAll(/(\d{1,3}(?:\.\d+)?)%/g)]
  for (let i = percentMatches.length - 1; i >= 0; i -= 1) {
    const value = Number.parseFloat(percentMatches[i]?.[1] ?? '')
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      return Math.round(value)
    }
  }
  return null
}

function stopInstallProgressPolling() {
  if (installProgressPollTimer) {
    clearInterval(installProgressPollTimer)
    installProgressPollTimer = null
  }
}

watch(liveInstallOutput, async () => {
  await nextTick()
  const el = liveOutputBodyRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
})

onBeforeUnmount(() => {
  stopInstallProgressPolling()
})

async function startInstallProgressPolling(
  client: Awaited<typeof clientReady>,
  target: 'homebrew' | 'opencode' | 'omo',
) {
  stopInstallProgressPolling()
  liveInstallOutput.value = ''
  liveInstallPercent.value = null

  const tick = async () => {
    try {
      const progress = await client.installer.getInstallProgress({ target })
      liveInstallOutput.value = progress.output
      liveInstallPercent.value = inferPercentFromOutput(progress.output)
    } catch {
      // ignore polling errors during transition
    }
  }

  await tick()
  installProgressPollTimer = setInterval(() => {
    void tick()
  }, 500)
}

async function stopInstallProgressPollingAndRefresh(
  client: Awaited<typeof clientReady>,
  target: 'homebrew' | 'opencode' | 'omo',
) {
  stopInstallProgressPolling()
  try {
    const progress = await client.installer.getInstallProgress({ target })
    liveInstallOutput.value = progress.output
    liveInstallPercent.value = inferPercentFromOutput(progress.output)
  } catch {
    // no-op
  }
}

const homebrewStatusText = computed(() => {
  switch (homebrewStatus.value) {
    case 'idle': return t('install.status.waiting')
    case 'checking': return t('install.status.checking')
    case 'installing': return t('install.status.installing')
    case 'installed': return t('install.status.installed')
    case 'error': return t('install.status.failed')
  }
})

const opencodeStatusText = computed(() => {
  switch (opencodeStatus.value) {
    case 'idle': return t('install.status.waiting')
    case 'checking': return t('install.status.checking')
    case 'installing': return t('install.status.installing')
    case 'installed': return t('install.status.installed')
    case 'error': return t('install.status.failed')
  }
})

const omoStatusText = computed(() => {
  switch (omoStatus.value) {
    case 'idle': return t('install.status.waiting')
    case 'checking': return t('install.status.checking')
    case 'installing': return t('install.status.installing')
    case 'installed': return t('install.status.installed')
    case 'error': return t('install.status.failed')
  }
})

function selectMode(mode: 'auto' | 'advanced') {
  config.value.mode = mode
  if (mode === 'auto') {
    currentStep.value = 'auto-config'
  } else {
    currentStep.value = 'advanced-config'
  }
}

async function startAutoInstall() {
  stopInstallProgressPolling()
  currentStep.value = 'installing'
  installError.value = null
  liveInstallOutput.value = ''
  liveInstallPercent.value = null

  try {
    const client = await clientReady

    // Step 1: Check/Install Homebrew
    installStep.value = 'homebrew'
    homebrewStatus.value = 'checking'
    const homebrewCheck = await client.installer.checkHomebrew()

    if (!homebrewCheck.installed) {
      homebrewStatus.value = 'installing'
      await startInstallProgressPolling(client, 'homebrew')
      const homebrewResult = await client.installer.installHomebrew()
      await stopInstallProgressPollingAndRefresh(client, 'homebrew')
      if (!homebrewResult.success) {
        homebrewStatus.value = 'error'
        installError.value = t('install.errors.homebrewFailed', { output: homebrewResult.output })
        return
      }
    }
    homebrewStatus.value = 'installed'

    // Step 2: Install OpenCode via Homebrew
    installStep.value = 'opencode'
    opencodeStatus.value = 'checking'
    const opencodeCheck = await client.installer.checkOpencode()

    if (!opencodeCheck.installed) {
      opencodeStatus.value = 'installing'
      await startInstallProgressPolling(client, 'opencode')
      const opencodeResult = await client.installer.installOpencodeViaBrew()
      await stopInstallProgressPollingAndRefresh(client, 'opencode')
      if (!opencodeResult.success) {
        opencodeStatus.value = 'error'
        installError.value = t('install.errors.openCodeFailed', { output: opencodeResult.output })
        return
      }
    }
    opencodeStatus.value = 'installed'

    // Step 3: Install Oh My OpenCode with defaults
    installStep.value = 'omo'
    omoStatus.value = 'checking'
    const omoCheck = await client.installer.checkOmo()

    if (!omoCheck.installed) {
      omoStatus.value = 'installing'
      await startInstallProgressPolling(client, 'omo')
      const omoResult = await client.installer.installOmoWithOptions({
        options: config.value.omoOptions,
        packageManager: 'auto',
      })
      await stopInstallProgressPollingAndRefresh(client, 'omo')
      if (!omoResult.success) {
        omoStatus.value = 'error'
        installError.value = t('install.errors.ohMyOpenCodeFailed', { output: omoResult.output })
        return
      }
    }
    omoStatus.value = 'installed'

    currentStep.value = 'complete'
  } catch (err) {
    stopInstallProgressPolling()
    installError.value = err instanceof Error ? err.message : String(err)
  }
}

async function startAdvancedInstall() {
  stopInstallProgressPolling()
  currentStep.value = 'installing'
  installError.value = null
  liveInstallOutput.value = ''
  liveInstallPercent.value = null

  try {
    const client = await clientReady
    const pkgManager = config.value.packageManager || 'brew'

    // Step 1: Check/Install Homebrew if using brew
    if (pkgManager === 'brew') {
      installStep.value = 'homebrew'
      homebrewStatus.value = 'checking'
      const homebrewCheck = await client.installer.checkHomebrew()

      if (!homebrewCheck.installed) {
        homebrewStatus.value = 'installing'
        await startInstallProgressPolling(client, 'homebrew')
        const homebrewResult = await client.installer.installHomebrew()
        await stopInstallProgressPollingAndRefresh(client, 'homebrew')
        if (!homebrewResult.success) {
          homebrewStatus.value = 'error'
          installError.value = t('install.errors.homebrewFailed', { output: homebrewResult.output })
          return
        }
      }
      homebrewStatus.value = 'installed'
    } else {
      homebrewStatus.value = 'installed'
    }

    // Step 2: Install OpenCode
    installStep.value = 'opencode'
    opencodeStatus.value = 'checking'
    const opencodeCheck = await client.installer.checkOpencode()

    if (!opencodeCheck.installed) {
      opencodeStatus.value = 'installing'
      await startInstallProgressPolling(client, 'opencode')
      let opencodeResult
      if (pkgManager === 'brew') {
        opencodeResult = await client.installer.installOpencodeViaBrew()
      } else {
        opencodeResult = await client.installer.installOpencode()
      }
      await stopInstallProgressPollingAndRefresh(client, 'opencode')
      if (!opencodeResult.success) {
        opencodeStatus.value = 'error'
        installError.value = t('install.errors.openCodeFailed', { output: opencodeResult.output })
        return
      }
    }
    opencodeStatus.value = 'installed'

    // Step 3: Install Oh My OpenCode with custom options
    installStep.value = 'omo'
    omoStatus.value = 'checking'
    const omoCheck = await client.installer.checkOmo()

    if (!omoCheck.installed) {
      omoStatus.value = 'installing'
      await startInstallProgressPolling(client, 'omo')
      const omoResult = await client.installer.installOmoWithOptions({
        options: config.value.omoOptions,
        packageManager: 'auto',
      })
      await stopInstallProgressPollingAndRefresh(client, 'omo')
      if (!omoResult.success) {
        omoStatus.value = 'error'
        installError.value = t('install.errors.ohMyOpenCodeFailed', { output: omoResult.output })
        return
      }
    }
    omoStatus.value = 'installed'

    currentStep.value = 'complete'
  } catch (err) {
    stopInstallProgressPolling()
    installError.value = err instanceof Error ? err.message : String(err)
  }
}

async function retryInstall() {
  stopInstallProgressPolling()
  installError.value = null
  if (config.value.mode === 'advanced') {
    await startAdvancedInstall()
    return
  }
  await startAutoInstall()
}

async function goToMain() {
  const client = await clientReady

  if (!autoStartWeb.value) {
    await client.setup.recordSetupSuccess({
      port: null,
      autoStartWeb: false,
      webStarted: false,
    })
    router.replace('/main')
    return
  }

  router.replace('/setup')
}
</script>

<style scoped>
.install-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #131010;
}

.install-container {
  width: 600px;
  max-width: min(600px, 100%);
  max-height: min(92vh, 900px);
  padding: 40px;
  overflow-y: auto;
}

@media (max-width: 720px) {
  .install-container {
    padding: 24px;
  }
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: #f5efea;
  margin-bottom: 8px;
  text-align: center;
}

.subtitle {
  font-size: 14px;
  color: #8d7d73;
  margin-bottom: 32px;
  text-align: center;
}

/* Mode Selection */
.mode-selection {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mode-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.mode-card {
  background: #1f1a18;
  border: 1px solid #3f3431;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.mode-card:hover {
  border-color: #5a4b47;
  background: #2a2321;
}

.mode-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.mode-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #f5efea;
  margin-bottom: 8px;
}

.mode-card p {
  font-size: 13px;
  color: #b8aaa1;
  margin-bottom: 12px;
}

.mode-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.mode-features li {
  font-size: 12px;
  color: #8d7d73;
  padding: 4px 0;
  padding-left: 16px;
  position: relative;
}

.mode-features li::before {
  content: "•";
  position: absolute;
  left: 4px;
  color: #4ade80;
}

/* Advanced Config */
.advanced-config {
  background: #1f1a18;
  border: 1px solid #3f3431;
  border-radius: 12px;
  padding: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #f5efea;
  margin-bottom: 24px;
}

.config-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #3f3431;
}

.config-section:last-of-type {
  border-bottom: none;
}

.config-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: #e7ddd6;
  margin-bottom: 12px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.15s;
}

.option-label:hover {
  background: #2a2321;
}

.radio-text {
  font-size: 13px;
  color: #ddd1c8;
}

.warning-text {
  font-size: 12px;
  color: #fca5a5;
  margin-top: 8px;
  padding: 8px;
  background: rgba(220, 38, 38, 0.2);
  border-radius: 6px;
}

/* Toggle Switch */
.toggle-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
}

.toggle-label {
  font-size: 13px;
  color: #ddd1c8;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #3f3431;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #b8aaa1;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #4ade80;
}

input:checked + .slider:before {
  transform: translateX(20px);
  background-color: white;
}

/* Config Actions */
.config-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-primary {
  background: #4ade80;
  color: #064e3b;
}

.btn-primary:hover {
  background: #22c55e;
}

.btn-secondary {
  background: #3f3431;
  color: #ddd1c8;
}

.btn-secondary:hover {
  background: #5a4b47;
}

/* Progress */
.install-progress {
  background: #1f1a18;
  border: 1px solid #3f3431;
  border-radius: 12px;
  padding: 24px;
}

.progress-overview {
  margin-bottom: 14px;
}

.progress-overview-row {
  display: flex;
  justify-content: space-between;
  color: #ddd1c8;
  font-size: 13px;
  margin-bottom: 8px;
}

.overall-progress-bar {
  height: 8px;
  border-radius: 999px;
  background: #3f3431;
  overflow: hidden;
}

.overall-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e 0%, #86efac 100%);
  transition: width 0.2s ease;
}

.current-step-text {
  margin-top: 8px;
  color: #8d7d73;
  font-size: 12px;
}

.live-output {
  margin-top: 16px;
  border-top: 1px solid #3f3431;
  padding-top: 12px;
}

.live-output-header {
  display: flex;
  justify-content: space-between;
  color: #b8aaa1;
  font-size: 12px;
  margin-bottom: 8px;
}

.live-output-body {
  margin: 0;
  background: #171312;
  border: 1px solid #3f3431;
  border-radius: 8px;
  color: #ddd1c8;
  font-size: 12px;
  line-height: 1.45;
  padding: 10px;
  max-height: 180px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.progress-step.active {
  background: #2a2321;
}

.progress-step.completed {
  opacity: 0.7;
}

.step-name {
  font-weight: 500;
  color: #e7ddd6;
  font-size: 14px;
}

.step-status {
  margin-left: auto;
  font-size: 13px;
  color: #8d7d73;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: #7f1d1d;
  border: 1px solid #991b1b;
  border-radius: 8px;
  color: #fca5a5;
  font-size: 13px;
}

.error-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

/* Complete */
.install-complete {
  text-align: center;
  padding: 40px;
  background: #1f1a18;
  border: 1px solid #3f3431;
  border-radius: 12px;
}

.success-icon {
  width: 64px;
  height: 64px;
  background: #4ade80;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #064e3b;
  margin: 0 auto 24px;
}

.install-complete h2 {
  font-size: 20px;
  font-weight: 600;
  color: #f5efea;
  margin-bottom: 8px;
}

.install-complete p {
  font-size: 14px;
  color: #b8aaa1;
  margin-bottom: 24px;
}

.startup-choice {
  margin: 0 auto 20px;
  max-width: 320px;
  text-align: left;
  background: #2a2321;
  border: 1px solid #3f3431;
  border-radius: 10px;
  padding: 12px;
}

.startup-choice-title {
  font-size: 13px;
  color: #ddd1c8;
  margin: 0 0 8px 0;
}

.startup-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #b8aaa1;
  padding: 6px 0;
}
</style>
