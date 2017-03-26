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
	private $boolean_options;

	function __construct( $fontsampler, $post, $files ) {
		$this->fontsampler = $fontsampler;
		$this->post        = $post;
		$this->files       = $files;

		$this->boolean_options = array(
			'size',
			'letterspacing',
			'lineheight',
			'sampletexts',
			'alignment',
			'invert',
			'opentype',
			'multiline',
			'fontpicker',
		);
	}


	function handle_font_insert() {
		return $this->handle_font_edit( null );
	}


	function handle_font_edit( $id = null ) {
		check_admin_referer( 'fontsampler-action-edit_font' );
		if ( ! empty( $this->post['fontname'][0] ) ) {
			$this->upload_multiple_fontset_files( $this->post['fontname'], $id );
		}

		return true;
	}


	/**
	 * TODO: possibly also remove font file from wp media gallery?
	 *
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

		$res = $this->fontsampler->db->delete_font( $id );
		if ( ! $res ) {
			$this->fontsampler->db->error( 'Error: No font sets deleted' );
		} else {
			$this->fontsampler->db->delete_join( array( 'font_id' => $id ) );
			$this->fontsampler->msg->info( 'Font set succesfully removed. Font set also removed from any fontsamplers using it.' );
			$this->fontsampler->msg->notice( 'Note that the font files themselves have not been removed from the Wordpress uploads folder ( Media Gallery ).' );
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
		$settings = array_map(function () {
			return null;
		}, $this->fontsampler->db->get_settings());
		$use_defaults = intval( $this->post['use_default_options'] ) === 1;

		// if this fontsampler uses custom settings, insert them
		if ( !$use_defaults ) {

			$settings['set_id'] = $id;
			$settings['is_ltr'] = $this->post['is_ltr'];
			$settings['initial'] = $this->post['initial'];

			$sliders = array('font_size', 'letter_spacing', 'line_height');
			foreach ( $sliders as $slider ) {
				if ( isset( $this->post[ $slider ] ) ) {
					$settings[ $slider ] = 1;
					$settings[ $slider . '_label' ] = intval( $this->post[ $slider . '_use_default' ] ) === 1 ?
						null : $this->post[ $slider . '_label' ];
					$settings[ $slider . '_min' ] = intval( $this->post[ $slider . '_min_use_default' ] ) === 1 ?
						null : $this->post[ $slider . '_min_value'];
					$settings[ $slider . '_initial' ] = intval( $this->post[ $slider . '_initial_use_default' ] ) === 1 ?
						null : $this->post[ $slider . '_initial_value'];
					$settings[ $slider . '_max' ] = intval( $this->post[ $slider . '_max_use_default' ] ) === 1 ?
						null : $this->post[ $slider . '_max_value'];
				}
			}

			var_dump($this->post);

			$checkboxes = array('sampletexts', 'fontpicker', 'alignment', 'invert', 'opentype', 'multiline');
			foreach ( $checkboxes as $checkbox ) {
				if ( isset( $this->post[ $checkbox ] ) ) {
					$settings[ $checkbox ] = 1;
				}
			}
			var_dump($settings);
		}

		// save the fontsampler set to the DB
		if ( ! isset( $id ) ) {
			// insert new
			$set = array(
				'name'         => '..',
				'initial_font' => isset( $this->post['initial_font'] ) ? $this->post['initial_font'] : null,
				'use_defaults' => $use_defaults ? 1 : 0
			);
			$id = $this->fontsampler->db->insert_set($set);

			if ( $id ) {
				$this->fontsampler->db->save_settings_for_set( $settings, $id );
				$this->fontsampler->msg->info( 'Created fontsampler with id ' . $id
				                               . '. You can now embed it in your posts or pages by adding [fontsampler id='
				                               . $id . '].' );
			} else {
				$this->fontsampler->msg->error( 'Error: Failed to create new fontsampler.' );
				return false;
			}
		} else {
			// update existing
			if ( !$use_defaults ) {
				$this->fontsampler->db->save_settings_for_set( $settings, $id );
			} else {
				// if updating an existing set that now uses default settings but used to have
				// custom settings, delete those
				$this->fontsampler->db->delete_settings_for_set( $id );
			}
			$this->fontsampler->db->update_set( array( 'use_defaults' => $use_defaults ? 1 : 0 ), $id );
			$this->fontsampler->msg->info('Fontsampler ' . $id . ' successfully updated.');
		}

		// wipe join table for this fontsampler, then add whatever now was instructed to be saved
		$this->fontsampler->db->delete_join( array( 'set_id' => $id ) );


		// handle any possibly included inline fontset creation
		// Any items present in the fontname array indicate new fonts have been added inline and need to be
		// processed
		$inlineFontIds = array();
		if ( isset( $this->post['fontname'] ) ) {
			$inlineFontIds = $this->upload_multiple_fontset_files( $this->post['fontname'] );
		}


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


	/**
	 * Handles uploading and inserting one or more fontset's fonts (woff2, woff, etc) from the $this->files array
	 *
	 * @param $names : array of name fields
	 * @param $id    : id of the db font entry, if it is an existing one that should be updated
	 *
	 * @return: array of font ids inserted to the database
	 */
	function upload_multiple_fontset_files( $names, $id = null ) {
		$num_names = sizeof( $names );

		if ( $num_names === 1 ) {
			// single font, i.e. only one inline font, or create font dialog
			return array( $this->upload_fontset_files( $names[0], 0, $id ) );
		} else {
			// multiple fonts posted for saving
			$created = array();
			for ( $i = 0; $i < $num_names; $i ++ ) {
				$name = $names[ $i ];
				array_push( $created, $this->upload_fontset_files( $name, $i, $id ) );
			}

			return $created;
		}
	}


	/**
	 * Handles uploading and inserting ONE fontset's fonts (woff2, woff, etc) from the $this->files array
	 *
	 * @param $name
	 * @param int $file_suffix
	 * @param int $id : id of the db font entry, if it is an existing one that should be updated
	 *
	 * @return int or boolean: inserted fontset database id or false
	 */
	function upload_fontset_files( $name, $file_suffix = 0, $id = null ) {
		$data = array(
			'name' => $name,
		);

		if ( null !== $id ) {
			// initially set all formats to NULL
			// if there previously there was a font, and now it got deleted,
			// it will not linger in the db as unaffected
			// column, but instead get deleted
			$data = array_merge( $data, array(
				'woff2' => null,
				'woff'  => null,
				'eot'   => null,
				'ttf'   => null,
			) );
		}

		foreach ( $this->fontsampler->font_formats as $label ) {
			$file = $this->files[ $label . '_' . $file_suffix ];

			if ( ! empty( $file ) && $file['size'] > 0 ) {
				$uploaded = media_handle_upload( $label . '_' . $file_suffix, 0);
//				, null, array(
//					'mimes' => get_allowed_mime_types(),
//					'validate' =>
//				) );

				if ( is_wp_error( $uploaded ) ) {
					$this->fontsampler->msg->error( 'Error uploading ' . $label . ' file: ' . $uploaded->get_error_message() );
				} else {
					$this->fontsampler->msg->info( 'Uploaded ' . $label . ' file: ' . $file['name'] );
					$data[ $label ] = $uploaded;
				}
			} else {
				if ( in_array( $label, $this->fontsampler->font_formats_legacy ) && ! $this->fontsampler->admin_hide_legacy_formats ) {
					$this->fontsampler->msg->notice( 'No ' . $label . ' file provided. You can still add it later.' );
				}
			}
		}

		if ( null !== $id ) {
			$this->fontsampler->db->update_font( $data, $id );

			return $id;
		} else {
			if ( $this->fontsampler->db->insert_font( $data ) ) {
				$this->fontsampler->msg->info( 'Created fontset ' . $name );

				return $this->fontsampler->db->get_insert_id();
			}
		}

		return false;
	}


	function handle_set_delete() {
		if ( isset( $this->post['id'] ) ) {
			$id = (int) ( $this->post['id'] );
			if ( 'delete_set' == $this->post['action'] && isset( $id ) && is_int( $id ) && $id > 0 ) {
				check_admin_referer( 'fontsampler-action-delete_set' );
				if ( $this->fontsampler->db->delete_set( intval( $this->post['id'] ) ) ) {
					$this->fontsampler->msg->info( 'Deleted Fontsampler ' . $id );
				}
			}
		}
	}


	function handle_settings_edit() {
		// no settings ID's for now, just one default row
		if ( isset( $this->post['id'] ) ) {
			$id = (int) ( $this->post['id'] );
			if ( 'edit_settings' == $this->post['action'] && isset( $id ) && is_int( $id ) && $id > 0 ) {
				// update the wp_option field for hiding legacy font formats
				if ( isset( $this->post['admin_hide_legacy_formats'] ) ) {
					$val = intval( $this->post['admin_hide_legacy_formats'] );
					update_option( constant( get_class( $this->fontsampler ) . "::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS" ), $val );
					$this->fontsampler->admin_hide_legacy_formats = $val;
				} else {
					update_option( constant( get_class( $this->fontsampler ) . "::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS" ), 0 );
					$this->fontsampler->admin_hide_legacy_formats = 0;
				}

				$settings_fields = array_keys( $this->fontsampler->settings_defaults );

				$data = array();
				foreach ( $settings_fields as $field ) {
					if ( in_array( $field, $this->fontsampler->default_features ) ) {
						$data[ $field ] = isset( $this->post[ $field ] ) ? 1 : 0;
					} else {
						if ( isset( $this->post[ $field ] ) ) {
							$data[ $field ] = trim( $this->post[ $field ] );
						}
					}
				}

				// atm no inserts, only updating the defaults
				$this->fontsampler->db->update_settings( $data );

				// rewrite any fontsampler sets that use the defaults
				$this->fontsampler->db->update_defaults( $data );

				// further generate a new settings css file
				$this->fontsampler->helpers->write_css_from_settings( $data );
			}
		}
	}
}