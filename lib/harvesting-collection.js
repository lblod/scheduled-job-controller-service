import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { v4 as uuid } from 'uuid';
import { PREFIXES } from '../constants';
import { parseResult } from '../utils/parseResult';
import { createRemoteDataObjectFromTemplate } from './remote-data-object';

export async function createHarvestingCollectionFromTemplate(sourceCollectionUri){
  const harvestingCollectionId = uuid();
  const harvestingCollectionUri = `http://data.lblod.info/id/harvesting-collection/${harvestingCollectionId}`;

  const urlsQueryStr = `
    ${PREFIXES}

    SELECT DISTINCT ?uri WHERE {
      ${sparqlEscapeUri(sourceCollectionUri)} a hrvst:HarvestingCollection;
        dct:hasPart ?uri.
    }
  `;

  const remoteObjects = parseResult(await query(urlsQueryStr));

  const clonedRemoteObjects = [];
  for(const remoteObject of remoteObjects){
    const clonedUri = await createRemoteDataObjectFromTemplate(remoteObject.uri);
    clonedRemoteObjects.push(clonedUri);
  }

  const hasPartStatements = clonedRemoteObjects
        .map(c => `${sparqlEscapeUri(harvestingCollectionUri)} dct:hasPart ${sparqlEscapeUri(c)}.`)
        .join('\n');

  const queryStr = `
    ${PREFIXES}

    INSERT {
      GRAPH ?g {
        ${sparqlEscapeUri(harvestingCollectionUri)} a hrvst:HarvestingCollection;
          mu:uuid ${sparqlEscapeString(harvestingCollectionId)};
          dct:creator ?creator.

        ${hasPartStatements}
      }
    }
    WHERE {
      GRAPH ?g {
        ?source a hrvst:HarvestingCollection;
          dct:creator ?creator.
      }

      BIND(${sparqlEscapeUri(sourceCollectionUri)} as ?source)
    }
  `;

  await update(queryStr);
  return harvestingCollectionUri;
}
