import { updateSudo as update } from '@lblod/mu-auth-sudo';
import { sparqlEscapeDateTime, sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { v4 as uuid } from 'uuid';
import {
    PREFIXES, STATUS_BUSY, STATUS_SCHEDULED
} from '../constants';
import { createContainerFromTemplate } from './data-container';
import { loadScheduledTask } from './scheduled-task';
import { createTask } from './task';

export async function createJobFromScheduledJob(scheduledJob) {
  const jobId = uuid();
  const jobUri = `http://redpencil.data.gift/id/job/${jobId}`;
  const now = new Date();

  if(scheduledJob.scheduledTasks.length > 1){
    throw 'Currently only one scheduled task is supported for a scheduledJob';
  }

  const scheduledTask = await loadScheduledTask(scheduledJob.scheduledTasks[0]);

  const vendorTriple = scheduledJob.vendor
    ? `${sparqlEscapeUri(jobUri)} prov:wasAssociatedWith ${sparqlEscapeUri(scheduledJob.vendor)} .`
    : '';
  const newJobQuery = `
    ${PREFIXES}
    INSERT DATA {
      GRAPH ${sparqlEscapeUri(scheduledJob.graph)} {
        ${sparqlEscapeUri(jobUri)} a cogs:Job;
              mu:uuid ${sparqlEscapeString(jobId)};
              adms:status ${sparqlEscapeUri(STATUS_BUSY)};
              dct:creator ${sparqlEscapeUri(scheduledJob.uri)};
              dct:created ${sparqlEscapeDateTime(now)};
              dct:modified ${sparqlEscapeDateTime(now)};
              task:operation ${sparqlEscapeUri(scheduledJob.operation)}.
        ${vendorTriple}
      }
    }
  `;
  await update(newJobQuery);

  const clonedContainers = [];

  for(const container of scheduledTask.inputContainers){
    clonedContainers.push(await createContainerFromTemplate(container));
  }

  await createTask( scheduledTask.graph,
                    jobUri,
                    '0',
                    scheduledTask.operation,
                    STATUS_SCHEDULED,
                    [],
                    clonedContainers);
}
