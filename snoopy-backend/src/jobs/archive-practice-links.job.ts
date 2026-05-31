import cron from 'node-cron';
import { archiveExpiredLinks } from '../services/practice.service';

export function startArchiveCronJob(): void {
  const schedule = process.env['CRON_ARCHIVE_SCHEDULE'] ?? '1 0 * * *'; // Default: 00:01 daily
  console.log(`[CronJob] Archive practice links scheduled: ${schedule}`);

  cron.schedule(schedule, async () => {
    console.log('[CronJob] Running: archive expired practice links...');
    try {
      const count = await archiveExpiredLinks();
      console.log(`[CronJob] Done: ${count} links archived`);
    } catch (err) {
      console.error('[CronJob] Error:', err);
    }
  }, { timezone: 'Asia/Bangkok' });
}
