import {REPEAT_FREQUENCY_PREDICATE} from '../../../constants';
import {
  getScheduledJobForCronSchedule,
} from '../../scheduled-job';

export class UpdatedScheduledJobsEvent {

  manager;

  constructor(manager) {
    this.manager = manager;
  }

  async process(delta) {
    const inserts =
        delta.getInsertsFor(
            undefined,
            REPEAT_FREQUENCY_PREDICATE);
    for (let {subject} of inserts) {
      const scheduleURI = subject.value;
      try {
        const {uri, frequency} =
            await getScheduledJobForCronSchedule(scheduleURI);
        try {
          const inMemory = this.manager.get(uri);
          if(inMemory && inMemory.frequency !== frequency) {
            inMemory.frequency = frequency;
            inMemory.start();
            // TODO remove verbose logging
            console.info(`DeltaEvent: (re)started ${uri} [${frequency}]`);
          }
        } catch (e) {
          /**
           * NOTE:
           *  if we fail to update to a new frequency,
           *  is it best we remove the outdated job?
           */
          this.manager.delete(uri);
          console.warn(
              `DeltaEvent: Stopping job: Failed to update: For ${uri}, Reason:`);
          console.warn(e);
        }
      } catch (e) {
        console.warn(
            `DeltaEvent: Failed to update: For ${subject.value}, Reason:`);
        console.warn(e);
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
    const inserts =
        delta.getInsertsFor(
            undefined,
            REPEAT_FREQUENCY_PREDICATE);
    if (inserts.length > 0) {
      return inserts.find(({subject, predicate}) => delta.hasDeletesFor(subject, predicate, undefined));
    }
    return false;
  }
}