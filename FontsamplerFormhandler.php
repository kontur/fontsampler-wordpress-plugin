<?php

/**
 * Class FontsamplerFormhandler
 *
 * Wrapper for all kind of form and file processing in the admin panel
 */
class FontsamplerFormhandler {

	private $fontsampler;
	private $post;
	private $files;

	function __construct( $fontsampler, $post, $files ) {
		$this->fontsampler = $fontsampler;
		$this->post        = $post;
		$this->files       = $files;
	}


	function handle_font_insert() {
		return $this->handle_font_edit( null );
	}

	function handle_font_edit( $id = null ) {
		check_admin_referer( 'fontsampler-action-edit_font' );
		$this->font_edit( $id );
	}

	function font_edit( $id = null, $offset = 0 ) {
		$data = array(
			'woff'  => $this->post['woff'][ $offset ],
//			'woff2' => $this->post['woff2'][ $offset ],
			'eot'   => $this->post['eot'][ $offset ],
			'ttf'   => $this->post['ttf'][ $offset ],
			'name'  => $this->post['fontname'][ $offset ]
		);

		if ( null === $id ) {
			$id = $this->fontsampler->db->insert_font( $data );
		} else {
			$this->fontsampler->db->update_font( $data, $id );
		}

		return $id;
	}


	/**
	 * @param int $id
	 *
	 * @return bool
	 */
	function handle_font_delete( $id ) {
		check_admin_referer( 'fontsampler-action-delete_font' );
		$id = intval( $id );

		if ( ! $id ) {
			return false;
		}

		// if files are set to be deleted
		if ( 1 === intval( $this->post['remove_files'] ) ) {
			$font = $this->fontsampler->db->get_fontset_raw( $id );
			foreach ( $this->fontsampler->font_formats as $format ) {
				if ( ! empty( $font[ $format ] ) ) {
					if ( false === wp_delete_attachment( $font[ $format ] ) ) {
						$this->fontsampler->add_info( 'Font file for format ' . $format . ' removed from Wordpress Media Gallery' );
					}
				}
			}
		} else {
			$this->fontsampler->msg->add_notice( 'Note that the font files themselves have not been removed from the Wordpress uploads folder ( Media Gallery ).' );
		}

		$res = $this->fontsampler->db->delete_font( $id );
		if ( ! $res ) {
			$this->fontsampler->db->error( 'Error: No font sets deleted' );
		} else {
			$this->fontsampler->db->delete_join( array( 'font_id' => $id ) );
			$this->fontsampler->msg->add_info( 'Font set succesfully removed. Font set also removed from any fontsamplers using it.' );
		}

		return true;
	}


	function handle_set_insert() {
		return $this->handle_set_edit( null );
	}

