<?php

$phpDir = realpath(dirname(dirname(__FILE__)));

$temp = explode('/', $phpDir);
array_push($temp, 'app');
$temp = implode('/', $temp);
define('APP_DIR', $temp, true);
//print("\nAPP_DIR: " . APP_DIR);

$temp = explode('/', $phpDir);
array_push($temp, 'api');
$temp = implode('/', $temp);
define('API_DIR', $temp, true);
//print("\nAPI_DIR: " . API_DIR . "\n");

require_once realpath(API_DIR . '/Lifecycle.php');
require_once realpath(API_DIR . '/Configuration.php');
require_once realpath(API_DIR . '/Request.php');
require_once realpath(API_DIR . '/Response.php');
require_once realpath(API_DIR . '/Utilities.php');
require_once realpath(API_DIR . '/RadarProbeTypes.php');
require_once realpath(API_DIR . '/PulseProperties.php');
require_once realpath(API_DIR . '/FusionProperties.php');
require_once realpath(API_DIR . '/AnkeenaProperties.php');
require_once realpath(API_DIR . '/BgpProperties.php');
require_once realpath(API_DIR . '/GeoProperties.php');
require_once realpath(API_DIR . '/RequestProperties.php');

?>