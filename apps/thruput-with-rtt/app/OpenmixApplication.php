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
        'cdn2' => 'cdn2.cedexis.com'
    );

    private $reasons = array(
        'A', // Best performing platform selected by KBPS
        'B', // Best performing platform selected by RTT
        'C', // Data problem
        'D', // All platforms eliminated
    );

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
            $response->setReasonCode('D');
            return;
        }

        $kbps = $request->radar(RadarProbeTypes::HTTP_KBPS);
        $rtt = $request->radar(RadarProbeTypes::HTTP_RTT);
        if (!empty($kbps)) 
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
                if($first[key($first)] * $this->tieThreshold <= $second[key($second)] && !empty($rtt))
                {
                    //print "a tie! \n";
                    $candidates = array_intersect_key($rtt, $candidates);
                    asort($candidates);
                    $response->selectProvider(key($candidates));
                    $response->setReasonCode('B');
                    return;
                }
            }
            //print "not a tie or only 1 platform passed availability: \n";
            $response->selectProvider(key($first));
            $response->setReasonCode('A');
            return;
        } elseif (!empty($rtt))
        {
            //We lack KBPS measurements so choose by RTT
            $candidates = array_intersect_key($rtt, $candidates);
            asort($candidates);
            $response->selectProvider(key($rtt));
            $response->setReasonCode('B');
            return;
        }
        else
        {
            $response->setReasonCode('C');
        }
        $utilities->selectRandom();
    }
}
?>
