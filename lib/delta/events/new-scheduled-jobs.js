import {SCHEDULED_JOB_TYPE} from '../../../constants';
import {getScheduledJob} from '../../scheduled-job';

const RDF_PREDICATE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

// TODO document
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

  isMatch(delta) {
    return delta.hasInsertsFor(undefined, RDF_PREDICATE, SCHEDULED_JOB_TYPE);
  }
}