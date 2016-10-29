<?php
/*
Plugin Name: Fontsampler
Plugin URI:  https://github.com/kontur/fontsampler-wordpress-plugin
Description: Create editable webfont previews via shortcodes
Version:     0.0.3
Author:      Johannes Neumeier
Author URI:  http://johannesneumeier.com
Copyright:   Copyright 2016 Johannes Neumeier
Text Domain: fontsampler
*/
defined( 'ABSPATH' ) or die( 'Nope.' );

global $wpdb;
$f = new Fontsampler( $wpdb );


// register the shortcode hook
add_shortcode( 'fontsampler', array( $f, 'fontsampler_shortcode' ) );

// backend
add_action( 'admin_menu', array( $f, 'fontsampler_plugin_setup_menu' ));
add_action( 'admin_enqueue_scripts', array( $f, 'fontsampler_admin_enqueues' ));
add_filter( 'upload_mimes', array( $f, 'allow_font_upload_types' ));
register_activation_hook( __FILE__, array( $f, 'fontsampler_activate' ));


class Fontsampler {

	private $db;
	private $table_sets;
	private $table_fonts;
	private $table_join;
	private $table_settings;
	private $boolean_options;
	private $default_features;
	private $font_formats;
	private $fontsampler_db_version;
	private $settings_defaults;

	function Fontsampler( $wpdb ) {
		// convenience variables for the wpdb object and the fontsampler db tables
		$this->db             = $wpdb;
		$this->table_sets     = $this->db->prefix . 'fontsampler_sets';
		$this->table_fonts    = $this->db->prefix . 'fontsampler_fonts';
		$this->table_join     = $this->db->prefix . 'fontsampler_sets_x_fonts';
		$this->table_settings = $this->db->prefix . 'fontsampler_settings';

		// keep track of db versions and migrations via this
		// simply set this to the current PLUGIN VERSION number when bumping it
		// i.e. a database update always bumps the version number of the plugin as well
		$this->fontsampler_db_version = '0.0.3';

		$current_db_version = get_option( 'fontsampler_db_version' );

		// if no previous db version has been registered assume new install and set to v 0.0.1 which was the "last"
		// version install without the db option
		if ( ! $current_db_version ) {
			add_option( 'fontsampler_db_version', '0.0.1' );
			$current_db_version = '0.0.1';
		}

		if ( version_compare( $current_db_version, $this->fontsampler_db_version ) < 0 ) {
			$this->migrate_db();
		}

		$this->boolean_options = array(
			'size',
			'letterspacing',
			'lineheight',
			'sampletexts',
			'alignment',
			'invert',
			'ot_liga',
			'ot_hlig',
			'ot_dlig',
			'ot_calt',
			'ot_frac',
			'ot_sups',
			'ot_subs',
		);
		$this->default_features = array(
			'size',
			'letterspacing',
			'lineheight',
			'sampletexts',
			'alignment',
			'invert',
			'multiline',
		);
		$this->font_formats = array( 'woff2', 'woff', 'eot', 'svg', 'ttf' );

		$this->settings_defaults = array(
			'font_size_label'		    => 'Size',
			'font_size_min'			    => '8',
			'font_size_max'			    => '96',
			'font_size_initial'		    => '14',
			'font_size_unit'		    => 'px',
			'letter_spacing_label'  	=> 'Letter spacing',
			'letter_spacing_min'    	=> '-5',
			'letter_spacing_max'	    => '5',
			'letter_spacing_initial'	=> '0',
			'letter_spacing_unit'	    => 'px',
			'line_height_label'		    => 'Line height',
			'line_height_min'		    => '70',
			'line_height_max'		    => '300',
			'line_height_initial'	    => '110',
			'line_height_unit'		    => '%',
			'sample_texts'              => "hamburgerfontstiv\nabcdefghijklmnopqrstuvwxyz\nABCDEFGHIJKLMNOPQRSTUVWXYZ\nThe quick brown fox jumps over the lazy cat",
			'css_color_text'            => '#333333',
			'css_color_background'      => '#ffffff',
			'css_color_label'           => '#333333',
			'css_size_label'            => 'inherit',
			'css_fontfamily_label'      => 'inherit',
			'css_color_highlight'       => '#efefef',
			'css_color_highlight_hover' => '#dedede',
			'css_color_line'            => '#333333',
			'css_color_handle'          => '#333333',
			'css_color_icon_active'     => '#333333',
			'css_color_icon_inactive'   => '#dedede',
			'size'                      => 1,
			'letterspacing'             => 1,
			'lineheight'                => 1,
			'sampletexts'               => 0,
			'alignment'                 => 0,
			'invert'                    => 0,
			'multiline'                 => 1,
		);
	}


	/*
	 * DIFFERENT HOOKS
	 */


	/*
	 * Register the [fontsampler id=XX] hook for use in pages and posts
	 */
	function fontsampler_shortcode( $atts ) {
		$this->fontsampler_interface_enqueues();

		// merge in possibly passed in attributes
		$attributes = shortcode_atts( array( 'id' => '0' ), $atts );
		// do nothing if missing id
		// TODO change or fallback to name= instead of id=
		if ( 0 != $attributes['id'] ) {
			$set   = $this->get_set( intval( $attributes['id'] ) );
			$fonts = $this->get_fontset_for_set( intval( $attributes['id'] ) );

			if ( false == $set || false == $fonts ) {
				if ( current_user_can( 'edit_posts' ) || current_user_can( 'edit_pages' ) ) {
					return '<div><strong>The typesampler with ID ' . $attributes['id'] . ' can not be displayed because some files or the type sampler set are missing!</strong> <em>You are seeing this notice because you have rights to edit posts - regular users will see an empty spot here.</em></div>';
				} else {
					return '<!-- typesampler #' . $attributes['id'] . ' failed to render -->';
				}
			}

			// TODO labels from options or translation file
			$defaults = $this->get_settings();
			// some of these get overwritten from defaults, but list them all here explicitly
			$replace = array_merge( $this->settings_defaults, $defaults );

			// buffer output until return
			ob_start();

			echo '<div class="fontsampler-wrapper">';
			$settings = $this->get_settings();

			// include, aka echo, template with replaced values from $replace above
			include( 'includes/interface.php' );

			echo '</div>';

			// return all that's been buffered
			return ob_get_clean();
		}
	}


