import { updateSudo as update } from '@lblod/mu-auth-sudo';
import { sparqlEscapeUri } from 'mu';
import { v4 as uuid } from 'uuid';

export async function createGraphFromTemplate(sourceGraph){
  //TODO: performance!
  const graphUri = `http://data.lblod.info/id/graphs/${uuid()}`;

  const queryStr = `
     INSERT {
       GRAPH ${sparqlEscapeUri(graphUri)}{
         ?s ?p ?o.
      }
     }
     WHERE {
       GRAPH ${sparqlEscapeUri(sourceGraph)}{
         ?s ?p ?o.
      }
     }
  `;

  await update(queryStr);
  return graphUri;
}
