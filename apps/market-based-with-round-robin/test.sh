#!/bin/sh

set -v

# Canada 98.142.244.90
# expecting one of: 50.97.227.68, 65.254.36.226
dig +short 2-01-2a40-0009.cdx-i-98-142-244-90.cedexis.net

# Brazil 200.170.73.2
# expecting one of: 50.97.227.68, 65.254.36.226
dig +short 2-01-2a40-0009.cdx-i-200-170-73-2.cedexis.net

# Singapore 203.127.23.38
# expecting one of: 119.81.23.243, 50.97.227.68
dig +short 2-01-2a40-0009.cdx-i-203-127-23-38.cedexis.net

# Australia 117.53.166.22
# expecting one of: 119.81.23.243, 50.97.227.68
dig +short 2-01-2a40-0009.cdx-i-117-53-166-22.cedexis.net

# France 94.124.133.192
# expecting one of: 94.23.254.99, 37.59.8.25
dig +short 2-01-2a40-0009.cdx-i-94-124-133-192.cedexis.net

# Kenya 196.201.214.47
# expecting one of: 94.23.254.99, 37.59.8.25
dig +short 2-01-2a40-0009.cdx-i-196-201-214-47.cedexis.net
