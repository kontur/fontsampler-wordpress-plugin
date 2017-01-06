<?php
/*
Plugin Name: Fontsampler
Plugin URI:  https://fontsampler.johannesneumeier.com
Description: Create interactive webfont previews via shortcodes
Version:     0.1.4
Author:      Johannes Neumeier
Author URI:  http://johannesneumeier.com
Copyright:   Copyright 2016 Johannes Neumeier
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

require_once( 'vendor/oyejorge/less.php/lessc.inc.php');

global $wpdb;
$f = new FontsamplerPlugin( $wpdb );

// register the shortcode hook
add_shortcode( 'fontsampler', array( $f, 'fontsampler_shortcode' ) );

// backend
add_action( 'admin_menu', array( $f, 'fontsampler_plugin_setup_menu' ) );
add_action( 'admin_enqueue_scripts', array( $f, 'fontsampler_admin_enqueues' ) );
add_action( 'wp_ajax_get_mock_fontsampler', array( $f, 'ajax_get_mock_fontsampler'));
add_filter( 'upload_mimes', array( $f, 'allow_font_upload_types' ) );
register_activation_hook( __FILE__, array( $f, 'fontsampler_activate' ) );

