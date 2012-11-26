<?php

class EDNSProperties
{
    /**
     * (string) ISO 10383 Market Identification Code of market in which the
     * request's client is located
     */
    const MARKET  = 'string:edns:market_iso';
    /**
     * (string) ISO 3166-1 alpha-2 code assigned to the country where the
     * request's client is located
     */
    const COUNTRY = 'string:edns:country_iso';
    /**
     * (integer) ASN (Autonomous System Number) assigned to the network of the
     * request's origin
     */
    const ASN     = 'integer:edns:asn';

	/**
	 * This is a hack to 'turn on' edns for apps. Returns true at service if
	 * EDNS is enabled and we have an EDNS_IP set.
     */		
	const ENABLE = 'integer:enable_edns:enable_edns';
}

?>
