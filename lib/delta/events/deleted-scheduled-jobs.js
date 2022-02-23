import {SCHEDULED_JOB_TYPE} from '../../../constants';
import {getScheduledJob} from '../../scheduled-job';

// TODO move to constants
const RDF_PREDICATE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

// TODO document
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

  isMatch(delta) {
    return delta.hasDeletesFor(undefined, RDF_PREDICATE, SCHEDULED_JOB_TYPE);
  }
}