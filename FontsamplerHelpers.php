<?php

/**
 * Class FontsamplerHelpers
 *
 * Wrapper for misc helper functions useful throughout the plugin
 */
class FontsamplerHelpers {

	private $fontsampler;
	private $less;
	private $features;
	private $additional_features;
	private $layout;

	function __construct( $fontsampler ) {
		$this->fontsampler         = $fontsampler;
		$this->less                = new Less_Parser( array( 'compress' => true ) );
		$this->layout              = new FontsamplerLayout();
		$this->features            = array(
			'fontsize'      => array(
				'name'                 => 'fontsize',
				'label'                => 'Size control',
				'slider_label'         => 'Label',
				'slider_initial_label' => 'Initial px',
				'slider_min_label'     => 'Min px',
				'slider_max_label'     => 'Max px',
				'label_installation_default' => $this->fontsampler->settings_defaults['fontsize_label'],
			),
			'letterspacing' => array(
				'name'                 => 'letterspacing',
				'label'                => 'Letter spacing control',
				'slider_label'         => 'Label',
				'slider_initial_label' => 'Initial px',
				'slider_min_label'     => 'Min px',
				'slider_max_label'     => 'Max px',
				'label_installation_default' => $this->fontsampler->settings_defaults['letterspacing_label'],
			),
			'lineheight'    => array(
				'name'                 => 'lineheight',
				'label'                => 'Line height control',
				'slider_label'         => 'Label',
				'slider_initial_label' => 'Initial %',
				'slider_min_label'     => 'Min %',
				'slider_max_label'     => 'Max %',
				'label_installation_default' => $this->fontsampler->settings_defaults['lineheight_label'],
			)
		);
		$this->additional_features = array(
			'sampletexts' => 'Display dropdown selection for sample texts',
			'fontpicker'  => 'Display fontsname(s) as dropdown selection (for several fonts) or label (for a single font)',
			'alignment'   => 'Alignment controls',
			'invert'      => 'Allow inverting the text field to display negative text',
			'opentype'    => 'Display OpenType feature controls (automatic detection)',
			'locl'		  => 'Add dropdown for switching language (activates locl features)',
			'multiline'   => 'Allow line breaks',
			'buy'         => 'Display a link to buy these fonts',
			'specimen'    => 'Display a link to a specimen',
		);
		$this->notdef_options = array(
			"Do nothing (renders fallback font)",
			"Highlight visually (renders fallback font)",
			"Render .notdef instead (of font or else of fallback)",
			"Block rendering",
		);
		// the default admin slider ranges for each field
		$this->slider_ranges = array(
			'fontsize'      => array( 0, 255 ), // pixels
			'letterspacing' => array( - 25, 25 ), // pixels
			'lineheight'    => array( 0, 500 ), // percent
		);
	}


	/**
	 * @return array of keys of features that are boolean in fontsampler-edit and settings
	 */
	function get_checkbox_features() {
		return array_merge( array_keys( $this->features ), array_keys( $this->additional_features ) );
	}


	/**
	 * @id - if false return the default css file and compile if needed
	 *
	 * @return string path to include styles css file
	 * (general plugin css, or custom css for a particular fontsampler)
	 */
	function get_css_file( $id = false, $css = false ) {
		if ( false === $id ) {
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
		} else {
			$path = plugin_dir_path( __FILE__ ) . 'css/custom/fontsampler-interface-' . $id . '.css';
			$url  = plugin_dir_url( __FILE__ ) . 'css/custom/fontsampler-interface-' . $id . '.css';
			if ( ! file_exists( $path ) ) {
				$this->write_custom_css( $path, $css, $id );
			}

			return $url;
		}
	}


	function write_custom_css_for_set( $set ) {
		$defaults = $this->fontsampler->db->get_default_settings();
		$css      = array_filter( $set, function ( $item ) {
			return substr( $item, 0, 4 ) === 'css_';
		}, ARRAY_FILTER_USE_KEY );

		// catch 5.6.30 errors about ARRAY_FILTER_USE_KEY, 5.6.33 check should
		// catch those in the future
		if (!is_array($css)) {
			return false;
		}

		$supplemented = array();
		foreach ( $css as $key => $value ) {
			if ( null === $value ) {
				// any null values, replace them from defaults, so we can render a custom css
				// with all values filled
				$supplemented[ $key ] = $defaults[ $key ];
			} else {
				// found a non null value => generate custom css!
				$supplemented[ $key ] = $value;
			}
		}
		$path = plugin_dir_path( __FILE__ ) . 'css/custom/fontsampler-interface-' . $set['id'] . '.css';

		return $this->write_custom_css( $path, $css, $set['id'] );
	}

