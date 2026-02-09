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
              <IconChevronRight
                :size="14"
                stroke-width="2"
                class="sidebar-toggle-icon"
                :class="{ expanded: !isNestedCollapsed(section.id) }"
              />
            </button>
            <span v-else class="sidebar-toggle-placeholder" aria-hidden="true"></span>
            <button
              class="sidebar-link-main"
              @click="handleSectionClick(section)"
            >
              <span>{{ section.sidebarLabel }}</span>
            </button>
          </div>
        </div>
          <Transition name="sidebar-collapse">
            <div
              v-if="hasNestedAnchors(section.id) && !isNestedCollapsed(section.id)"
              class="sidebar-nested-shell"
            >
              <div class="sidebar-nested-list">
                <template v-for="item in getSectionAnchors(section.id)" :key="item.id">
                  <!-- Level 2 item (e.g., provider name) -->
                  <div class="sidebar-nested-item-row">
                    <button
                      v-if="hasNestedChildren(section.id, item.id)"
                      class="sidebar-nested-toggle-btn"
                      :aria-label="isSubNestedCollapsed(section.id, item.id) ? t('sidebar.expandNestedItems') : t('sidebar.collapseNestedItems')"
                      @click="toggleSubNested(section.id, item.id)"
                    >
                      <IconChevronRight
                        :size="12"
                        stroke-width="2"
                        class="sidebar-nested-toggle-icon"
                        :class="{ expanded: !isSubNestedCollapsed(section.id, item.id) }"
                      />
                    </button>
                    <span v-else class="sidebar-nested-toggle-placeholder" aria-hidden="true"></span>
                    <button
                      class="sidebar-nested-link sidebar-nested-link-expandable"
                      @click="handleNestedItemClick(section.id, item)"
                    >
                      <span>{{ item.label }}</span>
                    </button>
                  </div>
                  <!-- Level 3 items (e.g., model names) -->
                  <Transition name="sidebar-collapse">
                    <div
                      v-if="hasNestedChildren(section.id, item.id) && !isSubNestedCollapsed(section.id, item.id)"
                      class="sidebar-sub-nested-shell"
                    >
                      <div class="sidebar-sub-nested-list">
                        <button
                          v-for="child in getNestedChildren(section.id, item.id)"
                          :key="child.id"
                          class="sidebar-sub-nested-link"
                          @click="$emit('goToAnchor', child.id, section.id, child.label, item.label)"
                        >
                          <span>{{ child.label }}</span>
                        </button>
                      </div>
                    </div>
                  </Transition>
                </template>
              </div>
            </div>
          </Transition>
        </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconChevronRight, IconChevronDown } from '@tabler/icons-vue'
import type { SettingsSection } from '../../types/settings.js'

interface SidebarAnchorItem {
  id: string
  label: string
  children?: SidebarAnchorItem[]
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
  goToAnchor: [anchorId: string, sectionId: string, label?: string, parentLabel?: string]
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
  wrapper: t('sidebar.groups.opencodeDesktop'),
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
const collapsedSubNestedByKey = ref<Record<string, boolean>>({})

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

function hasNestedChildren(sectionId: string, itemId: string): boolean {
  const anchors = getSectionAnchors(sectionId)
  const item = anchors.find((a) => a.id === itemId)
  return Boolean(item?.children && item.children.length > 0)
}

function getNestedChildren(sectionId: string, itemId: string): SidebarAnchorItem[] {
  const anchors = getSectionAnchors(sectionId)
  const item = anchors.find((a) => a.id === itemId)
  return item?.children ?? []
}

function buildSubNestedKey(sectionId: string, itemId: string): string {
  return `${sectionId}::${itemId}`
}

function isSubNestedCollapsed(sectionId: string, itemId: string): boolean {
  const key = buildSubNestedKey(sectionId, itemId)
  return collapsedSubNestedByKey.value[key] !== false
}

function toggleSubNested(sectionId: string, itemId: string) {
  const key = buildSubNestedKey(sectionId, itemId)
  collapsedSubNestedByKey.value = {
    ...collapsedSubNestedByKey.value,
    [key]: !isSubNestedCollapsed(sectionId, itemId),
  }
}

function expandNestedRecursively(sectionId: string) {
  collapsedNestedBySection.value = {
    ...collapsedNestedBySection.value,
    [sectionId]: false,
  }
  const anchors = getSectionAnchors(sectionId)
  for (const item of anchors) {
    if (item.children && item.children.length > 0) {
      const key = buildSubNestedKey(sectionId, item.id)
      collapsedSubNestedByKey.value = {
        ...collapsedSubNestedByKey.value,
        [key]: false,
      }
    }
  }
}


function handleSectionClick(section: SidebarSection) {
  emit('goToSection', section.id)
  if (hasNestedAnchors(section.id)) {
    expandNestedRecursively(section.id)
  }
}

function handleNestedItemClick(sectionId: string, item: SidebarAnchorItem) {
  emit('goToAnchor', item.id, sectionId, item.label)
  if (hasNestedChildren(sectionId, item.id)) {
    const key = buildSubNestedKey(sectionId, item.id)
    collapsedSubNestedByKey.value = {
      ...collapsedSubNestedByKey.value,
      [key]: false,
    }
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
}

.sidebar-collapse-enter-active,
.sidebar-collapse-leave-active {
  transition: grid-template-rows 0.26s ease, opacity 0.2s ease, transform 0.26s ease;
}

.sidebar-collapse-enter-from,
.sidebar-collapse-leave-to {
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
  width: 26px;
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
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
  transition: background-color 0.15s, color 0.15s;
}

.sidebar-toggle-btn:hover {
  color: #f5efea;
}

.sidebar-toggle-icon {
  transition: transform 0.2s ease;
}

.sidebar-toggle-icon.expanded {
  transform: rotate(90deg);
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

/* Level 2 item row with toggle button */
.sidebar-nested-item-row {
  display: flex;
  align-items: center;
  margin-left: 22px;
  gap: 0;
}

.sidebar-nested-toggle-btn,
.sidebar-nested-toggle-placeholder {
  width: 20px;
  flex-shrink: 0;
}

.sidebar-nested-toggle-btn {
  border: none;
  background: transparent;
  color: #9a8a80;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.sidebar-nested-toggle-btn:hover {
  color: #f5efea;
}

.sidebar-nested-toggle-icon {
  transition: transform 0.2s ease;
}

.sidebar-nested-toggle-icon.expanded {
  transform: rotate(90deg);
}

.sidebar-nested-link-expandable {
  flex: 1;
  margin-left: 0;
}

/* Level 3 sub-nested styles */
.sidebar-sub-nested-shell {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0);
}

.sidebar-sub-nested-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
  margin-left: 42px;
  padding: 4px 0;
}

.sidebar-sub-nested-link {
  text-align: left;
  border: 1px solid #3f3431;
  background: #171313;
  color: #9a8a80;
  border-radius: 5px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.sidebar-sub-nested-link:hover {
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
