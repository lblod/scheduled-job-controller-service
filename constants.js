export const STATUS_BUSY = 'http://redpencil.data.gift/id/concept/JobStatus/busy';
export const STATUS_SCHEDULED = 'http://redpencil.data.gift/id/concept/JobStatus/scheduled';
export const STATUS_SUCCESS = 'http://redpencil.data.gift/id/concept/JobStatus/success';
export const STATUS_FAILED = 'http://redpencil.data.gift/id/concept/JobStatus/failed';

export const JOB_TYPE = 'http://vocab.deri.ie/cogs#Job';
export const TASK_TYPE = 'http://redpencil.data.gift/vocabularies/tasks/Task';
export const ERROR_TYPE= 'http://open-services.net/ns/core#Error';
export const SCHEDULED_JOB_TYPE = 'http://vocab.deri.ie/cogs#ScheduledJob';
export const SCHEDULED_TASK_TYPE = 'http://redpencil.data.gift/vocabularies/tasks/ScheduledTask';
export const HARVESTNG_COLLECTION_TYPE = 'http://lblod.data.gift/vocabularies/harvesting/HarvestingCollection';
export const FILE_DATA_OBJECT_TYPE = 'http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject';

export const PREFIXES = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
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
  PREFIX hrvst: <http://lblod.data.gift/vocabularies/harvesting/>
  PREFIX rpioHttp: <http://redpencil.data.gift/vocabularies/http/>
  PREFIX dgftSec: <http://lblod.data.gift/vocabularies/security/>
`;

export const TASK_URI_PREFIX = 'http://redpencil.data.gift/id/task/';
export const ERROR_URI_PREFIX = 'http://redpencil.data.gift/id/jobs/error/';