	function handle_set_edit( $id = null ) {
		check_admin_referer( 'fontsampler-action-edit_set' );

		// for the settings to be inserted, create a copy of the defaults with "null" values,
		// then fill from $post
		$settings     = array_map( function () {
			return null;
		}, $this->fontsampler->db->get_settings() );
		$use_defaults = intval( $this->post['use_default_options'] ) === 1;

		// if this fontsampler uses custom settings, insert them
		if ( ! $use_defaults ) {

			// set these basic submitted infos
			$settings['set_id']            = $id;
			$settings['is_ltr']            = $this->post['is_ltr'];
			$settings['alignment_initial'] = $this->post['alignment_initial'] === 'default' 
				? null : $this->post['alignment_initial'];
			$settings['initial']           = $this->post['initial'];
			$settings['ui_order']          = $this->post['ui_order'];
			$settings['ui_columns']        = $this->post['ui_columns'] == 'default'
				? null : intval( $this->post['ui_columns'] );
			$settings['notdef'] 		   = $this->post['notdef'] === "default" 
				? null : intval( $this->post['notdef'] );


			// loop through the first 3 options that have more detailed sliders associated with them
			// which in turn can rely on using defaults or adapt a custom setting as well
			// also register any non-default value for initial, which can be active even when the UI block is not
			// to allow setting a different default for the slider
			$sliders = array( 'fontsize', 'letterspacing', 'lineheight' );
			foreach ( $sliders as $slider ) {
				if ( isset( $this->post[ $slider ] ) && intval( $this->post[ $slider ] ) === 1 ) {
					$settings[ $slider ]            = 1;
					$settings[ $slider . '_label' ] = intval( $this->post[ $slider . '_use_default' ] ) === 1 ?
						null : $this->post[ $slider . '_label' ];
					$settings[ $slider . '_min' ]   = intval( $this->post[ $slider . '_min_use_default' ] ) === 1 ?
						null : $this->post[ $slider . '_min' ];
					$settings[ $slider . '_max' ]   = intval( $this->post[ $slider . '_max_use_default' ] ) === 1 ?
						null : $this->post[ $slider . '_max' ];
				}
				$settings[ $slider . '_initial' ] = intval( $this->post[ $slider . '_initial_use_default' ] ) === 1 ?
					null : $this->post[ $slider . '_initial' ];
			}

			// loop through all simple checkbox features
			$checkboxes = array(
				'sampletexts',
				'fontpicker',
				'alignment',
				'invert',
				'opentype',
				'locl',
				'multiline',
				'buy',
				'specimen'
			);
			foreach ( $checkboxes as $checkbox ) {
				if ( isset( $this->post[ $checkbox ] ) ) {
					$settings[ $checkbox ] = 1;
				}

				// exception here: sampletexts has a further subsection about using defaults or custom
				if ( $checkbox === 'sampletexts' ) {
					if ( intval( $this->post['sampletexts_use_default'] ) === 1 ) {
						$settings['sample_texts'] = null;
					} else {
						$settings['sample_texts'] = $this->post['sample_texts'];
					}

					if ( intval( $this->post['sampletexts_use_default_label'] ) === 1 ) {
						$settings['sample_texts_default_option'] = null;
					} else {
						$settings['sample_texts_default_option'] = $this->post['sample_texts_default_option'];
					}
				}

				if ( $checkbox === 'locl' ) {
					if ( intval( $this->post['locl_use_default'] ) === 1 ) {
						$settings['locl_options'] = null;
					} else {
						$settings['locl_options'] = $this->post['locl_options'];
					}

					if ( intval( $this->post['locl_use_default_label'] ) === 1 ) {
						$settings['locl_default_option'] = null;
					} else {
						$settings['locl_default_option'] = $this->post['locl_default_option'];
					}
				}
			}

			// upload buy and specimen images or set labels
			foreach ( array( 'buy', 'specimen' ) as $link ) {
				if ( $settings[ $link ] === 1 ) {
					// store the actual link value
					$settings[ $link . '_url' ] = isset( $this->post[ $link . '_url' ] )
						? $this->post[ $link . '_url' ] : null;

					// type, either a radio set to either "label" or "image", or "label_default", or "image_default"
					$type              = $link . '_type';
					$settings[ $type ] = isset( $this->post[ $type ] ) ? $this->post[ $type ] : null;

					$target              = $link . '_target';
					$settings[ $target ] = isset( $this->post[ $target ] ) ? $this->post[ $target ] : null;

					if ( false !== strpos( $settings[ $type ], '_default' ) ) {
						// selected one of the DEFAULT options:
						// replace the "_default" and set all individual values to null
						// so that the set will inherit from the defaults
						$settings[ $type ]            = str_replace( '_default', '', $settings[ $type ] );
						$settings[ $link . '_image' ] = null;
						$settings[ $link . '_label' ] = null;
					} else {
						// custom settings for this SET, save the value that corresponds to the "type" submitted
						if ( $settings[ $type ] === 'image' ) {
							$settings[ $link . '_label' ] = null;
							$settings[ $link . '_image' ] = trim( $this->post[ $link . '_image' ] );
						} else {
							$settings[ $link . '_label' ] = trim( $this->post[ $link . '_label' ] );
							$settings[ $link . '_image' ] = null;
						}
					}
				}
			}

			// loop through css colors
			// these can be gotten from default settings, all color fields start with 'css_color_...'
			$css_colors = array_filter( array_keys( $settings ), function ( $item ) {
				return substr( $item, 0, 10 ) === 'css_color_';
			} );
			foreach ( $css_colors as $key ) {
				if ( $use_defaults ) {
					$settings[ $key ] = null;
				} else {
					$settings[ $key ] = $this->post[ $key . '_use_default' ] == 1
						? null : $this->post[ $key ];
				}
			}

			// loop through css fields
			// these can be gotten from default settings, all css fields other than colors start with 'css_value_...'
			$css_colors = array_filter( array_keys( $settings ), function ( $item ) {
				return substr( $item, 0, 10 ) === 'css_value_';
			} );
			foreach ( $css_colors as $key ) {
				if ( $use_defaults ) {
					$settings[ $key ] = null;
				} else {
					$settings[ $key ] = $this->post[ $key . '_use_default' ] == 1
						? null : $this->post[ $key ];
				}
			}
		}


		// handle any possibly included inline fontset creation
		// Any items present in the fontname array indicate new fonts have been added inline and need to be
		// processed
		$inlineFontIds = array();
		if ( isset( $this->post['fontname'] ) ) {
			for ( $i = 0; $i < sizeof( $this->post['fontname'] ); $i ++ ) {
				// all inline fontset creations are with $id=null, and their offset comes
				// from how many entries there were in the fontname[] field
				array_push( $inlineFontIds, $this->font_edit( null, $i ) );
			}
		}

		$initial_font = isset( $this->post['initial_font'] ) ? $this->post['initial_font'] : null;
		if ( substr( $initial_font, 0, 6 ) == "inline" ) {
			$initial_font = $inlineFontIds[ intval( substr( $initial_font, 7 ) ) ];
		}

		// save the fontsampler set to the DB
		if ( ! isset( $id ) ) {
			// insert new
			$set = array(
				'name'         => '..',
				'initial_font' => $initial_font,
				'use_defaults' => $use_defaults ? 1 : 0
			);
			$id  = $this->fontsampler->db->insert_set( $set );

			if ( $id ) {
				$this->fontsampler->db->save_settings_for_set( $settings, $id );
				$this->fontsampler->helpers->get_custom_css( $this->fontsampler->db->get_set( $id ) );
				$this->fontsampler->msg->add_info( 'Created fontsampler with id ' . $id
				                                   . '. You can now embed it by adding this shortcode to your post or page: [fontsampler id='
				                                   . $id . ']' );
			} else {
				$this->fontsampler->msg->add_error( 'Error: Failed to create new fontsampler.' );

				return false;
			}
		} else {
			// update existing
			if ( ! $use_defaults ) {
				$this->fontsampler->db->save_settings_for_set( $settings, $id );
			} else {
				// if updating an existing set that now uses default settings but used to have
				// custom settings, delete those
				$this->fontsampler->db->delete_settings_for_set( $id );
			}
			$update = array(
				'use_defaults' => $use_defaults ? 1 : 0,
				'initial_font' => $initial_font,
			);
			$this->fontsampler->db->update_set( $update, $id );
			$this->fontsampler->helpers->write_custom_css_for_set( $this->fontsampler->db->get_set( $id ) );
			$this->fontsampler->msg->add_info( 'Fontsampler ' . $id . ' successfully updated. <a href="?page=fontsampler&subpage=set_edit&id=' .
			                                   $id . '">Edit again</a>.' );
		}

		// wipe join table for this fontsampler, then add whatever now was instructed to be saved
		$this->fontsampler->db->delete_join( array( 'set_id' => $id ) );

		// fonts_order looks something like like 3,2,1,inline_0,4 where ints are existing fonts and inline_x are
		// newly inserted fontsets; those need to get substituted with the ids that were generated above from
		// inserting them into the database
		$font_ids = array();
		if ( ! empty( $this->post['fonts_order'] ) ) {
			$fonts_order = explode( ',', $this->post['fonts_order'] );
			for ( $f = 0; $f < sizeof( $fonts_order ); $f ++ ) {
				$ordered_id = $fonts_order[ $f ];

				// if the fonts_order has not just ids, but also "inline_0" values, replace those
				// with the newly created font_ids, if indeed such a font was created as indicated by the presence of
				// that inline_x in the $inlineFontIds array
				if ( strpos( $ordered_id, "_" ) !== false ) {
					$ordered_id = array_shift( $inlineFontIds );
				}
				array_push( $font_ids, $ordered_id );
			}
		} else {
			$font_ids = $this->post['font_id'];
		}

		// filter possibly duplicate font selections, then add them into the join table
		$font_index = 0;
		foreach ( array_unique( $font_ids ) as $font_id ) {
			if ( 0 != $font_id ) {
				$this->fontsampler->db->insert_join( array(
					'set_id'  => $id,
					'font_id' => $font_id,
					'order'   => $font_index
				) );
				$font_index ++;
			}
		}

	}

