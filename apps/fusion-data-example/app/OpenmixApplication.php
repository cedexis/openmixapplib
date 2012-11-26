<?php

/**
 * Uses Fusion Data to respond to requests with the latest values for a
 * platform available through Fusion.
 *
 * In order to use this application you'll need to create a platform
 * aliased as `fusion_example` or update this script to the alias of your
 * Fusion Data-enabled platform.
 *
 * For information on writing Openmix applications, check out
 * https://github.com/cedexis/openmixapplib/wiki
 */
class OpenmixApplication implements Lifecycle
{
    /**
     * @param Configuration $config
     **/
    public function init($config)
    {
        $config->declareResponseOption('fusion_example', 'b.example.com', 20);
        
        // Declare the desire for Fusion Data GB for the `fusion_example` platform.
        $config->declareInput(FusionProperties::GB, 'fusion_example');
        // Declare the desire for Fusion Data MBPS for the `fusion_example` platform.
        $config->declareInput(FusionProperties::MBPS, 'fusion_example');
        
    }

    /**
     * @param Request $request
     * @param Response $response
     * @param Utilities $utilities
     **/
    public function service($request,$response,$utilities)
    {
        $gb = $request->fusion(FusionProperties::GB);
        $mbps = $request->fusion(FusionProperties::MBPS);

        $response->respond('fusion_example', $gb['fusion_example'] . '-' . $mbps['fusion_example']);
        //$response->respond('fusion_example', 'd.example.com');
    }
}

?>
