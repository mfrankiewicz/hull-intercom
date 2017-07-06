# Changelog

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
