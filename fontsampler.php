<?php
/*
Plugin Name: Fontsampler
Plugin URI:  http://fontsampler.johannesneumeier.com
Description: Create interactive webfont previews via shortcodes. Create and edit previews from the &para; Fontsampler sidebar menu or click "Settings" on the left.
Version:     0.4.4
Author:      Underscore
Author URI:  https://underscoretype.com
Copyright:   Copyright 2016-2018 Johannes Neumeier
Text Domain: fontsampler
*/
defined( 'ABSPATH' ) or die( 'Access denied.' );


// PHP version check first and foremost
function displayPhpError() {
	echo '<section id="fontsampler-admin">';
	echo '<div class="notice error">Your server is running PHP version ' . PHP_VERSION
	     . ', <br>Fontsampler requires at least PHP version 5.6.33 or higher to run.<br><br>'
	     . 'The <a href="https://wordpress.org/about/requirements/">recommended PHP version '
	     . 'for Wordpress itself is 7</a> or greater.<br><br>'
	     . 'While legacy Wordpress support extends to 5.2.4, <strong>Fontsampler requires a minimum '
	     . 'of PHP 5.6.33.</strong> Please be in touch with your webserver provider about upgrading or enabling '
	     . 'a more modern version of PHP.';
	echo '</section>';
	exit();
}

function addMenu() {
	add_menu_page( 'Fontsampler plugin page', 'Fontsampler', 'manage_options', 'fontsampler', 'displayPhpError', 'dashicons-editor-paragraph' );
	wp_enqueue_style( 'fontsampler_admin_css', plugin_dir_url( __FILE__ ) . '/admin/css/fontsampler-admin.css', false, '1.0.0' );
}

if ( version_compare( PHP_VERSION, "5.6.33" ) < 0 ) {
	add_action( 'admin_menu', 'addMenu' );
} else {
    global $wpdb;
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

	// hook all plugin classes init to when Wordpress is ready
	$loader 	 = new Twig_Loader_Filesystem( __DIR__ . '/includes' );
	$twig   	 = new Twig_Environment( $loader );
	$fontsampler = new FontsamplerPlugin( $wpdb, $twig );

	// load translations, then kick off actual Fontsampler setup and hooks
	add_action( 'plugins_loaded', array( $fontsampler, 'fontsampler_load_text_domain' ) );
	add_action( 'init', "fontsampler_init" );
	register_activation_hook( __FILE__, array( $fontsampler, 'fontsampler_activate' ) );
}

function fontsampler_init() {
	global $wpdb, $fontsampler;

	// It's not entirely clear why $fontsampler is not available form the previous init above,
	// but using the wp CLI not re-initializing the instance causes nasty errors
	// hook all plugin classes init to when Wordpress is ready
	$loader 	 = new Twig_Loader_Filesystem( __DIR__ . '/includes' );
	$twig   	 = new Twig_Environment( $loader );
	$fontsampler = new FontsamplerPlugin( $wpdb, $twig );
	$fontsampler->init();

	// register the shortcode hook
	add_shortcode( 'fontsampler', array( $fontsampler, 'fontsampler_shortcode' ) );

	// register front end styles and scripts, but don't load them yet
	wp_register_script( 'fontsampler-js', plugin_dir_url( __FILE__ ) . 'js/fontsampler.js', array('jquery'), false, false );

	// register hook to check if a shortcode is present and attempt to enqueue styles
	// then; scripts can be enqueued in the shortcode itself, since they are okay to 
	// be in the footer
	add_action( 'wp', array( $fontsampler, 'check_shortcodes_enqueue_styles' ));
    
	// backend	
	add_action( 'admin_menu', array( $fontsampler, 'fontsampler_plugin_setup_menu' ) );
	add_action( 'admin_enqueue_scripts', array( $fontsampler, 'fontsampler_admin_enqueues' ) );
	add_action( 'wp_ajax_get_mock_fontsampler', array( $fontsampler, 'ajax_get_mock_fontsampler' ) );
	add_filter( 'upload_mimes', array( $fontsampler, 'allow_font_upload_types' ) );
	add_filter( 'wp_check_filetype_and_ext', 'common_upload_real_mimes', 10, 4 );
	add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), array( $fontsampler, 'add_action_links' ) );
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
