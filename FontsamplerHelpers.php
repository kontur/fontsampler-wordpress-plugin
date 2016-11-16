<?php

/**
 * Class FontsamplerHelpers
 *
 * Wrapper for misc helper functions useful throughout the plugin
 */
class FontsamplerHelpers {

	private $fontsampler;

	function FontsamplerHelpers( $fontsampler ) {
		$this->fontsampler = $fontsampler;
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
			$styles   = file_get_contents( $styles_path );

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
		foreach ( $this->fontsampler->font_formats as $format ) {
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
	 *
	 * @param $string
	 *
	 * @return array
	 */
	function parse_ui_order( $string ) {
		$order = array();
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
			$ui_order .= implode( ',', $row ) . '|';
		}
		$ui_order = substr( $ui_order, 0, - 1 );

		return $ui_order;
	}


	function set_has_options_ui( $set ) {
		return ( isset( $set['invert'] ) || isset( $set['alignment'] ) || isset( $set['opentype'] ) );
	}

	/**
	 * Helper to remove not acutally present elements from the compressed string
	 *
	 * @param $string the compressed string of ui elements, commaseparated and | -separated, i.e.
	 *                size,letterspacing|fontsampler
	 * @param $set    the fontsampler set to validate it against
	 *
	 * @return $string of the ui fields, separated by fields with comma, and rows with |
	 */
	function prune_ui_order( $string, $set ) {
		// force include the non-db value "fontsampler"
		$set['fontsampler'] = 1;

		// force include the value "options" if any OT feature, invert or alignment are enabled
		if ( $this->set_has_options_ui( $set ) ) {
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
				if ( isset( $set[ $item ] ) && $set[ $item ] == 1 ) {
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
		// to generate an array of ui_blocks that need to be arranged
		$ui_blocks_default  = array( 'size', 'letterspacing', 'lineheight', 'sampletexts' );
		$ui_blocks_settings = array_keys( array_filter( $settings, function ( $a ) {
			return $a == "1";
		} ) );

		$ui_blocks = array_intersect( $ui_blocks_settings, $ui_blocks_default );

		if ( isset( $set['fonts'] ) && sizeof( $set['fonts'] ) > 0 ) {
			array_push( $ui_blocks, 'fontpicker' );
		}

		if ( $this->set_has_options_ui( array_flip( $ui_blocks_settings ) ) ) {
			array_push( $ui_blocks, 'options' );
		}

		// every fontsampler has this block:
		array_push( $ui_blocks, 'fontsampler' );

		$ui_order = array();

		// generate the most "ideal" (no gaps in the row, no 2+2 rows) layout of ui_blocks and store them
		// in a format that is the same as ui_order_parsed

		// magic $r < 2 comes from max. 3 rows of interface elements altogether
		for ( $r = 0; $r < 2; $r ++ ) {
			$ui_order[ $r ] = array();

			// as long as there is less than 3 elements in this row and there is block to distribute
			while ( sizeof( $ui_order[ $r ] ) < 3 && sizeof( $ui_blocks ) > 0 ) {
				$block = array_shift( $ui_blocks );
				if ( ( 'options' !== $block && isset( $set[ $block ] ) ) ||
				     ( 'options' === $block && $this->set_has_options_ui( $set ) ) ||
				     ( 'fontpicker' === $block )
				) {
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