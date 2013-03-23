# Application: **Fusion Custom - cloud burstig with weighted round robin based on an instance health check**

Demonstrates how to mix Radar performance data with a dynamically maintained list of Cloud Instances. Each cloud instance is associated with a Cloud Provider Region (like AWS US-East) for which we have Radar Performance data. Each instance also has a destination hostname or IP address and a "health" value (1-10). Openmix will first determine the health of all the instances in each region. Regions where instances are struggling will have a handicap applied to their Radar score. This will shed traffic away from struggling regions. Users are sent to least latent Cloud Region and then an instance within using a weighted round robin approach taking into account the instance health score.

# Openmix Application Library

[Cedexis Openmix](http://www.cedexis.com/products/openmix.html) applications
give you dynamic, flexible, and automatic control over where your traffic is
routed so that your business goals are achieved. Openmix applications are
programmed in [PHP](http://www.php.net), a commonly used server-side language
accessible to most web programmers and network administrators.

These Openmix Application PHP scripts are used by specialized DNS servers to respond to DNS requests based on the logic in the scripts. Deployment of the scripts is done via our [customer portal](https://portal.cedexis.com/) or [web services API](https://github.com/cedexis/webservices/wiki).

Learn how to use the library to make your own applications in
[the wiki](https://github.com/cedexis/openmixapplib/wiki).

