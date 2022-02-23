import {CronJob} from 'cron';
import {app, errorHandler} from 'mu';
import bodyParser from 'body-parser';
import {CRON_TIMEZONE} from './constants';
import {DeltaEvents} from './lib/delta/delta-events';
import {NewScheduledJobsEvent} from './lib/delta/events/new-scheduled-jobs';
import {
  DeletedScheduledJobsEvent
} from './lib/delta/events/deleted-scheduled-jobs';
import {
  UpdatedScheduledJobsEvent,
} from './lib/delta/events/updated-scheduled-jobs';
import {ScheduledJobsManager} from './lib/scheduled-jobs-manager';
import {waitForDatabase} from './utils/database-utils';

const CRON_MANAGE_SCHEDULED_JOBS = process.env.CRON_MANAGE_SCHEDULED_JOBS ||
    '*/5 * * * *';

app.use(bodyParser.json({
  type: function(req) {
    return /^application\/json/.test(req.get('content-type'));
  },
}));

const manager = new ScheduledJobsManager();
const deltaEvents = new DeltaEvents([
  ['new scheduled-jobs', new NewScheduledJobsEvent(manager)],
  ['deleted scheduled-jobs', new DeletedScheduledJobsEvent(manager)],
  ['updated scheduled-jobs', new UpdatedScheduledJobsEvent(manager)],
]);

/**
 * Setup
 *  - initialize scheduled-job-manager: (re)start jobs
 *  - initialize healing-job: ensures jobs stay in sync and up-to-date with store (client)
 */
waitForDatabase().then(async () => {
  const {started} = await manager.init();
  const healing = new HealingJob();
  console.info(
      `Started ${started.length} scheduled-job(s) \n` +
      `Healing: ${healing.running ? 'ACTIVE' : 'INACTIVE'}`,
  );
});

app.get('/', function(_, res) {
  res.send('Hello from scheduled-job-controller');
});

app.post('/delta', (req, res) => {
  deltaEvents.process(req.body);
  res.status(201).send();
});

app.use(errorHandler);

/* Private Functions */

function HealingJob() {
  return new CronJob({
    start: true,
    cronTime: CRON_MANAGE_SCHEDULED_JOBS,
    timeZone: CRON_TIMEZONE,
    onTick: async () => {
      try {
        const {
          started,
          updated,
          removed,
          encounteredIssues,
        } = await manager.sync();
        const logging = ['Healing: Report: Nothing happened, all systems nominal'];

        if (encounteredIssues) {
          logging.push(
              'Healing: Report: Encountered issues while healing, check the logging above ...');
        }
        if (started.length > 0)
          logging.push(`Healing: Report: Started ${started.length} new job(s)`);
        if (updated.length > 0)
          logging.push(`Healing: Report: Updated ${updated.length} job(s)`);
        if (removed.length > 0)
          logging.push(
              `Healing: Report: Deleted (and stopped) ${removed.length} job(s)`);
        if (logging.length > 1) {
          logging.shift();
        }
        console.log(logging.join('\n'));
      } catch (e) {
        console.error(
            `Healing: Something unexpected went wrong while trying to heal, Reason:`);
        console.error(e);
        //TODO: alert someone
      }
    },
  });
}

