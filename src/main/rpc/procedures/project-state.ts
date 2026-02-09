import { os } from '@orpc/server'
import { z } from 'zod'
import {
  getDurableProjectStatePath,
  readDurableProjectState,
  writeDurableProjectState,
} from '../../services/project-state.js'

export const readProjectState = os.handler(async () => {
  return { state: await readDurableProjectState() }
})

export const writeProjectState = os
  .input(z.object({ entries: z.record(z.string(), z.string()) }))
  .handler(async ({ input }) => {
    const state = await writeDurableProjectState(input.entries)
    return { state }
  })

export const getProjectStatePath = os.handler(async () => {
  return { path: getDurableProjectStatePath() }
})
