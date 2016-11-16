<?php

/**
 * Class FontsamplerDatabase
 *
 * Wrapper for all sort of database interactions, including:
 *  - Creating database tables on install
 *  - Checking all needed tables exist on run
 *  - CRUD operations on the database
 *  - Migrating database versions base on the WP_OPTION 'fontsampler_db_version'
 */
class FontsamplerDatabase {

	private $wpdb;
	private $table_sets;
	private $table_fonts;
	private $table_join;
	private $table_settings;
	private $font_formats;
	private $fontsampler;
	private $helpers;

	function FontsamplerDatabase( $wpdb, $fontsampler ) {
		$this->wpdb = $wpdb;

		$this->table_sets     = $this->wpdb->prefix . 'fontsampler_sets';
		$this->table_fonts    = $this->wpdb->prefix . 'fontsampler_fonts';
		$this->table_join     = $this->wpdb->prefix . 'fontsampler_sets_x_fonts';
		$this->table_settings = $this->wpdb->prefix . 'fontsampler_settings';

		$this->fontsampler = $fontsampler;
		$this->helpers     = new FontsamplerHelpers( $fontsampler );
	}

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
                `opentype` tinyint( 1 ) NOT NULL DEFAULT '0',
                `is_ltr` tinyint( 1 ) NOT NULL DEFAULT '1',
                `ui_order` VARCHAR( 255 ) NOT NULL DEFAULT 'size,letterspacing,options|fontpicker,sampletexts,lineheight|fontsampler',
                `default_features` tinyint( 1 ) NOT NULL DEFAULT '1',
                `default_options` tinyint( 1 ) NOT NULL DEFAULT '0',
                `initial_font` int( 10 ) unsigned DEFAULT NULL,
			  PRIMARY KEY ( `id` )
			) DEFAULT CHARSET=utf8";

		$this->wpdb->query( $sql );
	}


	function create_table_fonts() {
		$sql = "CREATE TABLE " . $this->table_fonts . " (
			  `id` int( 11 ) unsigned NOT NULL AUTO_INCREMENT,
			  `name` varchar( 255 ) NOT NULL DEFAULT '',
			  `woff` int( 11 ) unsigned DEFAULT NULL,
			  `woff2` int( 11 ) unsigned DEFAULT NULL,
			  `eot` int( 11 ) unsigned DEFAULT NULL,
			  `ttf` int( 11 ) unsigned DEFAULT NULL,
			  PRIMARY KEY ( `id` )
			) DEFAULT CHARSET=utf8";
		$this->wpdb->query( $sql );
	}


	function create_table_join() {
		$sql = "CREATE TABLE " . $this->table_join . " (
			   `set_id` int( 11 ) unsigned NOT NULL,
			   `font_id` int( 11 ) unsigned NOT NULL,
			   `order` smallint( 5 ) unsigned NOT NULL DEFAULT '0'
				) DEFAULT CHARSET=utf8";
		$this->wpdb->query( $sql );
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
			`opentype` tinyint(1) unsigned NOT NULL DEFAULT '0',
			PRIMARY KEY (`id`)
			) DEFAULT CHARSET=utf8";
		$this->wpdb->query( $sql );

		$this->wpdb->insert( $this->table_settings, $this->fontsampler->settings_defaults );
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
			'0.0.4' => array(
				'ALTER TABLE ' . $this->table_sets . " ADD `default_options` tinyint( 1 ) NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_sets . " ADD `default_features` tinyint( 1 ) NOT NULL DEFAULT '1'",
				'ALTER TABLE ' . $this->table_sets . " ADD `is_ltr` tinyint( 1 ) NOT NULL DEFAULT '1'",
				'ALTER TABLE ' . $this->table_sets . " ADD  `initial_font` int( 10 ) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_sets . ' DROP COLUMN `fontpicker`',
				'ALTER TABLE ' . $this->table_settings . " ADD `size` tinyint( 1 ) unsigned NOT NULL DEFAULT '1'",
				'ALTER TABLE ' . $this->table_settings . " ADD `letterspacing` tinyint( 1 ) unsigned NOT NULL DEFAULT '1'",
				'ALTER TABLE ' . $this->table_settings . " ADD `lineheight` tinyint( 1 ) unsigned NOT NULL DEFAULT '1'",
				'ALTER TABLE ' . $this->table_settings . " ADD `fontpicker` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `sampletexts` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `alignment` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `invert` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `multiline` tinyint( 1 ) unsigned NOT NULL DEFAULT '1'",
			),
			'0.0.5' => array(
				'ALTER TABLE ' . $this->table_sets . ' DROP COLUMN `ot_liga`',
				'ALTER TABLE ' . $this->table_sets . ' DROP COLUMN `ot_dlig`',
				'ALTER TABLE ' . $this->table_sets . ' DROP COLUMN `ot_hlig`',
				'ALTER TABLE ' . $this->table_sets . ' DROP COLUMN `ot_calt`',
				'ALTER TABLE ' . $this->table_sets . ' DROP COLUMN `ot_frac`',
				'ALTER TABLE ' . $this->table_sets . ' DROP COLUMN `ot_sups`',
				'ALTER TABLE ' . $this->table_sets . ' DROP COLUMN `ot_subs`',
				'ALTER TABLE ' . $this->table_sets . " ADD `opentype` tinyint( 1 ) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `opentype` tinyint(1) unsigned NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_fonts . ' DROP COLUMN `svg`',
			)
		);

		// loop through the available update queries and execute those that are higher versions than the currently
		// database stored db version option
		foreach ( $changes as $version => $queries ) {
			// check that:
			// 1) not updating beyond what is the coded fontsampler_db_version even if there is update entries in the array
			// 2) the current version stored in the db is smaller than what we're updating to
			if ( version_compare( $version, $this->fontsampler->fontsampler_db_version ) <= 0 &&
			     version_compare( get_option( 'fontsampler_db_version' ), $version ) < 0
			) {
				foreach ( $queries as $sql ) {
					try {
						// this try catch doesn't seem to do anything, since WP throwns and prints it's own errors
						// TODO check how debug mode influences this
						// NOTE: most important though that single error (i.e. existing column or something) doesn't break
						// the entire update loop
						$res = $this->wpdb->query( $sql );
					} catch ( Exception $e ) {
						$this->msg->error( "Problem updating database to version $version. The following sql query failed: " . $sql );
					}
				}
				// bump the version number option in the options database
				$this->msg->info( "Updated database schema to $version" );
				update_option( 'fontsampler_db_version', $version );
			}
		}
		// if all executed bump the version number option in the options database to the manually entered db version
		// even if the last query was not of that high of a version (which it shouldn't)
		update_option( 'fontsampler_db_version', $this->fontsampler->fontsampler_db_version );
		$this->msg->info( 'Database schemas now up to date' );

		return true;
	}


	/**
	 * Helper to check if tables exist
	 * TODO: check if tables are in the correct structure
	 */
	function check_table_exists( $table ) {
		$this->wpdb->query( "SHOW TABLES LIKE '" . $table . "'" );

		return 0 == $this->wpdb->num_rows ? false : true;
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


	/*
	 * Read from settings table ( currently only one row with defaults )
	 */
	function get_settings( $id = 1 ) {
		$sql = 'SELECT * FROM ' . $this->table_settings . ' WHERE `id` = ' . $id;
		$res = $this->wpdb->get_row( $sql, ARRAY_A );

		// remove any empty string settings
		$res = array_filter( $res, function ( $item ) { return '' !== $item; } );

		// return that row but make sure any missing or empty settings fields get substituted from the hardcoded defaults
		$defaults = array_merge( $this->fontsampler->settings_defaults, $res );

		return $defaults;
	}


	/*
	 * Read from fontsampler sets table
	 */
	function get_sets( $offset = null, $num_rows = null, $order_by = null ) {
		// first fetch (a possibly limited amount of) fontsets
		$sql = 'SELECT * FROM ' . $this->table_sets . ' s';

		if ( is_null( $order_by ) ) {
			$sql .= ' ORDER BY s.id ASC ';
		} else {
			$sql .= $order_by;
		}

		if ( ! is_null( $offset ) && ! is_null( $num_rows ) ) {
			$sql .= ' LIMIT ' . $offset . ',' . $num_rows . ' ';
		}

		$sets = $this->wpdb->get_results( $sql, ARRAY_A );

		// now sort all the fonts attachments of each sampler to the array
		$set_with_fonts = array();
		foreach ( $sets as $set ) {
			$sql = 'SELECT f.name, f.id, ';
			foreach ( $this->fontsampler->font_formats as $format ) {
				$sql .= ' ( SELECT guid FROM ' . $this->wpdb->prefix . 'posts p 
						WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
			}
			$sql = substr( $sql, 0, - 1 );
			$sql .= ' FROM ' . $this->table_sets . ' s
					LEFT JOIN ' . $this->table_join . ' j
					ON s.id = j.set_id
					LEFT JOIN ' . $this->table_fonts . ' f
					ON f.id = j.font_id
					WHERE j.set_id = ' . intval( $set['id'] ) . '
					ORDER BY j.`order` ASC';

			$set['fonts'] = $this->wpdb->get_results( $sql, ARRAY_A );
			array_push( $set_with_fonts, $set );

		}

		return $set_with_fonts;
	}


	function get_set( $id, $including_fonts = true ) {
		$sql = 'SELECT * FROM ' . $this->table_sets . ' s
				WHERE s.id = ' . $id;
		$set = $this->wpdb->get_row( $sql, ARRAY_A );

		if ( 0 == $this->wpdb->num_rows ) {
			return false;
		}

		if ( ! $including_fonts ) {
			// generate order array with rows of arrays of ui fields, remove any fields from the ui_order string that
			// are in fact not enabled in this set
			$set['ui_order_parsed'] = $this->parse_ui_order(
				$this->prune_ui_order( $set['ui_order'], $set )
			);

			return $set;
		}

		$sql = 'SELECT f.id, f.name, ';
		foreach ( $this->fontsampler->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->wpdb->prefix . 'posts p 
					WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
		}
		$sql = substr( $sql, 0, - 1 );
		$sql .= ' FROM ' . $this->table_sets . ' s
				LEFT JOIN ' . $this->table_join . ' j
				ON s.id = j.set_id
				LEFT JOIN ' . $this->table_fonts . ' f
				ON f.id = j.font_id
				WHERE j.set_id = ' . intval( $id ) . '
				ORDER BY j.`order` ASC';

		$set['fonts']           = $this->wpdb->get_results( $sql, ARRAY_A );
		$set['ui_order_parsed'] = $this->helpers->parse_ui_order(
			$this->helpers->prune_ui_order( $set['ui_order'], $set )
		);

		return $set;
	}


	/*
	 * read font files from Wordpress attachements
	 */
	function get_fontfile_posts() {
		$sql = 'SELECT *, ';
		foreach ( $this->fontsampler->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->wpdb->prefix . 'posts p 
					WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
		}
		$sql = substr( $sql, 0, - 1 );
		$sql .= ' FROM ' . $this->table_fonts . ' f ';
		$result = $this->wpdb->get_results( $sql, ARRAY_A );

		return 0 == $this->wpdb->num_rows ? false : $result;
	}


	/**
	 * Read all fonts and formats for fontsampler with $set_id
	 */
	function get_fontset_for_set( $set_id ) {
		$sql = 'SELECT f.id, f.name, ';
		foreach ( $this->fontsampler->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->wpdb->prefix . 'posts p 
					WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
		}
		$sql = substr( $sql, 0, - 1 );
		$sql .= ' FROM ' . $this->table_fonts . ' f
		        LEFT JOIN ' . $this->table_join . ' j
		        ON j.font_id = f.id
				WHERE j.set_id = ' . intval( $set_id ) . ' AND f.id IS NOT NULL
				ORDER BY j.`order` ASC';
		$result = $this->wpdb->get_results( $sql, ARRAY_A );

		return 0 == $this->wpdb->num_rows ? false : $result;
	}


	function get_fontset( $font_id, $sorted = true ) {
		$sql = 'SELECT f.id, f.name, ';
		foreach ( $this->fontsampler->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->wpdb->prefix . 'posts p 
					WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
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
		$result = $this->wpdb->get_results( $sql, ARRAY_A );

		return 0 == $this->wpdb->num_rows ? false : $result[0];
	}


	/*
	 * Read all sets of fonts with font files
	 */
	function get_fontsets( $offset = 0, $num_rows = 25, $order_by = null ) {
		$sql = 'SELECT f.id, f.name, ';
		foreach ( $this->fontsampler->font_formats as $format ) {
			$sql .= ' ( SELECT guid FROM ' . $this->wpdb->prefix . 'posts p 
					WHERE p.ID = f.' . $format . ' ) AS ' . $format . ',';
		}
		$sql = substr( $sql, 0, - 1 );
		$sql .= ' FROM ' . $this->table_fonts . ' f ';

		if ( is_null( $order_by ) ) {
			$sql .= ' ORDER BY f.name ASC ';
		} else {
			$sql .= $order_by;
		}

		$sql .= ' LIMIT ' . $offset . ',' . $num_rows . ' ';

		$result = $this->wpdb->get_results( $sql, ARRAY_A );

		return 0 == $this->wpdb->num_rows ? false : $result;
	}


	function count_fontsets() {
		$sql = 'SELECT COUNT(*) FROM ' . $this->table_fonts;

		return $this->wpdb->get_var( $sql );
	}


	/**
	 * Get the first (first X) character of the fontset names in order
	 *
	 * @param null $order_by : optional ORDER BY clause
	 *
	 * @return mixed: Array of rows with only field 'initial'
	 */
	function get_fontsets_initials( $order_by = null ) {
		$sql = 'SELECT SUBSTRING( `name`, 1, 1 ) AS label FROM ' . $this->table_fonts;

		if ( is_null( $order_by ) ) {
			$sql .= ' ORDER BY `name` ASC ';
		} else {
			$sql .= $order_by;
		}

		return $this->wpdb->get_results( $sql, ARRAY_A );
	}


	function get_samples_ids( $order_by = null ) {
		$sql = 'SELECT `id` AS label FROM ' . $this->table_sets;

		if ( is_null( $order_by ) ) {
			$sql .= ' ORDER BY `id` ASC';
		} else {
			$sql .= $order_by;
		}

		return $this->wpdb->get_results( $sql, ARRAY_A );
	}


	/**
	 * Helper function that updates all fontsampler sets with the new (default) options just saved
	 *
	 * @param $options
	 */
	function update_defaults( $options ) {
		// write all new default options to the corresponding columns in the sets
		$data = array_intersect_key( $options, array_flip( $this->fontsampler->default_features ) );
		$this->wpdb->update( $this->table_sets, $data, array( 'default_features' => '1' ) );

		// a bit clumsily with second update, but need to first have all fields in sync
		// update the generated ui_order column so that editing the fontsampler the UI layout is reflected to match
		// the current defaults
		foreach ( $this->get_sets() as $set ) {
			$data = array(
				'ui_order' => $this->fontsampler->helpers->concat_ui_order(
					$this->fontsampler->helpers->ui_order_parsed_from( $options, $set )
				)
			);
			$this->wpdb->update( $this->table_sets, $data, array( 'default_features' => '1' ) );
		}
	}


	function update_settings( $data, $id ) {
		$res = $this->wpdb->update( $this->table_settings, $data, array( 'id' => $id ) );

		return $res !== false ? true : false;
	}


	function insert_font( $data ) {
		$res = $this->wpdb->insert( $this->table_fonts, $data );

		return $res ? $this->wpdb->insert_id : false;
	}

	function update_font( $data, $id ) {
		$res = $this->wpdb->update( $this->table_fonts, $data, array( 'id' => $id ) );

		return $res !== false ? true : false;
	}

	function delete_font( $id ) {
		$this->wpdb->delete( $this->table_fonts, array( 'id' => $id ) );

		return true;
	}


	function insert_set( $data ) {
		$res = $this->wpdb->insert( $this->table_sets, $data );

		return $res ? $this->wpdb->insert_id : false;
	}

	function update_set( $data, $id ) {
		$res = $this->wpdb->update( $this->table_sets, $data, array( 'id' => $id ) );

		return $res !== false ? true : false;
	}

	function delete_set( $id ) {
		$this->wpdb->delete( $this->table_join, array( 'set_id' => $id ) );
		$this->wpdb->delete( $this->table_sets, array( 'id' => $id ) );

		return true;
	}


	function insert_join( $data ) {
		$res = $this->wpdb->insert( $this->table_join, $data );

		return $res ? $this->wpdb->insert_id : false;
	}

	function delete_join( $data ) {
		$this->wpdb->delete( $this->table_join, $data );

		return true;
	}


	function get_insert_id() {
		return $this->wpdb->insert_id;
	}
}