	/**
	 * Register all script and styles needed in the front end
	 */
	function fontsampler_interface_enqueues() {
		wp_enqueue_script( 'fontsampler-js', plugin_dir_url( __FILE__ ) . 'bower_components/jquery-fontsampler/dist/jquery.fontsampler.js', array( 'jquery' ) );
		wp_enqueue_script( 'fontsampler-init-js', plugin_dir_url( __FILE__ ) . 'js/fontsampler-init.js', array( 'fontsampler-js' ) );
		wp_enqueue_script( 'fontsampler-rangeslider-js', plugin_dir_url( __FILE__ ) . 'bower_components/rangeslider.js/dist/rangeslider.min.js', array( 'jquery' ) );
		wp_enqueue_script( 'fontsampler-selectric-js', plugin_dir_url( __FILE__ ) . 'bower_components/jquery-selectric/public/jquery.selectric.min.js', array( 'jquery' ) );
		wp_enqueue_style( 'fontsampler-css', $this->get_css_file() );
	}

	/*
	 * Register scripts and styles needed in the admin panel
	 */
	function fontsampler_admin_enqueues() {
		wp_enqueue_script( 'fontsampler-rangeslider-js', plugin_dir_url( __FILE__ ) . 'bower_components/rangeslider.js/dist/rangeslider.min.js', array( 'jquery' ) );
		wp_enqueue_script( 'fontsampler-preview-js', plugin_dir_url( __FILE__ ) . 'bower_components/jquery-fontsampler/dist/jquery.fontsampler.js', array( 'jquery' ) );
		wp_enqueue_script( 'fontsampler-admin-js', plugin_dir_url( __FILE__ ) . 'admin/js/fontsampler-admin.js', array( 'jquery', false, true ) );
		wp_enqueue_script( 'colour-pick', plugins_url( 'admin/js/fontsampler-admin.js', __FILE__ ), array( 'wp-color-picker' ), false, true );
		wp_enqueue_script( 'jquery-ui-sortable', array( 'jquery' ) );
		wp_enqueue_script( 'jquery-form-validator', plugin_dir_url( __FILE__ ) . 'bower_components/jquery-form-validator/form-validator/jquery.form-validator.js', array( 'jquery' ) );
		wp_enqueue_style( 'wp-color-picker' );
		wp_enqueue_style( 'fontsampler_admin_css', plugin_dir_url( __FILE__ ) . '/admin/css/fontsampler-admin.css', false, '1.0.0' );
	}


	/*
	 * Add the fontsampler admin menu to the sidebar
	 */
	function fontsampler_plugin_setup_menu() {
		add_menu_page( 'Fontsampler plugin page', 'Fontsampler', 'manage_options', 'fontsampler', array(
			$this,
			'fontsampler_admin_init',
		), 'dashicons-editor-paragraph' );
	}


	/*
	 * Expand allowed upload types to include font files
	 */
	function allow_font_upload_types( $existing_mimes = array() ) {
		$existing_mimes['woff']  = 'application/font-woff';
		$existing_mimes['woff2'] = 'application/font-woff2';
		$existing_mimes['eot']   = 'application/eot';
		$existing_mimes['svg']   = 'application/svg';
		$existing_mimes['ttf']   = 'application/ttf';

		return $existing_mimes;
	}


	/*
	 * React to the plugin being activated
	 */
	function fontsampler_activate() {
		$this->check_and_create_tables();
	}

	/*
	 *
	 */
	function fontsampler_uninstall() {
		$this->delete_tables();
	}


	/*
	 * FLOW CONTROL
	 */

	/*
	 * Rendering the admin interface
	 */
	function fontsampler_admin_init() {

		echo '<section id="fontsampler-admin">';

		include( 'includes/header.php' );

		echo '<main>';

		$this->check_and_create_tables();

		// check upload folder is writable
		$dir    = wp_upload_dir();
		$upload = $dir['basedir'];
		if ( ! is_dir( $upload ) ) {
			echo '<p>Uploads folder does not exist! Make sure Wordpress has writing permissions to create the
                    uploads folder at: <em>' . $upload . '</em></p>';
		}

		if ( 'POST' == $_SERVER['REQUEST_METHOD'] && isset( $_POST['action'] ) ) {
			$this->handle_font_edit();
			$this->handle_font_delete();
			$this->handle_set_edit();
			$this->handle_set_delete();
			$this->handle_settings_edit();
		}

		$subpage = isset( $_GET['subpage'] ) ? $_GET['subpage'] : '';
		switch ( $subpage ) {
			case 'set_create':
				$default_settings = $this->get_settings();
				$set = array_intersect_key( $default_settings, array_flip( $this->default_features ) );
				$set['default_features'] = 1; // by default pick the default UI options
				$set['ui_order_parsed'] = $this->ui_order_parsed_from( $default_settings, $set );

				$formats = $this->font_formats;
				$fonts = $this->get_fontfile_posts();
				include( 'includes/sample-edit.php' );
				break;

			case 'set_edit':
				$default_settings = $this->get_settings();
				$set = $this->get_set( intval( $_GET['id'] ) );
				if ( sizeof( $set['fonts'] ) > 1) {
					$set['fontpicker'] = 1;
				}
				$fonts = $this->get_fontfile_posts();
				$fonts_order = implode( ',', array_map( function ( $font ) {
					return $font['id'];
				}, $set['fonts']));
				$formats = $this->font_formats;
				include( 'includes/sample-edit.php' );
				break;

			case 'set_delete':
				$set = $this->get_set( intval( $_GET['id'] ) );
				include( 'includes/sample-delete.php' );
				break;

			case 'fonts':
				$fonts   = $this->get_fontsets();
				$formats = $this->font_formats;
				include( 'includes/fontsets.php' );
				break;

			case 'font_create':
				$font    = null;
				$formats = $this->font_formats;
				include( 'includes/fontset-edit.php' );
				break;

			case 'font_edit':
				$font    = $this->get_fontset( intval( $_GET['id'] ) );
				$formats = $this->font_formats;
				include( 'includes/fontset-edit.php' );
				break;

			case 'font_delete':
				$font = $this->get_fontset( intval( $_GET['id'] ) );
				include( 'includes/fontset-delete.php' );
				break;

			case 'settings':
				$defaults = $this->get_settings();
				include( 'includes/settings.php' );
				break;

			case 'about':
				include( 'includes/about.php' );
				break;

			default:
				$sets = $this->get_sets();
				include( 'includes/samples.php' );
				break;
		}
		echo '</main>';

		include( 'includes/footer.php' );
		echo '</section>';
	}


