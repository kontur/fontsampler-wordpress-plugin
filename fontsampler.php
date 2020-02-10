<?php
/*
Plugin Name: Fontsampler
Plugin URI:  http://fontsampler.johannesneumeier.com
Description: Create interactive webfont previews via shortcodes. Create and edit previews from the &para; Fontsampler sidebar menu or click "Settings" on the left.
Version:     0.4.6
Author:      Underscore
Author URI:  https://underscoretype.com
Copyright:   Copyright 2016-2020 Johannes Neumeier
Text Domain: fontsampler
*/
defined( 'ABSPATH' ) or die( 'Access denied.' );
error_reporting(E_ALL);

// PHP version check first and foremost
function displayPhpError() {
	echo '<section id="fontsampler-admin">';
	echo '<div class="notice error"><strong>Your server is running an outdated PHP version ' . PHP_VERSION
	     . '</strong>, <br>Fontsampler requires at least PHP version 7.0.0 or higher to run.<br><br>'
	     . 'The recommended PHP version for Wordpress itself is 7.0.0</a> or greater.<br><br>'
	     . 'While legacy Wordpress support extends to 5.6.20+, <strong>Fontsampler requires a minimum '
		 . 'of PHP 7.0.0.</strong> Please <a href="https://wordpress.org/about/requirements/">follow the instractions for requirements</a> '
		 . 'and be in touch with your webserver provider about upgrading or enabling '
		 . 'a more modern version of PHP.<br><br>'
		 . 'As a last resort you can also try <a href="https://wordpress.org/plugins/fontsampler/advanced/">manually download a zip archive</a> of an older, but outdated, '
		 . 'version of Fontsampler (try 0.4.4) to run with your server’s PHP version.';
	echo '</section>';
	exit();
}

function addMenuWithWarning() {
	add_menu_page( 'Fontsampler plugin page', 'Fontsampler', 'manage_options', 'fontsampler', 'displayPhpError', 'dashicons-editor-paragraph' );
	wp_enqueue_style( 'fontsampler_admin_css', plugin_dir_url( __FILE__ ) . '/admin/css/fontsampler-admin.css', false, '1.0.0' );
}

if ( version_compare( PHP_VERSION, "7.0.0" ) < 0 ) {
	add_action( 'admin_menu', 'addMenuWithWarning' );
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
    if (get_option($fontsampler::FONTSAMPLER_OPTION_PROXY_URLS) && !empty(get_option( 'permalink_structure' ))) {
        add_action('template_redirect', array($fontsampler, 'fontsampler_template_redirect'));
        add_filter('query_vars', array($fontsampler, 'fontsampler_query_vars'));
    }
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
	
    if (get_option($fontsampler::FONTSAMPLER_OPTION_PROXY_URLS) && !empty(get_option( 'permalink_structure' ))) {
        // register an endpoint for custom webfont URLs, if enabled
		add_rewrite_rule('^' . $fontsampler::FONTSAMPLER_PROXY_URL . '/(\d+)', 'index.php?' . $fontsampler::FONTSAMPLER_PROXY_QUERY_VAR . '=$matches[1]', 'top');
    }

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
	add_filter( 'wp_check_filetype_and_ext', 'common_upload_real_mimes', 10, 4 );
	add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), array( $fontsampler, 'add_action_links' ) );
}

