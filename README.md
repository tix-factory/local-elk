# Local ELK

The repository containing everything you need to run the ELK (Elasticsearch, Logstash, Kibana) stack, locally.

This repository was created with the intention of running ELK on Windows.

BONUS: Also runs prometheus, grafana, and ties it together with nginx.

# Setup

## Prerequisites

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install [WSL2](https://aka.ms/wsl2kernel), and run `wsl --set-default-version 2`
3. Ensure `openssl` exists in the `PATH` environment variable (see: [stackoverflow](https://stackoverflow.com/a/51757939/1663648))

## Repository Setup

Commands are intended to be run in the cloned repository root.

1. Move the `.wslconfig` file to `%USERPROFILE%`, and run `wsl --shutdown`, then use Docker Desktop to restart WSL2, in the troubleshoot panel.
2. Run `docker network create tix-factory`
3. Run `[guid]::NewGuid().ToString() | Out-File -FilePath .\secrets\prometheus-bearer-token.txt -NoNewline -Encoding UTF8`
4. Run `docker-compose up -d`
5. Run `node index.js { email }` in the [http/certbot](./http/certbot) directory. Recommended to setup a recurring task for this one.
6. Save the password output by this command, it will be used to connect to kibana.
7. Run `docker-compose restart nginx`

## Kibana

Configure the index in kibana by going to `Stack Management` -> `Data Views`.

Create a data view for the `logstash` index to visualize the logs from all the docker containers.

## Grafana

Log into grafana (username: `admin`, password: `admin`), and set the email + username + password.

To add more hosts for prometheus to scrape for metrics, update the [prometheus.yml](./metrics/prometheus.yml) `targets`.
