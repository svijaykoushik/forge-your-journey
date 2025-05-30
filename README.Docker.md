### Building and running your application

When you're ready, start your application by running:
`docker compose up --build`.

**Setting `ARG` values in `docker-compose.yml`**:
You can define `args` in your `docker-compose.yml` file under the `build` section for your service. For example:

```yaml
services:
  your-service-name:
    build:
      context: .
      args:
        GEMINI_API_KEY: your_gemini_api_key_here # Replace with your actual key
        IMAGE_GENERATION_ENABLED: disabled # Replace with enabled if you need visuals
````

Your application will be available at http://localhost:80.

-----

### Deploying your application to the cloud

First, build your image, e.g.: `docker build -t myapp .`.

**Setting `ARG` values when building directly**:
You can pass `ARG` values directly during the `docker build` command using the `--build-arg` flag. For example:

```sh
docker build --build-arg GEMINI_API_KEY=your_gemini_api_key_here --build-arg IMAGE_GENERATION_ENABLED=disabled -t myapp .
```

If your cloud uses a different CPU architecture than your development
machine (e.g., you are on a Mac M1 and your cloud provider is amd64),
you'll want to build the image for that platform, e.g.:
```sh
docker build --platform=linux/amd64 --build-arg GEMINI_API_KEY=your_gemini_api_key_here --build-arg IMAGE_GENERATION_ENABLED=disabled -t myapp .
```

Then, push it to your registry, e.g. `docker push myregistry.com/myapp`.

Consult Docker's [getting started](https://docs.docker.com/go/get-started-sharing/)
docs for more detail on building and pushing.

-----

### References

  * [Docker's Node.js guide](https://docs.docker.com/language/nodejs/)