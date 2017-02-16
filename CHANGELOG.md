# Changelog

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
