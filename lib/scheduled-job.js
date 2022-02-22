import {CronJob, CronTime} from 'cron';
import {sparqlEscapeUri} from 'mu';
import {querySudo as query} from '@lblod/mu-auth-sudo';
import {CRON_TIMEZONE, PREFIXES} from '../constants';
import {parseResult} from '../utils/parseResult';
import {createJobFromScheduledJob} from './job';

export class ScheduledJob {

  /**
   * URI of the scheduled-job
   */
  uri;

  /**
   * CronJob for the scheduled-job
   */
  job;

  constructor(uri, frequency) {
    this.uri = uri;
    this.job = new CronJob({
      timeZone: CRON_TIMEZONE,
      cronTime: frequency,
      onTick: () => this.run(),
      context: this,
    });
  }

  /**
   * Returns the frequency of the job,
   * the frequency should be a valid cron.
   *
   * @returns string
   */
  get frequency() {
    // TODO is their a better way?
    return this.job.cronTime.source;
  }

  /**
   * Sets the valid frequency vale as the new time for the cron-job
   *
   * [SIDE EFFECT] stops the cron-job
   *
   * @param value valid cron | Date
   */
  set frequency(value) {
    this.job.setTime(new CronTime(value, CRON_TIMEZONE));
  }

  /**
   * Start the cron-job
   */
  start() {
    this.job.start();
  }

  /**
   * Strop the cron-job
   */
  stop() {
    this.job.stop();
  }

  /**
   * Run the task for a scheduled-job
   *
   * @returns {Promise<void>}
   */
  async run() {
    try {
      console.info(`[INFO] Started ${this.uri} @${new Date().toISOString()}`);
      const metadata = await getScheduledJobData({uri: this.uri});
      if (!metadata) {
        console.warn(`[WARN] no metadata for ${this.uri} could be found.`);
        return;
      }
      await createJobFromScheduledJob(metadata);
    } catch (e) {
      console.error(`[ERROR] Something unexpected went wrong while executing ${this.uri}`);
      console.error(e);
      //TODO: alert someone
    }
  }
}

/* SPARQL Queries */

export async function getScheduledJobData(scheduledJob) {
  const scheduledJobDataQuery = `
    ${PREFIXES}
    SELECT DISTINCT ?graph ?uri ?uuid ?schedule ?operation ?scheduledTasks WHERE {
        BIND(${sparqlEscapeUri(scheduledJob.uri)} as ?uri)

        GRAPH ?graph {
          ?uri a cogs:ScheduledJob;
            task:operation ?operation;
            mu:uuid ?uuid;
            task:schedule ?schedule.

          ?scheduledTasks a task:ScheduledTask;
            dct:isPartOf ?uri.
      }
    }
  `;
  const scheduledJobInfo = parseResult(await query(scheduledJobDataQuery));
  const scheduledJobData = scheduledJobInfo[0];

  scheduledJobData.scheduledTasks = [
    ...new Set(scheduledJobInfo.map(d => d.scheduledTasks))];
  return scheduledJobData;
}

export async function getScheduledJob(uri) {
  const qs = `
${PREFIXES}
SELECT DISTINCT ?uri ?frequency WHERE {
BIND(${sparqlEscapeUri(uri)} as ?uri)
  ?uri a cogs:ScheduledJob;
        mu:uuid ?uuid;
        task:schedule ?schedule.

  ?schedule schema:repeatFrequency ?frequency.
}`;
  return parseResult(await query(qs))[0];
}

export async function getScheduledJobForCronSchedule(uri) {
  const qs = `
${PREFIXES}
SELECT DISTINCT ?uri ?frequency WHERE {
BIND(${sparqlEscapeUri(uri)} as ?schedule)
  ?uri a cogs:ScheduledJob;
        mu:uuid ?uuid;
        task:schedule ?schedule.

  ?schedule schema:repeatFrequency ?frequency.
}`;
  return parseResult(await query(qs))[0];
}
