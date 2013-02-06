<?php
/**
 * Choose valid destinations from an external file associated with a Cloud Region 
 * measured by Radar
 */
class OpenmixApplication implements Lifecycle
{
    
    public $platforms = array(
        'amazon_ec2___asia_se__singapore__1a' => 'tobeoverwritten',
        'amazon_ec2___eu_west_1a' => 'tobeoverwritten',
        'amazon_ec2___us_east_1a' => 'tobeoverwritten'
    );

    /** Openmix is sometimes unable to calculate a response
    * Generally fewer than 0.01% of responses over a month are fallback
    * We need one CDN that can return content from any site, based on the HTTP HOST HEADER
    * the browser passes through, though we can also append the subdomain if that helps
    */
    private $fallback = array( 'dc1' => 'dc1.example.com');
    
    private $reasons = array(
        'Best Region' => 'A',
        'All destinations eliminated' => 'B',
        'Only one destination available' => 'C',
        'Data problem' => 'D'
    );
    
    private $ttl = 20;
    
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {

        // Only Need to pull in a single file. Which CDN the Load URL is associated with
        // is unimportant. Load URLs are configured via the portal > Platforms > Advanced > Sonar
        $config->declareInput(PulseProperties::LOAD, 'dc1');

        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->platforms)));

        foreach ($this->platforms as $alias => $destination)
        {
            $config->declareResponseOption($alias, $destination, $this->ttl);
        }
        // Even though there is just one fallback option
        foreach ($this->fallback as $alias => $cname)
        {
            $config->declareResponseOption($alias, $cname, $this->ttl);
        }
        foreach ($this->reasons as $code => $explanation)
        {
            $config->declareReasonCode($explanation);
        }
    }
    
    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     **/
    public function service($request,$response,$utilities)
    {
        $configData = $request->pulse(PulseProperties::LOAD);
        //print("\nPulse data:\n" . print_r($configData, true));
        $destinations = array();

        if (is_array($configData))
        {
            
            $val = $configData['dc1'];
            //print("\nVal:\n" . print_r($val, true));
            
            $rows = explode("\n", $val);
            foreach ($rows as $row)
            {
                if ($row[0] === '#' || count($row[0]) < 1) {
                    continue;
                }
                
                list($region,$hostname,$status) = explode(',', $row);
                
                // Add matching hosts to destinations 
                if ($status == 1) {
                    $destinations[$hostname] = $region;  
                }
            }
        }

        //print_r($destinations);
        //In case $destinations is empty
        if (count($destinations) == 0)
        {
            $response->selectProvider(key($this->fallback));
            $response->setReasonCode($this->reasons['All destinations eliminated']);
            // stop further execution
            return;
        } elseif (count($destinations) == 1)
        {
            $response->selectProvider($destinations[key($destinations)]);
            $response->setCName(key($destinations));
            $response->setReasonCode($this->reasons['Only one destination available']);
            return; 
        }

        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        $considered = array();
        $chosen_region = '';
        
        if (is_array($rtt))
        {
            // put the fastest first
            asort($rtt);
            foreach($rtt as $aws_region => $milliseconds)
            {
            
                #check to see if we have any choices within that region
                foreach ($destinations as $hostname => $region)
                {
                    if ($region === $aws_region)
                    {
                        //Push the matching platform to the end of the array
                        $considered[] = $hostname;
                        $chosen_region = $region;
                    }
                }
                
                //print_r($considered);
                if (count($considered) > 0)
                {
                    //print_r($considered);
                    // Now round robin within the remaining destinations
                    $idx = $this->rand(0, count($considered) - 1);
                    # $considered is a simple list so reference by position (versus key)
                    $response->selectProvider($chosen_region);
                    $response->setCName($considered[$idx]);
                    $response->setReasonCode($this->reasons['Best Region']);
                    return;
                }
            }
        } else
        {
            //In the unlikely event there is no RTT data, round robin
            //convert destination to simple list
            $considered = array_keys($destinations);
            $idx = $this->rand(0, count($considered) - 1);
            $response->selectProvider($destinations[$considered[$idx]]);
            $response->setCName($considered[$idx]);
            $response->setReasonCode($this->reasons['Data problem']);
            return;
        }
        
        $response->setReasonCode($this->reasons['Data Problem']);
        $response->selectProvider(key($fallback));
    }
    

    /* This method just wraps the PHP rand function, but provides
     * a seam that can be used in unit testing.
     */
    public function rand($min, $max)
    {
        return $min == $max ? $min : rand($min, $max);
    }
}
?>









