<?php

/*
Choose the best provider by Throuput, if the top 2 are within $tieThreshold %, use Response time to break the tie
*/


class OpenmixApplication implements Lifecycle
{
    /**
     * @var The list of available CNAMEs, keyed by alias.
     */
    public $platforms = array(
        'cdn1' => 'cdn1.cedexis.com',
        'cdn2' => 'cdn2.cedexis.com');
    
    private $reasons = array(
        'Best performing platform selected by KBPS' => 'A',
        'Best performing platform selected by RTT' => 'B',
        'Data problem' => 'C',
        'All platforms eliminated' => 'D');
    
    private $ttl = 20;
    
    private $availabilityThreshold = 90;

    private $tieThreshold = .95;
    
    /**
     * @param Configuration $config
     */
    public function init($config)
    {
        $config->declareInput(
            RadarProbeTypes::HTTP_RTT,
            implode(',', array_keys($this->platforms)));
        
        $config->declareInput(
            RadarProbeTypes::HTTP_KBPS,
            implode(',', array_keys($this->platforms)));
        
        $config->declareInput(
            RadarProbeTypes::AVAILABILITY,
            implode(',', array_keys($this->platforms)));
        
        foreach ($this->platforms as $alias => $cname)
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
        //First, remove unavailable platforms
        $avail = $request->radar(RadarProbeTypes::AVAILABILITY);
        $candidates = $this->platforms;
        foreach ($avail as $alias => $value)
        {
            //print "$alias has {$avail[$alias]}\n";
            if ($value < $this->availabilityThreshold)
            {
                unset($candidates[$alias]);
            }
        }

        //If none or just one are available, choose the least bad
        if(count($candidates) <= 1)
        {
            //print "Availability Issue, choosing the best: {$avail[key($avail)]}\n";
            arsort($avail);
            $response->selectProvider(key($avail));
            $response->setReasonCode($this->reasons['All platforms eliminated']);
            return;
        }

        $kbps = $request->radar(RadarProbeTypes::HTTP_KBPS);
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        if (is_array($kbps) && 0 < count($kbps)) 
        {
            //print_r($kbps);
            //$candidates now has the KBPS info for the reminaing platforms
            $candidates = array_intersect_key($kbps, $candidates);
            if (1 < count($candidates))
            {
                arsort($candidates);
                //print_r($candidates);
                //see if the top 2 are a tie
                $first = array_slice($candidates, 0, 1, true);
                $second = array_slice($candidates, 1, 1, true);
                /*
                print "first:   "; print_r($first); print "second:   "; print_r($second);
                */
                //Access the 0th value in an array w/o knowing the key
                if($first[key($first)] * $this->tieThreshold <= $second[key($second)] && is_array($rtt))
                {
                    //print "a tie! \n";
                    $candidates = array_intersect_key($rtt, $candidates);
                    asort($candidates);
                    $response->selectProvider(key($candidates));
                    $response->setReasonCode($this->reasons['Best performing platform selected by RTT']);
                    return;
                }
            }
            //print "not a tie or only 1 platform passed availability: \n";
            $response->selectProvider(key($first));
            $response->setReasonCode($this->reasons['Best performing platform selected by KBPS']);
            return;
        } elseif (is_array($rtt) && 0 < count($rtt))
        {
            //We lack KBPS measurements so choose by RTT
            $candidates = array_intersect_key($rtt, $candidates);
            asort($candidates);
            $response->selectProvider(key($rtt));
            $response->setReasonCode($this->reasons['Best performing platform selected by RTT']);
            return;
        }
        else
        {
            $response->setReasonCode($this->reasons['Data problem']);
        }
        $utilities->selectRandom();
    }
}
?>