	/**
	 * @param $path
	 * @param null $css
	 * @param null $id
	 *
	 * Helper function that writes the css file specific to a particular set
	 *
	 * @return bool
	 */
	function write_custom_css( $path, $css = null, $id = null ) {
		$input  = plugin_dir_path( __FILE__ ) . 'css/fontsampler-interface.less';
		$output = $path;

		// the initial $input holds all less variables and declarations
		// to make it more specific than the defaults, let's substitute all
		// ".fontsampler-interface" with ".fontsampler-interface.fontsampler-id-X"
		$content = file_get_contents( $input );
		$content = str_replace( '.fontsampler-interface', '.fontsampler-interface.fontsampler-id-' . $id, $content );

		$vars = $this->settings_array_css_to_less( $css );

		return $this->write_less( $content, $output, $vars, false );
	}


	/**
	 * @param $settings db row of setting params as array
	 */
	function write_css_from_settings( $settings ) {
		$input  = plugin_dir_path( __FILE__ ) . 'css/fontsampler-css.less';
		$output = plugin_dir_path( __FILE__ ) . 'css/fontsampler-css.css';

		// reduce passed in settings row to only values for keys starting with css_ and prefix those keys with an @ for
		// matching and replacing
		$vars = $this->settings_array_css_to_less( $settings );

		return $this->write_less( $input, $output, $vars );
	}


	/**
	 * @param $input        - file path or string
	 * @param $output
	 * @param $vars         -  variables to supplement in less
	 * @param bool $is_path - signifies if @input is a file path, or a string
	 *
	 * @return bool
	 */
	function write_less( $input, $output, $vars, $is_path = true ) {
		$m          = new FontsamplerMessages();
		$this->less = new Less_Parser( array( 'compress' => true ) );
		if ( file_exists( $input ) || ! $is_path ) {
			try {
				if ( $is_path ) {
					$this->less->parseFile( $input );
				} else {
					$this->less->parse( $input );
				}
				$this->less->ModifyVars( $vars );
				$css = $this->less->getCss();
			} catch ( Exception $e ) {
				$m->error( $e->getMessage() );

				return false;
			}

			// concat the base styles and the replaced template into the default css file
			if ( false === $this->check_is_writeable( dirname($output) ) ) {
				$m->error( 'Error: Permission to write to ' . ($output) . ' denied. Failed to update styles' );

				return false;
			}
			if ( false !== file_put_contents( $output, $css ) ) {
				return $output;
			}
		}

		return false;
	}


	/**
	 * @param $set
	 *
	 * Function that is called to retrieve a CSS file for a set
	 * This either returns a string to the css file (just written or existing)
	 * of false if it fails or the provided $set is invalid or has no non-default values
	 *
	 * @return bool|string
	 */
	function get_custom_css( $set ) {
		if ( false === $set ) {
			return false;
		}
		if ( intval( $set['use_defaults'] ) === 1 ) {
			return false;
		}
		$defaults = $this->fontsampler->db->get_default_settings();
		$css      = array_filter( $set, function ( $item ) {
			return substr( $item, 0, 4 ) === 'css_';
		}, ARRAY_FILTER_USE_KEY );

		$supplemented  = array();
		$defaults_only = true; // detect if any of the values actually differ from the defaults
		foreach ( $css as $key => $value ) {
			if ( null === $value ) {
				// any null values, replace them from defaults, so we can render a custom css
				// with all values filled
				$supplemented[ $key ] = $defaults[ $key ];
			} else {
				// found a non null value => generate custom css!
				$defaults_only        = false;
				$supplemented[ $key ] = $value;
			}
		}

		if ( $defaults_only ) {
			return false;
		}

		return $this->get_css_file( $set['id'], $supplemented );

	}


