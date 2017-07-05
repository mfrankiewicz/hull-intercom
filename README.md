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
