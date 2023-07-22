# <img valign="middle" src="https://github.com/logunify/dsensei/blob/main/docs/images/logo.png" width="65" height="65"/>   DSensei

[![Discord](https://img.shields.io/badge/discord-@DSensei-blue.svg?logo=discord)](https://discord.gg/fRzNUEugRU)


WIP

## Table of Contents

- [Demo Videos](#Demo-videos)
- [Setup](#Setup)
- [Usage](#Usage)
- [Known Issues](#Known-Issues)

## Demo Videos

https://github.com/dsensei/dsensei-insight/assets/1261809/4452e2fb-d77c-44e8-bb42-ad8972bebb5c


## Setup
There are multiple ways to run DSensei on your machine.

### Using Docker (recommended)
The recommended way is to use the official Docker image. Make sure you have Docker installed on your system, then run the following command:

```shell
docker run -p 5001:5001 dsenseiapp/dsensei:0.1.0
```

This will pull the latest version of the DSensei-insight image and start the application on port 5001.

### Running Locally
To run the application locally without Docker, you need to have `python3` and `nodejs-18` installed on your system, then follow these steps.

1. First, navigate to the `frontend` directory and install dependencies using pnpm `pnpm install` or npm `npm install`
2. Then build the frontend `npm run build`
3. Switch to the `backend` directory and install python dependencies: `python install -r requirements.txt`
4. Finally, run the application by executing the following command in the backend directory `flask run`

### Building Your Own Docker Image
If you want to modify and run the application using Docker, you can build the Docker image using the provided `Dockerfile` in this project.


## Usage
