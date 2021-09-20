import { updateSudo as update } from '@lblod/mu-auth-sudo';
import { sparqlEscapeDateTime, sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { v4 as uuid } from 'uuid';
import { PREFIXES } from '../constants';

export async function createRemoteDataObjectFromTemplate(sourceRemoteDataObjectUri){
  const now = new Date();
  const remoteDataObjectId = uuid();
  const remoteDataObjectUri = `http://data.lblod.info/id/remote-data-objects/${remoteDataObjectId}`;

  const queryStr = `
    ${PREFIXES}

    INSERT {
      GRAPH ?g {
        ${sparqlEscapeUri(remoteDataObjectUri)} a nfo:RemoteDataObject;
          mu:uuid ${sparqlEscapeString(remoteDataObjectId)};
          nie:url ?url;
          rpioHttp:requestHeader ?header;
          dct:created ${sparqlEscapeDateTime(now)};
          dct:modified ${sparqlEscapeDateTime(now)}.

        ${sparqlEscapeUri(remoteDataObjectUri)} dgftSec:authenticationConfiguration ?securityConfig.
      }
    }
    WHERE {
      GRAPH ?g {
       ${sparqlEscapeUri(sourceRemoteDataObjectUri)} a nfo:RemoteDataObject;
         nie:url ?url;
         rpioHttp:requestHeader ?header.

       OPTIONAL {
         ${sparqlEscapeUri(sourceRemoteDataObjectUri)} dgftSec:authenticationConfiguration ?securityConfig.
       }
     }
    }
  `;
  await update(queryStr);
  return remoteDataObjectUri;
}
