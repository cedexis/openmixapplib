<?php

/* Some platforms use virtual-host specific hostnames, often for content localization, but you often want to centralize these into your Openmix script rather than creating many Openmix platforms. For example, imagine your website has the URLs http://<country>.example.com/ where <country> is replaced with ISO codes.

The solution is to dynamically construct the resulting hostname in the application as in this example application which routes traffic to the available platform with the lowest response time.
*/

class OpenmixApplication implements Lifecycle
{
    public $providerss = array(
        'cdn1' => 'example.com.cdn1.net',
        'cdn2' => 'example.com.cdn2.net');

    private $cthost = array(
     "de" => "123.",
     "uk" => "456.",
     "es" => "789."
    );
        
    private $reasons = array(
        'Best performing providers selected' => 'A',
        'Data problem' => 'B',
        'All providerss eliminated' => 'C');
    
    private $ttl = 30;
    
    private $availabilityThreshold = 90;
    
    /**
     * @param Configuration $config
     */
    public function init($config)
    {
        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->providerss)));
        
        $config->declareInput(
            RadarProbeTypes::AVAILABILITY,
            implode(',', array_keys($this->providerss)));
        
        $config->declareInput(RequestProperties::HOSTNAME);
        
        foreach ($this->providerss as $alias => $cname)
        {
            $config->declareResponseOption($alias, $cname, $this->ttl);
        }
        
        foreach ($this->reasons as $code)
        {
            $config->declareReasonCode($code);
        }
    }
    
    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     */
    public function service($request, $response, $utilities)
    {
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        $hostname = $request->request(RequestProperties::HOSTNAME);
        
        if (is_array($rtt)) {
            $candidates = array_intersect_key($rtt, $this->providerss);
            if (0 < count($candidates))
            {
                print("\ncandidates\n");
                print_r($candidates);
                // Select the best performing providers that meets its minimum
                // availability score, if given
                asort($candidates);
                $avail = $request->radar(RadarProbeTypes::AVAILABILITY);
                print("avail is\n");
                print_r($avail);
                foreach (array_keys($candidates) as $alias)
                {
                    print_r($avail);
                    if ($avail[$alias] >= $this->availabilityThreshold)
                    {
                        print("\nthere are candiates above the avail threshold\n");
                        $response->selectProvider($alias);
                        $response->setReasonCode($this->reasons['Best performing providers selected']);
                        // Now confirm and translate the ISO country code to the numeric identifier
                        // and append to the front of the providers name
                        if (in_array($hostname, $this->$cthost))
                        {
                            $response->setCName($this->cthost[$hostname] . $this->providerss[$alias]);
                        }
                        // optionally add an else statement to handle the  unkown case
                        return;
                    }
                }
                $response->setReasonCode($this->reasons['All providerss eliminated']);
            }
            else
            {
                $response->setReasonCode($this->reasons['Data problem']);
            }
        }
        else
        {
            $response->setReasonCode($this->reasons['Data problem']);
        }
        $utilities->selectRandom();
    }
}
?>
