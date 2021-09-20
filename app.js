import bodyParser from 'body-parser';
import { CronJob } from 'cron';
import { app, errorHandler } from 'mu';
import { Delta } from "./lib/delta";
import { createJobFromScheduledJob } from "./lib/job";
import { getRepeatFrequency, getScheduledJobData, getScheduledJobs } from './lib/scheduled-job';
import { waitForDatabase } from './utils/database-utils';

const CRON_JOBS = {};

app.use(bodyParser.json({
  type: function (req) {
    return /^application\/json/.test(req.get('content-type'));
  }
}));

waitForDatabase(initScheduledJobs);

async function initScheduledJobs() {
  const scheduledJobs = await getScheduledJobs();

  if (scheduledJobs.length == 0) {
    console.log("No scheduled-jobs found that need to be added to cron.");
    return;
  }

  await addScheduledJobs(scheduledJobs);
}

app.get('/', function (_, res) {
  res.send('Hello from job-controller');
});

app.post('/delta/', async function(req, res, next) {
  try {
    const scheduledJobsToDelete = new Delta(req.body)
          .getDeletesFor('http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://vocab.deri.ie/cogs#ScheduledJob')
          .map(uri => { return { uri }; });

    //If it fails here, let's fail the subsequent processing, as we might end up in integrity problems (e.g. running multiple jobs)
    await deleteScheduledJobs(scheduledJobsToDelete);

    const scheduledJobsToAdd = new Delta(req.body)
          .getInsertsFor('http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://vocab.deri.ie/cogs#ScheduledJob')
          .map(uri => { return { uri }; });

    await addScheduledJobs(scheduledJobsToAdd);

    return res.sendStatus(201);
  }
  catch(e) {
    console.log(`Something unexpected went wrong while handling delta for scheduled-job!`);
    console.error(e);
    return next(e);
  }
});

async function addScheduledJobs(scheduledJobs){
  const hasErrors = false;
  for(const scheduledJob of scheduledJobs){
    try {
      console.log(`Scheduling job: ${scheduledJob.uri}`);
      await addScheduledJob(scheduledJob);
    }
    catch(e){
      console.log(`Error scheduling job: ${scheduledJob.uri}`);
      console.error(e);
      hasErrors = true;
    }
  }

  if(hasErrors){
    throw "There were errors scheduling incoming jobs, please check logs";
  }
}

async function deleteScheduledJobs(scheduledJobs){
  const hasErrors = false;
  for(const scheduledJob of scheduledJobs){
    try {
      console.log(`Removing job from list: ${scheduledJob.uri}`);
      deleteScheduledJob(scheduledJob);
    }
    catch(e){
      console.log(`Error removing job: ${scheduledJob.uri}`);
      console.error(e);
      hasErrors = true;
    }
  }

  if(hasErrors){
    throw "There were errors removing jobs, please check logs";
  }
}

function deleteScheduledJob(scheduledJob) {
  const cron = CRON_JOBS[scheduledJob.uri];
  if(cron) {
    cron.stop();
    delete CRON_JOBS[scheduledJob.uri];
  }
  else {
    console.warn(`No active job found for ${scheduledJob.uri}, ignoringc`);
  }
}

async function addScheduledJob(scheduledJob) {
  const repeatFrequency = await getRepeatFrequency(scheduledJob);
  scheduledJob.repeatFrequency = repeatFrequency;
  CRON_JOBS[scheduledJob.uri] = new CronJob(scheduledJob.repeatFrequency, async function() {
    console.log(`Executing scheduled job: creating new job generated by scheduled-job: ${scheduledJob.uri}`);
    const scheduledJobData = await getScheduledJobData(scheduledJob);
    await createJobFromScheduledJob(scheduledJobData);

  }, null, true);
}


app.use(errorHandler);
