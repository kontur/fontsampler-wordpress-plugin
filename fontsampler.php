<?php
/*
Plugin Name: Fontsampler
Plugin URI:  https://github.com/kontur/fontsampler-wordpress-plugin
Description: Create editable webfont previews via shortcodes
Version:     0.0.5
Author:      Johannes Neumeier
Author URI:  http://johannesneumeier.com
Copyright:   Copyright 2016 Johannes Neumeier
Text Domain: fontsampler
*/
error_reporting(E_ALL);
defined( 'ABSPATH' ) or die( 'Nope.' );


require_once( 'FontsamplerPagination.php' );
require_once( 'FontsamplerMessages.php' );
require_once( 'FontsamplerDatabase.php' );
require_once( 'FontsamplerHelpers.php' );

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

	public $font_formats;
	public $settings_defaults;
	public $font_formats_legacy;

	private $boolean_options;
	private $default_features;
	private $fontsampler_db_version;
	private $admin_hide_legacy_formats;

	// helper classes
	private $msg;
	private $db;
	private $helpers;

	const FONTSAMPLER_OPTION_DB_VERSION = 'fontsampler_db_version';
	const FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS = 'fontsampler_hide_legacy_formats';

	function Fontsampler( $wpdb ) {

		// keep track of db versions and migrations via this
		// simply set this to the current PLUGIN VERSION number when bumping it
		// i.e. a database update always bumps the version number of the plugin as well
		$this->fontsampler_db_version = '0.0.5';
		$current_db_version = get_option( self::FONTSAMPLER_OPTION_DB_VERSION );

		// if no previous db version has been registered assume new install and set to v 0.0.1 which was the "last"
		// version install without the db option
		if ( ! $current_db_version ) {
			add_option( self::FONTSAMPLER_OPTION_DB_VERSION, '0.0.1' );
			$current_db_version = '0.0.1';
		}
		if ( version_compare( $current_db_version, $this->fontsampler_db_version ) < 0 ) {
			$this->migrate_db();
		}


		// check if to display legacy formats or not
		$option_legacy_formats = get_option( self::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS );

		// set the option in the db, if it's unset; default to hiding the legacy formats
		if ( $option_legacy_formats === false ) {
			add_option( self::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS, '1');
			$this->admin_hide_legacy_formats = 1;
		} else {
			$this->admin_hide_legacy_formats = $option_legacy_formats;
		}


		// TODO combined default_features and boolean options as array of objects
		// with "isBoolean" attribute
		$this->boolean_options = array(
			'size',
			'letterspacing',
			'lineheight',
			'sampletexts',
			'alignment',
			'invert',
			'opentype',
		);
		$this->default_features = array(
			'size',
			'letterspacing',
			'lineheight',
			'sampletexts',
			'alignment',
			'invert',
			'multiline',
			'opentype',
		);
		// note: font_formats order matters: most preferred to least preferred
		// note: so far no feature detection and no fallbacks, so woff2 last until fixed
		$this->font_formats = array( 'woff', 'ttf', 'eot', 'woff2' );
		$this->font_formats_legacy = array( 'eot', 'ttf' );

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
			'opentype'                  => 0,
		);


		$this->db = new FontsamplerDatabase( $wpdb, $this );
		$this->msg = new FontsamplerMessages();
		$this->helpers = new FontsamplerHelpers( $this );
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
		if ( 0 != $attributes['id'] ) {
			$set   = $this->get_set( intval( $attributes['id'] ) );
			$fonts = $this->get_best_file_from_fonts( $this->get_fontset_for_set( intval( $attributes['id'] ) ) );

			if ( false == $set || false == $fonts ) {
				if ( current_user_can( 'edit_posts' ) || current_user_can( 'edit_pages' ) ) {
					return '<div><strong>The typesampler with ID ' . $attributes['id'] . ' can not be displayed because some files or the type sampler set are missing!</strong> <em>You are seeing this notice because you have rights to edit posts - regular users will see an empty spot here.</em></div>';
				} else {
					return '<!-- typesampler #' . $attributes['id'] . ' failed to render -->';
				}
			}

			$defaults = $this->get_settings();

			// some of these get overwritten from defaults, but list them all here explicitly
			$replace = array_merge( $set, $this->settings_defaults, $defaults );

			$script_url = preg_replace("/^http\:\/\/[^\/]*/", "", plugin_dir_url( __FILE__ ) );

			$initialFont = isset( $fonts[ $set[ 'initial_font' ] ] ) ? $fonts[$set['initial_font']] : false;

			$settings = $this->get_settings();

			// buffer output until return
			ob_start();
			?>
			<script> var fontsamplerBaseUrl = '<?php echo $script_url; ?>'; </script>
			<div class='fontsampler-wrapper on-loading'
			     data-fonts='<?php echo implode(',', $fonts); ?>'
				<?php if ($initialFont) : ?>
				 data-initial-font='<?php echo $initialFont; ?>'
				 <?php endif; ?>
			>
			<?php


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
		wp_enqueue_script( 'require-js', plugin_dir_url( __FILE__ ) . 'js/libs/requirejs/require.js' );
		wp_enqueue_script( 'main-js', plugin_dir_url( __FILE__ ) . 'js/main.js');
		wp_enqueue_style( 'fontsampler-css', $this->get_css_file() );
	}


	/*
	 * Register scripts and styles needed in the admin panel
	 */
	function fontsampler_admin_enqueues() {
		wp_enqueue_script( 'fontsampler-js', plugin_dir_url( __FILE__ ) . 'js/libs/jquery-fontsampler/dist/jquery.fontsampler.js', array( 'jquery' ) );
		wp_enqueue_script( 'fontsampler-rangeslider-js', plugin_dir_url( __FILE__ ) . 'js/libs/rangeslider.js/dist/rangeslider.js', array( 'jquery' ) );
		wp_enqueue_script( 'fontsampler-preview-js', plugin_dir_url( __FILE__ ) . 'js/libs/jquery-fontsampler/dist/jquery.fontsampler.js', array( 'jquery' ) );
		wp_enqueue_script( 'fontsampler-admin-js', plugin_dir_url( __FILE__ ) . 'admin/js/fontsampler-admin.js', array( 'jquery', false, true ) );
		wp_enqueue_script( 'colour-pick', plugins_url( 'admin/js/fontsampler-admin.js', __FILE__ ), array( 'wp-color-picker' ), false, true );
		wp_enqueue_script( 'jquery-ui-sortable', array( 'jquery' ) );
		wp_enqueue_script( 'jquery-form-validator', plugin_dir_url( __FILE__ ) . 'js/libs/jquery-form-validator/form-validator/jquery.form-validator.js', array( 'jquery' ) );
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
		$existing_mimes['ttf']   = 'application/ttf';

		return $existing_mimes;
	}


	/*
	 * React to the plugin being activated
	 */
	function fontsampler_activate() {
		$this->db->check_and_create_tables();
	}

	/*
	 *
	 */
	function fontsampler_uninstall() {
		$this->db->delete_tables();
	}


	/*
	 * FLOW CONTROL
	 */

	/*
	 * Rendering the admin interface
	 */
	function fontsampler_admin_init() {

		echo '<section id="fontsampler-admin" class="';
		echo $this->admin_hide_legacy_formats ? 'fontsampler-admin-hide-legacy-formats' : 'fontsampler-admin-show-legacy-formats';
		echo '">';

		include( 'includes/header.php' );

		echo '<main>';

		$this->db->check_and_create_tables();

		// check upload folder is writable
		$dir    = wp_upload_dir();
		$upload = $dir['basedir'];
		if ( ! is_dir( $upload ) ) {
			echo '<p>Uploads folder does not exist! Make sure Wordpress has writing permissions to create the
                    uploads folder at: <em>' . $upload . '</em></p>';
		}


		// handle any kind of form processing and output any messages inside a notice, if there were any
		if ( 'POST' == $_SERVER['REQUEST_METHOD'] && isset( $_POST['action'] ) ) {
			ob_start( function ( $buffer ) {
				if ( ! empty( $buffer ) ) {
					return '<div class="notice">' . $buffer . '</div>';
				}
			});
			$this->handle_font_edit();
			$this->handle_font_delete();
			$this->handle_set_edit();
			$this->handle_set_delete();
			$this->handle_settings_edit();
			ob_end_flush();
		}


		$subpage = isset( $_GET['subpage'] ) ? $_GET['subpage'] : '';
		switch ( $subpage ) {
			case 'set_create':
				$default_settings = $this->db->get_settings();
				$set = array_intersect_key( $default_settings, array_flip( $this->default_features ) );
				$set['default_features'] = 1; // by default pick the default UI options
				$set['ui_order_parsed'] = $this->helpers->ui_order_parsed_from( $default_settings, $set );

				$formats = $this->font_formats;
				$fonts = $this->db->get_fontfile_posts();
				include( 'includes/set-edit.php' );
				break;

			case 'set_edit':
				$default_settings = $this->db->get_settings();
				$set = $this->db->get_set( intval( $_GET['id'] ) );
				if ( sizeof( $set['fonts'] ) > 1) {
					$set['fontpicker'] = 1;
				}
				$fonts = $this->db->get_fontfile_posts();
				$fonts_order = implode( ',', array_map( function ( $font ) {
					return $font['id'];
				}, $set['fonts']));
				$formats = $this->font_formats;
				include( 'includes/set-edit.php' );
				break;

			case 'set_delete':
				$set = $this->db->get_set( intval( $_GET['id'] ) );
				include( 'includes/set-delete.php' );
				break;

			case 'fonts':
				$offset = isset( $_GET['offset'] ) ? intval( $_GET['offset'] ) : 0;
				$num_rows = isset( $_GET['num_rows'] ) ? intval( $_GET['num_rows'] ) : 10;
				$initials   = $this->db->get_fontsets_initials();
				if ( sizeof( $initials ) > 10 ) {
					$pagination = new FontsamplerPagination( $initials, $num_rows, false, $offset );
				}

				$fonts   = $this->db->get_fontsets( $offset, $num_rows );
				$formats = $this->font_formats;

				include( 'includes/fontsets.php' );
				break;

			case 'font_create':
				$font    = null;
				$formats = $this->font_formats;
				include( 'includes/fontset-edit.php' );
				break;

			case 'font_edit':
				$font    = $this->db->get_fontset( intval( $_GET['id'] ) );
				$formats = $this->font_formats;
				include( 'includes/fontset-edit.php' );
				break;

			case 'font_delete':
				$font = $this->db->get_fontset( intval( $_GET['id'] ) );
				include( 'includes/fontset-delete.php' );
				break;

			case 'settings':
				$defaults = $this->db->get_settings();
				include( 'includes/settings.php' );
				break;

			case 'about':
				include( 'includes/about.php' );
				break;

			default:
				$offset = isset( $_GET['offset'] ) ? intval( $_GET['offset'] ) : 0;
				$num_rows = isset( $_GET['num_rows'] ) ? intval( $_GET['num_rows'] ) : 10;
				$initials = $this->db->get_samples_ids();
				if ( sizeof( $initials ) > 10 ) {
					$pagination = new FontsamplerPagination( $initials, $num_rows, true, $offset );
				}

				$sets = $this->db->get_sets( $offset, $num_rows );
				include( 'includes/sets.php' );
				break;
		}
		echo '</main>';

		include( 'includes/footer.php' );
		echo '</section>';
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
				'ttf'   => NULL,
			);

			foreach ( $this->font_formats as $label ) {
				$file = $_FILES[ $label . '_0'];
				if ( isset( $file ) && $file['size'] > 0 ) {
					$uploaded = media_handle_upload( $label . '_0', 0 );
					if ( is_wp_error( $uploaded ) ) {
						$this->msg->error( 'Error uploading ' . $label . ' file: ' . $uploaded->get_error_message() );
					} else {
						$this->msg->info( 'Uploaded ' . $label . ' file: ' . $file['name'] );
						$data[ $label ] = $uploaded;
					}
				} elseif ( ! empty( $_POST[ 'existing_file_' . $label ][0] ) ) {
					// don't overwrite current file reference
					$this->msg->info( 'Existing ' . $label . ' file remains unchanged.' );
					unset( $data[ $label ] );
				} else {
					$this->msg->notice( 'No ' . $label . ' file provided. You can still add it later.' );
				}
			}

			if ( 0 == $_POST['id'] ) {
				$this->db->insert_font( $data );
				$this->msg->info( 'Created fontset ' . $_POST['fontname'][0] );
			} else {
				$this->db->update_font( $data, $_POST['id'] );
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
			$res = $this->db->delete_font( $id );
			if ( ! $res ) {
				$this->db->error( 'Error: No font sets deleted' );
			} else {
				$this->db->delete_join( array( 'font_id' => $id ) );
				$this->msg->info( 'Font set succesfully removed. Font set also removed from any fontsamplers using it.' );
				$this->msg->notice( 'Note that the font files themselves have not been removed from the Wordpress uploads folder ( Media Gallery ).' );
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
				$substitutes = array_intersect_key( $this->db->get_settings(), $this->boolean_options );
				$data = array_replace( $data, $substitutes );
				$data['default_features'] = 1;
			} else {
				$data['default_features'] = 0;
			}

			// also allow for empty initial text
			if ( ! empty( $_POST['initial'] ) ) {
				$data['initial'] = $_POST['initial'];
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

			// store the initial font, this is either the only font, or the selected font
			if ( isset( $_POST['font_id'] ) && isset( $_POST['initial_font'] ) ) {

				if ( sizeof( array_unique( $_POST['font_id'] ) ) + sizeof( $inlineFontIds ) == 1 ) {
					// single font sent along
					if ( strpos( $_POST['initial_font'], '_' ) !== false && sizeof( $inlineFontIds ) > 0 ) {
						// the initial_font was inline uploaded, use fresh insert id
						$data['initial_font'] = $inlineFontIds[0];
					} else {
						// the initial font was a existing select font, use id
						$data['initial_font'] = $_POST['font_id'][0];
					}
				} else {
					// multiple fonts sent along
					if ( strpos( $_POST['initial_font'], '_' ) !== false && ! empty( $_POST['fonts_order'] ) ) {
						// the initial_font was one of the inline uploaded ones
						// reduce the fonts_order to get an array with only newly created fonts (in case there is several)
						$inline = array_filter(explode( ',', $_POST['fonts_order'] ), function ( $val ) {
							return strpos($val, "_") !== false;
						});

						// then pick that one of the newly created fonts, which has the suffix gotten from "initial_X"
						// NOTE there is a danger that two fonts were inline created and one of them fails upload, and thus
						// skews this default - but in that case one of the uploaded fonts is missing, which is the bigger
						// problem
						$tmp = array_values($inlineFontIds);
						$data['initial_font'] = $tmp[ intval( substr( $_POST['initial_font'], -1) ) ];
					} else {
						// initial_font was existing one, take that id provided
						$data['initial_font'] = $_POST['initial_font'];
					}
				}
			} else {
				$data['initial_font'] = NULL;
			}

			// save the fontsampler to the DB
			if ( ! isset( $_POST['id'] ) ) {
				// insert new
				$res = $this->db->insert_set( $data );
				if ( $res ) {
					$id = $this->db->get_insert_id();
					$this->msg->info( 'Created fontsampler with id ' . $id );
				} else {
					$this->msg->error( 'Error: Failed to create new fomtsampler.' );
				}
			} else {
				// update existing
				$id = intval( $_POST['id'] );
				$this->db->update_set( $data, $id );
			}

			// wipe join table for this fontsampler, then add whatever now was instructed to be saved
			$this->db->delete_join( array( 'set_id' => $id ) );

			$font_ids = array();
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

					$this->db->insert_join( array( 'set_id' => $id, 'font_id' => $font_id, 'order' => $font_index ) );
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
					$this->msg->error( 'Error uploading ' . $label . ' file: ' . $uploaded->get_error_message() );
				} else {
					$this->msg->info( 'Uploaded ' . $label . ' file: ' . $file['name'] );
					$data[ $label ] = $uploaded;
				}
			} else {
				$this->msg->notice( 'No ' . $label . ' file provided for ' . $name . '. You can still add it later.');
			}
		}

		if ( $this->db->insert_font( $data ) ) {
			$this->msg->info( 'Created fontset ' . $name );

			return $this->db->get_insert_id;
		}

		return false;
	}


	function handle_set_delete() {
		if ( isset( $_POST['id'] ) ) {
			$id = (int) ( $_POST['id'] );
			if ( 'delete_set' == $_POST['action'] && isset( $id ) && is_int( $id ) && $id > 0 ) {
				check_admin_referer( 'fontsampler-action-delete_set' );
				if ( $this->db->delete_set( intval( $_POST['id'] ) ) ) {
					$this->msg->info( 'Deleted ' . $id );
				}
			}
		}
	}


	function handle_settings_edit() {
		// no settings ID's for now, just one default row
		if ( isset( $_POST['id'] ) ) {
			$id = (int) ( $_POST['id'] );
			if ( 'edit_settings' == $_POST['action'] && isset( $id ) && is_int( $id ) && $id > 0 ) {
				// update the wp_option field for hiding legacy font formats
				if ( isset( $_POST['admin_hide_legacy_formats'] ) ) {
					$val = intval( $_POST['admin_hide_legacy_formats'] );
					update_option( self::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS, $val );
					$this->admin_hide_legacy_formats = $val;
				} else {
					update_option( self::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS, 0 );
					$this->admin_hide_legacy_formats = 0;
				}


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
				$this->db->update_settings( $data, array( 'id' => $id ) );

				// rewrite any fontsampler sets that use the defaults
				$this->db->update_defaults( $data );

				// further generate a new settings css file
				$this->write_css_from_settings( $data );
			}
		}
	}

}
