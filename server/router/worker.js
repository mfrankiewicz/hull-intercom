import JobsController from "../controller/jobs";

export default function (deps) {
  const jobsController = new JobsController();
  return function WorkerRouter(workerApp) {
    console.log("ATTACH");
    workerApp.attach("importUsers", jobsController.importUsers);
    workerApp.attach("saveUsers", jobsController.saveUsers);
    return workerApp;
  };
}
