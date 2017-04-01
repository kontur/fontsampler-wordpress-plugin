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
		$this->features            = [
			'font_size'      => array(
				'name'                 => 'font_size',
				'label'                => 'Size control',
				'slider_label'         => 'Label',
				'slider_initial_label' => 'Initial px',
				'slider_min_label'     => 'Min px',
				'slider_max_label'     => 'Max px',
			),
			'letter_spacing' => array(
				'name'                 => 'letter_spacing',
				'label'                => 'Letter spacing control',
				'slider_label'         => 'Label',
				'slider_initial_label' => 'Initial px',
				'slider_min_label'     => 'Min px',
				'slider_max_label'     => 'Max px',
			),
			'line_height'    => array(
				'name'                 => 'line_height',
				'label'                => 'Line height control',
				'slider_label'         => 'Label',
				'slider_initial_label' => 'Initial px',
				'slider_min_label'     => 'Min px',
				'slider_max_label'     => 'Max px',
			)
		];
		$this->additional_features = [
			'sampletexts' => 'Display dropdown selection for sample texts',
			'fontpicker'  => 'Display fontsname(s) as dropdown selection (for several fonts) or label (for a single font)',
			'alignment'   => 'Alignment controls',
			'invert'      => 'Allow inverting the text field to display negative text',
			'opentype'    => 'Display OpenType feature controls (automatic detection)',
			'multiline'   => 'Allow line breaks',
			'buy'         => 'Display a link to buy these fonts',
			'specimen'    => 'Display a link to a specimen',
		];
	}


	/**
	 * @return array of keys of features that are boolean in fontsampler-edit and settings
	 */
	function get_checkbox_features() {
		return array_merge( array_keys( $this->features ), array_keys( $this->additional_features ) );
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

		// For testing changes to the default:
		// return plugin_dir_url( __FILE__ ) . 'css/fontsampler-interface.css';
	}


	/**
	 * @param $settings db row of setting params as array
	 */
	function write_css_from_settings( $settings ) {
		$input  = plugin_dir_path( __FILE__ ) . 'css/fontsampler-css.less';
		$output = plugin_dir_path( __FILE__ ) . 'css/fontsampler-css.css';

		$m = new FontsamplerMessages();

		// reduce passed in settings row to only values for keys starting with css_ and prefix those keys with an @ for
		// matching and replacing
		$settings_less_vars = array();
		foreach ( $settings as $key => $value ) {
			if ( false !== strpos( $key, 'css_' ) ) {
				$settings_less_vars[ $key ] = $value;
			}
		}

		if ( file_exists( $input ) ) {
			try {
				$this->less->parseFile( $input );
				$this->less->ModifyVars( $settings_less_vars );
				$css = $this->less->getCss();
			} catch ( Exception $e ) {
				$m->error( $e->getMessage() );

				return false;
			}

			// concat the base styles and the replaced template into the default css file
			if ( false === $this->check_is_writeable( $output ) ) {
				$m->error( 'Error: Permission to write to ' . $output . ' denied. Failed to update styles' );

				return false;
			}
			if ( false !== file_put_contents( $output, $css ) ) {
				return true;
			} else {
			}
		}

		return false;
	}


	function check_is_writeable( $handle, $output_wrapper = false ) {
		$m = new FontsamplerMessages();
		if ( ( is_dir( $handle ) || is_file( $handle ) ) && false === is_writeable( $handle ) ) {
			if ( $output_wrapper ) {
				echo '<div class="notice">';
			}
			$m->notice( 'Warning: ' . $handle . ' not writable by the server, update the folder/file permissions.' );
			if ( $output_wrapper ) {
				echo '</div>';
			}

			return false;
		}

		return true;
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
				$fontsFiltered[ $font['id'] ] = $best;
			}
		}

		return sizeof( $fontsFiltered ) > 0 ? $fontsFiltered : false;
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

		$twig->addGlobal( 'block_classes', $this->layout->blocks );

		$twig->addGlobal( 'block_labels', $this->layout->labels );

		$twig->addGlobal( 'plugin_dir_url', plugin_dir_url( __FILE__ ) );

		$twig->addGlobal( 'features', $this->features );

		$twig->addGlobal( 'additional_features', $this->additional_features );

		$twig->addGlobal( 'formats', $this->fontsampler->font_formats );
	}

}