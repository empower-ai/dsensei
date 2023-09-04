# <img valign="middle" src="https://github.com/logunify/dsensei/blob/main/docs/images/logo.png" width="65" height="65"/> DSensei

[![Discord](https://img.shields.io/badge/discord-@DSensei-blue.svg?logo=discord)](https://discord.gg/6h5cdNhK)

## Introduction

https://github.com/dsensei/dsensei/assets/1261809/85d9094c-ae12-4bae-b15c-0e8cc1368729

The video is muted by default, 🎧 Unmute for audio explanations and improve your viewing experience!

### Quick Start

Live Demo

[https://app.dsensei.app](https://app.dsensei.app)

Running Locally

```shell
docker run -p 5001:5001 dsenseiapp/dsensei:latest
```

Open [http://localhost:5001](http://localhost:5001)

## Table of Contents

- [What is DSensei](#What-is-DSensei)
- [Setup](#Setup)
- [Contact](#Contact)

## What is DSensei

DSensei is an AI-powered key driver analysis engine that can
pinpoint the root cause of metric fluctuations within one minute. We
save data teams hours to days of manual work on root cause analysis
and help organizations uncover critical drivers and segments that
are otherwise easy to overlook.

DSensei overcome the limitation of existing BI tools to empower you
to understand the "why" behind metric fluctuations to inform better
business decisions more effectively. Checkout our [blog](https://www.dsensei.app/article/why-do-you-need-a-key-driver-analysis-engine)
for more details.

## Setup

There are multiple ways to run DSensei on your machine.

### Using Docker (recommended)

The recommended way is to use the official Docker image. Make sure you have Docker installed on your system, then run the following command:

If you use CSV data source:

```shell
docker run -p 5001:5001 dsenseiapp/dsensei:latest
```

If you use BigQuery data source:

```shell
gcloud auth application-default login
docker run -p 5001:5001 -v ~/.config:/root/.config -e GCLOUD_PROJECT=$GOOGLE_PROJECT dsenseiapp/dsensei:latest
```

Replace the `$GOOGLE_PROJECT` with your own GCP project name.

This will pull the latest version of the DSensei-insight image and start the application on port 5001.

### Running from code

To run the application locally without Docker, you need to have `python3` and `nodejs-18` installed on your system, then follow these steps.

1. First, navigate to the `frontend` directory and install dependencies using pnpm `pnpm install` or npm `npm install`
2. Then build the frontend `npm run build`
3. Switch to the `backend` directory and install python dependencies: `python install -r requirements.txt`
4. Finally, run the application by executing the following command in the backend directory `flask run -p 5001`

## Contact

Please submit your bug report or feature request directly on github or in our [discord group](https://discord.gg/6h5cdNhK). We appreciate all your feedback!
