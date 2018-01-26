<?php

/**
 * Class FontsamplerLayout
 *
 * Helper class for converting UI layouts to a db stored string and back
 * The db value is a string of fields + their default "layout", with commas separating blocks (and their css width
 * forcing new rows where needed) and | representing row breaks, e.g.:
 * fontsampler_full,size_column,|,lineheight_column,fontpicker_full
 */
class FontsamplerLayout {

	public $blocks;
	public $labels;

	function __construct() {
		// any possible UI blocks available for sorting, and an array of their options for layout
		// full means spanning all columns
		// column means spanning one column
		// half means spanning half a column
		// the first entry in the array is also the default
		$this->blocks = array(
			'fontsampler'   => array( 'full' ),
			'fontsize'      => array( 'column', 'full' ),
			'letterspacing' => array( 'column', 'full' ),
			'lineheight'    => array( 'column', 'full' ),
			'alignment'     => array( 'column', 'inline' ),
			'opentype'      => array( 'column', 'inline' ),
			'locl'			=> array( 'column', 'inline' ),
			'invert'        => array( 'column', 'inline' ),
			'fontpicker'    => array( 'column', 'full' ),
			'sampletexts'   => array( 'column', 'full' ),
			'buy'           => array( 'column', 'inline' ),
			'specimen'      => array( 'column', 'inline' ),
		);

		// the labels used in the admin UI for sorting the layout
		$this->labels = array(
			'fontsampler'   => 'Fontsampler',
			'fontsize'      => 'Font size',
			'letterspacing' => 'Letter spacing',
			'lineheight'    => 'Line height',
			'alignment'     => 'Alignment',
			'opentype'      => 'OpenType',
			'locl'			=> 'Languages',
			'invert'        => 'Invert',
			'fontpicker'    => 'Fontpicker',
			'sampletexts'   => 'Sampletexts',
			'buy'           => 'Buy link',
			'specimen'      => 'Specimen link',
		);
	}


	/**
	 * @param $string   : ui_order from db
	 * @param null $set : set against which to validate and supplement
	 *
	 * @return array: Array or layout blocks and their class as value
	 */
	public function stringToArray( $string, $set = null ) {
		$string = $this->sanitizeString( $string, $set );
		$array  = array();

		$arr = explode( ',', $string );

		foreach ( $arr as $item ) {
			if ( $item != "|" ) {
				$pos           = strpos( $item, '_' );
				$key           = substr( $item, 0, $pos );
				$class         = substr( $item, $pos + 1, strlen( $item ) - $pos );
				$array[ $key ] = $class;
			} else {
				$array["|"] = "";
			}
		}

		return $array;
	}


	public function arrayToString( $blocks, $set = null ) {
		$string = '';
		foreach ( $blocks as $item => $class ) {
			$string .= $item . '_' . $class . ',';
		}
		$string = rtrim( $string, ',' );

		if ( ! empty ( $set ) ) {
			$string = $this->sanitizeString( $string, $set );
		}

		return $string;
	}


	/**
	 * @param $string   : ui_order db value
	 * @param null $set : fontsampler_set against which to validate the ui_order
	 *                  labels to make sure they do exist in that way
	 *
	 * @return string: ui_order in right format, optionally in coherence with the
	 *               passed in $set data
	 */
	public function sanitizeString( $string, $set = null ) {

		// remove no longer used fields or formatting:

		// pre 0.2.0 - reading & parsing works, new saves / edits will be formatted correctly;
		// foo|bar now is foo,|,bar - detect non-comma surrounded | and format them correctly for 0.2.0 interpretation
		$string = preg_replace( '/([^,]*)\|([^,]*)/', '$1,|,$2', $string );
		$string = preg_replace( '/(^|,|\|)size/', '$1fontsize', $string ); // pre 0.2.0 fontsize field was called size
		$string = str_replace( 'options', '', $string ); // no longer in use, now specific options individually
		$string = str_replace( ',,', ',', $string ); // remove "empty" rows


		$uiOrder = array();
		foreach ( explode( ',', $string ) as $item ) {
			if ( ! empty( $item ) ) {
				if ( strpos( $item, '_' ) === false && $item != '|' ) {
					array_push( $uiOrder, $item . '_' . $this->blocks[ $item ][0] );
				} else {
					array_push( $uiOrder, $item );
				}
			}
		}

		if ( ! empty( $set ) ) {
			/*
			 * When a set is passed in, crosscheck set items and the ui_order string so that:
			 *  - if an item is in ui_order but not actually present in set remove it
			 *  - if an item is not in ui_order but actually present add to ui_order
			 */

			// there is no sets "without" the fontsampler ui block, but it's not in the set
			// per se, so add it for this checking routing
			$set['fontsampler'] = 1;

			// reduce set to actual block relevant values
			$set      = array_intersect_key( $set, $this->blocks );
			$newarray = array();

			// check of all the items in UI_ORDER are really be based on set
			// remove those that are in UI_ORDER but not actually present
			foreach ( $uiOrder as $blockstring ) {
				if ( $blockstring != "|" ) {
					$block = substr( $blockstring, 0, strpos( $blockstring, '_' ) );

					// if an item is in ui_order but not actually present in set remove it
					if ( ( isset( $set[ $block ] ) && 1 === intval( $set[ $block ] ) ) && $block !== "fontsampler" ) {
						array_push( $newarray, $blockstring );
					} else if ( $block === "fontsampler" ) {
						array_push( $newarray, $blockstring );
					}
				} else {
					array_push( $newarray, $blockstring );
				}
			}

			// check through all set items and check that those are in the ui_order
			foreach ( $set as $setblock => $value ) {
				if ( ! empty( $value ) ) {
					// pass $uiOrder in, and get a name of all the blocks (without their layout suffix)
					$justblocknames = array_map( function ( $blockstring ) {
						return substr( $blockstring, 0, strpos( $blockstring, '_' ) );
					}, $uiOrder );

					// if one of the set's blocks has a 1 value but is not in the array of blocks from $ui_order
					// push it in
					if ( ! in_array( $setblock, $justblocknames ) ) {
						//						 echo "<br>missing $setblock from ui_order but it is in set";
						array_push( $newarray, $setblock . '_' . $this->blocks[ $setblock ][0] );
					}
				}
			}

			$uiOrder = $newarray;
		}

		return implode( ',', $uiOrder );
	}

	/**
	 * @return array: Array of layout block fields and their default class as value
	 */
	public function getDefaultBlocks() {
		$blocks   = $this->blocks;
		$defaults = array();
		foreach ( $blocks as $item => $class ) {
			$defaults[ $item ] = $class[0];
		}

		return $defaults;
	}
}