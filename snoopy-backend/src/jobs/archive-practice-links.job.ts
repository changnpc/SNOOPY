import cron from 'node-cron';
import { archiveExpiredLinks } from '../services/practice.service';
import { archiveExpiredActivities } from '../services/activities.service';

export function startArchiveCronJob(): void {
  const schedule = process.env['CRON_ARCHIVE_SCHEDULE'] ?? '1 0 * * *'; // Default: 00:01 daily
  console.log(`[CronJob] Archive scheduled: ${schedule}`);

  cron.schedule(schedule, async () => {
    console.log('[CronJob] Running: archive expired practice links + activities...');
    try {
      const links = await archiveExpiredLinks();
      const acts  = await archiveExpiredActivities();
      console.log(`[CronJob] Done: ${links} links, ${acts} activities archived`);
    } catch (err) {
      console.error('[CronJob] Error:', err);
    }
  }, { timezone: 'Asia/Bangkok' });
}
