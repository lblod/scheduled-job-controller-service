import { sparqlEscapeUri, uuid, sparqlEscapeString, sparqlEscapeDateTime } from 'mu';
import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import { PREFIXES, ERROR_URI_PREFIX, ERROR_TYPE, RLOG_ERROR_LEVEL } from '../constants';
import { parseResult } from '../utils/parseResult';

export async function loadError( subject ){
  const queryError = `
   ${PREFIXES}
   SELECT DISTINCT ?graph ?error ?message ?date ?level ?module ?resource WHERE {
     GRAPH ?graph {
       BIND(${ sparqlEscapeUri(subject) } as ?error)
       ?error rlog:message ?message ;
              rlog:date ?date ;
              rlog:level ?level .
       OPTIONAL { ?error rlog:module ?module . }
       OPTIONAL { ?error rlog:resource ?resource . }
      }
    }
  `;
  return parseResult(await query(queryError))[0];
}

export async function createError( graph, message, options = {} ){
  const id = uuid();
  const uri = ERROR_URI_PREFIX + id;
  const now = new Date();

  const {
    level = RLOG_ERROR_LEVEL,
    module = 'scheduled-job-controller',
    resource = null,
    stackTrace = null
  } = options;

  // Build optional triples
  const optionalTriples = [];
  if (resource) {
    optionalTriples.push(`rlog:resource ${sparqlEscapeUri(resource)}`);
  }
  if (stackTrace) {
    optionalTriples.push(`rlog:stackTrace ${sparqlEscapeString(stackTrace)}`);
  }

  const queryError = `
   ${PREFIXES}
   INSERT DATA {
    GRAPH ${sparqlEscapeUri(graph)}{
      ${sparqlEscapeUri(uri)} a ${sparqlEscapeUri(ERROR_TYPE)};
        mu:uuid ${sparqlEscapeString(id)};
        rlog:message ${sparqlEscapeString(message)};
        rlog:date ${sparqlEscapeDateTime(now)};
        rlog:level ${sparqlEscapeUri(level)};
        rlog:module ${sparqlEscapeString(module)};
        ${optionalTriples.length > 0 ? optionalTriples.join('; ') + ';' : ''}
        dct:created ${sparqlEscapeDateTime(now)}.
    }
   }
  `;

  try {
    await update(queryError);
  } catch (errorCreationError) {
    console.error('Failed to create error record:', errorCreationError);
    console.error('Original message was:', message);
    return null;
  }
}

export async function removeError( error ){
  const queryError = `
    DELETE {
     GRAPH ?g {
       ?error a ?errorType;
         mu:uuid ?uuid;
         rlog:message ?message;
         rlog:date ?date;
         rlog:level ?level;
         rlog:module ?module;
         rlog:resource ?resource;
         rlog:stackTrace ?stackTrace;
         dct:created ?created.
     }
   }
   WHERE {
    GRAPH ?g {
     BIND(${sparqlEscapeUri(error.error)} as ?error)
     ?error a ?errorType;
         mu:uuid ?uuid;
         rlog:message ?message;
         rlog:date ?date;
         rlog:level ?level.
     OPTIONAL { ?error rlog:module ?module. }
     OPTIONAL { ?error rlog:resource ?resource. }
     OPTIONAL { ?error rlog:stackTrace ?stackTrace. }
     OPTIONAL { ?error dct:created ?created. }
    }
   }`;
  await update(queryError);
}
