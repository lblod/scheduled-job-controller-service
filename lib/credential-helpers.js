import { PREFIXES, BASIC_AUTH, OAUTH2 } from "../constants";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { sparqlEscapeUri, uuid } from "mu";
import { parseResult } from "../utils/parseResult";

/**
 * Gets securityConfigurationType and authenticationConfiguration from CollectionUri
 * @param {String} collectionUri
 * @returns {Object} { securityConfigurationType, authenticationConfiguration }
 */

async function getAuthData(collectionUri) {
  const credentialsTypeQuery = `
    ${PREFIXES}

    SELECT DISTINCT ?securityConfigurationType ?authenticationConfiguration WHERE {
        ${sparqlEscapeUri(
          collectionUri
        )} dgftSec:targetAuthenticationConfiguration ?authenticationConfiguration .
        ?authenticationConfiguration dgftSec:securityConfiguration/rdf:type ?securityConfigurationType .
        VALUES ?securityConfigurationType {
          ${sparqlEscapeUri(BASIC_AUTH)}
          ${sparqlEscapeUri(OAUTH2)}
      }
    }
  `;
  const authData = parseResult(await query(credentialsTypeQuery))[0];
  return authData;
}

/**
 * Inserting the `AuthenticationConfiguration` from the source collection to cloned collection to allow the download step from `download-url-service`.
 * This is making a deepcopy of the authentication configuration from collection to collection.
 *
 * @param {String} clonedCollectionUri cloned collection
 * @param {String} sourceCollectionUri source collection
 * @returns newAuthConfUri
 *
 * Note: `AuthenticationConfiguration` credentials will be removed in the `download-url-service`.
 */
export async function attachClonedAuthenticationConfiguraton(
  clonedCollectionUri,
  sourceCollectionUri
) {
  const newAuthConfUri = `http://data.lblod.info/id/authentication-configurations/${uuid()}`;

  const authData = await getAuthData(sourceCollectionUri);

  const newOauth2SecurityScheme = `http://data.lblod.info/id/oauth2-security-schemes/${uuid()}`;
  const newOauth2Creds = `http://data.lblod.info/id/oauth2-credentials/${uuid()}`;
  const newBasicSecurityScheme = `http://data.lblod.info/id/basic-security-schemes/${uuid()}`;
  const newBasicCreds = `http://data.lblod.info/id/basic-authentication-credentials/${uuid()}`;

  let cloneQuery;

  if (!authData) {
    return null;
  } else if (authData.securityConfigurationType === BASIC_AUTH) {
    cloneQuery = `
    ${PREFIXES}
    INSERT {
      GRAPH ?g {
        ${sparqlEscapeUri(clonedCollectionUri)} dgftSec:targetAuthenticationConfiguration ${sparqlEscapeUri(newAuthConfUri)} .
        ${sparqlEscapeUri(newAuthConfUri)} dgftSec:secrets ${sparqlEscapeUri(newBasicCreds)} .
        ${sparqlEscapeUri(newBasicCreds)} meb:username ?user ;
          muAccount:password ?pass .
        ${sparqlEscapeUri(newAuthConfUri)} dgftSec:securityConfiguration ${sparqlEscapeUri(newBasicSecurityScheme)}.
        ${sparqlEscapeUri(newBasicSecurityScheme)} ?srcConfP ?srcConfO.
      }
    }
    WHERE {
      GRAPH ?g {
        ${sparqlEscapeUri(authData.authenticationConfiguration)} dgftSec:securityConfiguration ?srcConfg.
        ?srcConfg ?srcConfP ?srcConfO.
        ${sparqlEscapeUri(authData.authenticationConfiguration)} dgftSec:secrets ?srcSecrets.
        ?srcSecrets  meb:username ?user ;
          muAccount:password ?pass .
      }
    }`;
  } else if (authData.securityConfigurationType === OAUTH2) {
    cloneQuery = `
    ${PREFIXES}
    INSERT {
      GRAPH ?g {
        ${sparqlEscapeUri(clonedCollectionUri)} dgftSec:targetAuthenticationConfiguration ${sparqlEscapeUri(newAuthConfUri)} .
        ${sparqlEscapeUri(newAuthConfUri)} dgftSec:secrets ${sparqlEscapeUri(newOauth2Creds)} .
        ${sparqlEscapeUri(newOauth2Creds)} dgftOauth:clientId ?clientId ;
          dgftOauth:clientSecret ?clientSecret .
        ${sparqlEscapeUri(newAuthConfUri)} dgftSec:securityConfiguration ${sparqlEscapeUri(newOauth2SecurityScheme)}.
        ${sparqlEscapeUri(newOauth2SecurityScheme)} ?srcConfP ?srcConfO.
      }
    }
    WHERE {
      GRAPH ?g {
        ${sparqlEscapeUri(authData.authenticationConfiguration)} dgftSec:securityConfiguration ?srcConfg.
        ?srcConfg ?srcConfP ?srcConfO.
        ${sparqlEscapeUri(authData.authenticationConfiguration)} dgftSec:secrets ?srcSecrets.
        ?srcSecrets dgftOauth:clientId ?clientId ;
          dgftOauth:clientSecret ?clientSecret .
          OPTIONAL { ?srcConfig dgftOauth:resource ?resource . }
      }
    }`;
  } else {
    throw new Error(`Unsupported Security type ${authData.securityConfigurationType}`);
  }

  await update(cloneQuery);

  return newAuthConfUri;
}
