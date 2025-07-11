# scheduled-job-controller-service
Microservice responsible for controlling ScheduledJob and its related ScheduledTasks.
When a ScheduledJob is executed according to a cron pattern, it instantiates a `cogs:Job` and its `task:Task`'s so subsequent services can act upon it.
If provided, the `task:inputContainer` of `task:ScheduledTask` are cloned and attached to the instantiated `task:Task`.

# model

## prefixes
```
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX cogs: <http://vocab.deri.ie/cogs#>
  PREFIX adms: <http://www.w3.org/ns/adms#>
  PREFIX rlog: <http://persistence.uni-leipzig.org/nlp2rdf/ontologies/rlog#>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
```
## ScheduledJob
Job that owns information on when and how often it has to execute operations.

## class
`cogs:ScheduledJob`

## properties

| Name     | Predicate              | Range                      | Definition |
|----------|------------------------|----------------------------|------------|
| uuid     | mu:uuid                | xsd:string                 |            |
| creator  | dct:creator            | rdfs:Resource              |            |
| created  | dct:created            | xsd:dateTime               |            |
| modified | dct:modified           | xsd:dateTime               |            |
| jobType  | task:operation         | skos:Concept               |            |
| title    | dct:title              | xsd:string                 |            |
| schedule | task:schedule          | http://schema.org/Schedule |            |
| vendor   | prov:wasAssociatedWith | rdfs:Resource              |            |


## ScheduledTask
Subclass of `cogs:ScheduledJob`

## class
`task:ScheduledTask`

## properties

Name | Predicate | Range | Definition
--- | --- | --- | ---
uuid |mu:uuid | xsd:string
created | dct:created | xsd:dateTime
modified | dct:modified | xsd:dateTime
operation | task:operation | skos:Concept
index | task:index | xsd:string | May be used for orderering. E.g. : '1', '2.1', '2.2', '3'
parentTask| cogs:dependsOn | task:ScheduledTask
job | dct:isPartOf | rdfs:Resource | Refer to the parent job, in this case the `cogs:ScheduledJob`
inputContainer | task:inputContainer | nfo:DataContainer | An generic type, which may have elements such as File, Graph. The consumer needs to determine how to handle it

## Error

## class
`rlog:Entry`

## properties
| Name       | Predicate       | Range         | Definition                                   |
|------------|-----------------|---------------|----------------------------------------------|
| uuid       | mu:uuid         | xsd:string    | Unique identifier                            |
| message    | rlog:message    | xsd:string    | Error message                                |
| date       | rlog:date       | xsd:dateTime  | Timestamp when error occurred                |
| level      | rlog:level      | rlog:Level    | Error severity (rlog:ERROR, rlog:WARN, etc.) |
| module     | rlog:module     | xsd:string    | Service identifier (always "scheduled-job-controller") |
| resource   | rlog:resource   | rdfs:Resource | Related resource URI (optional)              |
| stackTrace | rlog:stackTrace | xsd:string    | Stack trace for debugging (optional)         |
| created    | dct:created     | xsd:dateTime  | Record creation timestamp                    |

## CronSchedule
Subclass of `schema:Schedule`
### class
`task:CronSchedule`
### properties

| Name            | Predicate              | Range      | Definition                                    |
|-----------------|------------------------|------------|-----------------------------------------------|
| uuid            | mu:uuid                | xsd:string |                                               |
| repeatFrequency | schema:repeatFrequency | xsd:string | Note: this is going to be e.g. '1-5 * * * *', |

# Useage
## docker-compose.yml
```
  jobs-controller:
    image: lblod/scheduled-job-controller-service:x.x.x
```
## Environment variables
- `CRON_HEALING_JOB`: Periodicity for the healing job that ensures job consistency. Default: `00 6-22 * * 1-5` (hourly, 6-22, Monday-Friday)
- `DISABLE_HEALING_JOB`: Disable the healing job. Default: `false`
- `DISABLE_DELTA`: Disable delta handling. Default: `false`
- `MAX_CONCURRENT_JOBS`: Limit concurrent busy jobs. Set to `0` for unlimited (default), or positive integer to enforce limit
- `MU_APPLICATION_GRAPH`: Default graph for error records when job-specific graph is unavailable. Default: `http://mu.semte.ch/graphs/public`

## Error Handling and Monitoring

The service automatically creates structured error records in the database when failures occur. These use the rlog ontology for rich metadata and can be queried for monitoring purposes.

### Error Record Structure
Each error is stored as an `rlog:Entry` with the following properties:
- **Timestamp**: When the error occurred (`rlog:date`)
- **Severity**: Error level (`rlog:level` - typically `rlog:ERROR`)
- **Source**: Service identifier (`rlog:module` - always "scheduled-job-controller")
- **Context**: Related resource URI (`rlog:resource` - e.g., the failing scheduled job)
- **Details**: Error message and stack trace for debugging

### Error Monitoring Examples

Query recent errors:
```sparql
  PREFIX rlog: <http://persistence.uni-leipzig.org/nlp2rdf/ontologies/rlog#>
SELECT ?date ?module ?message ?resource WHERE {
  ?error a rlog:Entry ;
         rlog:level rlog:ERROR ;
         rlog:date ?date ;
         rlog:module ?module ;
         rlog:message ?message .
  OPTIONAL { ?error rlog:resource ?resource }
  FILTER(?date > "2025-07-01T00:00:00Z"^^xsd:dateTime)
}
ORDER BY DESC(?date)
```

Query errors by service:
```sparql
SELECT * WHERE {
  ?error rlog:module "scheduled-job-controller" ;
         rlog:message ?message ;
         rlog:date ?date ;
         rlog:resource ?failedJob .
}
```

# Caveats/TODO's
- The service assumes the job is stored in one graph.
- Currently deep cloning of `nfo:DataContainer` is only limited to the containers having the predicate:
  - `<http://redpencil.data.gift/vocabularies/tasks/hasGraph>`
  - `<http://redpencil.data.gift/vocabularies/tasks/hasHarvestingCollection>`
  - Note also: cloning of the contents is limited to known predicates of the related model entities.
    This means e.g. if you have special predicates attached to `RemoteDataObject`, it might not work without extension of this service.
      - Future work might investigate on how the cloning itself could be made more generic or configurable.
- Only creation and deletion of `cogs:ScheduledJob` are currently supported.
