# Application: **Fusion Custom - Manage Cloud Instances externally**

Demonstrates how to mix Radar performance data with a dynamically maintained list of Cloud Instances. Each cloud instance is associated with a Cloud Provider Region (like AWS US-East) for which we have Radar Performance data. Each instance also has a destination hostname or IP address and a "status". Openmix will first determine the least latent Cloud Region and then Round Robin within the specific Cloud Instances marked as "UP" in the destinations.txt file.

# Openmix Application Library

[Cedexis Openmix](http://www.cedexis.com/products/openmix.html) applications
give you dynamic, flexible, and automatic control over where your traffic is
routed so that your business goals are achieved. Openmix applications are
programmed in [PHP](http://www.php.net), a commonly used server-side language
accessible to most web programmers and network administrators.

These Openmix Application PHP scripts are used by specialized DNS servers to respond to DNS requests based on the logic in the scripts. Deployment of the scripts is done via our [customer portal](https://portal.cedexis.com/) or [web services API](https://github.com/cedexis/webservices/wiki).

Learn how to use the library to make your own applications in
[the wiki](https://github.com/cedexis/openmixapplib/wiki).

