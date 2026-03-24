import cron, { ScheduledTask } from 'node-cron'
import { logError, logInfo } from '../utils/logger'
import { xpService } from './xp.service'

const WEEKLY_RESET_CRON_EXPRESSION = '59 23 * * 0'
const DEFAULT_WEEKLY_RESET_TIMEZONE = 'Europe/Lisbon'

let weeklyResetTask: ScheduledTask | null = null

const getWeeklyResetTimezone = (): string =>
  process.env.COMMUNITY_WEEKLY_RESET_TIMEZONE ||
  process.env.COMMUNITY_WEEKLY_RESET_TZ ||
  process.env.TZ ||
  DEFAULT_WEEKLY_RESET_TIMEZONE

const runWeeklyReset = async () => {
  try {
    const result = await xpService.resetWeeklyXp()
    logInfo('community_weekly_xp_reset_completed', result as unknown as Record<string, unknown>)
  } catch (error) {
    logError('community_weekly_xp_reset_failed', error)
  }
}

export const startCommunityLeaderboardCron = () => {
  if (weeklyResetTask) return

  const timezone = getWeeklyResetTimezone()

  weeklyResetTask = cron.schedule(
    WEEKLY_RESET_CRON_EXPRESSION,
    () => {
      void runWeeklyReset()
    },
    {
      timezone,
    }
  )

  logInfo('community_weekly_xp_reset_cron_started', {
    expression: WEEKLY_RESET_CRON_EXPRESSION,
    timezone,
  })
}

export const stopCommunityLeaderboardCron = () => {
  if (!weeklyResetTask) return

  weeklyResetTask.stop()
  weeklyResetTask.destroy()
  weeklyResetTask = null

  logInfo('community_weekly_xp_reset_cron_stopped')
}

