import {querySudo as query} from '@lblod/mu-auth-sudo';
import {PREFIXES} from '../constants';
import {parseResult} from '../utils/parseResult';
import {ScheduledJob} from './scheduled-job';

export class ScheduledJobsManager {

  /**
   * Map of running {@link ScheduledJob} per URI
   */
  inMemoryJobsByURI;

  constructor() {
    this.inMemoryJobsByURI = new Map();
    this.syncing = false;
  }

  /**
   * Get the running {@link ScheduledJob} in memory as an array
   *
   * @returns {[ScheduledJob]}
   */
  get inMemoryJobs() {
    return Array.from(this.inMemoryJobsByURI.values());
  }

  /**
   * Initialize the manager
   *
   * [WARNING] only use this at start-up!
   * [BY DEFAULT] scheduled-jobs will be retrieved from the sparql store.
   *
   * @returns {Promise<{started: [{uri, frequency}], encounteredIssues: boolean}>}
   */
  async init() {
    const scheduled = await getScheduledJobs();
    const started = [];
    let encounteredIssues = false;
    if (this.inMemoryJobs.length === 0) {
      scheduled.forEach(({uri, frequency}) => {
        try {
          this.add(uri, frequency);
          started.push({uri, frequency});
        } catch (e) {
          encounteredIssues = true
          console.warn(
              `Stopping job: Failed to update: For ${uri}, Reason:`);
          console.warn(e);
        }
      });
      this.restart();
      return {
        started,
        encounteredIssues,
      };
    }
    throw 'This instance has running jobs, use the "sync" function instead!';
  }

  /**
   * Synchronize (heal) the manager
   *
   * [BY DEFAULT] scheduled-jobs will be retrieved from the sparql store.
   *
   * @returns {Promise<{
   *    started: [{uri, frequency}],
   *    updated: [{uri, frequency}],
   *    removed: [{uri, frequency}],
   *    encounteredIssues: boolean
   *  }>}
   */
  async sync() {
    const scheduled = await getScheduledJobs();

    const started = [];
    const updated = [];
    const removed = [];
    let encounteredIssues = false;

    /**
     * NOTE:
     *  - update existing jobs
     *  - add newly created jobs in the store (by the client)
     */
    scheduled.forEach(({uri, frequency}) => {
      if (this.inMemoryJobsByURI.has(uri)) {
        const inMemory = this.inMemoryJobsByURI.get(uri);
        if (inMemory.frequency !== frequency) {
          // NOTE: update existing job
          try {
            inMemory.frequency = frequency;
            updated.push({uri, frequency});
          } catch (e) {
            /**
             * NOTE:
             *  if we fail to update to a new frequency,
             *  is it best we remove the outdated job?
             */
            if (this.delete(uri)) {
              removed.push({uri, frequency});
            }
            encounteredIssues = true
            console.warn(
                `Stopping job: Failed to update: For ${uri}, Reason:`);
            console.warn(e);
          }
        }
      } else {
        // NOTE: add new job
        try {
          this.add(uri, frequency);
          started.push({uri, frequency});
        } catch (e) {
          encounteredIssues = true
          console.warn(`Failed to start job: For ${uri}, Reason:`);
          console.warn(e);
        }
      }
    });

    // NOTE: delete (and stop) jobs that are not present in the store (aka deleted by client)
    this.inMemoryJobs.forEach(({uri, frequency}) => {
      if (!scheduled.map(job => job.uri).includes(uri)) {
        if (this.delete(uri)) {
          removed.push({uri, frequency});
        }
      }
    });

    // NOTE: restart stopped jobs (either newly added or updated)
    this.inMemoryJobs.filter(job => !job.running).map(job => job.start());

    return {
      started,
      updated,
      removed,
      encounteredIssues
    };
  }

  /**
   * Adds a scheduled-job to the manager.
   *
   * @param job can be either a valid URI or {@link ScheduledJob}
   * @param frequency valid cron
   * @returns {ScheduledJob}
   */
  add(job, frequency = '*/5 * * * *') {
    if (job) {
      if (typeof job === 'string' || job instanceof String) {
        return this.add(new ScheduledJob(job, frequency));
      }
      if (job instanceof ScheduledJob) {
        return this.inMemoryJobsByURI.set(job.uri, job).get(job.uri);
      }
    }
    throw 'job needs to be either a scheduled-job URI or {@link ScheduledJob}';
  }

  /**
   * Delete the scheduled-job for the given URI
   *
   * [SIDE EFFECT] stops the job
   *
   * @param uri
   * @returns boolean
   */
  delete(uri) {
    if (this.inMemoryJobsByURI.has(uri)) {
      this.inMemoryJobsByURI.get(uri).stop();
    }
    return this.inMemoryJobsByURI.delete(uri);
  }

  /**
   * Restart all scheduled-jobs
   */
  restart() {
    this.inMemoryJobs.forEach(job => {
      if (job.running) {
        job.stop();
      }
      job.start();
    });
  }
}

/* SPARQL Queries */

/**
 * Returns array of scheduled-jobs defined within the sparql store.
 *
 * @returns {Promise<Array[{uri, repeatFrequency}]>}
 */
async function getScheduledJobs() {
  const scheduledJobsQuery = `
 ${PREFIXES}
 SELECT DISTINCT ?uri ?frequency WHERE {
   ?uri a cogs:ScheduledJob;
         mu:uuid ?uuid;
         task:schedule ?schedule.

   ?schedule schema:repeatFrequency ?frequency.
 }`;
  return parseResult(await query(scheduledJobsQuery));
}