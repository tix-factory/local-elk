# Local ELK

The repository containing everything you need to run the ELK (Elasticsearch, Logstash, Kibana) stack, locally.

This repository was created with the intention of running ELK on Windows.

# Setup

## Prerequisites

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install [WSL2](https://aka.ms/wsl2kernel), and run `wsl --set-default-version 2`

## Repository Setup

Commands are intended to be run in the cloned repository root.

1. Move the `.wslconfig` file to `%USERPROFILE%`, and run `wsl --shutdown`, then use Docker Desktop to restart WSL2, in the troubleshoot panel.
2. Run `docker network create tix-factory`
3. Run `docker-compose up -d`
