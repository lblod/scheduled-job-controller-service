import { PREFIXES, BASIC_AUTH, OAUTH2, JOB_TYPE, SCHEDULED_JOB_TYPE } from "../constants";
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { sparqlEscapeUri, sparqlEscapeString, sparqlEscapeBool, uuid } from "mu";
import { parseResult } from "../utils/parseResult";
import { decrypt, encrypt } from "../utils/encrypt-credentials";

/**
 * Asks if there is authentication on the scheduled job. This way we can run
 * the encryption flow only when there is authentication.
 * @param {String} scheduledJobUri
 * @returns {Boolean} Boolean
 */
export async function hasAuth(scheduledJobUri) {
  const askQuery = `
  ${PREFIXES}
  ASK WHERE {
    GRAPH ?g {
    ${sparqlEscapeUri(scheduledJobUri)} ^dct:isPartOf ?scheduledTasks.
    ?scheduledTasks task:inputContainer ?inputContainer .
    ?inputContainer task:hasHarvestingCollection ?sourceCollection .
    ?sourceCollection dgftSec:targetAuthenticationConfiguration ?authenticationConfiguration.
    ?authenticationConfiguration dgftSec:securityConfiguration/rdf:type ?secType .
    VALUES ?secType {
      ${sparqlEscapeUri(BASIC_AUTH)}
      ${sparqlEscapeUri(OAUTH2)}
    }
   }
  }
  `;
  const { boolean } = await query(askQuery);
  return boolean
}

/**
 * Asks if the job is created by the scheduled job service.
 * @param {String} scheduledJobUri
 * @returns {Boolean} Boolean
 */
export async function alreadyEncryptedAuthenticationConfiguration(scheduledJobUri) {
  const askQuery = `
    ${PREFIXES}
    ASK WHERE {
      BIND(${sparqlEscapeUri(scheduledJobUri)} AS ?job) .
      ?job
        a ${sparqlEscapeUri(SCHEDULED_JOB_TYPE)} .
      ?task
        dct:isPartOf ?job ;
        task:inputContainer ?inputContainer .
      ?inputContainer
        task:hasHarvestingCollection ?harvestingCollection .
      ?harvestingCollection
        dgftSec:targetAuthenticationConfiguration ?authenticationConfiguration .
      ?authenticationConfiguration
        ext:authenticationSecretsEncrypted ${sparqlEscapeBool(true)} .
    }
  `;
  const { boolean } = await query(askQuery);
  return boolean;
}

/**
 * Gets the source collection URI from the scheduled job.
 * @param {String} jobUri
 * @returns {Object}
 */
 export async function getCollectionFromJob(jobUri) {
  const getCollectionQuery = `
  ${PREFIXES}
  SELECT DISTINCT ?collectionUri WHERE {
    ${sparqlEscapeUri(jobUri)} ^dct:isPartOf ?scheduledTasks.
    ?scheduledTasks task:inputContainer ?inputContainer .
    ?inputContainer task:hasHarvestingCollection ?collectionUri .
  }
  `
  return parseResult(await query(getCollectionQuery))[0];
}

