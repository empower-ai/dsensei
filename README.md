# <img valign="middle" src="https://github.com/logunify/dsensei/blob/main/docs/images/logo.png" width="65" height="65"/> DSensei

[![Discord](https://img.shields.io/badge/discord-@DSensei-blue.svg?logo=discord)](https://discord.gg/fRzNUEugRU)

## Introduction

https://github.com/dsensei/dsensei-insight/assets/1261809/4452e2fb-d77c-44e8-bb42-ad8972bebb5c

The video is muted by default, 🎧 Unmute for audio explanations and improve your viewing experience!

### Quick Start

Live Demo

[https://app.dsensei.app](https://app.dsensei.app)

Running Locally

```shell
docker run -p 5001:5001 dsenseiapp/dsensei
```

Open [http://localhost:5001](http://localhost:5001)

## Table of Contents

- [What is DSensei](#What-is-DSensei)
- [Setup](#Setup)
- [Contact](#Contact)

## What is DSensei

DSensei is an open-source insight discovery engine that goes beyond
traditional BI dashboards by uncovering patterns and revelations in
datasets. While BI dashboards can answer the question of "what,"
they fall short of explaining the "why." As a result, when facing movements
in metrics, it often requires significant manual effort to explore
various combinations and identify the underlying causes.

For example, consider an e-commerce platform experiencing a recent
surge in return orders. To pinpoint the reason, one would need to
generate multiple hypotheses (E.g: Is the rise in returns limited to
specific brands, product categories, regions, or some specific
combinations? Is there a global phenomenon influenced by a general
increase in the number of orders.) and conduct extensive slicing and
dicing to uncover potential factors. This process can be arduous and
time-consuming.

We built DSensei to address this. By autonomously exploring all
possible combinations over a specified time period, DSensei offers a
holistic view of the data and presents the top drivers in a
user-friendly interface. This empowers users to establish a holistic
view of all the key drivers and delve into each factor effortlessly
and gain intuitive insights into the reasons behind specific
movements in their datasets. As a result, users can get the answer
to the “why” more effectively.

## Setup

There are multiple ways to run DSensei on your machine.

### Using Docker (recommended)

The recommended way is to use the official Docker image. Make sure you have Docker installed on your system, then run the following command:

```shell
docker run -p 5001:5001 dsenseiapp/dsensei
```

This will pull the latest version of the DSensei-insight image and start the application on port 5001.

### Running from code

To run the application locally without Docker, you need to have `python3` and `nodejs-18` installed on your system, then follow these steps.

1. First, navigate to the `frontend` directory and install dependencies using pnpm `pnpm install` or npm `npm install`
2. Then build the frontend `npm run build`
3. Switch to the `backend` directory and install python dependencies: `python install -r requirements.txt`
4. Finally, run the application by executing the following command in the backend directory `flask run -p 5001`

## Contact

Please submit your bug report or feature request directly on github or in our [discord group](https://discord.gg/fRzNUEugRU). We appreciate all your feedback!
