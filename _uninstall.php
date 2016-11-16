<?php
defined( 'ABSPATH' ) or die( 'Access denied.' );
// if uninstall.php is not called by WordPress, die
defined( 'WP_UNINSTALL_PLUGIN' ) or die( 'Uninstall denied.' );

require_once( 'FontsamplerPlugin.php' );

// Convenience subclasses instantiated within the FontsamplerPlugin class
require_once( 'FontsamplerDatabase.php' );
require_once( 'FontsamplerFormhandler.php' );
require_once( 'FontsamplerHelpers.php' );
require_once( 'FontsamplerPagination.php' );
require_once( 'FontsamplerMessages.php' );

// TODO figure out why I can't embed and call Fontsampler->uninstall() instead
global $wpdb;
$f = new FontsamplerPlugin( $wpdb);