/**
 * Gets securityConfigurationType and authenticationConfiguration from
 * CollectionUri.
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

  let cloneQueryDecrypt;

  if (!authData) {
    return null;
  } else if (authData.securityConfigurationType === BASIC_AUTH) {
    const getBasicAuthInfo = `
    ${PREFIXES}
    SELECT DISTINCT ?user ?pass
    WHERE {
      ${sparqlEscapeUri(
        sourceCollectionUri
      )} dgftSec:targetAuthenticationConfiguration ?configuration .
      GRAPH ?g {
        ?configuration dgftSec:secrets ?secrets .
        ?secrets meb:username ?user ;
                muAccount:password ?pass .
      }
    }
    `;
    const { user, pass } = parseResult(await query(getBasicAuthInfo))[0];
    cloneQueryDecrypt = `
        ${PREFIXES}
        INSERT {
          GRAPH ?g {
            ${sparqlEscapeUri(
              clonedCollectionUri
            )} dgftSec:targetAuthenticationConfiguration ${sparqlEscapeUri(
      newAuthConfUri
    )} .
            ${sparqlEscapeUri(
              newAuthConfUri
            )} dgftSec:secrets ${sparqlEscapeUri(newBasicCreds)} .
            ${sparqlEscapeUri(newBasicCreds)} meb:username ${sparqlEscapeString(await decrypt(user))} ;
              muAccount:password ${sparqlEscapeString(await decrypt(pass))} .
            ${sparqlEscapeUri(
              newAuthConfUri
            )} dgftSec:securityConfiguration ${sparqlEscapeUri(
      newBasicSecurityScheme
    )}.
            ${sparqlEscapeUri(newBasicSecurityScheme)} ?srcConfP ?srcConfO.
          }
        }
        WHERE {
          GRAPH ?g {
            ${sparqlEscapeUri(
              authData.authenticationConfiguration
            )} dgftSec:securityConfiguration ?srcConfg.
            ?srcConfg ?srcConfP ?srcConfO.
            ${sparqlEscapeUri(
              authData.authenticationConfiguration
            )} dgftSec:secrets ?srcSecrets.
            ?srcSecrets  meb:username ?user ;
              muAccount:password ?pass .
          }
        }`;
  } else if (authData.securityConfigurationType === OAUTH2) {
    const getOauth2Info = `
  ${PREFIXES}
  SELECT DISTINCT ?clientId ?clientSecret ?token ?flow
  WHERE {
    ${sparqlEscapeUri(
      sourceCollectionUri
    )} dgftSec:targetAuthenticationConfiguration ?configuration .
    GRAPH ?g {
      ?configuration dgftSec:secrets ?secrets .
      ?secrets dgftOauth:clientId ?clientId ;
        dgftOauth:clientSecret ?clientSecret .
      ?configuration dgftSec:securityConfiguration ?scheme .
      ?scheme wotSec:token ?token ;
        wotSec:flow ?flow . }
  }
  `;
    const { clientId, clientSecret, token, flow } = parseResult(await query(getOauth2Info))[0];
    const decryptedClientId = await decrypt(clientId);
    const decryptedClientSecret = await decrypt(clientSecret);
    const decryptedToken = await decrypt(token);
    const decryptedFlow = await decrypt(flow);
    cloneQueryDecrypt = `
      ${PREFIXES}
      INSERT {
        GRAPH ?g {
          ${sparqlEscapeUri(clonedCollectionUri)}
            dgftSec:targetAuthenticationConfiguration ${sparqlEscapeUri(newAuthConfUri)} .
          ${sparqlEscapeUri(newAuthConfUri)}
            a dgftSec:AuthenticationConfiguration ;
            dgftSec:secrets ${sparqlEscapeUri(newOauth2Creds)} ;
            dgftSec:securityConfiguration ${sparqlEscapeUri(newOauth2SecurityScheme)}.
          ${sparqlEscapeUri(newOauth2Creds)}
            a dgftSec:OAuth2Credentials ;
            a dgftSec:Credentials ;
            dgftOauth:clientId ${sparqlEscapeString(decryptedClientId)} ;
            dgftOauth:clientSecret ${sparqlEscapeString(decryptedClientSecret)} .
          ${sparqlEscapeUri(newOauth2SecurityScheme)}
            a wotSec:SecurityScheme ;
            a wotSec:OAuth2SecurityScheme ;
            wotSec:token ${sparqlEscapeString(decryptedToken)} ;
            wotSec:flow ${sparqlEscapeString(decryptedFlow)} .
        }
      }
      WHERE {
        GRAPH ?g {
          ${sparqlEscapeUri(authData.authenticationConfiguration)}
            a dgftSec:AuthenticationConfiguration .
        }
      }`;
  } else {
    throw new Error(`Unsupported Security type ${authData.securityConfigurationType}`);
  }

  await update(cloneQueryDecrypt);

  return newAuthConfUri;
}

/**
 * Encrypting the source collection authenticationConfiguration data
 * @param {String} sourceCollectionUri
 */
 export async function updateSourceCollection(sourceCollectionUri) {
  const getBasicAuthInfo = `
  ${PREFIXES}
  SELECT DISTINCT ?user ?pass
  WHERE {
    ${sparqlEscapeUri(
      sourceCollectionUri
    )} dgftSec:targetAuthenticationConfiguration ?configuration .
    GRAPH ?g {
      ?configuration dgftSec:secrets ?secrets .
      ?secrets meb:username ?user ;
              muAccount:password ?pass .
    }
  }
  `;
  const getOauth2Info = `
  ${PREFIXES}
  SELECT DISTINCT ?clientId ?clientSecret ?token ?flow
  WHERE {
    ${sparqlEscapeUri(
      sourceCollectionUri
    )} dgftSec:targetAuthenticationConfiguration ?configuration .
    GRAPH ?g {
      ?configuration dgftSec:secrets ?secrets .
      ?secrets dgftOauth:clientId ?clientId ;
        dgftOauth:clientSecret ?clientSecret .
      ?configuration dgftSec:securityConfiguration ?scheme .
      ?scheme wotSec:token ?token ;
              wotSec:flow ?flow .
    }
  }
  `;

  // Check for credential type
  const authData = await getAuthData(sourceCollectionUri);

  switch (authData.securityConfigurationType) {
    case BASIC_AUTH:
      const { user, pass } = parseResult(await query(getBasicAuthInfo))[0];
      const encryptBasicAuthQuery = `
      ${PREFIXES}
      DELETE {
        GRAPH ?g {
          ?configuration dgftSec:secrets ?secrets .
          ?secrets meb:username ?user ;
            muAccount:password ?pass .
        }
      }
      INSERT {
        GRAPH ?g {
          ?configuration
            dgftSec:secrets ?secrets ;
            ext:authenticationSecretsEncrypted ${sparqlEscapeBool(true)} .
          ?secrets meb:username ${sparqlEscapeString(await encrypt(user))} ;
            muAccount:password ${sparqlEscapeString(await encrypt(pass))} .
        }
      }
      WHERE {
        ${sparqlEscapeUri(sourceCollectionUri)} dgftSec:targetAuthenticationConfiguration ?configuration .

        GRAPH ?g {
          ?configuration dgftSec:secrets ?secrets .
          ?secrets meb:username ?user ;
            muAccount:password ?pass .
        }
      }
      `;
      await update(encryptBasicAuthQuery);
      break;
    case OAUTH2:
      const { clientId, clientSecret, token, flow } = parseResult(await query(getOauth2Info))[0];
      const encryptOauth2Query = `
      ${PREFIXES}
      DELETE {
        GRAPH ?g {
          ?configuration dgftSec:secrets ?secrets .
          ?secrets dgftOauth:clientId ?clientId ;
            dgftOauth:clientSecret ?clientSecret .
          ?configuration dgftSec:securityConfiguration ?scheme .
          ?scheme wotSec:token ?token ;
            wotSec:flow ?flow .
        }
      }
      INSERT {
        GRAPH ?g {
          ?configuration
            dgftSec:secrets ?secrets ;
            ext:authenticationSecretsEncrypted ${sparqlEscapeBool(true)} .
          ?secrets dgftOauth:clientId ${sparqlEscapeString(await encrypt(clientId))} ;
            dgftOauth:clientSecret ${sparqlEscapeString(await encrypt(clientSecret))}  .
          ?configuration dgftSec:securityConfiguration ?scheme .
          ?scheme wotSec:token ${sparqlEscapeString(await encrypt(token))}  ;
            wotSec:flow ${sparqlEscapeString(await encrypt(flow))}  .
        }
      }
      WHERE {
        ${sparqlEscapeUri(
          sourceCollectionUri
        )} dgftSec:targetAuthenticationConfiguration ?configuration .

        GRAPH ?g {
          ?configuration dgftSec:secrets ?secrets .
          ?secrets dgftOauth:clientId ?clientId ;
            dgftOauth:clientSecret ?clientSecret .
          ?configuration dgftSec:securityConfiguration ?scheme .
          ?scheme wotSec:token ?token ;
            wotSec:flow ?flow .
        }
      }
      `;
      await update(encryptOauth2Query);
      break;
    default:
      return false;
  }
}
