<?php

/**
 * For information on writing Openmix applications, check out
 * https://github.com/cedexis/openmixapplib/wiki
 */
class OpenmixApplication implements Lifecycle
{
    public $data_centers = array(
        'dc' => 'dc.example.com'
    );
    
    public $cdns = array(
        'cdn' => 'example.cdn.com'
    );
    
    public $ttl = 20;
    
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        foreach (array_merge($this->data_centers, $this->cdns) as $alias => $cname) {
            $config->declareResponseOption($alias, $cname, $this->ttl);
        }
        $config->declareInput(
            PulseProperties::LOAD,
            implode(',', array_keys($this->data_centers)));
    }
    
    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     **/
    public function service($request,$response,$utilities)
    {
        $load_data = $request->pulse(PulseProperties::LOAD);
        $random = $this->getRand(0, count($this->data_centers) - 1);
        $selected_dc = array_keys($this->data_centers)[$random];
        $select_dc_load_data = $load_data[$selected_dc];
        $select_dc_load_data = trim($select_dc_load_data);
        $select_dc_load_data = str_replace("\r\n", "\n", $select_dc_load_data);
        $select_dc_load_data = explode("\n", $select_dc_load_data);
        $select_dc_load_data = array_values(array_filter($select_dc_load_data, array($this, 'containsData')));
        $selected_dc_current_load = floatval($select_dc_load_data[0]);
        //print("\ncurrent load: $selected_dc_current_load");
        $selected_dc_threshold = floatval($select_dc_load_data[1]);
        if ($selected_dc_current_load > $selected_dc_threshold) {
            // Calculate the CDN selection criteria
            $cdn_pct_factor = 100 / (100 - $selected_dc_threshold);
            $cdn_pct = ($selected_dc_current_load - $selected_dc_threshold);
            $cdn_pct = floor($cdn_pct * $cdn_pct_factor);
            //print("\ncdn pct: $cdn_pct");
            $random = $this->getRand(1, 100);
            //print("\nrandom: $random");
            if ($random <= $cdn_pct) {
                // Select CDN
                $random = $this->getRand(0, count($this->cdns) - 1);
                $selected_cdn = array_keys($this->cdns)[$random];
                $response->selectProvider($selected_cdn);
                return;
            }
        }
        $response->selectProvider($selected_dc);
    }
    
    public function getRand($min, $max) {
        return rand($min, $max);
    }
    
    public function containsData($value) {
        return is_string($value) && (0 < strlen($value));
    }
}

?>
