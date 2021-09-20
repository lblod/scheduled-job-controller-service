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
  PREFIX oslc: <http://open-services.net/ns/core#>
  PREFIX cogs: <http://vocab.deri.ie/cogs#>
  PREFIX adms: <http://www.w3.org/ns/adms#>
```
## ScheduledJob
Job that owns information on when and how often it has to execute operations.

## class
`cogs:ScheduledJob`

## properties

Name | Predicate | Range | Definition
--- | --- | --- | ---
uuid |mu:uuid | xsd:string
creator | dct:creator | rdfs:Resource
created | dct:created | xsd:dateTime
modified | dct:modified | xsd:dateTime
jobType | task:operation | skos:Concept
title | dct:title | xsd:string
schedule | task:schedule | http://schema.org/Schedule


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
`oslc:Error`

## properties
Name | Predicate | Range | Definition
--- | --- | --- | ---
uuid |mu:uuid | xsd:string
message | oslc:message | xsd:string

## CronSchedule
Subclass of `schema:Schedule`
### class
`task:CronSchedule`
### properties

Name | Predicate | Range | Definition
--- | --- | --- | ---
uuid |mu:uuid | xsd:string
repeatFrequency | schema:repeatFrequency | xsd:string | Note: this is going to be e.g. '1-5 * * * *',

# Useage
## docker-compose.yml
```
  jobs-controller:
    image: lblod/scheduled-job-controller-service:x.x.x
```
## Environment variables
- `CRON_MANAGE_SCHEDULED_JOBS`: Periodicity to update the ScheduledJob cron list. Default to '*/5 * * * *';

# Caveats/TODO's
- The service assumes the job is stored in one graph.
- Currently deep cloning of `nfo:DataContainer` is only limited to the containers having the predicate:
  - `<http://redpencil.data.gift/vocabularies/tasks/hasGraph>`
  - `<http://redpencil.data.gift/vocabularies/tasks/hasHarvestingCollection>`
  - Note also: cloning of the contents is limited to known predicates of the related model entities.
    This means e.g. if you have special predicates attached to `RemoteDataObject`, it might not work without extension of this service.
      - Future work might investigate on how the cloning itself could be made more generic or configurable.
- Only creation and deletion of `cogs:ScheduledJob` are currently supported.
- No error notifications are done so far: only logged.
- The non-transactional nature of deltas and the fact there is high interaction with frontend service, makes it diffucult to check delta's for relevant changes (without exposing the internals of the backend)
   - Hence we choose, for now, work with a cron job to manage the scheduled jobs.
