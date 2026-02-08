import { os } from '@orpc/server'
import { z } from 'zod'
import { readSetupState, recordSetupSuccess as recordSetupSuccessService } from '../../services/setup-state.js'

export const getSetupState = os.handler(async () => {
  return await readSetupState()
})

export const recordSetupSuccess = os
  .input(z.object({
    port: z.number().int().nullable(),
    autoStartWeb: z.boolean().optional(),
    webStarted: z.boolean().optional(),
  }))
  .handler(async ({ input }) => {
    return await recordSetupSuccessService(input)
  })
