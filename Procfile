web: NODE_ENV=production WEB=true node --optimize_for_size --max_old_space_size=$MEMORY_AVAILABLE -r newrelic -r @risingstack/trace build
worker: NODE_ENV=production WORKER=true node --optimize_for_size --max_old_space_size=$MEMORY_AVAILABLE -r newrelic -r @risingstack/trace build
