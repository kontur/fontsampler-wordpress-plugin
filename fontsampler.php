<?php
/*
Plugin Name: Fontsampler
Plugin URI:  https://fontsampler.johannesneumeier.com
Description: Create interactive webfont previews via shortcodes. Create and edit previews from the <a href="http://fontsampler.dev/wp-admin/admin.php?page=fontsampler">&para; Fontsampler</a> sidebar menu.
Version:     0.1.7
Author:      Johannes Neumeier
Author URI:  http://johannesneumeier.com
Copyright:   Copyright 2016-2017 Johannes Neumeier
Text Domain: fontsampler
*/
defined( 'ABSPATH' ) or die( 'Access denied.' );

require_once( 'FontsamplerPlugin.php' );

// Convenience subclasses instantiated within the FontsamplerPlugin class
require_once( 'FontsamplerDatabase.php' );
require_once( 'FontsamplerFormhandler.php' );
require_once( 'FontsamplerLayout.php' );
require_once( 'FontsamplerHelpers.php' );
require_once( 'FontsamplerPagination.php' );
require_once( 'FontsamplerMessages.php' );
require_once( 'FontsamplerNotifications.php' );

require_once( 'vendor/oyejorge/less.php/lessc.inc.php');
require_once( 'vendor/autoload.php');

$loader = new Twig_Loader_Filesystem( __DIR__ . '/includes' );
$twig = new Twig_Environment( $loader );

global $wpdb;
$f = new FontsamplerPlugin( $wpdb, $twig );

// register the shortcode hook
add_shortcode( 'fontsampler', array( $f, 'fontsampler_shortcode' ) );

// backend
add_action( 'admin_menu', array( $f, 'fontsampler_plugin_setup_menu' ) );
add_action( 'admin_enqueue_scripts', array( $f, 'fontsampler_admin_enqueues' ) );
add_action( 'wp_ajax_get_mock_fontsampler', array( $f, 'ajax_get_mock_fontsampler'));
add_filter( 'upload_mimes', array( $f, 'allow_font_upload_types' ) );
add_filter('wp_check_filetype_and_ext', 'common_upload_real_mimes', 10, 4);
register_activation_hook( __FILE__, array( $f, 'fontsampler_activate' ) );
register_uninstall_hook( __FILE__, 'uninstall' );


//-------------------------------------------------
// Fix Upload MIME detection
//
// this is an out-and-out bug in 4.7.1 - ..2, but
// in general could use some extra love
//
// @param checked [ext, type, proper_filename]
// @param file
// @param filename
// @param mimes
function common_upload_real_mimes($checked, $file, $filename, $mimes) {
	if ( false === $checked['ext'] && false === $checked['type'] && false === $checked['proper_filename'] ) {
		$filetype = wp_check_filetype( $filename );
		$wp_mimes = get_allowed_mime_types();
		if (in_array($filetype['ext'], array_keys($wp_mimes))) {
			$checked['ext'] = true;
			$checked['type'] = true;
			return $checked;
		}
	}
	return $checked;
}


function uninstall() {
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
		delete_options( 'fontsampler_hide_legacy_formats' );
	}
}
