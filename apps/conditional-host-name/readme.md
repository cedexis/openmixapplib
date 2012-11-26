# Application: **Conditional Host Names**

Some platforms use virtual-host specific hostnames, often for content localization, but you often want to centralize these into your Openmix script rather than creating many Openmix platforms. For example, imagine your website has the URLs http://&lt;country&gt;.example.com/ where &lt;country&gt; is replaced with ISO codes.  

The solution is to dynamically construct the resulting hostname in the application as in this example application which routes traffic to the available platform with the lowest response time.

# Openmix Application Library

[Cedexis Openmix](http://www.cedexis.com/products/openmix.html) applications
give you dynamic, flexible, and automatic control over where your traffic is
routed so that your business goals are achieved. Openmix applications are
programmed in [PHP](http://www.php.net), a commonly used server-side language
accessible to most web programmers and network administrators.

These Openmix Application PHP scripts are used by specialized DNS servers to respond to DNS requests based on the logic in the scripts. Deployment of the scripts is done via our [customer portal](https://portal.cedexis.com/) or [web services API](https://github.com/cedexis/webservices/wiki).

Learn how to use the library to make your own applications in
[the wiki](https://github.com/cedexis/openmixapplib/wiki).

