# Changelog

## 0.8.5
- allow to set maximum notification batch size
- improve service_api metrics

## 0.8.4
- when updating leads use `user_id` Intercom object param instead of the `id`
- don't filter out users and leads with "Exceeded rate limit" error
- don't save the rate limit error as user trait
- add audit information on status endpoint

## 0.8.3
- add `contact.added_email` event support on incoming webhooks

## 0.8.2
- upgrade node version to 8.9.x
- store email address in the intercom traits group

## 0.8.1
- upgrade newrelic agent

## 0.8.0
- upgrade hull-node to `0.13.10` (includes couple of compatibility updates)
- improve batch handler
- disable tags deletion in tags mapper
- try to find tags before recreating them
- on `ship:update` refresh the mapping in the settings to make sure it's up to date
- add tags related checks to status endpoint

## 0.7.27
- introduce `THROTTLE_PER_RATE` env variable to control throttle time window
- change response error logs lines to error level

## 0.7.26
- change batch handling to process leads and users sequentially
- remove subqueues on superagent-throttle library

## 0.7.25
- add `LEADS_API_REQUEST_CONCURRENCY`, `USERS_API_REQUEST_CONCURRENCY` and `TAG_API_REQUEST_CONCURRENCY` env variables to control concurrency on outgoing API calls

## 0.7.24
- **IMPORTANT** - added filtering out users coming from notifications who already have `traits_intercom/id`, there is no change in for traits selected for outgoing traffic in settings and there is no outgoing event. This behavior is controlled by `skip_users_already_synced` private settings in the manifest.
- truncate outgoing custom attributes to 255 characters and add " [...]" string at the end to indicate it was truncated -> in that case a warning is logged
- added request timeout and temporary error retrial
- fixed overwrite settings

## 0.7.23
- fix update attributes for leads

## 0.7.22
- update attributes for leads with intercom values (overwrite)

## 0.7.21
- status endpoint

## 0.7.20
- added connector docs
- simplified settings
- adds logging changes and events names for notifications

## 0.7.19
- adds support for trace monitoring service

## 0.7.18
- improve logging on fetching operation

## 0.7.17
- filter tag events using not only ids but also names

## 0.7.16
- respect api rate limits via superagent-throttle
- limit concurrency on API calls
- log only part of incoming webhooks payload

## 0.7.15
- add more logging to Intercom Client
- upgrade hull-node to skip empty jobs
- handle and skip interval based fetchLeads operation rate limit errors

## 0.7.14
- make sure that the first handleBulkJob is delayed

## 0.7.13
- remove bloat logs payload

## 0.7.12
- adjust log levels
- upgrade the hull-node - use new firehose
- disable fastlane while saving leads on fetch-all-leads operation

## 0.7.11
- fix intercom event tracking to capture the right data

## 0.7.10
- remove requirement for validated email to complete oauth flow

## 0.7.9
- adds support for fetch scrolling (using `/contacts/scroll`) API endpoint

## 0.7.8
- fixes fetch leads pagination

## 0.7.7
- adds `src/ship.js` for easy client side embedding - webpack build script

## 0.7.6
- adds cache to `subscriptions` endpoint
- adds more context to rate limit error

## 0.7.5
- cache `/tags` results to speed up `saveEvents`

## 0.7.4
- hotfix enqueueing too many empty jobs

## 0.7.3
- don't sync ship settings with Intercom settings on `saveUsers` operation

## 0.7.2
- fix `convertLeadsToUsers` job

## 0.7.1
- don't requeue interval based `fetchUsers` operation, in that case stop it and wait for next call to continue
- for other operations radomly spread the delayed retry takin into account ratelimit information coming from Intercom headers

## 0.7.0
- support for leads:
  * listen for `contact.created` webhooks events and create corresponding user in Hull
  * fetch leads every 5 minutes in case of missed webhook call
  * push back to Intercom enriched leads traits - the same mapping and filtering as for users is applied here
  * detect leads conversion on Intercom side and merge that lead and user on Hull side
  * try to merge user on Hull side and when it's possible convert the lead into user on Intercom
- fix `metric.event` call
- handle `incoming.event.tagNotFound` event
- improve the rate limit handler to handle all errors

## 0.6.9
- adds rate limit handler - requeue current job with 10 seconds delay and don't fail
- upgrade testing tooling

## 0.6.8
- upgrade hull-node@0.11.4

## 0.6.7
- fix the fetchAll operation internal filtering

## 0.6.6
- pass segment information correctly to request an extract from Hull
- update hull-node to 0.11.3

## 0.6.5
- revert back to `es2015` preset and ignore `specs` directory where we do class inheritance

## 0.6.4
- check if the `last_updated_at` have sane value, if not, skip to some default value
- save `last_updated_at` not only at the end of the fetch, but also every 5 pages
- change default `last_updated_at` value from 10 minutes to 1 day
- allow to pass optional `updated_after` and `updated_before` params to fetchAll operation
- add optional, experimental switch to fetchAll if fetch page is going to be too high
- adds some metric events and end-to-end tests

## 0.6.3
- fix handling undeletable tag

## 0.6.2
- fix responses on endpoints

## 0.6.1
- fix the `last_updated_at` if not present in settings

## 0.6.0
- upgrade to `hull-node@0.11.0`
- restructurize the controllers into separate files
- reduce number of queued items - use jobs functions directly
- change the way fetchUsers `last_updated_at` timestamp is save (was queries from userbase, now it saves it to the connector settings)

## 0.5.3
- ignore an error when we try to delete an Intercom tag, which cannot be deleted (error 400)

## 0.5.2
- implement logging convention and adjust logging levels

## 0.5.1
- hotfix variable name

## 0.5.0
- save user tags after events coming from Intercom
- don't tag or untag user for particular segment tag based on `intercom/tags` trait values (don't untag if the segment user left is not present there, don't tag if the segment users should be in is already there)
- set event `ip` context param to Intercom event `last_seen_ip` field
- updates `hull-node`
- switch the default log format to json

## 0.4.0
- manual batch is NOT filtering users based on segment information
- fix NodeJS version to 6.10.0
- improve logging for user going through and for manual/automatic batch events

## 0.3.1
- hotfix error handling

## 0.3.0
- change the segment filtering - send no one by default
- store created attributes in the `intercom` group (Intercom -> Hull mapping)
- don't allow "create new values" in the Intercom attribute selector (Intercom -> Hull mapping)
- message the customer about custom attributes list behavior (they are available right after first
incoming user is processed by the ship)

## 0.1.0
- capturing basic events from Intercom (skipping events for Hull Segments Tags)
- adds `ensureWebhook` method which makes sure that the webhook has all topics set
- fixes handling data coming from Hull and Intercom webhook
- makes sure that companies, tags and segments array are clean
- overall maintenance fixes - linting, logging and cleanup

## 0.0.2
- setting default `name` value for new users sent to Hull
- minor bugfixes
