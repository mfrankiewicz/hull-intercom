# Hull Intercom Ship.
Syncs Hull Users from/to [Intercom](http://intercom.com).
End-users can install in 1 click from the hull.io Dashboard.

If you want to host your own instance: [![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/hull-ships/hull-intercom)

---

### Using :

[See Readme here](https://dashboard.hullapp.io/readme?url=https://hull-intercom.herokuapp.com)

### Developing :

- Fork
- Install
- Start Redis instance
- Copy .env.sample -> .env and set CLIENT_ID, CLIENT_SECRET, REDIS_URL

```sh
npm install
npm start
npm run start:dev # for autoreloading after changes
```

#### Docker based

If you want Docker based development after setting `.env` file:

```sh
docker-compose run install
docker-compose up -d redis
docker-compose up dev # with autoreloading enabled
```
