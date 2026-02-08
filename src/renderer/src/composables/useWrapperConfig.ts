import { ref, computed } from 'vue'
import type {
  WebSettings,
  TunnelSettings,
  WrapperSettings,
} from '../types/settings.js'

const defaultWebSettings: WebSettings = {
  port: null,
  hostname: '127.0.0.1',
  mdns: false,
  mdnsDomain: null,
  cors: [],
  username: null,
  password: null,
  extraArgs: [],
}

const defaultTunnelSettings: TunnelSettings = {
  enabled: false,
  mode: 'named',
  token: null,
  hostname: null,
  cloudflaredPath: null,
  autoStartWithWeb: true,
}

export function useWrapperConfig() {
  const launchAtLogin = ref(false)
  const web = ref<WebSettings>({ ...defaultWebSettings })
  const tunnel = ref<TunnelSettings>({ ...defaultTunnelSettings })
  const isHostnameLockedByTunnel = computed(() => tunnel.value.enabled)

  const isNetworkExposedWithoutAuth = computed(() => {
    return web.value.hostname === '0.0.0.0' && !web.value.password
  })

  function setWebPort(value: string) {
    const parsed = parseInt(value, 10)
    web.value.port = Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : null
  }

  function setWebHostname(value: string) {
    if (tunnel.value.enabled) {
      web.value.hostname = '0.0.0.0'
      return
    }
    web.value.hostname = value.trim() || '127.0.0.1'
  }

  function setWebMdns(value: boolean) {
    web.value.mdns = value
  }

  function setWebMdnsDomain(value: string) {
    web.value.mdnsDomain = value.trim() || null
  }

  function setWebCorsOrigins(value: string) {
    web.value.cors = value.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  }

  function getWebCorsOriginsString(): string {
    return web.value.cors.join('\n')
  }

  function setWebAuthUsername(value: string) {
    web.value.username = value.trim() || null
  }

  function setWebAuthPassword(value: string) {
    web.value.password = value.trim() || null
  }

  function setWebExtraArgs(value: string) {
    web.value.extraArgs = value.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  }

  function getWebExtraArgsString(): string {
    return web.value.extraArgs.join('\n')
  }

  function setTunnelEnabled(value: boolean) {
    tunnel.value.enabled = value
    if (value) {
      web.value.hostname = '0.0.0.0'
    }
  }

  function setTunnelMode(value: 'named' | 'quick') {
    tunnel.value.mode = value
  }

  function setTunnelToken(value: string) {
    tunnel.value.token = value.trim() || null
  }

  function setTunnelHostname(value: string) {
    tunnel.value.hostname = value.trim() || null
  }

  function setTunnelCloudflaredPath(value: string) {
    tunnel.value.cloudflaredPath = value.trim() || null
  }

  function setLaunchAtLogin(value: boolean) {
    launchAtLogin.value = value
  }

  function getSettingsForSave(): WrapperSettings {
    const nextWeb = { ...web.value }
    if (tunnel.value.enabled) {
      nextWeb.hostname = '0.0.0.0'
    }

    return {
      launchAtLogin: launchAtLogin.value,
      web: nextWeb,
      tunnel: {
        ...tunnel.value,
        autoStartWithWeb: true,
      },
    }
  }

  function loadSettings(settings: WrapperSettings) {
    launchAtLogin.value = settings.launchAtLogin === true
    web.value = { ...defaultWebSettings, ...settings.web }
    tunnel.value = { ...defaultTunnelSettings, ...settings.tunnel }
    if (tunnel.value.enabled) {
      web.value.hostname = '0.0.0.0'
    }
  }

  function loadFromServerConfig(serverConfig: { port?: number; hostname?: string; cors?: string[]; mdns?: boolean; mdnsDomain?: string }) {
    if (typeof serverConfig.port === 'number') {
      web.value.port = serverConfig.port
    }
    if (typeof serverConfig.hostname === 'string') {
      web.value.hostname = serverConfig.hostname
    }
    if (serverConfig.mdns === true) {
      web.value.mdns = true
    }
    if (typeof serverConfig.mdnsDomain === 'string') {
      web.value.mdnsDomain = serverConfig.mdnsDomain
    }
    if (Array.isArray(serverConfig.cors)) {
      web.value.cors = serverConfig.cors.filter((item): item is string => typeof item === 'string')
    }
  }

  return {
    web,
    tunnel,
    launchAtLogin,
    isNetworkExposedWithoutAuth,
    isHostnameLockedByTunnel,
    setWebPort,
    setWebHostname,
    setWebMdns,
    setWebMdnsDomain,
    setWebCorsOrigins,
    getWebCorsOriginsString,
    setWebAuthUsername,
    setWebAuthPassword,
    setWebExtraArgs,
    getWebExtraArgsString,
    setTunnelEnabled,
    setTunnelMode,
    setTunnelToken,
    setTunnelHostname,
    setTunnelCloudflaredPath,
    setLaunchAtLogin,
    getSettingsForSave,
    loadSettings,
    loadFromServerConfig,
  }
}
