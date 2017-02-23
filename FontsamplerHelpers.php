<?php

/**
 * Class FontsamplerHelpers
 *
 * Wrapper for misc helper functions useful throughout the plugin
 */
class FontsamplerHelpers {

	private $fontsampler;
	private $less;

	function __construct( $fontsampler ) {
		$this->fontsampler = $fontsampler;
		$this->less        = new Less_Parser( array( 'compress' => true ) );
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
				$error_message = $e->getMessage();

				return false;
			}

			// concat the base styles and the replaced template into the default css file
			if ( file_put_contents( $output, $css ) ) {
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

}