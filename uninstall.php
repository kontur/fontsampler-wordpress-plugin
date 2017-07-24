<?php

defined( 'WP_UNINSTALL_PLUGIN' ) or die();
/**
* NOTE: There doesn't seem to be a sane way of accessing the FontsamplerPlugin
* or related classes; table names and option names are magical ;(
*/
global $wpdb;

$sql = 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'fontsampler_sets_x_fonts';
$wpdb->query( $sql );

$sql = 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'fontsampler_fonts';
$wpdb->query( $sql );

$sql = 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'fontsampler_sets';
$wpdb->query( $sql );

$sql = 'DROP TABLE IF EXISTS ' . $wpdb->prefix . 'fontsampler_settings';
$wpdb->query( $sql );

// finally, remove fontsampler settings from wp_options
if ( get_option( 'fontsampler_db_version' ) ) {
	delete_option( 'fontsampler_db_version' );
}

if ( get_option( 'fontsampler_hide_legacy_formats' ) ) {
	delete_option( 'fontsampler_hide_legacy_formats' );
}

if ( get_option( 'fontsampler_last_changelog' ) ) {
	delete_option( 'fontsampler_last_changelog' );
}