	/*
	 * DATABASE INTERACTION
	 */

	/*
	 * setup fontsampler sets table
	 */
	function create_table_sets() {
		$sql = "CREATE TABLE " . $this->table_sets . " (
                `id` int( 11 ) unsigned NOT NULL AUTO_INCREMENT,
                `name` varchar( 255 ) NOT NULL DEFAULT '',
                `initial` text NOT NULL,
                `size` tinyint( 1 ) NOT NULL DEFAULT '0',
                `letterspacing` tinyint( 1 ) NOT NULL DEFAULT '0',
                `lineheight` tinyint( 1 ) NOT NULL DEFAULT '0',
                `sampletexts` tinyint( 1 ) NOT NULL DEFAULT '0',
                `alignment` tinyint( 1 ) NOT NULL DEFAULT '0',
                `invert` tinyint( 1 ) NOT NULL DEFAULT '0',
                `multiline` tinyint( 1 ) NOT NULL DEFAULT '1',
                `is_ltr` tinyint( 1 ) NOT NULL DEFAULT '1',
                `ot_liga` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_dlig` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_hlig` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_calt` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_frac` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_sups` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_subs` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ui_order` VARCHAR( 255 ) NOT NULL DEFAULT 'size,letterspacing,options|fontpicker,sampletexts,lineheight|fontsampler',
                `default_features` tinyint( 1 ) NOT NULL DEFAULT '1',
                `default_options` tinyint( 1 ) NOT NULL DEFAULT '0',
                `initial_font` int( 10 ) unsigned DEFAULT NULL,
			  PRIMARY KEY ( `id` )
			) DEFAULT CHARSET=utf8";

		$this->db->query( $sql );
	}


	function create_table_fonts() {
		$sql = "CREATE TABLE " . $this->table_fonts . " (
			  `id` int( 11 ) unsigned NOT NULL AUTO_INCREMENT,
			  `name` varchar( 255 ) NOT NULL DEFAULT '',
			  `woff` int( 11 ) unsigned DEFAULT NULL,
			  `woff2` int( 11 ) unsigned DEFAULT NULL,
			  `eot` int( 11 ) unsigned DEFAULT NULL,
			  `svg` int( 11 ) unsigned DEFAULT NULL,
			  `ttf` int( 11 ) unsigned DEFAULT NULL,
			  PRIMARY KEY ( `id` )
			) DEFAULT CHARSET=utf8";
		$this->db->query( $sql );
	}


	function create_table_join() {
		$sql = "CREATE TABLE " . $this->table_join . " (
			   `set_id` int( 11 ) unsigned NOT NULL,
			   `font_id` int( 11 ) unsigned NOT NULL,
			   `order` smallint( 5 ) unsigned NOT NULL DEFAULT '0'
				) DEFAULT CHARSET=utf8";
		$this->db->query( $sql );
	}


	function create_table_settings() {
		$sql = "CREATE TABLE " . $this->table_settings . "(
			`id` int(11) unsigned NOT NULL AUTO_INCREMENT,
			`font_size_label` varchar(50) NOT NULL DEFAULT 'Size',
			`font_size_initial` smallint(5) unsigned NOT NULL DEFAULT '18',
			`font_size_min` smallint(5) unsigned NOT NULL DEFAULT '8',
			`font_size_max` smallint(5) unsigned NOT NULL DEFAULT '96',
			`font_size_unit` varchar(50) NOT NULL DEFAULT 'px',
			`letter_spacing_label` varchar(50) NOT NULL DEFAULT 'Letter spacing',
			`letter_spacing_initial` tinyint(5) NOT NULL DEFAULT '0',
			`letter_spacing_min` tinyint(3) NOT NULL DEFAULT '-5',
			`letter_spacing_max` tinyint(3) NOT NULL DEFAULT '5',
			`letter_spacing_unit` varchar(50) NOT NULL DEFAULT 'px',
			`line_height_label` varchar(50) NOT NULL DEFAULT 'Line height',
			`line_height_initial` smallint(5) NOT NULL DEFAULT '110',
			`line_height_min` smallint(5) NOT NULL DEFAULT '0',
			`line_height_max` smallint(5) NOT NULL DEFAULT '300',
			`line_height_unit` varchar(50) NOT NULL DEFAULT '%',
			`sample_texts` text NOT NULL,
			`css_color_text` tinytext NOT NULL,
			`css_color_background` tinytext NOT NULL,
			`css_color_label` tinytext NOT NULL,
			`css_size_label` tinytext NOT NULL,
			`css_fontfamily_label` tinytext NOT NULL,
			`css_color_highlight` tinytext NOT NULL,
			`css_color_highlight_hover` tinytext NOT NULL,
			`css_color_line` tinytext NOT NULL,
			`css_color_handle` tinytext NOT NULL,
			`css_color_icon_active` tinytext NOT NULL,
			`css_color_icon_inactive` tinytext NOT NULL,
			`size` tinyint(1) unsigned NOT NULL DEFAULT '0',
			`letterspacing` tinyint(1) unsigned NOT NULL DEFAULT '0',
			`lineheight` tinyint(1) unsigned NOT NULL DEFAULT '0',
			`sampletexts` tinyint(1) unsigned NOT NULL DEFAULT '0',
			`alignment` tinyint(1) unsigned NOT NULL DEFAULT '0',
			`invert` tinyint(1) unsigned NOT NULL DEFAULT '0',
			`multiline` tinyint(1) unsigned NOT NULL DEFAULT '1',
			PRIMARY KEY (`id`)
			) DEFAULT CHARSET=utf8";
		$this->db->query( $sql );

		$this->db->insert( $this->table_settings, $this->settings_defaults );
	}


	function delete_tables() {
		$sql = 'DROP TABLE IF EXISTS ' . $this->table_join;
		$this->db->query( $sql );

		$sql = 'DROP TABLE IF EXISTS ' . $this->table_fonts;
		$this->db->query( $sql );

		$sql = 'DROP TABLE IF EXISTS ' . $this->table_sets;
		$this->db->query( $sql );

		$sql = 'DROP TABLE IF EXISTS ' . $this->table_settings;
		$this->db->query( $sql );
	}


	/**
	 * Updates the database schemas based on current db version and target db version
	 */
	function migrate_db() {
		// list here any queries to update the tables to the specific version
		// NOTE: ASCENDING ORDER MATTERS!!!
		$changes = array(
			// 0.0.2 added some settings and defaults for them
			// TODO replace id 1 with "WHERE default = 1" once implemented
			'0.0.2' => array(
				'ALTER TABLE ' . $this->table_settings . " ADD `font_size_label` VARCHAR( 50 ) NOT NULL DEFAULT 'Size'",
				'ALTER TABLE ' . $this->table_settings . " ADD `letter_spacing_label` VARCHAR( 50 ) NOT NULL DEFAULT 'Letter spacing'",
				'ALTER TABLE ' . $this->table_settings . " ADD `line_height_label` VARCHAR( 50 ) NOT NULL DEFAULT 'Line height'",
				'ALTER TABLE ' . $this->table_settings . " ADD `font_size_unit` VARCHAR( 50 ) NOT NULL DEFAULT 'px'",
				'ALTER TABLE ' . $this->table_settings . " ADD `letter_spacing_unit` VARCHAR( 50 ) NOT NULL DEFAULT 'px'",
				'ALTER TABLE ' . $this->table_settings . " ADD `line_height_unit` VARCHAR( 50 ) NOT NULL DEFAULT '%'",
				'ALTER TABLE ' . $this->table_settings . ' ADD `sample_texts` text NOT NULL',
				'ALTER TABLE ' . $this->table_settings . ' ADD `css_color_text` tinytext NOT NULL',
				'ALTER TABLE ' . $this->table_settings . ' ADD `css_color_background` tinytext NOT NULL',
				'ALTER TABLE ' . $this->table_settings . ' ADD `css_color_label` tinytext NOT NULL',
				'ALTER TABLE ' . $this->table_settings . ' ADD `css_size_label` tinytext NOT NULL',
				'ALTER TABLE ' . $this->table_settings . ' ADD `css_fontfamily_label` tinytext NOT NULL',
				'ALTER TABLE ' . $this->table_settings . ' ADD `css_color_highlight` tinytext NOT NULL',
				'ALTER TABLE ' . $this->table_settings . ' ADD `css_color_highlight_hover` tinytext NOT NULL',
				'ALTER TABLE ' . $this->table_settings . ' ADD `css_color_line` tinytext NOT NULL',
				'ALTER TABLE ' . $this->table_settings . ' ADD `css_color_handle` tinytext NOT NULL',
				'ALTER TABLE ' . $this->table_settings . ' ADD `css_color_icon_active` tinytext NOT NULL',
				'ALTER TABLE ' . $this->table_settings . ' ADD `css_color_icon_inactive` tinytext NOT NULL',
				'ALTER TABLE ' . $this->table_sets . " ADD `ui_order` VARCHAR( 255 ) NOT NULL DEFAULT 'size,letterspacing,options|fontpicker,sampletexts,lineheight|fontsampler'",
				'ALTER TABLE ' . $this->table_join . " ADD `order` smallint( 5 ) unsigned NOT NULL DEFAULT '0'",
			),
			'0.0.3' => array(
				'ALTER TABLE ' . $this->table_sets . " ADD `default_options` tinyint( 1 ) NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_sets . " ADD `default_features` tinyint( 1 ) NOT NULL DEFAULT '1'",
				'ALTER TABLE ' . $this->table_sets . " ADD `is_ltr` tinyint( 1 ) NOT NULL DEFAULT '1'",
				'ALTER TABLE ' . $this->table_sets . " ADD  `initial_font` int( 10 ) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_sets . ' DROP COLUMN `fontpicker`',
				'ALTER TABLE ' . $this->table_settings . " ADD `size` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `letterspacing` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `lineheight` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `fontpicker` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `sampletexts` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `alignment` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `invert` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `multiline` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
			),
		);

		// loop through the available update queries and execute those that are higher versions than the currently
		// database stored db version option
		foreach ( $changes as $version => $queries ) {
			// check that:
			// 1) not updating beyond what is the coded fontsampler_db_version even if there is update entries in the array
			// 2) the current version stored in the db is smaller than what we're updating to
			if ( version_compare( $version, $this->fontsampler_db_version ) <= 0 &&
				version_compare( get_option( 'fontsampler_db_version' ), $version ) < 0 ) {
				foreach ( $queries as $sql ) {
					try {
						// this try catch doesn't seem to do anything, since WP throwns and prints it's own errors
						// TODO check how debug mode influences this
						// NOTE: most important though that single error (i.e. existing column or something) doesn't break
						// the entire update loop
						$res = $this->db->query( $sql );
					} catch (Exception $e) {
						$this->error( "Problem updating database to version $version. The following sql query failed: " . $sql );
					}
				}
				// bump the version number option in the options database
				$this->info( "Updated database schema to $version" );
				update_option( 'fontsampler_db_version', $version );
			}
		}
		// if all executed bump the version number option in the options database to the manually entered db version
		// even if the last query was not of that high of a version (which it shouldn't)
		update_option( 'fontsampler_db_version', $this->fontsampler_db_version );
		$this->info( 'Database schemas now up to date' );
		return true;
	}


	/**
	 * Helper to check if tables exist
	 * TODO: check if tables are in the correct structure
	 */
	function check_table_exists( $table ) {
		$this->db->query( "SHOW TABLES LIKE '" . $table . "'" );

		return 0 == $this->db->num_rows ? false : true;
	}


	/**
	 * Helper that checks for the existance of all required fontsampler tables and where missing creates them
	 */
	function check_and_create_tables() {
		// check the fontsampler tables exist, and if not, create them now
		if ( ! $this->check_table_exists( $this->table_sets ) ) {
			$this->create_table_sets();
		}
		if ( ! $this->check_table_exists( $this->table_fonts ) ) {
			$this->create_table_fonts();
		}
		if ( ! $this->check_table_exists( $this->table_join ) ) {
			$this->create_table_join();
		}
		if ( ! $this->check_table_exists( $this->table_settings ) ) {
			$this->create_table_settings();
		}
	}


	// TODO deactivate -> remove tables

	/*
	 * Read from settings table ( currently only one row with defaults )
	 */
	function get_settings( $id = 1 ) {
		$sql = 'SELECT * FROM ' . $this->table_settings . ' WHERE `id` = ' . $id;
		$res = $this->db->get_row( $sql, ARRAY_A );

		// remove any empty string settings
		$res = array_filter( $res, function ( $item ) { return '' !== $item; } );

		// return that row but make sure any missing or empty settings fields get substituted from the hardcoded defaults
		$defaults = array_merge( $this->settings_defaults, $res );
		return $defaults;
	}


	/*
	 * Read from fontsampler sets table
	 */
	function get_sets() {
		$sql = 'SELECT * FROM ' . $this->table_sets . ' s';
		$sets  = $this->db->get_results( $sql, ARRAY_A );
		$set_with_fonts = array();
		foreach ( $sets as $set ) {
			$sql = 'SELECT f.name, f.id, ';
			foreach ( $this->font_formats as $format ) {
				$sql .= ' ( SELECT guid FROM ' . $this->db->prefix . 'posts p WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
			}
			$sql = substr( $sql, 0, - 1 );
			$sql .= ' FROM ' . $this->table_sets . ' s
					LEFT JOIN ' . $this->table_join . ' j
					ON s.id = j.set_id
					LEFT JOIN ' . $this->table_fonts . ' f
					ON f.id = j.font_id
					WHERE j.set_id = ' . intval( $set['id'] ) . '
					ORDER BY j.`order` ASC';

			$set['fonts'] = $this->db->get_results( $sql, ARRAY_A );
			array_push( $set_with_fonts, $set );
		}

		return $set_with_fonts;
	}


	function get_set( $id, $including_fonts = true ) {
		$sql = 'SELECT * FROM ' . $this->table_sets . ' s
				WHERE s.id = ' . $id;
		$set = $this->db->get_row( $sql, ARRAY_A );

		if ( 0 == $this->db->num_rows ) {
			return false;
		}

		if ( ! $including_fonts ) {
			// generate order array with rows of arrays of ui fields, remove any fields from the ui_order string that
			// are in fact not enabled in this set
			$set['ui_order_parsed'] = $this->parse_ui_order( $this->prune_ui_order( $set['ui_order'], $set) );
			return $set;
		}

		$sql = 'SELECT f.id, f.name, ';
		foreach ( $this->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->db->prefix . 'posts p WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
		}
		$sql = substr( $sql, 0, - 1 );
		$sql .= ' FROM ' . $this->table_sets . ' s
				LEFT JOIN ' . $this->table_join . ' j
				ON s.id = j.set_id
				LEFT JOIN ' . $this->table_fonts . ' f
				ON f.id = j.font_id
				WHERE j.set_id = ' . intval( $id ) . '
				ORDER BY j.`order` ASC';

		$set['fonts'] = $this->db->get_results( $sql, ARRAY_A );
		$set['ui_order_parsed'] = $this->parse_ui_order( $this->prune_ui_order( $set['ui_order'], $set ) );

		return $set;
	}


	/*
	 * Remove a fontsampler set
	 */
	function delete_set( $id ) {
		$this->db->delete( $this->table_join, array( 'set_id' => $id ) );
		$this->db->delete( $this->table_sets, array( 'id' => $id ) );
		return true;
	}


	/*
	 * read font files from Wordpress attachements
	 */
	function get_fontfile_posts() {
		$sql = 'SELECT *, ';
		foreach ( $this->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->db->prefix . 'posts p WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
		}
		$sql = substr( $sql, 0, - 1 );
		$sql .= ' FROM ' . $this->table_fonts . ' f ';
		$result = $this->db->get_results( $sql, ARRAY_A );

		return 0 == $this->db->num_rows ? false : $result;
	}


	/**
	 * Read all fonts and formats for fontsampler with $set_id
	 */
	function get_fontset_for_set( $set_id ) {
		$sql = 'SELECT f.id, f.name, ';
		foreach ( $this->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->db->prefix . 'posts p WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
		}
		$sql = substr( $sql, 0, - 1 );
		$sql .= ' FROM ' . $this->table_fonts . ' f
		        LEFT JOIN ' . $this->table_join . ' j
		        ON j.font_id = f.id
				WHERE j.set_id = ' . intval( $set_id ) . '
				ORDER BY j.`order` ASC';
		$result = $this->db->get_results( $sql, ARRAY_A );

		return 0 == $this->db->num_rows ? false : $result;
	}


	function get_fontset( $font_id, $sorted = true ) {
		$sql = 'SELECT f.id, f.name, ';
		foreach ( $this->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->db->prefix . 'posts p WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
		}
		$sql = substr( $sql, 0, - 1 );
		$sql .= ' FROM ' . $this->table_fonts . ' f ';

		if ( true === $sorted ) {
			$sql .= ' LEFT JOIN ' . $this->table_join . ' j
					ON j.font_id = f.id
					WHERE f.id = ' . intval( $font_id ) . '
					ORDER BY j.`order` ASC';
		} else {
			$sql .= ' WHERE f.id= ' . intval( $font_id );
		}
		$result = $this->db->get_results( $sql, ARRAY_A );

		return 0 == $this->db->num_rows ? false : $result[0];
	}


	/*
	 * Read all sets of fonts with font files
	 */
	function get_fontsets( $sorted = true ) {
		$sql = 'SELECT f.id, f.name, ';
		foreach ( $this->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->db->prefix . 'posts p WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
		}
		$sql = substr( $sql, 0, - 1 );
		$sql .= ' FROM ' . $this->table_fonts . ' f';
		$result = $this->db->get_results( $sql, ARRAY_A );

		return 0 == $this->db->num_rows ? false : $result;
	}


	// TODO check-routine that makes sure all sets and fonts are in order as defined in the database


	/*
	 * PROCESSING FROMS
	 */

	/*
	 * Dealing with new fonts being defined and uploaded explicitly via the plugin ( instead of the media gallery )
	 */
	function handle_font_edit() {
		if ( 'font_edit' == $_POST['action'] && ! empty( $_POST['fontname'][0] ) ) {
			check_admin_referer( 'fontsampler-action-font_edit' );

			echo '<div class="notice">';

			// initially set all formats to NULL
			// if there previously there was a font, and now it got deleted, it will not linger in the db as unaffected
			// column, but instead get deleted
			$data = array(
				'name'  => $_POST['fontname'][0],
				'woff2' => NULL,
				'woff'  => NULL,
				'eot'   => NULL,
				'svg'   => NULL,
				'ttf'   => NULL,
			);

			foreach ( $this->font_formats as $label ) {
				$file = $_FILES[ $label . '_0'];
				if ( isset( $file ) && $file['size'] > 0 ) {
					$uploaded = media_handle_upload( $label . '_0', 0 );
					if ( is_wp_error( $uploaded ) ) {
						$this->error( 'Error uploading ' . $label . ' file: ' . $uploaded->get_error_message() );
					} else {
						$this->info( 'Uploaded ' . $label . ' file: ' . $file['name'] );
						$data[ $label ] = $uploaded;
					}
				} elseif ( ! empty( $_POST[ 'existing_file_' . $label ][0] ) ) {
					// don't overwrite current file reference
					$this->info( 'Existing ' . $label . ' file remains unchanged.' );
					unset( $data[ $label ] );
				} else {
					$this->notice( 'No ' . $label . ' file provided. You can still add it later.' );
				}
			}

			if ( 0 == $_POST['id'] ) {
				$this->db->insert( $this->table_fonts, $data );
				$this->info( 'Created fontset ' . $_POST['fontname'][0] );
			} else {
				$this->db->update( $this->table_fonts, $data, array( 'ID' => $_POST['id'] ) );
			}

			echo '</div>';
		}
	}


	// TODO confirm delete, also confirm delete from fontsampler sets
	/*
	 * Delete a set of fonts from the database
	 */
	function handle_font_delete() {
		if ( 'delete_font' == $_POST['action'] && ! empty( $_POST['id'] ) ) {
			check_admin_referer( 'fontsampler-action-delete_font' );
			$id  = intval( $_POST['id'] );
			$res = $this->db->delete( $this->table_fonts, array( 'id' => $id ) );
			if ( ! $res ) {
				$this->db->error( 'Error: No font sets deleted' );
			} else {
				$this->db->delete( $this->table_join, array( 'font_id' => $id ) );
				$this->info( 'Font set succesfully removed. Font set also removed from any fontsamplers using it.' );
				$this->notice( 'Note that the font files themselves have not been removed from the Wordpress uploads folder ( Media Gallery ).' );
			}
		}
	}


	// TODO handle_font_file_remove()


	/**
	 * Creating or editing a fontsampler set
	 */
	function handle_set_edit() {
		if ( 'edit_set' == $_POST['action'] && isset( $_POST['action'] ) ) {
			check_admin_referer( 'fontsampler-action-edit_set' );
			$data = array();

			// loop over all checkbox fields and register their state
			foreach ( $this->boolean_options as $index ) {
				$data[ $index ] = isset( $_POST[ $index ] );
			}

			// substitute in defaults, if we are to use them
			// when defaults get updates, any sets with the default_features = 1 will need to get updated
			if ( $_POST['default_features'] == 1 ) {
				$substitutes = array_intersect_key( $this->get_settings(), $this->boolean_options );
				$data = array_replace( $data, $substitutes );
				$data['default_features'] = 1;
			} else {
				$data['default_features'] = 0;
			}

			// also allow for empty initial text
			if ( ! empty( $_POST['initial'] ) ) {
				$data['initial'] = $_POST['initial'];
			}

			// store the initial font, this is either the only font, or the selected font
			if ( isset( $_POST['font_id'] ) && isset( $_POST['initial_font'] ) ) {
				if ( sizeof( array_unique( $_POST['font_id'] ) ) == 1 ) {
					$data['initial_font'] = $_POST['font_id'][0];
				} else {
					$data['initial_font'] = $_POST['initial_font'];
				}
			} else {
				$data['initial_font'] = NULL;
			}

			// store script writing direction
			$data['is_ltr'] = !empty( $_POST['is_ltr'] ) && $_POST['is_ltr'] == "1" ? 1 : 0;

			$id = null;

			$data['ui_order'] = $_POST['ui_order'];

			// handle any possibly included inline fontset creation
			$inlineFontIds = array();

			// Any items present in the fontname array indicate new fonts have been added inline and need to be
			// processed
			if ( isset( $_POST['fontname'] ) ) {
				$inlineFontIds = $this->upload_multiple_fontset_files( $_POST['fontname'] );
			}

			// save the fontsampler to the DB
			if ( ! isset( $_POST['id'] ) ) {
				// insert new
				$res = $this->db->insert( $this->table_sets, $data );
				if ( $res ) {
					$id = $this->db->insert_id;
					$this->info( 'Created fontsampler with id ' . $id );
				} else {
					$this->error( 'Error: Failed to create new fomtsampler.' );
				}
			} else {
				// update existing
				$id = intval( $_POST['id'] );
				$this->db->update( $this->table_sets, $data, array( 'id' => $id ) );
			}

			// wipe join table for this fontsampler, then add whatever now was instructed to be saved
			$this->db->delete( $this->table_join, array( 'set_id' => $id ) );

			$font_ids = [];
			$font_index = 0;

			// fonts_order looks something like like 3,2,1,inline_0,4 where ints are existing fonts and inline_x are
			// newly inserted fontsets; those need to get substituted with the ids that were generated above from
			// inserting them into the database
			if ( ! empty( $_POST['fonts_order'] ) ) {
				$fonts_order = explode( ',', $_POST['fonts_order'] );
				for ( $f = 0; $f < sizeof( $fonts_order ); $f ++ ) {
					$ordered_id = $fonts_order[ $f ];

					// if the fonts_order has not just ids, but also "inline_0" values, replace those
					// with the newly created font_ids, if indeed such a font was created as indicated by the presence of
					// that inline_x in the $inlineFontIds array
					if ( strpos($ordered_id, "_") !== false ) {
						$ordered_id = array_shift( $inlineFontIds );
					}
					array_push( $font_ids, $ordered_id );
				}
			} else {
				$font_ids = $_POST['font_id'];
			}

			// filter possibly duplicate font selections, then add them into the join table
			foreach ( array_unique( $font_ids ) as $font_id ) {
				if ( 0 != $font_id ) {
					$this->db->insert( $this->table_join, array( 'set_id' => $id, 'font_id' => $font_id, 'order' => $font_index ) );
					$font_index++;
				}
			}
		}
	}


	/**
	 * Handles uploading and inserting one or more fontset's fonts (woff2, woff, etc) from the $_FILES array
	 *
	 * @param $names: array of name fields
	 */
	function upload_multiple_fontset_files($names) {
		$num_names = sizeof( $names );

		if ( $num_names === 1) {
			// single font, i.e. only one inline font, or create font dialog
			return array( $this->upload_fontset_files( $names[0] ) );
		} else {
			// multiple fonts posted for saving
			$created = array();
			for ( $i = 0; $i < $num_names; $i++ ) {
				$name = $names[ $i ];
				array_push( $created, $this->upload_fontset_files( $name, $i) );
			}
			return $created;
		}
	}


	/**
	 * Handles uploading and inserting ONE fontset's fonts (woff2, woff, etc) from the $_FILES array
	 *
	 * @param $name
	 * @param int $file_suffix
	 *
	 * @return int or boolean: inserted fontset database id or false
	 */
	function upload_fontset_files($name, $file_suffix = 0) {
		$data = array(
			'name' => $name,
		);

		foreach ( $this->font_formats as $label ) {
			$file = $_FILES[ $label . '_' . $file_suffix ];

			if ( ! empty( $file ) && $file['size'] > 0 ) {
				$uploaded = media_handle_upload( $label . '_' . $file_suffix, 0 );

				if ( is_wp_error( $uploaded ) ) {
					$this->error( 'Error uploading ' . $label . ' file: ' . $uploaded->get_error_message() );
				} else {
					$this->info( 'Uploaded ' . $label . ' file: ' . $file['name'] );
					$data[ $label ] = $uploaded;
				}
			} else {
				$this->notice( 'No ' . $label . ' file provided for ' . $name . '. You can still add it later.');
			}
		}

		if ( $this->db->insert( $this->table_fonts, $data ) ) {
			$this->info( 'Created fontset ' . $name );

			return $this->db->insert_id;
		}

		return false;
	}


	function handle_set_delete() {
		if ( isset( $_POST['id'] ) ) {
			$id = (int) ( $_POST['id'] );
			if ( 'delete_set' == $_POST['action'] && isset( $id ) && is_int( $id ) && $id > 0 ) {
				check_admin_referer( 'fontsampler-action-delete_set' );
				if ( $this->delete_set( intval( $_POST['id'] ) ) ) {
					$this->info( 'Deleted ' . $id );
				}
			}
		}
	}


	function handle_settings_edit() {
		// no settings ID's for now, just one default row
		if ( isset( $_POST['id'] ) ) {
			$id = (int) ( $_POST['id'] );
			if ( 'edit_settings' == $_POST['action'] && isset( $id ) && is_int( $id ) && $id > 0 ) {
				$settings_fields = array_keys( $this->settings_defaults );

				$data = array();
				foreach ( $settings_fields as $field ) {
					if ( in_array( $field, $this->default_features ) ) {
						$data[ $field ] = isset( $_POST[ $field ] ) ? 1 : 0;
					} else {
						if ( isset( $_POST[ $field ] ) ) {
							$data[ $field ] = trim( $_POST[ $field ] );
						}
					}
				}

				// atm no inserts, only updating the defaults
				$this->db->update( $this->table_settings, $data, array( 'id' => $id ) );

				// rewrite any fontsampler sets that use the defaults
				$this->update_defaults( $data );

				// further generate a new settings css file
				$this->write_css_from_settings( $data );
			}
		}
	}


	/*
	 * HELPERS
	 */

	/**
	 * Helper function that updates all fontsampler sets with the new (default) options just saved
	 * @param $options
	 */
	function update_defaults( $options ) {
		// write all new default options to the corresponding columns in the sets
		$data = array_intersect_key( $options, array_flip( $this->default_features ) );
		$this->db->update( $this->table_sets, $data, array( 'default_features' => '1' ) );

		// a bit clumsily with second update, but need to first have all fields in sync
		// update the generated ui_order column so that editing the fontsampler the UI layout is reflected to match
		// the current defaults
		foreach ( $this->get_sets() as $set ) {
			$data = array( 'ui_order' => $this->concat_ui_order( $this->ui_order_parsed_from( $options, $set ) ) );
			$this->db->update( $this->table_sets, $data, array( 'default_features' => '1' ) );
		}
	}

	/**
	 * @return string path to include styles css file
	 */
	function get_css_file() {
		// check path for existing file
		// if not, create it by merging css template with settings
		if ( ! file_exists( plugin_dir_path( __FILE__ ) . 'css/fontsampler-css.css' ) ) {
			$default_settings = $this->get_settings();
			if ( ! $this->write_css_from_settings( $default_settings ) ) {
				// if creating the missing file failed return the base styles by themselves
				return plugin_dir_url( __FILE__ ) . 'css/fontsampler-interface.css';
			}
		}

		// return file path to the css that contains base css merged with settings css
		return plugin_dir_url( __FILE__ ) . 'css/fontsampler-css.css';
	}


	/**
	 * @param $settings db row of setting params as array
	 */
	function write_css_from_settings( $settings ) {
		// reduce passed in settings row to only values for keys starting with css_ and prefix those keys with an @ for
		// matching and replacing

		$settings_preped = array();
		foreach ( $settings as $key => $value ) {
			if ( false !== strpos( $key, 'css_' ) ) {
				$settings_preped[ '@' . $key ] = $value;
			}
		}

		$template_path = plugin_dir_path( __FILE__ ) . 'css/fontsampler-css-template.tpl';
		$styles_path   = plugin_dir_path( __FILE__ ) . 'css/fontsampler-interface.css';
		if ( file_exists( $template_path ) && file_exists( $styles_path ) ) {
			$template = file_get_contents( $template_path );
			$template = str_replace( array_keys( $settings_preped ), $settings_preped, $template );
			$styles = file_get_contents( $styles_path );

			// concat the base styles and the replaced template into the default css file
			if ( file_put_contents( plugin_dir_path( __FILE__ ) . 'css/fontsampler-css.css', array(
				$styles,
				$template,
			) ) ) {
				return true;
			}
		}

		return false;
	}


	/*
	 * Helper that generates a json formatted strong with { formats: files, ... }
	 * for passed in $fonts ( array )
	 */
	function fontfiles_json( $font ) {
		if ( empty( $font ) ) {
			return false;
		}
		$fonts_object = '{';
		foreach ( $this->font_formats as $format ) {
			if ( ! empty( $font[ $format ] ) ) {
				$fonts_object .= '"' . $format . '": "' . $font[ $format ] . '",';
			}
		}
		$fonts_object = substr( $fonts_object, 0, - 1 );
		$fonts_object .= '}';

		return $fonts_object;
	}


	/**
	 * Helper to parse the comma,separated|value|string,in,the database into an multidimensional array
	 * @param $string
	 *
	 * @return array
	 */
	function parse_ui_order( $string ) {
		$order = [];
		if ( empty( $string ) ) {
			return false;
		}
		foreach ( explode( '|', $string ) as $commavalues ) {
			array_push( $order, explode( ',', $commavalues ) );
		}

		return $order;
	}


	function concat_ui_order( $array ) {
		$ui_order = '';
		foreach ( $array as $row ) {
			$ui_order .= implode( ',', $row) . '|';
		}
		$ui_order = substr($ui_order, 0, -1);
		return $ui_order;
	}


	function set_has_options ( $set ) {
		return ( isset( $set['invert'] ) || isset( $set['alignment'] ) ||
		! empty( array_filter( $set, function ($var) { return substr( $var, 0, 3 ) === "ot_"; }) ) );
	}

	/**
	 * Helper to remove not acutally present elements from the compressed string
	 *
	 * @param $string the compressed string of ui elements, commaseparated and | -separated, i.e. size,letterspacing|fontsampler
	 * @param $set the fontsampler set to validate it against
	 * @return $string of the ui fields, separated by fields with comma, and rows with |
	 */
	function prune_ui_order( $string, $set ) {
		// force include the non-db value "fontsampler"
		$set['fontsampler'] = 1;

		// force include the value "options" if any OT feature, invert or alignment are enabled
		if ( $this->set_has_options( $set ) ) {
			$set['options'] = 1;
		}

		// if there are more than 1 font in the set, make sure to not pluck the 'fontpicker' label
		if ( isset( $set['fonts'] ) && sizeof( $set['fonts'] ) ) {
			$set['fontpicker'] = 1;
		}

		// loop over the parsed array and rebuild the array only with values that are defined to be there as evident
		// from their presence in $set
		$parsed = $this->parse_ui_order( $string );
		$pruned = array();
		foreach ( $parsed as $row ) {
			$prunedRow = array();
			foreach ( $row as $item ) {
				if ( isset( $set[ $item ] ) && $set[ $item ] == 1) {
					array_push( $prunedRow, $item );
				}
			}
			array_push( $pruned, implode( ',', $prunedRow ) );
		}

		return implode( '|', $pruned );
	}


	/**
	 * Helper that returnes a parsed array with the correct UI blocks based on passed in settings and set
	 *
	 * @param $settings
	 * @param $set
	 *
	 * @return array
	 */
	function ui_order_parsed_from( $settings, $set ) {

		// all blocks except 'fontpicker' (no need when creating a new set with 0 fonts - gets dynamically
		// added on selecting fonts)

		// fetch the defaults and intersect them with the five possible options (mandatory fontsampler added last)
		// to generate an array of ui_blocks that need to be arranhged
		$ui_blocks = array_intersect( array_keys( array_filter($settings, function ($a) {
			return $a == "1";
		}) ), array( 'size', 'letterspacing', 'lineheight', 'sampletexts', 'options' ) );
		array_push( $ui_blocks, 'fontsampler' );

		$ui_order = array();

		// generate the most "ideal" (no gaps in the row, no 2+2 rows) layout of ui_blocks and store them
		// in a formate that is the same as ui_order_parsed
		for ( $r = 0; $r < 2; $r++ ) {
			$ui_order[ $r ] = array();

			while ( sizeof( $ui_order[ $r ] ) < 3 && sizeof( $ui_blocks ) > 0 ) {

				$block = array_shift( $ui_blocks );
				if ( ( 'options' !== $block && isset( $set[ $block ] ) ) ||
				     ('options' === $block && $this->set_has_options( $set ) ) ) {
					array_push( $ui_order[ $r ], $block );
				}
			}
			if ( sizeof( $ui_blocks ) == 0 ) {
				break;
			}
		}
		array_push( $ui_order, array( 'fontsampler' ) );

		return $ui_order;
	}


	/*
	 * Render different confirmation messages
	 */
	function info( $message ) {
		echo '<strong class="info">' . $message . '</strong>';
	}

	function notice( $message ) {
		echo '<strong class="note">' . $message . '</strong>';
	}

	function error( $message ) {
		echo '<strong class="error">' . $message . '</strong>';
	}

}
