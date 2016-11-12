import JobsController from "../controller/jobs";

export default function (deps) {
  const jobsController = new JobsController();
  return function WorkerRouter(workerApp) {
    workerApp.attach("importUsers", jobsController.importUsers);
    workerApp.attach("saveUsers", jobsController.saveUsers);
    workerApp.attach("sendUsers", jobsController.sendUsers);
    workerApp.attach("handleBulkJob", jobsController.handleBulkJob);
    return workerApp;
  };
}
