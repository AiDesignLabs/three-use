<script setup lang="ts">
import { minus, add as add2 } from '@three-use/core'
import { add as add3 } from '~/utils'
const a = ref(1)
</script>

<template>
  <div>
    <div i-ri:add-circle-fill h-4 w-4 icon-btn @click="a++" />
    <div>{{ `${a} + 2 = ${add2(a, 2)}` }}</div>
    <div>{{ `${a} - 2 = ${minus(a, 2)}` }}</div>
    <div>{{ `${a} + 2 = ${add3(a, 2)}` }}</div>
  </div>
</template>
