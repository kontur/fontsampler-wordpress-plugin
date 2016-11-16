<?php
// if uninstall.php is not called by WordPress, die
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	die;
}

// TODO figure out why I can't embed and call Fontsampler->uninstall() instead
global $wpdb;

$sql = "DROP TABLE IF EXISTS " . $wpdb->prefix . "fontsampler_sets";
$wpdb->query( $sql );

$sql = "DROP TABLE IF EXISTS " . $wpdb->prefix . "fontsampler_fonts";
$wpdb->query( $sql );

$sql = "DROP TABLE IF EXISTS " . $wpdb->prefix . "fontsampler_sets_x_fonts";
$wpdb->query( $sql );

$sql = "DROP TABLE IF EXISTS " . $wpdb->prefix . "fontsampler_settings";
$wpdb->query( $sql );


// finally, remove fontsampler settings from wp_options

if ( get_option( 'fontsampler_db_version' ) ) {
	delete_option( 'fontsampler_db_version' );
}

if ( get_option( 'fontsampler_hide_legacy_formats' ) ) {
	delete_options( 'fontsampler_hide_legacy_formats' );
}

?>