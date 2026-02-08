<template>
  <div class="app-shell">
    <div class="window-drag-bar" />
    <div class="app-content">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #131010;
}

.window-drag-bar {
  height: 34px;
  flex-shrink: 0;
  -webkit-app-region: drag;
  background: #131010;
  border-bottom: 1px solid #3f3431;
}

.app-content {
  flex: 1;
  min-height: 0;
  -webkit-app-region: no-drag;
}
</style>

<style>
:root {
  --scrollbar-size: 10px;
  --scrollbar-track: #1a1514;
  --scrollbar-thumb: #5d4f49;
  --scrollbar-thumb-hover: #74635c;
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}

*::-webkit-scrollbar {
  width: var(--scrollbar-size);
  height: var(--scrollbar-size);
}

*::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

*::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #6a5952 0%, var(--scrollbar-thumb) 100%);
  border-radius: 999px;
  border: 2px solid var(--scrollbar-track);
}

*::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #85726a 0%, var(--scrollbar-thumb-hover) 100%);
}

*::-webkit-scrollbar-corner {
  background: var(--scrollbar-track);
}
</style>
