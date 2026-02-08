<template>
  <aside class="settings-sidebar">
    <div v-for="group in groupedSections" :key="group.id" class="sidebar-group">
      <p class="sidebar-group-title">{{ group.label }}</p>
      <template v-for="section in group.sections" :key="section.id">
        <div class="sidebar-link-row">
          <div class="sidebar-link-combo">
            <button
              v-if="hasNestedAnchors(section.id)"
              class="sidebar-toggle-btn"
              :aria-label="isNestedCollapsed(section.id) ? t('sidebar.expandNestedItems') : t('sidebar.collapseNestedItems')"
              @click="toggleNested(section.id)"
            >
              {{ isNestedCollapsed(section.id) ? '▸' : '▾' }}
            </button>
            <span v-else class="sidebar-toggle-placeholder" aria-hidden="true"></span>
            <button
              class="sidebar-link-main"
              @click="emit('goToSection', section.id)"
            >
              <span>{{ section.sidebarLabel }}</span>
            </button>
          </div>
        </div>
        <div
          v-if="hasNestedAnchors(section.id)"
          class="sidebar-nested-shell"
          :class="{ 'is-collapsed': isNestedCollapsed(section.id) }"
        >
          <div class="sidebar-nested-list">
            <button
              v-for="item in getSectionAnchors(section.id)"
              :key="item.id"
              class="sidebar-nested-link"
              @click="$emit('goToAnchor', item.id, section.id, item.label)"
            >
            <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SettingsSection } from '../../types/settings.js'

interface SidebarAnchorItem {
  id: string
  label: string
}

type SectionAnchors = Record<string, SidebarAnchorItem[]>

const props = defineProps<{
  opencodeConfigPath: string
  wrapperConfigPath: string
  omoConfigPath: string
  sections: SettingsSection[]
  sectionAnchors?: SectionAnchors
}>()

const emit = defineEmits<{
  goToSection: [id: string]
  goToAnchor: [anchorId: string, sectionId: string, label?: string]
}>()

const { t } = useI18n()

type SidebarGroupId = SettingsSection['group']

interface SidebarSection extends SettingsSection {
  sidebarLabel: string
}

interface SidebarGroup {
  id: SidebarGroupId
  label: string
  sections: SidebarSection[]
}

const groupOrder: SidebarGroupId[] = ['opencode', 'wrapper', 'omo']

const groupLabels = computed<Record<SidebarGroupId, string>>(() => ({
  opencode: t('sidebar.groups.opencode'),
  wrapper: t('sidebar.groups.opencodeWrapper'),
  omo: t('sidebar.groups.ohMyOpenCode'),
}))

const groupedSections = computed<SidebarGroup[]>(() => {
  return groupOrder
    .map((groupId) => {
      const grouped = props.sections
        .filter((section) => section.group === groupId)
        .map((section) => ({
          ...section,
          sidebarLabel: formatSidebarLabel(section),
        }))

      return {
        id: groupId,
          label: groupLabels.value[groupId],
          sections: grouped,
        }
    })
    .filter((group) => group.sections.length > 0)
})

const collapsedNestedBySection = ref<Record<string, boolean>>({})

function getSectionAnchors(sectionId: string): SidebarAnchorItem[] {
  const anchors = props.sectionAnchors?.[sectionId]
  return Array.isArray(anchors) ? anchors : []
}

function hasNestedAnchors(sectionId: string): boolean {
  return getSectionAnchors(sectionId).length > 0
}

function isNestedCollapsed(sectionId: string): boolean {
  return collapsedNestedBySection.value[sectionId] !== false
}

function toggleNested(sectionId: string) {
  collapsedNestedBySection.value = {
    ...collapsedNestedBySection.value,
    [sectionId]: !isNestedCollapsed(sectionId),
  }
}

function formatSidebarLabel(section: SettingsSection): string {
  return section.label
}
</script>

<style scoped>
.settings-sidebar {
  position: sticky;
  top: 0;
  min-height: 0;
  max-height: calc(100dvh - 120px);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #1c1716;
  border: 1px solid #3f3431;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-group-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #e8ddd6;
}

.config-path {
  font-size: 12px;
  color: #8d7d73;
  margin: 0;
  font-family: 'SF Mono', 'Fira Code', monospace;
  overflow-wrap: anywhere;
}

.config-path-group {
  margin-bottom: 8px;
}

.config-path-group:last-of-type {
  margin-bottom: 10px;
}

.config-path-label {
  margin: 0 0 4px;
  font-size: 11px;
  color: #b8aaa1;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.sidebar-link-main {
  text-align: left;
  border: none;
  background: transparent;
  color: #ddd1c8;
  padding: 8px 10px;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s;
  display: flex;
  align-items: center;
  gap: 0;
  margin-left: 0;
  flex: 1;
}

.sidebar-link-main:hover {
  color: #f5efea;
}

.sidebar-link-combo {
  width: 100%;
  display: flex;
  align-items: center;
  border: 1px solid #4f433f;
  background: #1a1514;
  border-radius: 6px;
  transition: border-color 0.15s, color 0.15s;
}

.sidebar-link-combo:hover,
.sidebar-link-combo:focus-within {
  border-color: #3b82f6;
}

.sidebar-nested-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.sidebar-nested-shell {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0);
  transition: grid-template-rows 0.26s ease, opacity 0.2s ease, transform 0.26s ease;
}

.sidebar-nested-shell.is-collapsed {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
}

.sidebar-chevron {
  width: 12px;
  display: inline-flex;
  justify-content: center;
  color: #b8aaa1;
  flex-shrink: 0;
}

.sidebar-link-row {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.sidebar-toggle-btn,
.sidebar-toggle-placeholder {
  width: 16px;
  height: 100%;
  flex-shrink: 0;
}

.sidebar-toggle-btn {
  border: none;
  background: transparent;
  color: #b8aaa1;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sidebar-toggle-btn:hover {
  color: #f5efea;
}

.sidebar-nested-link {
  text-align: left;
  border: 1px solid #4f433f;
  background: #1a1514;
  color: #b8aaa1;
  border-radius: 6px;
  margin-left: 22px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.sidebar-nested-link:hover {
  border-color: #3b82f6;
  color: #f5efea;
}

@media (max-width: 960px) {
  .settings-sidebar {
    position: static;
    max-height: none;
    overflow-y: visible;
  }
}
</style>
