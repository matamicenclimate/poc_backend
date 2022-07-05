# climatecoin-backend

We use Strapi (https://strapi.io/) as CMS for ClimateCoin.

# How to install

* First, create MongoDB container executing:
  
  ```docker-compose up -d```

* Next, you must create your .env file copying .env.example file and make sure you use correct data in the following variables (data used when you created previous database):
  
```
DATABASE_PORT=27018
DATABASE_NAME=project
DATABASE_USERNAME=guest
DATABASE_PASSWORD=guest
```

* Configure MinIO at http://localhost:9011/login, login with `admin` and `supersecret`.
Create a bucket named `climatecoin`. Lastly, to obtain the access and secret keys you must
create a "service account" (Under identity tab).

_Note_: Default API port is `9010`, GUI port is `9011`, see `docker-compose.yml`.

```
MINIO_ACCESS_KEY=<your-keys-here>
MINIO_SECRET_KEY=<your-keys-here>
MINIO_BUCKET=climatecoin
MINIO_ENDPOINT=localhost
MINIO_USE_SSL=true
MINIO_PORT=9010
MINIO_HOST=localhost:9010
```

* Then you can install project requeriments:
  
  ```yarn```

* And finally, execute the this command to start strapi:
  
  ```yarn develop```

* If all it is correct, you could navigate to http://localhost:1337/admin/ to see your strapi in action!

# Tests

```export DEBUG=nock.* && yarn test```

# Volumes

Create the volume on the server and mount it in `/opt/public/uploads`
