<?php
/*
Plugin Name: Fontsampler
Plugin URI:  https://github.com/kontur/fontsampler-wordpress-plugin
Description: Create editable webfont previews via shortcodes
Version:     0.0.1
Author:      Johannes Neumeier
Author URI:  http://johannesneumeier.com
Copyright:   Copyright 2016 Johannes Neumeier
Text Domain: fontsampler
*/

/*
general level TODO's:

	- Implement nounce checks for all forms

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
	private $font_formats;
	private $fontsampler_db_version;

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
		$this->fontsampler_db_version = '0.0.2';

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
			'fontpicker',
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
		$this->font_formats = array( 'woff2', 'woff', 'eot', 'svg', 'ttf' );
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
			$set   = $this->get_set( intval( $attributes['id'] ), false );
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
			$replace = array_merge( array(
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
				'color_fore'				=> '000000',
				'color_back'				=> 'ffffff',
			), $defaults );

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
		wp_enqueue_style( 'fontsampler-css', plugin_dir_url( __FILE__ ) . 'fontsampler-interface.css' );
	}

	/*
	 * Register scripts and styles needed in the admin panel
	 */
	function fontsampler_admin_enqueues() {
		wp_enqueue_script( 'fontsampler-rangeslider-js', plugin_dir_url( __FILE__ ) . 'bower_components/rangeslider.js/dist/rangeslider.min.js', array( 'jquery' ) );
		wp_enqueue_script( 'fontsampler-preview-js', plugin_dir_url( __FILE__ ) . 'bower_components/jquery-fontsampler/dist/jquery.fontsampler.js', array( 'jquery' ) );
		wp_enqueue_script( 'fontsampler-admin-js', plugin_dir_url( __FILE__ ) . 'js/fontsampler-admin.js', array( 'jquery' ) );
		wp_enqueue_script( 'colour-pick', plugins_url( 'js/fontsampler-admin.js', __FILE__ ), array( 'wp-color-picker' ), false, true );
		wp_enqueue_script( 'jquery-ui-sortable', array( 'jquery' ) );
		wp_enqueue_style( 'wp-color-picker' );
		wp_enqueue_style( 'fontsampler_admin_css', plugin_dir_url( __FILE__ ) . '/fontsampler-admin.css', false, '1.0.0' );
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
			case 'create':
				$set   = null;
				$fonts = $this->get_fontfile_posts();
				include( 'includes/sample-edit.php' );
				break;

			case 'edit':
				$set   = $this->get_set( intval( $_GET['id'] ) );
				$fonts = $this->get_fontfile_posts();
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
                `fontpicker` tinyint( 1 ) NOT NULL DEFAULT '0',
                `sampletexts` tinyint( 1 ) NOT NULL DEFAULT '0',
                `alignment` tinyint( 1 ) NOT NULL DEFAULT '0',
                `invert` tinyint( 1 ) NOT NULL DEFAULT '0',
                `multiline` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_liga` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_dlig` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_hlig` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_calt` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_frac` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_sups` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ot_subs` tinyint( 1 ) NOT NULL DEFAULT '0',
                `ui_order` VARCHAR( 255 ) NOT NULL DEFAULT 'size,letterspacing,options|fontpicker,sampletexts,lineheight|fontsampler'
			  PRIMARY KEY ( `id` )
			)";
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
			)";
		$this->db->query( $sql );
	}


	function create_table_join() {
		$sql = "CREATE TABLE " . $this->table_join . " (
			   `set_id` int( 11 ) unsigned NOT NULL,
			   `font_id` int( 11 ) unsigned NOT NULL
				)";
		$this->db->query( $sql );
	}


	function create_table_settings() {
		$sql = "CREATE TABLE " . $this->table_settings . " (
			`id` int( 11 ) unsigned NOT NULL AUTO_INCREMENT,
			`font_size_initial` smallint( 5 ) unsigned NOT NULL DEFAULT '18',
			`font_size_min` smallint( 5 ) unsigned NOT NULL DEFAULT '8',
			`font_size_max` smallint( 5 ) unsigned NOT NULL DEFAULT '96',
			`letter_spacing_initial` tinyint( 5 ) NOT NULL DEFAULT '0',
			`letter_spacing_min` tinyint( 3 ) NOT NULL DEFAULT '-5',
			`letter_spacing_max` tinyint( 3 ) NOT NULL DEFAULT '5',
			`line_height_initial` smallint( 5 ) NOT NULL DEFAULT '110',
			`line_height_min` smallint( 5 ) NOT NULL DEFAULT '0',
			`line_height_max` smallint( 5 ) NOT NULL DEFAULT '300',
			`sample_texts` text NOT NULL,
			`color_fore` tinytext NOT NULL,
			`color_back` tinytext NOT NULL,
			PRIMARY KEY ( `id` )
			);";
		$this->db->query( $sql );

		$data = array(
			'font_size_initial' => 18,
			'font_size_min' => 8,
			'font_size_max' => 96,
			'letter_spacing_initial' => 0,
			'letter_spacing_min' => -5,
			'letter_spacing_max' => 5,
			'line_height_initial' => 110,
			'line_height_min' => 0,
			'line_height_max' => 300,
			'sample_texts' => "hamburgerfontstiv\nabcdefghijklmnopqrstuvwxyz\nABCDEFGHIJKLMNOPQRSTUVWXYZ\nThe quick brown fox jumps over the lazy cat",
			'color_fore' => '#000000',
			'color_back' => '#FFFFFF',
		);
		$this->db->insert( $this->table_settings, $data );
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
				'ALTER TABLE ' . $this->table_settings . ' ADD `color_fore` tinytext NOT NULL',
				'UPDATE ' . $this->table_settings . " SET `color_fore` = '#000000' WHERE id = '1'",
				'ALTER TABLE ' . $this->table_settings . ' ADD `color_back` tinytext NOT NULL',
				'UPDATE ' . $this->table_settings . " SET `color_back` = '#FFFFFF' WHERE id = '1'",
				'ALTER TABLE ' . $this->table_sets . " ADD `ui_order` VARCHAR( 255 ) NOT NULL DEFAULT 'size,letterspacing,options|fontpicker,sampletexts,lineheight|fontsampler'",
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
					$res = $this->db->query( $sql );
					if ( false === $res ) {
						$this->error( "Database schema update to $version failed" );
						// if encountering an update error, break out of the entire routine
						$this->error( 'Aborting database migration' );
						return false;
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

		return $this->db->get_row( $sql, ARRAY_A );
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
					WHERE j.set_id = ' . intval( $set['id'] );

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

		// generate order array with rows of arrays of ui fields
		$order = [];
		foreach ( explode( '|', $set['ui_order'] ) as $commavalues ) {
			array_push( $order, explode( ',', $commavalues ) );
		}
		$set['ui_order_parsed'] = $order;

		if ( ! $including_fonts ) {
			return $set;
		}

		$sql = 'SELECT f.name, ';
		foreach ( $this->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->db->prefix . 'posts p WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
		}
		$sql = substr( $sql, 0, - 1 );
		$sql .= ' FROM ' . $this->table_sets . ' s
				LEFT JOIN ' . $this->table_join . ' j
				ON s.id = j.set_id
				LEFT JOIN ' . $this->table_fonts . ' f
				ON f.id = j.font_id
				WHERE j.set_id = ' . intval( $id );

		$set['fonts'] = $this->db->get_results( $sql, ARRAY_A );

		return $set;
	}


	/*
	 * Remove a fontsampler set
	 */
	function delete_set( $id ) {
		return $this->db->delete( $this->table_sets, array( 'id' => $id ) );
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
				WHERE j.set_id = ' . intval( $set_id );
		$result = $this->db->get_results( $sql, ARRAY_A );

		return 0 == $this->db->num_rows ? false : $result[0];
	}


	function get_fontset( $font_id ) {
		$sql = 'SELECT f.id, f.name, ';
		foreach ( $this->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->db->prefix . 'posts p WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
		}
		$sql = substr( $sql, 0, - 1 );
		$sql .= ' FROM ' . $this->table_fonts . ' f
				WHERE f.id= ' . intval( $font_id );
		$result = $this->db->get_results( $sql, ARRAY_A );

		return 0 == $this->db->num_rows ? false : $result[0];
	}


	/*
	 * Read all sets of fonts with font files
	 */
	function get_fontsets() {
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
		if ( 'font_edit' == $_POST['action'] && ! empty( $_POST['fontname'] ) ) {
			check_admin_referer( 'fontsampler-action-font_edit' );

			echo '<div class="notice">';

			$data = array( 'name' => $_POST['fontname'] );

			foreach ( $this->font_formats as $label ) {
				if ( isset( $_FILES[ $label ] ) && $_FILES[ $label ]['size'] > 0 ) {
					$uploaded = media_handle_upload( $label, 0 );
					if ( is_wp_error( $uploaded ) ) {
						$this->error( 'Error uploading ' . $label . ' file: ' . $uploaded->get_error_message() );
					} else {
						$this->info( 'Uploaded ' . $label . ' file: ' . $_FILES[ $label ]['name'] );
						$data[ $label ] = $uploaded;
					}
				} elseif ( ! empty( $_POST[ 'existing_file_' . $label ] ) ) {
					// don't overwrite current file reference
					$this->info( 'Existing ' . $label . ' file remains unchanged.' );
				} else {
					$this->notice( 'No ' . $label . ' file provided. You can still add it later.' );
				}
			}

			if ( 0 == $_POST['id'] ) {
				$res = $this->db->insert( $this->table_fonts, $data );
				$this->info( 'Created fontset ' . $_POST['fontname'] );
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
			foreach ( $this->boolean_options as $index ) {
				$data[ $index ] = isset( $_POST[ $index ] );
			}

			if ( sizeof( $_POST['font_id'] ) > 1 ) {
				$data['fontpicker'] = true;
			}

			if ( ! empty( $_POST['initial'] ) ) {
				$data['initial'] = $_POST['initial'];
			}

			$id = null;

			$data['ui_order'] = $_POST['ui_order'];

			if ( ! isset( $_POST['id'] ) ) {
				// insert new
				$res = $this->db->insert( $this->table_sets, $data );
				if ( $res ) {
					$id = $this->db->insert_id;
					$this->info( 'Created set with id ' . $id );
				} else {
					$this->error( 'Error: Failed to create new font set' );
				}
			} else {
				// update existing
				$id = intval( $_POST['id'] );
				$this->db->update( $this->table_sets, $data, array( 'id' => $id ) );
			}

			// wipe join table for this fontsampler, then add whatever now was instructed to be saved
			$this->db->delete( $this->table_join, array( 'set_id' => $id ) );

			// filter possibly duplicate font selections, then add them into the join table
			foreach ( array_unique( $_POST['font_id'] ) as $font_id ) {
				if ( 0 != $font_id ) {
					$this->db->insert( $this->table_join, array( 'set_id' => $id, 'font_id' => $font_id ) );
				}
			}
		}
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
				$settings_fields = array(
					'font_size_initial',
					'font_size_min',
					'font_size_max',
					'letter_spacing_initial',
					'letter_spacing_min',
					'letter_spacing_max',
					'line_height_initial',
					'line_height_min',
					'line_height_max',
					'sample_texts',
					'color_fore',
					'color_back',
				);

				$data = array();
				foreach ( $settings_fields as $field ) {
					if ( isset( $_POST[ $field ] ) ) {
						$data[ $field ] = trim( $_POST[ $field ] );
					}
				}

				// atm no inserts, only updating the defaults
				$this->db->update( $this->table_settings, $data, array( 'id' => $id ) );
			}
		}
	}


	/*
	 * HELPERS
	 */


	/*
	 * Helper that generates a json formatted strong with { formats: files, ... }
	 * for passed in $fonts ( array )
	 */
	function fontfiles_json( $fonts ) {
		if ( empty( $fonts ) ) {
			return false;
		}
		$fonts_object = '{';
		foreach ( $fonts as $format => $font ) {
			if ( in_array( $format, $this->font_formats ) && ! empty( $font ) ) {
				$fonts_object .= '"' . $format . '": "' . $font . '",';
			}
		}
		$fonts_object = substr( $fonts_object, 0, - 1 );
		$fonts_object .= '}';

		return $fonts_object;
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
