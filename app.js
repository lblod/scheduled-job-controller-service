import {CronJob} from 'cron';
import {app, errorHandler} from 'mu';
import bodyParser from 'body-parser';
import {CRON_TIMEZONE} from './constants';
import {ScheduledJobsManager} from './lib/scheduled-jobs-manager';
import {waitForDatabase} from './utils/database-utils';

const CRON_MANAGE_SCHEDULED_JOBS = process.env.CRON_MANAGE_SCHEDULED_JOBS ||
    '*/5 * * * *';

app.use(bodyParser.json({
  type: function(req) {
    return /^application\/json/.test(req.get('content-type'));
  },
}));

const scheduledJobsManager = new ScheduledJobsManager();

/**
 * Setup
 *  - initialize scheduled-job-manager, (re)start jobs
 *  - initialize healing-job, ensures jobs stay in sync and up-to-date
 */
waitForDatabase().then(async () => {
  console.log(`[INFO] Initializing ...`);
  const {started, failed} = await scheduledJobsManager.init();
  setupHealingJob();
  console.log(
      `[INFO] Initialized: ${started.length} job(s) (re)started\n` +
      `[INFO] Healing: ACTIVE`,
  );
  if (failed.length > 0) {
    console.warn(`[WARN] ${failed.length} job(s) failed to (re)start`);
    failed.forEach(job => {
      console.error(`[ERROR] For <${job.uri}>, Reason:`);
      console.error(job.reason);
    });
  }
});

app.get('/', function(_, res) {
  res.send('Hello from scheduled-job-controller');
});


app.use(errorHandler);

/* Functions */

function setupHealingJob() {
  new CronJob({
    start: true,
    cronTime: CRON_MANAGE_SCHEDULED_JOBS,
    timeZone: CRON_TIMEZONE,
    onTick: async () => {
      try {
        if(scheduledJobsManager.syncing) {
          console.info(
              "[INFO] Healing: manager is still syncing, waiting for next round ...")
          return;
        }

        const {
          started,
          updated,
          removed,
          failed,
        } = await scheduledJobsManager.sync();
        console.info(
            `[INFO] Healing Report:\n` +
            `[INFO] ${started.length} new job(s) started\n` +
            `[INFO] ${updated.length} job(s) updated\n` +
            `[INFO] ${removed.length} job(s) removed\n`,
        );
        if (failed.length > 0) {
          console.warn(
              `[WARN] ${failed.length} job(s) failed to start or update`);
          failed.forEach(job => {
            console.error(`[ERROR] For <${job.uri}>, Reason:`);
            console.error(job.reason);
          });
        }
      } catch (e) {
        console.error(
            `[ERROR] Healing: Something unexpected went wrong.`);
        console.error(e);
        //TODO: alert someone
      }
    },
  });
}

