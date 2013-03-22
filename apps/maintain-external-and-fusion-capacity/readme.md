# Application: **Fusion Custom - Cloud Bursting with Weighted Round Robin**

Demonstrates how to mix Radar performance data with a dynamically maintained list of Cloud Instances and instance capacity data from Nagios or New Relic. Each cloud instance is associated with a Cloud Provider Region (like AWS US-East) for which we have Radar Performance data. Each instance also has a destination hostname or IP address and a "health" value between 1 and 10. Openmix will first determine the least latent Cloud Region and then use a Wieghted Round Robin approach within the specific Cloud Instances. If the instances in a specific region are unhealthy this app will automatically decrease traffic to the impacted region until instance health improves.

# Openmix Application Library

[Cedexis Openmix](http://www.cedexis.com/products/openmix.html) applications
give you dynamic, flexible, and automatic control over where your traffic is
routed so that your business goals are achieved. Openmix applications are
programmed in [PHP](http://www.php.net), a commonly used server-side language
accessible to most web programmers and network administrators.

These Openmix Application PHP scripts are used by specialized DNS servers to respond to DNS requests based on the logic in the scripts. Deployment of the scripts is done via our [customer portal](https://portal.cedexis.com/) or [web services API](https://github.com/cedexis/webservices/wiki).

Learn how to use the library to make your own applications in
[the wiki](https://github.com/cedexis/openmixapplib/wiki).

