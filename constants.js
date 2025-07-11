import env from 'env-var';

export const STATUS_BUSY = 'http://redpencil.data.gift/id/concept/JobStatus/busy';
export const STATUS_SCHEDULED = 'http://redpencil.data.gift/id/concept/JobStatus/scheduled';

export const JOB_TYPE = 'http://vocab.deri.ie/cogs#Job';
export const TASK_TYPE = 'http://redpencil.data.gift/vocabularies/tasks/Task';
export const ERROR_TYPE= 'http://persistence.uni-leipzig.org/nlp2rdf/ontologies/rlog#Entry';
export const RLOG_ERROR_LEVEL = 'http://persistence.uni-leipzig.org/nlp2rdf/ontologies/rlog#ERROR';
export const RLOG_WARN_LEVEL = 'http://persistence.uni-leipzig.org/nlp2rdf/ontologies/rlog#WARN';
export const RLOG_INFO_LEVEL = 'http://persistence.uni-leipzig.org/nlp2rdf/ontologies/rlog#INFO';
export const SCHEDULED_JOB_TYPE = 'http://vocab.deri.ie/cogs#ScheduledJob';
export const SCHEDULED_TASK_TYPE = 'http://redpencil.data.gift/vocabularies/tasks/ScheduledTask';
export const HARVESTNG_COLLECTION_TYPE = 'http://lblod.data.gift/vocabularies/harvesting/HarvestingCollection';
export const FILE_DATA_OBJECT_TYPE = 'http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject';

export const RDF_PREDICATE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
export const REPEAT_FREQUENCY_PREDICATE = 'http://schema.org/repeatFrequency';

export const BASIC_AUTH = 'https://www.w3.org/2019/wot/security#BasicSecurityScheme';
export const OAUTH2 = 'https://www.w3.org/2019/wot/security#OAuth2SecurityScheme';

export const PREFIXES = `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
    PREFIX meb: <http://rdf.myexperiment.org/ontologies/base/>
    PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX oslc: <http://open-services.net/ns/core#>
    PREFIX cogs: <http://vocab.deri.ie/cogs#>
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX schema: <http://schema.org/>
    PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
    PREFIX dgftOauth: <http://kanselarij.vo.data.gift/vocabularies/oauth-2.0-session/>
    PREFIX hrvst: <http://lblod.data.gift/vocabularies/harvesting/>
    PREFIX wotSec: <https://www.w3.org/2019/wot/security#>
    PREFIX rpioHttp: <http://redpencil.data.gift/vocabularies/http/>
    PREFIX dgftSec: <http://lblod.data.gift/vocabularies/security/>
    PREFIX rlog: <http://persistence.uni-leipzig.org/nlp2rdf/ontologies/rlog#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

export const TASK_URI_PREFIX = 'http://redpencil.data.gift/id/task/';
export const ERROR_URI_PREFIX = 'http://redpencil.data.gift/id/jobs/error/';

export const CRON_HEALING_JOB = env.get('CRON_HEALING_JOB').default('00 6-22 * * 1-5').asString();
export const DISABLE_HEALING_JOB = env.get('DISABLE_HEALING_JOB').default('false').asBool();
export const DISABLE_DELTA = env.get('DISABLE_DELTA').default('false').asBool();
export const MAX_CONCURRENT_JOBS = env.get('MAX_CONCURRENT_JOBS').default('0').asInt();
export const MU_APPLICATION_GRAPH = env.get('MU_APPLICATION_GRAPH').default('http://mu.semte.ch/graphs/public').asString();

export const CRON_TIMEZONE = 'Europe/Brussels'
