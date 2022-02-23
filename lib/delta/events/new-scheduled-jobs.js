import {RDF_PREDICATE, SCHEDULED_JOB_TYPE} from '../../../constants';
import {getScheduledJob} from '../../scheduled-job';

export class NewScheduledJobsEvent {

  manager;

  constructor(manager) {
    this.manager = manager;
  }

  async process(delta) {
    const inserts =
        delta.getInsertsFor(
            undefined,
            RDF_PREDICATE,
            SCHEDULED_JOB_TYPE);
    for (let {subject} of inserts) {
      if (!this.manager.has(subject.value)) {
        try {
          const {uri, frequency} = await getScheduledJob(subject.value);
          this.manager.add(uri, frequency).start();
          // TODO remove verbose logging
          console.info(`DeltaEvent: started ${uri} [${frequency}]`);

        } catch (e) {
          console.warn(
              `DeltaEvent: Failed to start job: For ${subject.value}, Reason:`);
          console.warn(e);
        }
      }
    }
  }

  /**
   * Returns if the given delta matches this event.
   *
   * @param delta
   * @returns boolean
   */
  isMatch(delta) {
    return delta.hasInsertsFor(undefined, RDF_PREDICATE, SCHEDULED_JOB_TYPE);
  }
}