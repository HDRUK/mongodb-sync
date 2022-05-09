### Program to sync databases

### .env

Create the ".env" file in the root of the repository.

```
PROD_URI = "mongodb+srv://usr:pass@cluster/prod" # the full URI of the source db
LOCAL_URI = "mongodb+srv://usr:pass@cluster/bau" # the full URI of the target db
LOCAL_DB = "bau" # the base name of the target db
```

#### Steps below on how to RUN

The script is wrapped in an Express application so that it can be triggered by a HTTP request on a serverless platform.

To run the script locally - first build the Docker image:

`docker build -t <image_name> . `

Then run the image inside a container:

`docker run -i -p 8080:8080 <image_name>`

The script can now be triggered by a POST request to the chosen port. The name of the collections you wish to sync from the source db to the target db needs to be passed as JSON in the request.

For example, if we want to sync "teams" and "users", we would send:

```
POST [host:port]/

{
  "collections": ["teams", "users"]
}

200 - OK
```
