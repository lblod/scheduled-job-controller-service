import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { v4 as uuid } from 'uuid';
import { FILE_DATA_OBJECT_TYPE, HARVESTNG_COLLECTION_TYPE, PREFIXES } from '../constants';
import { parseResult } from '../utils/parseResult';
import { createFileDataObjectFromTemplate } from './file-data-object';
import { createGraphFromTemplate } from './graph';
import { createHarvestingCollectionFromTemplate } from './harvesting-collection';

export async function loadContainersFromTask(taskUri,
                                             containerType = 'http://redpencil.data.gift/vocabularies/tasks/inputContainer'){
  const queryStr = `
     ${PREFIXES}

     SELECT DISTINCT ?task ?container WHERE {
       BIND(${sparqlEscapeUri(taskUri)} as ?task)
       ?task ${sparqlEscapeUri(containerType)} ?container.
     }
  `;

  return parseResult( await query(queryStr));
}

export async function createContainerFromTemplate(sourceContainerUri){
  const dataContainerId = uuid();
  const dataContainerUri = `http://redpencil.data.gift/id/dataContainers/${dataContainerId}`;

  const containerContents = await getContainerContent(sourceContainerUri);

  const contentStatements = [];

  for(const content of containerContents){
    const contentType = deduceContainerContentType(content.contentPredicate);

    let cloneUri = undefined;
    //Needs proper TYPE URI, leave it here as string to make cleare this is NOK yet
    if(contentType == 'graph') {
      cloneUri = await createGraphFromTemplate(content.content);
    }
    else if(contentType == HARVESTNG_COLLECTION_TYPE) {
      cloneUri = await createHarvestingCollectionFromTemplate(content.content);
    }
    else {
      cloneUri = await createFileDataObjectFromTemplate(content.content);
    }

    contentStatements.push(`${sparqlEscapeUri(dataContainerUri)} ${sparqlEscapeUri(content.contentPredicate)} ${sparqlEscapeUri(cloneUri)}.`);
  }

  const queryStr = `
    ${PREFIXES}

    INSERT {
      GRAPH ?g {
        ${sparqlEscapeUri(dataContainerUri)} a nfo:DataContainer;
          mu:uuid ${sparqlEscapeString(dataContainerId)}.

        ${contentStatements.join('\n')}
      }
    }
    WHERE {
      BIND(${sparqlEscapeUri(sourceContainerUri)} as ?s)
      GRAPH ?g {
       ?s a nfo:DataContainer.
      }
    }
  `;

  await update(queryStr);

  return dataContainerUri;
}

async function getContainerContent(containerUri){
  const queryStr = `
   ${PREFIXES}

   SELECT DISTINCT ?contentPredicate ?content WHERE {
     ${sparqlEscapeUri(containerUri)} a nfo:DataContainer;
       ?contentPredicate ?content.

     FILTER(?contentPredicate IN (
        <http://redpencil.data.gift/vocabularies/tasks/hasGraph>,
        <http://redpencil.data.gift/vocabularies/tasks/hasHarvestingCollection>,
        <http://redpencil.data.gift/vocabularies/tasks/hasFile>
     ))
   }
  `;
  return parseResult(await query(queryStr));
}

function deduceContainerContentType(contentPredicate){
  const typeMap = {
    'http://redpencil.data.gift/vocabularies/tasks/hasGraph': 'graph', //TODO: needs proper typing
    'http://redpencil.data.gift/vocabularies/tasks/hasHarvestingCollection': HARVESTNG_COLLECTION_TYPE,
    'http://redpencil.data.gift/vocabularies/tasks/hasFile': FILE_DATA_OBJECT_TYPE
  };

  return typeMap[contentPredicate];
}
