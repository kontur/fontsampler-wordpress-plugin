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
	private $layout;
	private $settings_data_cols;

	function __construct( $wpdb, $fontsampler ) {
		$this->wpdb = $wpdb;

		$this->table_sets     = $this->wpdb->prefix . 'fontsampler_sets';
		$this->table_fonts    = $this->wpdb->prefix . 'fontsampler_fonts';
		$this->table_join     = $this->wpdb->prefix . 'fontsampler_sets_x_fonts';
		$this->table_settings = $this->wpdb->prefix . 'fontsampler_settings';

		$this->fontsampler = $fontsampler;
		$this->helpers     = new FontsamplerHelpers( $fontsampler );
		$this->layout      = new FontsamplerLayout();
	}

	/*
	 * setup fontsampler sets table
	 */
	function create_table_sets() {
		$sql = "CREATE TABLE " . $this->table_sets . " (
                `id` int( 11 ) unsigned NOT NULL AUTO_INCREMENT,
                `name` varchar( 255 ) NOT NULL DEFAULT '',
                `initial_font` int( 10 ) unsigned DEFAULT NULL,
                `use_defaults` tinyint(1) unsigned DEFAULT 0,
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
			`settings_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
			`is_default` tinyint(1) unsigned DEFAULT 0,
			`set_id` tinyint(1) unsigned DEFAULT NULL,
			`initial` text DEFAULT NULL,
			`is_ltr` tinyint( 1 ) DEFAULT 1,
			`ui_order` VARCHAR( 255 ) DEFAULT NULL,
			`ui_columns` tinyint( 1 ) DEFAULT NULL,
			`fontsize` tinyint(1) unsigned DEFAULT NULL,
			`letterspacing` tinyint(1) unsigned DEFAULT NULL,
			`lineheight` tinyint(1) unsigned DEFAULT NULL,
			`sampletexts` tinyint(1) unsigned DEFAULT NULL,
			`alignment` tinyint(1) unsigned DEFAULT NULL,
			`invert` tinyint(1) unsigned DEFAULT NULL,
			`multiline` tinyint(1) unsigned DEFAULT NULL,
			`opentype` tinyint(1) unsigned DEFAULT NULL,
			`fontpicker` tinyint( 1 ) unsigned DEFAULT NULL,
            `buy` VARCHAR( 255 ) DEFAULT NULL,
			`specimen` VARCHAR( 255 ) DEFAULT NULL,
			`buy_label` VARCHAR(255) DEFAULT NULL,
			`buy_image` int( 11 ) unsigned DEFAULT NULL,
			`buy_url` VARCHAR( 255 ) DEFAULT NULL,
			`buy_type` VARCHAR( 5 ) NULL DEFAULT 'label',
			`buy_target` VARCHAR(10) DEFAULT NULL,
			`specimen_label` VARCHAR(255) DEFAULT NULL,
			`specimen_image` int( 11 ) unsigned DEFAULT NULL,
			`specimen_url` VARCHAR( 255 ) DEFAULT NULL,
			`specimen_type` VARCHAR( 5 ) NULL DEFAULT 'label',
			`specimen_target` VARCHAR(10) DEFAULT NULL,
			`fontsize_label` varchar(50) DEFAULT NULL,
			`fontsize_initial` smallint(5) unsigned DEFAULT NULL,
			`fontsize_min` smallint(5) unsigned DEFAULT NULL,
			`fontsize_max` smallint(5) unsigned DEFAULT NULL,
			`fontsize_unit` varchar(50) DEFAULT NULL,
			`letterspacing_label` varchar(50) DEFAULT NULL,
			`letterspacing_initial` tinyint(5) DEFAULT NULL,
			`letterspacing_min` tinyint(3) DEFAULT NULL,
			`letterspacing_max` tinyint(3) DEFAULT NULL,
			`letterspacing_unit` varchar(50) DEFAULT NULL,
			`lineheight_label` varchar(50) DEFAULT NULL,
			`lineheight_initial` smallint(5) DEFAULT NULL,
			`lineheight_min` smallint(5) DEFAULT NULL,
			`lineheight_max` smallint(5) DEFAULT NULL,
			`lineheight_unit` varchar(50) DEFAULT NULL,
			`alignment_initial` varchar(50) DEFAULT NULL,
			`sample_texts` text DEFAULT NULL,
			`sample_texts_default_option` VARCHAR(255) DEFAULT NULL,
			`locl` tinyint(1) unsigned DEFAULT NULL,
			`locl_options` text DEFAULT NULL,
			`locl_default_option` VARCHAR(255) DEFAULT NULL,
			`notdef` smallint(5) DEFAULT NULL,
			`css_color_text` tinytext DEFAULT NULL,
			`css_color_background` tinytext DEFAULT NULL,
			`css_color_label` tinytext DEFAULT NULL,
			`css_value_size_label` tinytext DEFAULT NULL,
			`css_value_fontfamily_label` tinytext DEFAULT NULL,
			`css_value_lineheight_label` tinytext DEFAULT NULL,
			`css_color_button_background` tinytext DEFAULT NULL,
			`css_color_button_background_inactive` tinytext DEFAULT NULL,
			`css_color_highlight` tinytext DEFAULT NULL,
			`css_color_highlight_hover` tinytext DEFAULT NULL,
			`css_color_line` tinytext DEFAULT NULL,
			`css_color_handle` tinytext DEFAULT NULL,
			`css_value_column_gutter` tinytext DEFAULT NULL,
			`css_value_row_height` tinytext DEFAULT NULL,
			`css_value_row_gutter` tinytext DEFAULT NULL,
			`css_color_notdef` tinytext DEFAULT NULL,
			PRIMARY KEY (`settings_id`)
			) DEFAULT CHARSET=utf8";
		$this->wpdb->query( $sql );

		$this->set_default_settings();
	}

	/**
	 * Insert or reset the default settings
	 */
	function set_default_settings() {
		$data               = $this->fontsampler->settings_defaults;
		$data['is_default'] = 1;
		if ( false !== $this->get_default_settings() ) {
			$this->wpdb->delete( $this->table_settings, array( 'is_default' => 1 ) );
		}
		$this->wpdb->insert( $this->table_settings, $data );

		return true;
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
			),
			'0.1.1' => array(
				'ALTER TABLE ' . $this->table_settings . " ADD `buy_label` VARCHAR(255) DEFAULT 'Buy'",
				'ALTER TABLE ' . $this->table_settings . " ADD `buy_image` int( 11 ) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `specimen_label` VARCHAR(255) DEFAULT 'Specimen'",
				'ALTER TABLE ' . $this->table_settings . " ADD `specimen_image` int( 11 ) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `fontpicker` tinyint( 1 ) NOT NULL DEFAULT '0'",
				'ALTER TABLE ' . $this->table_settings . " ADD `css_column_gutter` tinytext NOT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `css_row_height` tinytext NOT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `css_row_gutter` tinytext NOT NULL",
				'ALTER TABLE ' . $this->table_sets . " ADD `buy` VARCHAR(255) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_sets . " ADD `specimen` VARCHAR(255) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_sets . " ADD `ui_columns` tinyint( 1 ) NOT NULL DEFAULT '3'",
				'ALTER TABLE ' . $this->table_sets . " ADD `fontpicker` tinyint( 1 ) NOT NULL DEFAULT '0'",
			),
			'0.1.2' => array(
				'ALTER TABLE ' . $this->table_settings . " ADD `alignment_initial` varchar(50) NOT NULL DEFAULT 'left'",
			),
			// 0.2.0 sees a major DB refactoring; let's here first do those migrations that we can
			// before transferring some more data explicitly later in the foreach loop below
			'0.2.0' => array(
				// remove this leftover
				'ALTER TABLE ' . $this->table_sets . " DROP `default_options`",

				// this added instead
				'ALTER TABLE ' . $this->table_sets . " ADD `use_defaults` tinyint(1) unsigned DEFAULT 0",

				// change the id field name to not interfere with the now more common joins
				'ALTER TABLE ' . $this->table_settings . " CHANGE `id` `settings_id` int(11) unsigned NOT NULL AUTO_INCREMENT",

				// add these fields from sets to settings
				'ALTER TABLE ' . $this->table_settings . " ADD `set_id` tinyint(1) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `initial` text DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `is_ltr` tinyint( 1 ) DEFAULT 1",
				'ALTER TABLE ' . $this->table_settings . " ADD `ui_order` VARCHAR( 255 ) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `ui_columns` tinyint( 1 ) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `buy` VARCHAR( 255 ) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `buy_url` VARCHAR( 255 ) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `buy_type` VARCHAR( 5 ) NULL DEFAULT 'label'",
				'ALTER TABLE ' . $this->table_settings . " ADD `specimen` VARCHAR( 255 ) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `specimen_url` VARCHAR( 255 ) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `specimen_type` VARCHAR( 5 ) NULL DEFAULT 'label'",
				'ALTER TABLE ' . $this->table_settings . " ADD `is_default` tinyint(1) unsigned DEFAULT 0",

				// change the defaults to allow NULL for existing settings fields
				'ALTER TABLE ' . $this->table_settings . " CHANGE `font_size_label` `fontsize_label` varchar(50) NULL DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `font_size_initial` `fontsize_initial` smallint(5) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `font_size_min` `fontsize_min` smallint(5) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `font_size_max` `fontsize_max` smallint(5) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `font_size_unit` `fontsize_unit` varchar(50) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `letter_spacing_label` `letterspacing_label` varchar(50) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `letter_spacing_initial` `letterspacing_initial` tinyint(5) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `letter_spacing_min` `letterspacing_min` tinyint(3) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `letter_spacing_max` `letterspacing_max` tinyint(3) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `letter_spacing_unit` `letterspacing_unit` varchar(50) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `line_height_label` `lineheight_label` varchar(50) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `line_height_initial` `lineheight_initial` smallint(5) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `line_height_min` `lineheight_min` smallint(5) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `line_height_max` `lineheight_max` smallint(5) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `line_height_unit` `lineheight_unit` varchar(50) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `alignment_initial` `alignment_initial` varchar(50) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `sample_texts` `sample_texts` text DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_color_text` `css_color_text` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_color_background` `css_color_background` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_color_label` `css_color_label` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_size_label` `css_value_size_label` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_fontfamily_label` `css_value_fontfamily_label` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_color_highlight` `css_color_highlight` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_color_highlight_hover` `css_color_highlight_hover` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_color_line` `css_color_line` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_color_handle` `css_color_handle` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " DROP `css_color_icon_active`",
				'ALTER TABLE ' . $this->table_settings . " DROP `css_color_icon_inactive`",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_column_gutter` `css_value_column_gutter` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_row_height` `css_value_row_height` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `css_row_gutter` `css_value_row_gutter` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `buy_label` `buy_label` VARCHAR(255) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `specimen_label` `specimen_label` VARCHAR(255) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `sampletexts` `sampletexts` tinyint(1) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `alignment` `alignment` tinyint(1) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `invert` `invert` tinyint(1) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `multiline` `multiline` tinyint(1) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `opentype` `opentype` tinyint(1) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `size` `fontsize` tinyint(1) unsigned DEFAULT NULL",

				// currently in the settings table is only the default, so set it that way
				'UPDATE ' . $this->table_settings . " SET is_default = 1, set_id = NULL, ui_columns = 3",
			),
			'0.2.4' => array(
				'ALTER TABLE ' . $this->table_settings . " CHANGE `letterspacing` `letterspacing` tinyint(1) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `lineheight` `lineheight` tinyint(1) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " CHANGE `fontpicker` `fontpicker` tinyint(1) unsigned DEFAULT NULL",

				'ALTER TABLE ' . $this->table_settings . " ADD `css_color_button_background` tinytext DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `css_value_lineheight_label` tinytext DEFAULT NULL",
				'UPDATE ' . $this->table_settings . " SET `css_color_button_background` = '#efefef', `css_value_lineheight_label` = 'normal' WHERE `is_default` = 1",
			),
			'0.2.6' => array(
				'ALTER TABLE ' . $this->table_settings . " ADD `buy_target` VARCHAR(10) DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `specimen_target` VARCHAR(10) DEFAULT NULL",
				'UPDATE ' . $this->table_settings . " SET `buy_target` = '_blank', `specimen_target` = '_blank' WHERE `is_default` = 1",

				'ALTER TABLE ' . $this->table_settings . " ADD `css_color_button_background_inactive` tinytext DEFAULT NULL",
				'UPDATE ' . $this->table_settings . " SET `css_color_button_background_inactive` = '#dfdfdf' WHERE `is_default` = 1",
			),
			'0.4.0' => array(
				// add default text for the sample texts dropdown, which can now also be overwritten
				'ALTER TABLE ' . $this->table_settings . " ADD `sample_texts_default_option` VARCHAR(255) DEFAULT NULL",
				'UPDATE ' . $this->table_settings . " SET `sample_texts_default_option` = 'Select a sample text' WHERE `is_default` = 1",

				// language dropdown for locl feature display
				'ALTER TABLE ' . $this->table_settings . " ADD `locl` tinyint(1) unsigned DEFAULT NULL",
				'ALTER TABLE ' . $this->table_settings . " ADD `locl_options` text DEFAULT NULL",
				'UPDATE ' . $this->table_settings . " SET `locl` = 0 WHERE `is_default` = 1",
				'ALTER TABLE ' . $this->table_settings . " ADD `locl_default_option` VARCHAR(255) DEFAULT NULL",
				'UPDATE ' . $this->table_settings . " SET `locl_default_option` = 'Select language' WHERE `is_default` = 1",

				// option for notdef characters
				'ALTER TABLE ' . $this->table_settings . " ADD `notdef` smallint(5) DEFAULT NULL",
				'UPDATE ' . $this->table_settings . " SET `notdef` = 0 WHERE `is_default` = 1",

				// color highlight for notdef characters
				'ALTER TABLE ' . $this->table_settings . " ADD `css_color_notdef` tinytext DEFAULT NULL",
				'UPDATE ' . $this->table_settings . " SET `css_color_notdef` = '#dedede' WHERE `is_default` = 1",
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
						$this->wpdb->query( $sql );
						if ( $this->wpdb->last_error ) {
							$this->fontsampler->msg->add_error( $this->wpdb->last_error . '<br>' . $this->wpdb->last_query );
						}
					} catch ( Exception $e ) {
						$this->fontsampler->msg->add_error( "Problem updating database to version $version. The following sql query failed: " . $sql );
						$this->fontsampler->msg->add_error( $this->wpdb->print_error() );
					}
				}


				// for update to 0.2.0 we need to do a little more transforms:
				if ( '0.2.0' === $version ) {
					$this->migrate_db_0_2_0();
				}

				// bump the version number option in the options database
				$this->fontsampler->msg->add_info( "Updated database schema to $version" );
				update_option( 'fontsampler_db_version', $version );
			}
		}

		// further generate a new settings css file (the update might have changed the less, so re-apply any
		// stored css values to that less and generate the current css from it
		$this->fontsampler->helpers->write_css_from_settings( $this->get_settings() );

		// if all executed bump the version number option in the options database to the manually entered db version
		// even if the last query was not of that high of a version (which it shouldn't)
		update_option( 'fontsampler_db_version', $this->fontsampler->fontsampler_db_version );
		$this->fontsampler->msg->add_info( 'Database schemas now up to date' );
	}


	/**
	 * For the transition from < 0.2.0 some more additional db transforms are required
	 */
	function migrate_db_0_2_0() {
		$sql = "SELECT * FROM " . $this->table_sets;
		$res = $this->wpdb->get_results( $sql, ARRAY_A );

		// iterate through all fontsampler sets and move their settings from the sets row to the linked settings row
		// finally remove unneeded columns from sets table
		if ( ! empty( $res ) ) {
			foreach ( $res as $row ) {
				$row['set_id'] = $row['id'];

				// some field renamings:
				$row['fontsize'] = $row['size'];

				// if < 0.2.0 "default_features" were selected, remove those fields from the set so that they will be NULL and
				// thus get replaced with the is_default values when retrieved later on
				if ( 1 == $row['default_features'] ) {
					unset( $row['fontsize'], $row['letterspacing'], $row['lineheight'], $row['sampletexts'], $row['alignment'],
						$row['invert'], $row['multiline'], $row['opentype'], $row['fontpicker'], $row['buy'], $row['specimen'] );
				}

				// these fields no longer used or not going to settings table
				unset( $row['id'], $row['name'], $row['default_features'],
					$row['initial_font'], $row['size'], $row['letterspacing'], $row['lineheight'],
					$row['use_defaults'] );

				// add each previous set's data to the settings table
				try {
					$this->wpdb->insert( $this->table_settings, $row );
					if ( $this->wpdb->last_error ) {
						$this->fontsampler->msg->add_error( $this->wpdb->last_error . '<br>' . $this->wpdb->last_query );
					}
					//echo $this->wpdb->last_query;
					$this->fontsampler->msg->add_notice( 'Migrated Fontsampler ' . $row['set_id'] . ' to 0.2.0' );
				} catch ( Exception $e ) {
					$this->fontsampler->msg->add_error( "Problem updating database to version 0.2.0. The following sql query failed: " . $sql );
				}
			}

			// delete these fields from the original "sets" table as those are now managed via the settings table
			$drop = array(
				'initial',
				'size',
				'letterspacing',
				'lineheight',
				'sampletexts',
				'alignment',
				'invert',
				'multiline',
				'opentype',
				'is_ltr',
				'fontpicker',
				'ui_order',
				'ui_columns',
				'default_features',
				'buy',
				'specimen'
			);

			foreach ( $drop as $field ) {
				try {
					$sql = "ALTER TABLE " . $this->table_sets . " DROP " . $field;
					$this->wpdb->query( $sql );
				} catch ( Exception $e ) {
					$this->fontsampler->msg->add_error( "Problem updating database to version 0.2.0. The following sql query failed: " . $sql );
				}
			}
		}
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
	 * Without params this returns the DEFAULTS
	 * With $id param supplied returns that settings row (although by itself that is not very useful)
	 */
	function get_settings( $id = false ) {
		if ( false === $id ) {
			return $this->get_default_settings();
		}

		$sql      = 'SELECT * FROM ' . $this->table_settings . ' WHERE `settings_id` = ' . $id . ' LIMIT 1';
		$settings = $this->wpdb->get_row( $sql, ARRAY_A );

		if ( empty( $settings ) ) {
			return false;
		}

		if ( 1 === $settings['is_default'] ) {
			return $settings;
		}

		return $this->settings_substitute_defaults( $settings );
	}


	/**
	 * @param $settings - associative array of settings row
	 *
	 * @return array - same settings, all NULL values replaced with defaults, if such existed
	 */
	function settings_substitute_defaults( $settings ) {
		// if the passed in settings row happens to be the defaults row just throw it back
		if ( 1 === $settings['is_default'] ) {
			return $settings;
		}

		// replace all NULL values in the retrieved settings with the defaults
		$defaults = $this->get_default_settings();
		$merged   = array();

		// if no defaults are defined, just do nothing and return as such
		if ( ! $defaults ) {
			return $settings;
		}

		// return that row but make sure any missing or empty settings fields get substituted from the hardcoded defaults
		foreach ( $settings as $key => $value ) {
			if ( null === $value ) {
				if ( null !== $defaults[ $key ] ) {
					$merged[ $key ] = $defaults[ $key ];
				}
			}
		}

		return $merged;
	}


	/**
	 * @return bool|array - returns the settings row marked as is_default
	 */
	function get_default_settings() {
		$sql      = 'SELECT * FROM ' . $this->table_settings . ' WHERE `is_default` = 1 LIMIT 1';
		$defaults = $this->wpdb->get_row( $sql, ARRAY_A );

		if ( empty( $defaults ) ) {
			return false;
		}

		// when we get the defaults, we don't want to manipulate the db row, but use only the values
		// remove db "references"
		unset( $defaults['settings_id'] );
		unset( $defaults['set_id'] );

		return $defaults;
	}


	/*
	 * Read from fontsampler sets table
	 */
	function get_sets( $offset = null, $num_rows = null, $order_by = null ) {
		// first fetch (a possibly limited amount of) fontsets
		$sql = 'SELECT * FROM ' . $this->table_sets . ' s
				LEFT JOIN ' . $this->table_settings . ' settings
				ON s.id = settings.set_id ';

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

			// if this set uses default features, the join clause returned a bunch of NULL values
			// supplement those with the actual defaults, so they are available
			if ( intval( $set['use_defaults'] ) === 1 ) {
				$set = array_merge( $set, $this->get_default_settings() );
			}

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
				LEFT JOIN ' . $this->table_settings . ' settings
				ON s.id = settings.set_id
				WHERE s.id = ' . $id;
		$set = $this->wpdb->get_row( $sql, ARRAY_A );

		if ( 0 == $this->wpdb->num_rows ) {
			return false;
		}

		// if this set uses default features, the join clause returned a bunch of NULL values
		// supplement those with the actual defaults, so they are available
		if ( intval( $set['use_defaults'] ) === 1 ) {
			$set = array_merge( $set, $this->get_default_settings() );
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

		$set['fonts'] = $this->wpdb->get_results( $sql, ARRAY_A );

		if ( sizeof( $set['fonts'] ) > 1 ) {
			$set['fontpicker'] = 1;
		}

		return $set;
	}


	function get_sets_missing_fonts() {
		$sets    = $this->get_sets();
		$missing = array();
		foreach ( $sets as $set ) {
			if ( empty( $set['fonts'] ) ) {
				array_push( $missing, $set );
			}
		}

		return empty( $missing ) ? false : $missing;
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
			$sql .= 'f.' . $format . ' AS ' . $format . '_id,';
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


	function get_fontset_raw( $font_id ) {
		$sql    = 'SELECT * FROM ' . $this->table_fonts . ' WHERE `id`=' . $font_id . ' LIMIT 1';
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


	function get_fontsets_missing_files() {
		$fonts   = $this->get_fontsets();
		$missing = array();
		if ( false !== $fonts ) {
			foreach ( $fonts as $font ) {
				$all_empty = true;
				foreach ( $this->fontsampler->font_formats as $format ) {
					if ( ! empty( $font[ $format ] ) ) {
						$all_empty = false;
					}
				}
				if ( $all_empty ) {
					array_push( $missing, $font );
				}
			}
		}

		return empty( $missing ) ? false : $missing;
	}


	function get_fontsets_missing_name() {
		$fonts   = $this->get_fontsets();
		$missing = array();
		if ( false !== $fonts ) {
			foreach ( $fonts as $font ) {
				if ( empty( $font['name'] ) ) {
					array_push( $missing, $font );
				}
			}
		}

		return empty( $missing ) ? false : $missing;
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
		return;

		// write all new default options to the corresponding columns in the sets
		$data = array_intersect_key( $options, array_flip( $this->fontsampler->default_features ) );
		$this->wpdb->update( $this->table_sets, $data, array( 'default_features' => '1' ) );

		// a bit clumsily with second update, but need to first have all fields in sync
		// update the generated ui_order column so that editing the fontsampler the UI layout is reflected to match
		// the current defaults
		foreach ( $this->get_sets() as $set ) {
			$data = array(
				'ui_order' => $this->layout->sanitizeString( $set['ui_order'], $set )
			);
			$this->wpdb->update( $this->table_sets, $data, array( 'id' => $set['id'], 'default_features' => '1' ) );
		}
	}


	function insert_settings( $data ) {
		$res = $this->wpdb->insert( $this->table_settings, $data );

		return $res !== false ? true : false;
	}


	function update_settings( $data, $id = false ) {
		$where = array();
		if ( false === $id ) {
			$where['is_default'] = '1';
		} else {
			$where['set_id'] = $id;
		}
		$res = $this->wpdb->update( $this->table_settings, $data, $where );

		return $res !== false ? true : false;
	}


	function save_settings_for_set( $data, $set_id ) {
		// check if this set has a settings row, if so update, if not, insert
		$count = $this->wpdb->get_var( "SELECT COUNT(*) FROM " . $this->table_settings . " WHERE set_id = $set_id" );
		if ( intval( $count ) !== 0 ) {
			$where = array( 'set_id' => $set_id );
			$res   = $this->wpdb->update( $this->table_settings, $data, $where );
		} else {
			$data['set_id'] = $set_id;
			$res            = $this->wpdb->insert( $this->table_settings, $data );
		}
	}


	function delete_settings_for_set( $set_id ) {
		$this->wpdb->delete( $this->table_settings, array( 'set_id' => $set_id ) );

		return true;
	}


	function fix_settings_from_defaults() {
		$settings = $this->get_default_settings();
		unset( $settings['is_default'] );

		foreach ( $settings as $key => $value ) {
			$value_empty       = null === $value || "" === $value;
			$default_not_empty = in_array( $key, $this->fontsampler->settings_defaults )
			                     && null !== $this->fontsampler->settings_defaults[ $key ];
			if ( $value_empty && $default_not_empty ) {
				$settings[ $key ] = $this->fontsampler->settings_defaults[ $key ];
			}
		}
		$this->update_settings( $settings );

		return true;
	}


	function get_default_settings_errors() {
		$settings = $this->get_default_settings();
		unset( $settings['is_default'] );

		$problems = array();
		if ($settings) {
			foreach ( $settings as $key => $value ) {
				$value_empty       = null === $value || "" === $value;
				$default_not_empty = in_array( $key, $this->fontsampler->settings_defaults )
									&& null !== $this->fontsampler->settings_defaults[ $key ];
				if ( $value_empty && $default_not_empty ) {
					array_push( $problems, $key );
				}
			}
		}

		return sizeof( $problems ) !== 0 ? $problems : false;
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