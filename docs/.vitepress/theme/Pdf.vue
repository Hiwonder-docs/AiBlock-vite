<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    title?: string
    height?: number | string
  }>(),
  {
    title: 'Assembly Guide PDF',
    height: 850,
  },
)

const root = ref<HTMLElement | null>(null)
const shouldLoad = ref(false)
let observer: IntersectionObserver | null = null

const frameHeight = computed(() => {
  return typeof props.height === 'number' ? `${props.height}px` : props.height
})

const frameSrc = computed(() => {
  if (!props.src) {
    return ''
  }

  return props.src.includes('#') ? props.src : `${props.src}#view=FitH`
})

function loadPdf() {
  shouldLoad.value = true
  observer?.disconnect()
  observer = null
}

onMounted(() => {
  if (!root.value || typeof IntersectionObserver === 'undefined') {
    loadPdf()
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadPdf()
      }
    },
    {
      rootMargin: '600px 0px',
    },
  )

  observer.observe(root.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div ref="root" class="pdf-viewer">
    <iframe
      v-if="shouldLoad"
      class="pdf-viewer__frame"
      :src="frameSrc"
      :title="title"
      width="100%"
      :height="frameHeight"
      loading="lazy"
    />
    <div v-else class="pdf-viewer__placeholder" :style="{ height: frameHeight }">
      <span>Assembly Guide PDF</span>
    </div>
  </div>
</template>

<style scoped>
.pdf-viewer {
  margin: 16px 0 28px;
}

.pdf-viewer__frame {
  display: block;
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.pdf-viewer__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 220px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 14px;
}
</style>
