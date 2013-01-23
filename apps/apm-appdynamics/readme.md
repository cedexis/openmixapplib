# Application: **AppDynamics Integration**

AppDynamics is an APM vendor focused on enterprise Java and .NET web applications. This app demonstrates using real time data from AppDynamics for decision making. Using FusionCustom, we will dynamically collect server health stats using a collector and basic HTTP authentication. 

This is a very simple example using current CPU threshold to switch between hosts. 

Log into [the AppDynamics dashboard](http://cedexis.saas.appdynamics.com/controller) and confirm that you see data coming in for your application. You might use Apache Bench (ab) to push some traffic at your test application.
 
From here you'll need to decide on which metric to pull from AppDynamics for decision making. 

Please refer to the [AppDynamics REST API](http://docs.appdynamics.com/display/ADPRO/Use+the+AppDynamics+REST+API) reference for additional info, you may need to authenticate with your AppDynamics credentials.
 
The metric we are going to use in this sample is "Application Infrastructure Performance|_Your_App_Identifier_|JVM|Process CPU Burnt (ms/min)" found at:

	http://cedexis.saas.appdynamics.com/controller/rest/applications/_Your_App_Identifier_/metric-data?output=JSON&metric-path=Application%20Infrastructure%20Performance%7C_Your_App_Identifier_%7CJVM%7CProcess%20CPU%20Burnt%20(ms/min)&time-range-type=BEFORE_NOW&duration-in-mins=15

which should return a payload like:

	[{
	  "frequency": "ONE_MIN",
	  "metricPath": "Application Infrastructure Performance|Trial Tier 1|JVM|Process CPU Burnt (ms/min)",
	  "metricValues": [  {
	    "current": 10,
	    "max": -2147483648,
	    "min": 2147483647,
	    "startTimeInMillis": 1358875140000,
	    "value": 0
	  }]
	}]

The value we are interested in is "current".

# Cedexis setup (Portal)

1. Upload the above OpenmixApplication.php as a new Application

2. Using the CNAME corresponding to your openmix app, open a new terminal, get a steady stream of DNS requests to the app by running:

		watch -n 1 dig +short __your_openmix_cname__.cdx.cedexis.net

3. Create a Custom platform with an alias of "appdynamics_a" with Sonar Load configured to a URL similar to:

		  http://cedexis.saas.appdynamics.com/controller/rest/applications/_Your_App_Identifier_/metric-data?output=JSON&metric-path=Application%20Infrastructure%20Performance%7C_Your_App_Identifier_%7CJVM%7CProcess%20CPU%20Burnt%20(ms/min)&time-range-type=BEFORE_NOW&duration-in-mins=15

4. Create a Custom platform with an alias of "appdynamics_b". It is just a placeholder for the other choice.

5. For testing, spike the CPU on your appdynamics_a target over the threshold (200 by default) using a script similar to:

		watch -n 3 ab -n 40 -c 4 -r http://_URL_to_your_appdynamics_a_host
		
6. Watch openmix switch to appdynamics_b in your terminal window (there may be a delay depending on Sonar configuration).

# Openmix Application Library

[Cedexis Openmix](http://www.cedexis.com/products/openmix.html) applications
give you dynamic, flexible, and automatic control over where your traffic is
routed so that your business goals are achieved. Openmix applications are
programmed in [PHP](http://www.php.net), a commonly used server-side language
accessible to most web programmers and network administrators.

These Openmix Application PHP scripts are used by specialized DNS servers to respond to DNS requests based on the logic in the scripts. Deployment of the scripts is done via our [customer portal](https://portal.cedexis.com/) or [web services API](https://github.com/cedexis/webservices/wiki).

Learn how to use the library to make your own applications in
[the wiki](https://github.com/cedexis/openmixapplib/wiki).