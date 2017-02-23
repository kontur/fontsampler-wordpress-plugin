<?php

/**
 * Class FontsamplerPlugin
 *
 * Main plugin class containing the frontend and backend routines
 * for rendering Fontsampler instances from shortcodes
 */
class FontsamplerPlugin {

	public $font_formats;
	public $settings_defaults;
	public $font_formats_legacy;
	public $default_features;
	public $admin_hide_legacy_formats;
	public $fontsampler_db_version;

	// helper classes
	public $msg;
	public $db;
	public $helpers;
	private $forms;

	const FONTSAMPLER_OPTION_DB_VERSION = 'fontsampler_db_version';
	const FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS = 'fontsampler_hide_legacy_formats';

	function __construct( $wpdb ) {

		// instantiate all needed helper subclasses
		$this->msg     = new FontsamplerMessages();
		$this->helpers = new FontsamplerHelpers( $this );
		$this->db      = new FontsamplerDatabase( $wpdb, $this );

		// keep track of db versions and migrations via this
		// simply set this to the current PLUGIN VERSION number when bumping it
		// i.e. a database update always bumps the version number of the plugin as well
		$this->fontsampler_db_version = '0.1.2';
		$current_db_version           = get_option( self::FONTSAMPLER_OPTION_DB_VERSION );

		// if no previous db version has been registered assume new install and set
		// to current version
		if ( ! $current_db_version ) {
			add_option( self::FONTSAMPLER_OPTION_DB_VERSION, $this->fontsampler_db_version );
			$current_db_version = $this->fontsampler_db_version;
		}
		if ( version_compare( $current_db_version, $this->fontsampler_db_version ) < 0 ) {
			$this->db->migrate_db();
		}


		// check if to display legacy formats or not
		$option_legacy_formats = get_option( self::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS );

		// set the option in the db, if it's unset; default to hiding the legacy formats
		if ( $option_legacy_formats === false ) {
			add_option( self::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS, '1' );
			$this->admin_hide_legacy_formats = 1;
		} else {
			$this->admin_hide_legacy_formats = $option_legacy_formats;
		}


		// TODO combined default_features and boolean options as array of objects
		// with "isBoolean" attribute
		$this->default_features = array(
			'size',
			'letterspacing',
			'lineheight',
			'sampletexts',
			'alignment',
			'invert',
			'multiline',
			'opentype',
			'fontpicker',
		);
		// note: font_formats order matters: most preferred to least preferred
		// note: so far no feature detection and no fallbacks, so woff2 last until fixed
		$this->font_formats        = array( 'woff', 'ttf', 'eot', 'woff2' );
		$this->font_formats_legacy = array( 'eot', 'ttf' );

		$this->settings_defaults = array(
			'font_size_label'           => 'Size',
			'font_size_min'             => '8',
			'font_size_max'             => '96',
			'font_size_initial'         => '14',
			'font_size_unit'            => 'px',
			'letter_spacing_label'      => 'Letter spacing',
			'letter_spacing_min'        => '-5',
			'letter_spacing_max'        => '5',
			'letter_spacing_initial'    => '0',
			'letter_spacing_unit'       => 'px',
			'line_height_label'         => 'Line height',
			'line_height_min'           => '70',
			'line_height_max'           => '300',
			'line_height_initial'       => '110',
			'line_height_unit'          => '%',
			'alignment_initial'         => 'left',
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
			'css_column_gutter'         => '10px',
			'css_row_height'            => '30px',
			'css_row_gutter'            => '10px',
			'size'                      => 1,
			'letterspacing'             => 1,
			'lineheight'                => 1,
			'sampletexts'               => 0,
			'alignment'                 => 0,
			'invert'                    => 0,
			'multiline'                 => 1,
			'opentype'                  => 0,
			'fontpicker'                => 0,
			'buy_label'                 => 'Buy',
			'buy_image'                 => '',
			'specimen_label'            => 'Specimen',
			'specimen_image'            => '',
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

		$script_url = preg_replace( "/^http\:\/\/[^\/]*/", "", plugin_dir_url( __FILE__ ) );
		?>
		<script> var fontsamplerBaseUrl = '<?php echo $script_url; ?>'; </script>

		<?php
		// merge in possibly passed in attributes
		$attributes = shortcode_atts( array( 'id' => '0' ), $atts );

		// do nothing if missing id
		if ( 0 != $attributes['id'] ) {
			$set   = $this->db->get_set( intval( $attributes['id'] ) );
			$fonts = $this->helpers->get_best_file_from_fonts( $this->db->get_fontset_for_set( intval( $attributes['id'] ) ) );

			if ( false == $set || false == $fonts ) {
				if ( current_user_can( 'edit_posts' ) || current_user_can( 'edit_pages' ) ) {
					return '<div><strong>The typesampler with ID ' . $attributes['id'] . ' can not be displayed because some files or the type sampler set are missing!</strong> <em>You are seeing this notice because you have rights to edit posts - regular users will see an empty spot here.</em></div>';
				} else {
					return '<!-- typesampler #' . $attributes['id'] . ' failed to render -->';
				}
			}

			// some of these get overwritten from defaults, but list them all here explicitly
			$options = array_merge( $set, $this->settings_defaults, $this->db->get_settings() );
			$initialFont = isset( $fonts[ $set['initial_font'] ] ) ? $fonts[ $set['initial_font'] ] : false;
			$settings = $this->db->get_settings();
			$layout = new FontsamplerLayout();
			$blocks = $layout->stringToArray( $set['ui_order'], $set );

			// buffer output until return
			ob_start();
			?>
			<div class='fontsampler-wrapper on-loading'
			     data-fonts='<?php echo implode( ',', $fonts ); ?>'
				<?php if ( $initialFont ) : ?>
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
		wp_enqueue_script( 'main-js', plugin_dir_url( __FILE__ ) . 'js/main.js' );
		wp_enqueue_style( 'fontsampler-css', $this->helpers->get_css_file() );
	}


	/*
	 * Register scripts and styles needed in the admin panel
	 */
	function fontsampler_admin_enqueues($hook) {
		// Load only on ?page=mypluginname
        if($hook != 'toplevel_page_fontsampler') {
                return;
        }


		wp_enqueue_script( 'require-js', plugin_dir_url( __FILE__ ) . 'js/libs/requirejs/require.js', array(), false, true);
		wp_enqueue_script( 'fontsampler-admin-main-js', plugin_dir_url( __FILE__ ) . 'admin/js/fontsampler-admin-main.js', array(
			'wp-color-picker',
			'jquery-ui-sortable'
		), false, true);

		wp_enqueue_script( 'fontsampler-js', plugin_dir_url( __FILE__ ) . 'js/libs/jquery-fontsampler/dist/jquery.fontsampler.js', array( 'jquery' ) );

		wp_enqueue_style( 'wp-color-picker' );
		wp_enqueue_style( 'fontsampler-css', $this->helpers->get_css_file() );
		wp_enqueue_style( 'fontsampler_admin_css', plugin_dir_url( __FILE__ ) . '/admin/css/fontsampler-admin.css', false, '1.0.0' );

		wp_enqueue_media();
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
	 * FLOW CONTROL
	 */

	/*
	 * Rendering the admin interface and dealing for form interactions
	 */
	function fontsampler_admin_init() {

		echo '<section id="fontsampler-admin" class="';
		echo $this->admin_hide_legacy_formats
			? 'fontsampler-admin-hide-legacy-formats'
			: 'fontsampler-admin-show-legacy-formats';
		echo '">';

		$script_url = preg_replace( "/^http\:\/\/[^\/]*/", "", plugin_dir_url( __FILE__ ) );
		?>
		<script> var fontsamplerBaseUrl = '<?php echo $script_url; ?>'; </script>
		<?php

		include( 'includes/header.php' );

		echo '<main>';

		$this->db->check_and_create_tables();

		// check upload folder is writable
		$dir    = wp_upload_dir();
		$upload = $dir['basedir'];
		if ( ! is_dir( $upload ) ) {
			echo '<p>Uploads folder does not exist! Make sure Wordpress has writing 
				permissions to create the uploads folder at: <em>' . $upload . '</em></p>';
		}


		// handle any kind of form processing and output any messages inside a notice, if there were any
		if ( 'POST' == $_SERVER['REQUEST_METHOD'] && isset( $_POST['action'] ) ) {
			$this->forms = new FontsamplerFormhandler( $this, $_POST, $_FILES );

			// buffer the output generated during form processing, then, if
			// not empty, print any output wrapped in a notice element
			ob_start( function ( $buffer ) {
				if ( ! empty( $buffer ) ) {
					return '<div class="notice">' . $buffer . '</div>';
				}
			} );

			$id = isset( $_POST['id'] ) && intval( $_POST['id'] ) > 0 ? intval( $_POST['id'] ) : null;
			switch ( $_POST['action'] ) {
				case 'edit_font':
					if ( ! isset( $id ) ) {
						$this->forms->handle_font_insert();
					} else {
						$this->forms->handle_font_edit( $id );
					}
					break;
				case 'delete_font':
					$this->forms->handle_font_delete( $id );
					break;
				case 'edit_set':
					if ( ! isset( $id ) ) {
						$this->forms->handle_set_insert();
					} else {
						$this->forms->handle_set_edit( $id );
					}
					break;
				case 'delete_set':
					$this->forms->handle_set_delete( $id );
					break;
				case 'edit_settings':
					$this->forms->handle_settings_edit();
					break;
				default:
					$this->msg->notice( 'Form submitted, but no matching action found for ' . $_POST['action'] );
					break;
			}
			ob_end_flush();
		}


		$subpage = isset( $_GET['subpage'] ) ? $_GET['subpage'] : '';
		switch ( $subpage ) {
			case 'set_create':
				$default_settings        = $this->db->get_settings();
				$set                     = array_intersect_key( $default_settings, array_flip( $this->default_features ) );
				$set['default_features'] = 1; // by default pick the default UI options

				$formats = $this->font_formats;
				$fonts   = $this->db->get_fontfile_posts();
				include( 'includes/set-edit.php' );
				break;

			case 'set_edit':
				$default_settings = $this->db->get_settings();
				$set              = $this->db->get_set( intval( $_GET['id'] ) );
				if ( sizeof( $set['fonts'] ) > 1 ) {
					$set['fontpicker'] = 1;
				}

				$layout = new FontsamplerLayout();
				$str = $layout->sanitizeString($set['ui_order'], $set);
				$layout->stringToArray($str);

				$fonts       = $this->db->get_fontfile_posts();
				$fonts_order = implode( ',', array_map( function ( $font ) {
					return $font['id'];
				}, $set['fonts'] ) );
				$formats     = $this->font_formats;
				include( 'includes/set-edit.php' );
				break;

			case 'set_delete':
				$set = $this->db->get_set( intval( $_GET['id'] ) );
				include( 'includes/set-delete.php' );
				break;

			case 'fonts':
				$offset   = isset( $_GET['offset'] ) ? intval( $_GET['offset'] ) : 0;
				$num_rows = isset( $_GET['num_rows'] ) ? intval( $_GET['num_rows'] ) : 10;
				$initials = $this->db->get_fontsets_initials();
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
				$this->helpers->check_is_writeable( plugin_dir_path( __FILE__ ) . 'css/fontsampler-css.css', true );
				include( 'includes/settings.php' );
				break;

			case 'about':
				include( 'includes/about.php' );
				break;

			default:
				$offset   = isset( $_GET['offset'] ) ? intval( $_GET['offset'] ) : 0;
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


	/**
	 * Registered ajax action to get a mockup fontsampler in the admin interface
	 * for layout previewing
	 */
	function ajax_get_mock_fontsampler () {
		check_ajax_referer( 'ajax_get_mock_fontsampler', 'action', false );

		$layout = new FontsamplerLayout();

		$data = $_POST['data'];

		// data['ui_order'] contains a string with all the blocks transmitted
		// from the admin UI
		$fields = array_keys($layout->stringToArray($data['ui_order']));

		// fill all these with a simple "1", like they would be fetched from a
		// set in the db that has those fields enabled (or content in them signifiying
		// they should render)
		$fieldsFromUI = array_combine($fields, array_fill(0, sizeof($fields), 1));

		// emulate a set from the passed in mock data
		// if any field like "specimen" got not just passed in ui_order but as explicit
		// field with content, that overwrites the "1" array value
		$set = array_merge( $fieldsFromUI, $data, array(
			'multiline' => 0,
			'is_ltr' => 1
		));

		$font = plugin_dir_url( __FILE__ ) . 'admin/fonts/PTS55F-webfont.woff';
		$set['fonts'] = array('woff' => $font);

		// from this set create all blocks; pass in the generated set to make
		// sure all fields sync
		$blocks = $layout->stringToArray( $set['ui_order'], $set );

		$options = $this->db->get_settings();
		$settings = $this->db->get_settings();

?>

			<div class='fontsampler-wrapper on-loading'
			     data-fonts='<?php echo $font; ?>'
				 data-initial-font='<?php echo $font; ?>'>
				 <?php include( 'includes/interface.php' ); ?>
			</div>
				<?php
		die();
	}

}