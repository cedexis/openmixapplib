# Application: **AppDynamics Integration**

AppDynamics is an APM vendor focused on enterprise Java and .NET web applications. This app demonstrates using real time data from AppDynamics for decision making. Using FusionCustom, we will dynamically collect server health stats using a collector and basic HTTP authentication. 

This is a very simple example using current CPU threshold to switch between hosts. 

Log into [the AppDynamics dashboard](http://cedexis.saas.appdynamics.com/controller) and confirm that you see data coming in for your application. You might use Apache Bench (ab) to push some traffic at your test application.
 
From here you'll need to decide on which metric to pull from AppDynamics for decision making. 

Please refer to the [AppDynamics REST API](http://docs.appdynamics.com/display/ADPRO/Use+the+AppDynamics+REST+API) reference for additional info, you may need to authenticate with your AppDynamics credentials.
 
The metric we are going to use in this sample is "Application Infrastructure Performance|_Your_App_Identifier_|JVM|Process CPU Burnt (ms/min)" found at:

	http://cedexis.saas.appdynamics.com/controller/rest/applications/_Your_App_Identifier_/metric-data?output=JSON&metric-path=Application%20Infrastructure%20Performance%7C_Your_App_Identifier_%7CJVM%7CProcess%20CPU%20Burnt%20(ms/min)&time-range-type=BEFORE_NOW&duration-in-mins=15

which should return a payload similar to:

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

# Getting started

1. Open a browser to the Cedexis Portal

2. Upload the above OpenmixApplication.php as a new Application

3. Using the CNAME corresponding to your openmix app, open a new terminal, get a steady stream of DNS requests to the app by running:

		watch -n 1 dig +short __your_openmix_cname__.cdx.cedexis.net

4. Create a Custom platform with an alias of "appdynamics_a" with Sonar Load configured to a URL similar to (Note: the basica auth credentials passed in the URL):

		  http://username:secretpassword@cedexis.saas.appdynamics.com/controller/rest/applications/_Your_App_Identifier_/metric-data?output=JSON&metric-path=Application%20Infrastructure%20Performance%7C_Your_App_Identifier_%7CJVM%7CProcess%20CPU%20Burnt%20(ms/min)&time-range-type=BEFORE_NOW&duration-in-mins=15

5. Create a Custom platform with an alias of "appdynamics_b". It is just a placeholder for the other choice.

6. For testing, spike the CPU on your appdynamics_a target over the threshold (200 by default) using a script similar to:

		watch -n 3 ab -n 40 -c 4 -r http://_URL_to_your_appdynamics_a_host
		
7. Watch openmix switch to appdynamics_b in your terminal window (there may be a delay depending on Sonar configuration)