	/**
	 * Make sure the passed in handle is writeable
	 *
	 * @param $handle
	 *
	 * @return bool
	 */
	function check_is_writeable( $handle ) {
		if ( ( is_dir( $handle ) || is_file( $handle ) ) && true === is_writeable( $handle ) ) {
			return true;
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
		foreach ( $this->fontsampler->font_formats as $format ) {
			if ( ! empty( $font[ $format ] ) ) {
				$fonts_object .= '"' . $format . '": "' . $font[ $format ] . '",';
			}
		}
		$fonts_object = substr( $fonts_object, 0, - 1 );
		$fonts_object .= '}';

		return $fonts_object;
	}


	function is_legacy_format( $format ) {
		return in_array( $format, $this->fontsampler->font_formats_legacy );
	}


	function get_best_file_from_fonts( $fonts ) {
		$fontsFiltered = array();
		if ( ! $fonts ) {
			return false;
		}
		foreach ( $fonts as $font ) {
			$formats = $this->fontsampler->font_formats;
			$best    = false;
			while ( $best === false && sizeof( $formats ) > 0 ) {
				$check = array_shift( $formats );
				if ( isset( $font[ $check ] ) && ! empty( $font[ $check ] ) ) {
					$best = $font[ $check ];
				}
			}
			if ( false !== $best ) {
                if (is_ssl() && substr($best, 0, 7) === "http://") {
                    $best = str_replace("http://", "https://", $best);
				}
				$fontsFiltered[ $font['id'] ] = $best;
			}
		}

		return sizeof( $fontsFiltered ) > 0 ? $fontsFiltered : false;
	}


	/**
	 * @return bool - true if folder exists or has successfully been created
	 */
	function check_and_create_folders() {
		$customCssDir = plugin_dir_path( __FILE__ ) . 'css/custom';
		$exists       = is_dir( $customCssDir );
		if ( ! $exists ) {
			$exists = mkdir( $customCssDir );
		}

		return $exists;
	}


	/**
	 * @param $row - entire or partial row of fontsampler_settings table
	 *
	 * @return array - reduced to an array of only key-value paris whose key starts with css_
	 */
	function settings_array_css_to_less( $row ) {
		$vars = array();
		if (is_array($row)) {
			foreach ( $row as $key => $value ) {
				if ( false !== strpos( $key, 'css_' ) ) {
					$vars[ $key ] = $value;
				}
			}
		}

		return $vars;
	}


	function hide_changelog() {
		$plugin = get_plugin_data( realpath( dirname( __FILE__ ) . "/fontsampler.php" ) );
		// this throws obscure error on PHP 5.6
		//$option = update_option( $this->fontsampler::FONTSAMPLER_OPTION_LAST_CHANGELOG, $plugin['Version'] );
		$option = update_option( 'fontsampler_last_changelog', $plugin['Version'] );
	}

	function extend_twig( $twig ) {

		// mount some helpers to twig
		$twig->addFunction( new Twig_SimpleFunction( 'fontfiles_json', function ( $fontset ) {
			return $this->fontfiles_json( $fontset );
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'file_from_path', function ( $font, $format ) {
			return substr( $font[ $format ], strrpos( $font[ $format ], '/' ) + 1 );
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'submit_button',
				function ( $label = 'Submit', $type = 'primary' ) {
					return submit_button( $label, $type );
				} )
		);

		$twig->addFunction( new Twig_SimpleFunction( 'is_current', function ( $current ) {
			$subpages = explode( ',', $current );
			if ( ! isset( $_GET['subpage'] ) && in_array( 'index', $subpages ) ||
			     isset( $_GET['subpage'] ) && in_array( $_GET['subpage'], $subpages )
			) {
				return ' class=current ';
			} else {
				return '';
			}
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'wp_nonce_field', function ( $field ) {
			return function_exists( 'wp_nonce_field' ) ? wp_nonce_field( $field ) : false;
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'is_legacy_format', function ( $format ) {
			return $this->is_legacy_format( $format );
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'upload_link', function () {
			return esc_url( get_upload_iframe_src( 'image' ) );
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'image_src', function ( $image_id ) {
			return wp_get_attachment_image_src( $image_id, 'full' )[0];
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'admin_hide_legacy_formats', function () {
			return $this->fontsampler->admin_hide_legacy_formats;
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'image', function ( $src ) {
			return plugin_dir_url( __FILE__ ) . $src;
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'num_notifications', function () {
			return $this->fontsampler->notifications->get_notifications()['num_notifications'];
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'has_new_changelog', function () {
			$plugin = get_plugin_data( realpath( dirname( __FILE__ ) . "/fontsampler.php" ) );
			$option = get_option( 'fontsampler_last_changelog' );

			// if no previous changelog has been marked as viewed, or the previously marked
			// changelog is smaller than the current fontsampler plugin version, show the changelog
			if ( false === $option || version_compare( $plugin['Version'], $option ) > 0 ) {
				return true;
			}

			return false;
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'wp_get_attachment_image_src', function ( $id, $option = 'full' ) {
			return wp_get_attachment_image_src( $id, $option )[0];
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'has_messages', function () {
			return $this->fontsampler->msg->has_messages();
		} ) );

		$twig->addFunction( new Twig_SimpleFunction( 'get_messages', function () {
			return $this->fontsampler->msg->get_messages( true );
		} ) );

		$twig->addGlobal( 'block_classes', $this->layout->blocks );

		$twig->addGlobal( 'block_labels', $this->layout->labels );

		$twig->addGlobal( 'plugin_dir_url', plugin_dir_url( __FILE__ ) );

		$twig->addGlobal( 'features', $this->features );

		$twig->addGlobal( 'additional_features', $this->additional_features );

		$twig->addGlobal( 'formats', $this->fontsampler->font_formats );

		$twig->addGlobal( 'slider_ranges', $this->slider_ranges );

		$twig->addGlobal( 'is_rtl', is_rtl() );

		$twig->addGlobal( 'settings_defaults', $this->fontsampler->settings_defaults );

		$twig->addGlobal( 'notdef', $this->notdef_options );
	}

}