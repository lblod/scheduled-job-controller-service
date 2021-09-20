import { sparqlEscapeUri } from 'mu';
import { querySudo as query } from '@lblod/mu-auth-sudo';
import { PREFIXES} from '../constants';
import { parseResult } from '../utils/parseResult';

export async function getScheduledJobs() {
  const scheduledJobsQuery = `
    ${PREFIXES}
    SELECT DISTINCT ?uri ?repeatFrequency WHERE {
      ?uri a cogs:ScheduledJob;
            mu:uuid ?uuid;
            task:schedule ?schedule.

      ?schedule schema:repeatFrequency ?repeatFrequency.
    }
  `;

  return parseResult(await query(scheduledJobsQuery));
}

export async function getScheduledJobData(scheduledJob) {
  const scheduledJobDataQuery = `
    ${PREFIXES}
    SELECT DISTINCT ?graph ?uri ?uuid ?schedule ?operation ?scheduledTasks WHERE {
        GRAPH ?graph {
          ?uri a cogs:ScheduledJob;
            task:operation ?operation;
            mu:uuid ?uuid;
            task:schedule ?schedule.

          ?scheduledTasks a task:ScheduledTask;
            dct:isPartOf ?uri.

        BIND(${sparqlEscapeUri(scheduledJob.uri)} as ?uri)
      }
    }
  `;
  const scheduledJobInfo = parseResult(await query(scheduledJobDataQuery));
  const scheduledJobData = scheduledJobInfo[0];

  scheduledJobData.scheduledTasks = [ ...new Set(scheduledJobInfo.map(d => d.scheduledTasks)) ] ;
  return scheduledJobData;
}

export async function getRepeatFrequency(scheduledJob) {
  const queryScheduledJobs = `
    ${PREFIXES}
    SELECT DISTINCT ?repeatFrequency WHERE {
      ?uri a cogs:ScheduledJob;
            mu:uuid ?uuid;
            task:schedule ?schedule.

      ?schedule schema:repeatFrequency ?repeatFrequency.
      BIND(${sparqlEscapeUri(scheduledJob.uri)} as ?uri)
    }
  `;

  return parseResult(await query(queryScheduledJobs))[0].repeatFrequency;
}
