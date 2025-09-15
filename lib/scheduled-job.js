import {CronJob, CronTime} from 'cron';
import {sparqlEscapeUri} from 'mu';
import {querySudo as query} from '@lblod/mu-auth-sudo';
import {CRON_TIMEZONE, PREFIXES, MAX_CONCURRENT_JOBS, MU_APPLICATION_GRAPH, RLOG_ERROR_LEVEL, RLOG_WARN_LEVEL} from '../constants';
import {parseResult} from '../utils/parseResult';
import {createJobFromScheduledJob, countBusyJobs} from './job';
import {createError} from './error';

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
   * Returns if the cron-job is running
   *
   * @returns {boolean|*}
   */
  get running() {
    return this.job.running;
  }
  /**
   * Returns the frequency of the cron-job,
   * the frequency should be a valid cron.
   *
   * @returns string
   */
  get frequency() {
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
      console.info(`ScheduledJob: Executing ${this.uri} [${this.frequency}]`);
      await runScheduledJob(this.uri);
    } catch (e) {
      console.error(`ScheduledJob: Something unexpected went wrong while executing ${this.uri}`);
      console.error(e);
      await createError(metadata?.graph || MU_APPLICATION_GRAPH,
                       `ScheduledJob execution failed for ${this.uri}: ${e.message || e}`,
                       {
                         level: RLOG_ERROR_LEVEL,
                         resource: this.uri,
                         stackTrace: e.stack
                       });
    }
  }
}

/* reusable functions */

export async function runScheduledJob(uri, maxConcurrentJobEnabled = true) {
  const metadata = await getScheduledJobData({ uri });
  if (!metadata) {
    console.info(`ScheduledJob: Job not created: No metadata for ${uri} could be found.`);
    return false;
  }
  if (maxConcurrentJobEnabled && MAX_CONCURRENT_JOBS > 0) {
    const busyJobCount = await countBusyJobs();
    if (busyJobCount >= MAX_CONCURRENT_JOBS) {
      console.info(`ScheduledJob: Job creation skipped for ${uri}: ${busyJobCount} busy jobs >= ${MAX_CONCURRENT_JOBS} max concurrent jobs`);
      throw Error(`Job creation skipped for ${uri}: ${busyJobCount} busy jobs >= ${MAX_CONCURRENT_JOBS} max concurrent jobs`);
    }
  }

  await createJobFromScheduledJob(metadata);
}

/* SPARQL Queries */

export async function getScheduledJobData(scheduledJob) {
  const scheduledJobDataQuery = `
${PREFIXES}
SELECT DISTINCT ?graph ?uri ?uuid ?schedule ?operation ?scheduledTasks ?vendor ?storagePath WHERE {
    BIND(${sparqlEscapeUri(scheduledJob.uri)} as ?uri)

    GRAPH ?graph {
      ?uri a cogs:ScheduledJob;
        mu:uuid ?uuid;
        task:operation ?operation;
        task:schedule ?schedule.

      ?scheduledTasks a task:ScheduledTask;
        dct:isPartOf ?uri.

      OPTIONAL {
        ?uri prov:wasAssociatedWith ?vendor .
      }
      OPTIONAL {
        ?uri task:storagePath ?storagePath.
      }
  }
}`;
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
