import { updateSudo as update, querySudo as query } from '@lblod/mu-auth-sudo';
import { sparqlEscapeDateTime, sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { v4 as uuid } from 'uuid';
import {
    PREFIXES, STATUS_BUSY, STATUS_SCHEDULED, MAX_CONCURRENT_JOBS
} from '../constants';
import { createContainerFromTemplate } from './data-container';
import { loadScheduledTask } from './scheduled-task';
import { createTask } from './task';
import { parseResult } from '../utils/parseResult';

export async function countBusyJobs() {
  const countQuery = `
    ${PREFIXES}
    SELECT (COUNT(?job) as ?count) WHERE {
      ?job a cogs:Job;
           adms:status ${sparqlEscapeUri(STATUS_BUSY)}.
    }
  `;
  const result = parseResult(await query(countQuery));
  return parseInt(result[0]?.count || '0', 10);
}

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
  let storageTriple;
  if (scheduledJob.storagePath) {
    const timestamp = new Date().toISOString().replace(/:/g, "-").replace("T", "_").split(".")[0];
    let path  = scheduledJob.storagePath.replace("${date}", timestamp);
    if (/[<>:"|?*\.]/.test(path)) {
      console.warn(`path ${path} contains unsafe characters ([<>:"|?*.]), replacing with -`);
      path = path.replace(/[<>:"|?*\.]/g,'-');
    }
    storageTriple = `${sparqlEscapeUri(jobUri)} task:storagePath ${sparqlEscapeString(path)} .`;

  }
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
        ${storageTriple}
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
