<?php

class BgpProperties
{
    /**
     * The value of the next hop in the bgp feed.
     * 
     * Example::
     *
     *      $value = $request->bgp(BgpProperties::NEXT_HOP);
     */
    const NEXT_HOP = 'integer:bgp:next_hop';
    
    /**
     * The bgp community string
     * 
     * Example::
     * 
     *      $value = $request->bgp(BgpProperties::COMMUNITY);
     */
    const COMMUNITY = 'string:bgp:community';
}

?>
