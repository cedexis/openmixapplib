#!/bin/sh

rsync -a --delete template/api limit-money-spent
rsync -a --delete template/api conditional-host-name
rsync -a --delete template/api perf-and-availability
rsync -a --delete template/api geo-with-overides
rsync -a --delete template/api perf-with-geo-backup
rsync -a --delete template/api thruput-with-rtt
rsync -a --delete template/api limit-load
rsync -a --delete template/api perf-with-penalty
