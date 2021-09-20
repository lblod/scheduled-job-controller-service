import { querySudo as query } from '@lblod/mu-auth-sudo';
import { sparqlEscapeUri } from 'mu';
import { PREFIXES, SCHEDULED_TASK_TYPE } from '../constants';
import { parseResult } from '../utils/parseResult';
import { loadContainersFromTask } from './data-container';

export async function loadScheduledTask(subject){
  const queryTask = `
   ${PREFIXES}
   SELECT DISTINCT ?graph ?task ?job ?created ?modified ?index ?operation WHERE {
    GRAPH ?graph {
      BIND(${ sparqlEscapeUri(subject) } as ?task)
      ?task a ${ sparqlEscapeUri(SCHEDULED_TASK_TYPE) }.
      ?task dct:isPartOf ?job;
        dct:created ?created;
        dct:modified ?modified;
        task:index ?index;
        task:operation ?operation.
    }
   }
  `;

  const task = parseResult(await query(queryTask))[0];
  if(!task) return null;

  //now fetch the hasMany. Easier to parse these
  const queryParentTasks = `
   ${PREFIXES}
   SELECT DISTINCT ?task ?parentTask WHERE {
     GRAPH ?g {
       BIND(${ sparqlEscapeUri(subject) } as ?task)
       ?task cogs:dependsOn ?parentTask.

      }
    }
  `;

  const parentTasks = parseResult(await query(queryParentTasks)).map(row => row.parentTask);
  task.parentSteps = parentTasks;
  task.inputContainers = (await loadContainersFromTask(subject)).map(c => c.container);
  return task;
}
