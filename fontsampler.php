<?php
/*
Plugin Name: Fontsampler
Plugin URI:  https://fontsampler.johannesneumeier.com
Description: Create interactive webfont previews via shortcodes. Create and edit previews from the &para; Fontsampler sidebar menu or click "Settings" on the left.
Version:     0.3.8
Author:      Johannes Neumeier
Author URI:  http://johannesneumeier.com
Copyright:   Copyright 2016-2017 Johannes Neumeier
Text Domain: fontsampler
*/
defined( 'ABSPATH' ) or die( 'Access denied.' );


// PHP version check first and foremost
function displayPhpError() {
	echo '<section id="fontsampler-admin">';
	echo '<div class="notice error">Your server is running PHP version ' . PHP_VERSION
	     . ', <br>Fontsampler requires at least PHP version 5.6 or higher to run.<br><br>'
	     . 'The <a href="https://wordpress.org/about/requirements/">recommended PHP version '
	     . 'for Wordpress itself is 7</a> or greater.<br><br>'
	     . 'While legacy Wordpress support extends to 5.2.4, <strong>Fontsampler requires a minimum '
	     . 'of PHP 5.6.</strong> Please be in touch with your webserver provider about upgrading or enabling '
	     . 'a more modern version of PHP.';
	echo '</section>';
	exit();
}

function addMenu() {
	add_menu_page( 'Fontsampler plugin page', 'Fontsampler', 'manage_options', 'fontsampler', 'displayPhpError', 'dashicons-editor-paragraph' );
	wp_enqueue_style( 'fontsampler_admin_css', plugin_dir_url( __FILE__ ) . '/admin/css/fontsampler-admin.css', false, '1.0.0' );
}

if ( version_compare( PHP_VERSION, "5.6" ) < 0 ) {
	add_action( 'admin_menu', 'addMenu' );
} else {
	// PHP version is good, let's go all bells and whistles...

	require_once( 'FontsamplerPlugin.php' );

	// Convenience subclasses instantiated within the FontsamplerPlugin class
	require_once( 'FontsamplerDatabase.php' );
	require_once( 'FontsamplerFormhandler.php' );
	require_once( 'FontsamplerLayout.php' );
	require_once( 'FontsamplerHelpers.php' );
	require_once( 'FontsamplerPagination.php' );
	require_once( 'FontsamplerMessages.php' );
	require_once( 'FontsamplerNotifications.php' );

	require_once( 'vendor/oyejorge/less.php/lessc.inc.php' );
	require_once( 'vendor/autoload.php' );

	$loader = new Twig_Loader_Filesystem( __DIR__ . '/includes' );
	$twig   = new Twig_Environment( $loader );

	global $wpdb;
	$f = new FontsamplerPlugin( $wpdb, $twig );

	// register the shortcode hook
	add_shortcode( 'fontsampler', array( $f, 'fontsampler_shortcode' ) );

	// backend
	add_action( 'admin_menu', array( $f, 'fontsampler_plugin_setup_menu' ) );
	add_action( 'admin_enqueue_scripts', array( $f, 'fontsampler_admin_enqueues' ) );
	add_action( 'wp_ajax_get_mock_fontsampler', array( $f, 'ajax_get_mock_fontsampler' ) );
	add_filter( 'upload_mimes', array( $f, 'allow_font_upload_types' ) );
	add_filter( 'wp_check_filetype_and_ext', 'common_upload_real_mimes', 10, 4 );
	add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), array( $f, 'add_action_links' ) );
	add_action('plugins_loaded', array( $f, 'fontsampler_load_text_domain'));
	register_activation_hook( __FILE__, array( $f, 'fontsampler_activate' ) );
}

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
function common_upload_real_mimes( $checked, $file, $filename, $mimes ) {
	if ( false === $checked['ext'] && false === $checked['type'] && false === $checked['proper_filename'] ) {
		$filetype = wp_check_filetype( $filename );
		$wp_mimes = get_allowed_mime_types();
		if ( in_array( $filetype['ext'], array_keys( $wp_mimes ) ) ) {
			$checked['ext']  = true;
			$checked['type'] = true;

			return $checked;
		}
	}

	return $checked;
}
