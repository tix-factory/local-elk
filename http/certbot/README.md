# certbot

This directory contains the node script that launches the [certbot](https://hub.docker.com/r/certbot/certbot) docker image, for each site in the [sites-enabled](../sites-enabled) directory.

The contents of each site configuration file are then copied into the [sites-available](../sites-available) directory, after the SSL certificates are generated.

It is recommended to setup a recurring task that executes `node index.js { email }` once/week.
