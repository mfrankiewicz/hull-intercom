# Hull Intercom Ship.
Syncs Hull Users from/to [Intercom](http://intercom.com).
End-users can install in 1 click from the hull.io Dashboard.

If you want to host your own instance: [![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/hull-ships/hull-intercom)

---

## Using:

[See Readme here](https://dashboard.hullapp.io/readme?url=https://hull-intercom.herokuapp.com)

## Developing:

- Fork
- Install
- Start Redis instance
- Copy .env.sample -> .env and set CLIENT_ID, CLIENT_SECRET, REDIS_URL

### Native node:

```sh
npm install
npm start
npm run start:dev # for autoreloading after changes
```

`npm run ngrok` will allow you to serve the connector to a publicly-accessible URL

### Docker based

If you want Docker based development after setting `.env` file:

```sh
docker-compose run npm install
docker-compose run npm # with autoreloading enabled

# run tests
docker-compose run npm test

# install new dep
docker-compose run npm install dep -s
```


---

## Intercom API endpoints

- `GET /users`
- `GET /users/scroll`
- `POST /users`
- `POST /bulk/users`
- `GET /jobs/${id}`
- `GET /jobs/${id}/error`
- `GET /tags`
- `POST /tags`
- `GET /contacts`
- `POST /contacts`
- `POST /contacts/convert`
- `GET /subscriptions/${id}`
- `POST /subscriptions/${id}`

---

### Logs 

  Logs that are specific for Intercom Connector: 
  
    * service.api.ratelimit - warning about rate limits 
    * intercomAgent.sendUsers.microbatch.error - logged when encountered some problems during micro users batch operation 
    * intercomAgent.sendUsers.bulkSubmit.error - logged when encountered some problems during bulk users submit operation
    * intercomAgent.tagUsers.error - logged when encountered some problems during tag users operation 
    * getUsersTotalCount.error - logged when encountered error while getting users from intercom
    * saving user error - logged if connector encountered some conflicts during save user operation
    * getRecentUsers.error - logged while getting recent users throwed an error
    * sync.error - logged when connector was unable to delete tag at intercom
    * postConvertLead.error - logged when converting lead throwed an error
    * postLeads.error - logged when encountered problem during post leads operation
