# climatecoin-backend

We use Strapi (https://strapi.io/) as CMS for ClimateCoin.

# How to install

* First, create MongoDB container executing:
  
  ```docker-compose up -d```

* Next, you must create your .env file copying .env.example file and make sure you use correct data in the following variables (data used when you created previous database):
  
  ```
  DATABASE_PORT=270127
  DATABASE_NAME=climatecoin
  DATABASE_USERNAME=strapi
  DATABASE_PASSWORD=strapi
  ```

* Then you can install project requeriments:
  
  ```yarn```

* And finally, execute the this command to start strapi:
  
  ```yarn develop```

* If all it is correct, you could navigate to http://localhost:1337/admin/ to see your strapi in action!

# Tests

```export DEBUG=nock.* && yarn test```

### Volumes

Create the volume on the server and mount it in `/opt/public/uploads`