	function handle_set_get_initial_font( $inlineFontIds ) {
		// store the initial font, this is either the only font, or the selected font
		if ( ! isset( $this->post['font_id'] ) || ! isset( $this->post['initial_font'] ) ) {
			return null;
		}

		if ( sizeof( array_unique( $this->post['font_id'] ) ) + sizeof( $inlineFontIds ) == 1 ) {
			// single font sent along
			if ( strpos( $this->post['initial_font'], '_' ) !== false && sizeof( $inlineFontIds ) > 0 ) {
				// the initial_font was inline uploaded, use fresh insert id
				return $inlineFontIds[0];
			} else {
				// the initial font was a existing select font, use id
				return $this->post['font_id'][0];
			}
		} else {
			// multiple fonts sent along
			if ( strpos( $this->post['initial_font'], '_' ) !== false && ! empty( $this->post['fonts_order'] ) ) {
				// the initial_font was one of the inline uploaded ones
				// reduce the fonts_order to get an array with only newly created fonts (in case there is several)
				$inline = array_filter( explode( ',', $this->post['fonts_order'] ), function ( $val ) {
					return strpos( $val, "_" ) !== false;
				} );

				// then pick that one of the newly created fonts, which has the suffix gotten from "initial_X"
				// NOTE there is a danger that two fonts were inline created and one of them fails upload, and thus
				// skews this default - but in that case one of the uploaded fonts is missing, which is the bigger
				// problem
				$tmp = array_values( $inlineFontIds );

				return $tmp[ intval( substr( $this->post['initial_font'], - 1 ) ) ];
			} else {
				// initial_font was existing one, take that id provided
				return $this->post['initial_font'];
			}
		}
	}


