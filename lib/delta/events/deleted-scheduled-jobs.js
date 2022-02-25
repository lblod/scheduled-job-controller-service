import {RDF_PREDICATE, SCHEDULED_JOB_TYPE} from '../../../constants';
import {getScheduledJob} from '../../scheduled-job';

export class DeletedScheduledJobsEvent {

  manager;

  constructor(manager) {
    this.manager = manager;
  }

  async process(delta) {
    const deletes =
        delta.getDeletesFor(
            undefined,
            RDF_PREDICATE,
            SCHEDULED_JOB_TYPE);
    for (let {subject} of deletes) {
      this.manager.delete(subject.value);
    }
  }

  /**
   * Returns if the given delta matches this event.
   *
   * @param delta
   * @returns boolean
   */
  isMatch(delta) {
    return delta.hasDeletesFor(undefined, RDF_PREDICATE, SCHEDULED_JOB_TYPE);
  }
}