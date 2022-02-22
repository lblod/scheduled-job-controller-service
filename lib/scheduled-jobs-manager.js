import {querySudo as query} from '@lblod/mu-auth-sudo';
import {PREFIXES} from '../constants';
import {parseResult} from '../utils/parseResult';
import {ScheduledJob} from './scheduled-job';

export class ScheduledJobsManager {

  /**
   * Map of running {@link ScheduledJob} per URI
   */
  inMemoryJobsByURI;

  /**
   * Is the manager syncing/healing
   */
  syncing;

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
   * @returns {Promise<{started: [{uri, frequency}], failed: [{uri, frequency, reason}]}>}
   */
  async init() {
    const scheduled = await getScheduledJobs();
    const started = [];
    const failed = [];
    if (this.inMemoryJobs.length === 0) {
      scheduled.forEach(({uri, frequency}) => {
        try {
          this._add(uri, frequency).start();
          started.push({uri, frequency});
        } catch (e) {
          failed.push({uri, frequency, reason: e});
        }
      });
      return {
        started,
        failed,
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
   *    failed: [{uri, frequency, reason}],
   *  }>}
   */
  async sync() {

    if (this.syncing)
      throw '[WARN] Sync locked, previous sync. is still running';

    this.syncing = true;

    try {
      const scheduled = await getScheduledJobs();

      const started = [];
      const updated = [];
      const failed = [];

      scheduled.forEach(({uri, frequency}) => {
        if (this.inMemoryJobs.map(job => job.uri).includes(uri)) {
          const inMemory = this.inMemoryJobsByURI.get(uri);
          if (inMemory.frequency !== frequency) {
            try {
              this._updateFrequency(uri, frequency);
              updated.push({uri, frequency});
            } catch (e1) {
              try {
                this._remove(uri).stop();
                failed.push({uri, frequency, reason: e1});
              } catch (e2) {
                console.error(
                    '[ERROR] Couldn\'t UPDATE or REMOVE scheduled-job from memory.\n' +
                    '[ERROR] Something must be very broken!\n',
                );
                console.error(e2);
                console.error('[ERROR] Original Reason:');
                console.error(e1);
              }
            }
          }
        } else {
          try {
            this._add(uri, frequency).start();
            started.push({uri, frequency});
          } catch (e) {
            failed.push({uri, frequency, reason: e});
          }
        }
      });

      const removed = [];

      this.inMemoryJobs.forEach(({uri, frequency}) => {
        if (!scheduled.map(job => job.uri).includes(uri)) {
          try {
            this._remove(uri);
          } catch (e) {
            // IGNORE: can only fail if it didn't exist
          } finally {
            removed.push({uri, frequency});
          }
        }
      });

      return {
        started,
        updated,
        failed,
        removed,
      };

    } catch (e) {
      throw e;
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Adds a scheduled-job to the manager.
   *
   * @param job can be either a valid URI or {@link ScheduledJob}
   * @param frequency valid cron
   * @returns {ScheduledJob}
   */
  add(job, frequency = '*/5 * * * *') {
    if (this.syncing)
      throw '[WARN] adding locked, sync. in progress';
    this._add(job, frequency);
  }

  /**
   * Update the frequency for the given scheduled-job URI
   *
   * [SIDE EFFECT] the job is restarted.
   *
   * @param uri valid URI
   * @param frequency valid cron
   */
  updateFrequency(uri, frequency) {
    if (this.syncing)
      throw '[WARN] updating locked, sync. in progress';
    this._updateFrequency(uri, frequency);
  }

  /**
   * Delete the scheduled-job for the given URI
   *
   * @param uri
   * @returns {*}
   */
  remove(uri) {
    if (this.syncing)
      throw '[WARN] removing locked, sync. in progress';
    return this._remove(uri);
  }

  /**
   * [PRIVATE] Adds a scheduled-job to the manager.
   *
   * @param job can be either a valid URI or {@link ScheduledJob}
   * @param frequency valid cron
   * @returns {ScheduledJob}
   */
  _add(job, frequency = '*/5 * * * *') {
    if (!job)
      throw 'job can not be empty';
    if (typeof job === 'string' || job instanceof String) {
      return this._add(new ScheduledJob(job, frequency));
    }
    if (job instanceof ScheduledJob) {
      this.inMemoryJobsByURI.set(job.uri, job);
      return this.inMemoryJobsByURI.get(job.uri);
    }
    throw 'job needs to be either a scheduled-job URI or {@link ScheduledJob}';
  }

  /**
   * [PRIVATE] Update the frequency for the given scheduled-job URI
   *
   * [SIDE EFFECT] the job is restarted.
   *
   * @param uri valid URI
   * @param frequency valid cron
   */
  _updateFrequency(uri, frequency) {
    if (!this.inMemoryJobsByURI.has(uri))
      throw `couldn't find any running scheduled-job for <${uri}>, nothing updated`;
    const job = this.inMemoryJobsByURI.get(uri);
    job.frequency = frequency;
    job.start();
  }

  /**
   * [PRIVATE] Delete the scheduled-job for the given URI
   *
   * @param uri
   * @returns {*}
   */
  _remove(uri) {
    if (!this.inMemoryJobsByURI.has(uri))
      throw `Couldn't find running scheduled-job <${uri}>`;
    const job = this.inMemoryJobsByURI.get(uri);
    this.inMemoryJobsByURI.delete(uri);
    return job;
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