	function handle_set_delete() {
		if ( isset( $this->post['id'] ) ) {
			$id = (int) ( $this->post['id'] );
			if ( 'delete_set' == $this->post['action'] && isset( $id ) && is_int( $id ) && $id > 0 ) {
				check_admin_referer( 'fontsampler-action-delete_set' );
				if ( $this->fontsampler->db->delete_set( intval( $this->post['id'] ) ) ) {
					$this->fontsampler->msg->add_info( 'Deleted Fontsampler ' . $id );
				}
			}
		}
	}


	function handle_settings_edit() {
		if ( 'edit_settings' == $this->post['action'] ) {
			$data = array();

			// update the wp_option field for hiding legacy font formats
			if ( isset( $this->post['admin_hide_legacy_formats'] ) ) {
				$val = intval( $this->post['admin_hide_legacy_formats'] );
				update_option( constant( get_class( $this->fontsampler ) . "::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS" ), $val );
				$this->fontsampler->admin_hide_legacy_formats = $val;
			} else {
				update_option( constant( get_class( $this->fontsampler ) . "::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS" ), 0 );
				$this->fontsampler->admin_hide_legacy_formats = 0;
			}

			$settings_fields   = array_keys( $this->fontsampler->db->get_default_settings() );
			$checkbox_features = $this->fontsampler->helpers->get_checkbox_features();

			foreach ( $settings_fields as $field ) {
				if ( in_array( $field, $checkbox_features ) ) {
					$data[ $field ] = ( isset( $this->post[ $field ] ) && $this->post[ $field ] == 1 ) ? 1 : 0;
				} else {					
					if ( isset( $this->post[ $field ] ) ) {
						$data[ $field ] = trim( $this->post[ $field ] );
					} else {
						// if the field is not one of the UI block checkboxes
						// and it was not posted it was posted as "empty", so set it null in the db
						$data[ $field ] = null;
					}
				}
			}

			// upload buy and specimen images or set labels
			foreach ( array( 'buy', 'specimen' ) as $link ) {
				if ( $data[ $link ] === 1 ) {
					// buy_url gets stored already from above foreach loop
					// buy_type already gets stored, but remove the "_default" suffix
					$data[ $link . '_type' ] = str_replace( '_default', '', $data[ $link . '_type' ] );
					if ( empty( $data[ $link . '_type' ] ) ) {
						$data[ $link . '_type' ] = 'label';
					}
					$data[ $link . '_label' ] = $data[ $link . '_type' ] === 'label'
						? $this->post[ $link . '_label' ]
						: $this->fontsampler->settings_defaults[ $link . '_label' ]; // since this is settings, restore default if unset
					$data[ $link . '_image' ] = $data[ $link . '_type' ] === 'image'
						? $this->post[ $link . '_image' ]
						: null;
				}
			}

			$data['is_default'] = 1;
			$data['set_id']     = null;

			// explicitly save the units, since they are not yet editable and thus missing from the $post
			$data['fontsize_unit']      = $this->fontsampler->settings_defaults['fontsize_unit'];
			$data['letterspacing_unit'] = $this->fontsampler->settings_defaults['letterspacing_unit'];
			$data['lineheight_unit']    = $this->fontsampler->settings_defaults['lineheight_unit'];

			// atm no inserts, only updating the defaults
			$this->fontsampler->db->update_settings( $data );

			// rewrite any fontsampler sets that use the defaults
			$this->fontsampler->db->update_defaults( $data );

			// further generate a new settings css file
			$this->fontsampler->helpers->write_css_from_settings( $data );
		}
	}

	function handle_settings_reset() {
		if ( $this->fontsampler->db->set_default_settings() ) {
			$this->fontsampler->helpers->write_css_from_settings( $this->fontsampler->db->get_default_settings() );

			return true;
		}

		return false;
	}
}