<?php global $f; ?>

<div class="fontsampler-interface">

	<?php if (isset( $set['ui_order_parsed'] )) : ?>
	<?php foreach ( $set['ui_order_parsed'] as $row ) : ?>
		<div class="fontsampler-interface-row">
			<?php
			foreach ( $row as $item ) :
				// loop through all UI elements in order of their row placement
				// check though that each is in fact enabled and not just a left over value in the ui_order field
				// (just to be sure: for example if the set is created and ui_order falls back to its default value
				// including all fields)
				switch ( $item ) {
					case 'size':
						if ( $set['size'] ) : ?>
							<label class="fontsampler-slider">
							<span class="slider-label"><?php echo $replace['font_size_label']; ?></span>
							<span class="slider-value type-tester__label" data-target-property="font-size"></span>
							<div class="type-tester__slider" data-target-property="font-size"></div>
							</label>
							<!--
							<label class="fontsampler-slider">
								<span class="slider-label"><?php echo $replace['font_size_label']; ?></span>
						<span class="slider-value"><?php echo $replace['font_size_initial']; ?>
							&nbsp;<?php echo $replace['font_size_unit']; ?></span>
								<input type="range" min="<?php echo $replace['font_size_min']; ?>"
								       max="<?php echo $replace['font_size_max']; ?>"
								       value="<?php echo $replace['font_size_initial']; ?>"
								       data-unit="<?php echo $replace['font_size_unit']; ?>" name="font-size">
							</label>
							-->
						<?php endif;
						break;

					case 'letterspacing':
						if ( $set['letterspacing'] ) : ?>
							<label class="fontsampler-slider">
								<span class="slider-label"><?php echo $replace['letter_spacing_label']; ?></span>
								<span class="slider-value type-tester__label" data-target-property="letter-spacing"></span>
								<div class="type-tester__slider" data-target-property="letter-spacing"></div>
							</label>
							<!--
							<label class="fontsampler-slider">
								<span class="slider-label"><?php /*echo $replace['letter_spacing_label']; */?></span>
							<span class="slider-value"><?php /*echo $replace['letter_spacing_initial']; */?>
								&nbsp;<?php /*echo $replace['letter_spacing_unit']; */?></span>
								<input type="range" min="<?php /*echo $replace['letter_spacing_min']; */?>"
								       max="<?php /*echo $replace['letter_spacing_max']; */?>"
								       value="<?php /*echo $replace['letter_spacing_initial']; */?>"
								       data-unit="<?php /*echo $replace['letter_spacing_unit']; */?>"
								       name="letter-spacing">
							</label>
-->
						<?php endif;
						break;

					case 'lineheight':
						if ( $set['lineheight'] ) : ?>
							<label class="fontsampler-slider">
								<span class="slider-label"><?php echo $replace['line_height_label']; ?></span>
								<span class="slider-value type-tester__label" data-target-property="line-height"></span>
								<div class="type-tester__slider" data-target-property="line-height"></div>
							</label>
							<!--
							<label class="fontsampler-slider">
								<span class="slider-label"><?php /*echo $replace['line_height_label']; */?></span>
							<span class="slider-value"><?php /*echo $replace['line_height_initial']; */?>
								&nbsp;<?php /*echo $replace['line_height_unit']; */?></span>
								<input type="range" min="<?php /*echo $replace['line_height_min']; */?>"
								       max="<?php /*echo $replace['line_height_max']; */?>"
								       value="<?php /*echo $replace['line_height_initial']; */?>"
								       data-unit="<?php /*echo $replace['line_height_unit']; */?>" name="line-height">
							</label>
							-->
						<?php endif;
						break;
					case 'fontpicker':
						if ( sizeof( $fonts ) > 1 ) : ?>
							<!--
							<select name="font-selector">
								<?php /*foreach ( $fonts as $font ) : */?>
									<option data-font-files='<?php /*echo $f->fontfiles_json( $font ); */?>'
									<?php /*if ( isset( $set['initial_font'] ) && $set['initial_font'] == $font['id'] ) :
										echo 'selected="selected"'; endif; */?>>
										<?php /*echo $font['name']; */?></option>
								<?php /*endforeach; */?>
							</select>
							-->

							<div class="font-lister"></div>
						<?php endif;
						break;

					case 'sampletexts':
						$samples = explode( "\n", $replace['sample_texts'] );
						if ( $set['sampletexts'] ) : ?>
							<select name="sample-text">
								<option value="Select a sample text">Select a sample text</option>
								<?php foreach ( $samples as $sample ) : ?>
									<option value="<?php echo $sample; ?>"><?php echo $sample; ?></option>
								<?php endforeach; ?>
							</select>
						<?php endif;
						break;

					case 'options':
						if ( $set['alignment'] ) : ?>
							<div class="fontsampler-multiselect three-items" data-name="alignment">
								<button <?php if ( isset( $set['is_ltr']) && $set['is_ltr'] == "1" ) : echo 'class="fontsampler-multiselect-selected"'; endif; ?>
										data-value="left"><img
										src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-left.svg">
								</button>
								<button data-value="center"><img
										src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-center.svg">
								</button>
								<button <?php if ( isset( $set['is_ltr']) && $set['is_ltr'] == "0" ) : echo 'class="fontsampler-multiselect-selected"'; endif; ?>
										data-value="right"><img
										src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-right.svg">
								</button>
							</div>
						<?php endif;
						if ( $set['invert'] ) : ?>
							<div class="fontsampler-multiselect two-items" data-name="invert">
								<button class="fontsampler-multiselect-selected" data-value="positive"><img
										src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/invert-white.svg">
								</button>
								<button data-value="negative"><img
										src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/invert-black.svg">
								</button>
							</div>
						<?php endif;

						if ( $set['ot_liga'] || $set['ot_dlig'] || $set['ot_hlig'] || $set['ot_calt'] ||
						     $set['ot_frac'] || $set['ot_sups'] || $set['ot_subs']
						) : ?>
							<div class="fontsampler-multiselect one-item fontsampler-opentype">

								<button class="fontsampler-opentype-toggle">O</button>

								<div class="feature-lister fontsampler-opentype-features"></div>

							</div>
						<?php endif;
						break;

					case 'fontsampler':
						// NOTE echo with " and class with ' to output json as ""-enclosed strings

						// find the initial font, if one is set, and encode it as json for the fontsampler to start
						// up with
						$initial_font = NULL;
						if ( isset( $set['initial_font'] ) && ! empty( $set['initial_font'] ) ) {
							$initial_font = array_filter( $fonts, function ( $font ) use ( $set ) {
								return ( isset( $font['id'] ) && $font['id'] == $set['initial_font'] );
							} );
							$initial_font = array_shift($initial_font);
						} else {
							$initial_font = $fonts[0];
						}
						$initial_font_json = $this->fontfiles_json( $initial_font );

						if ( isset( $set['multiline'] ) && $set['multiline'] == 1) {
							preg_replace( '/\n/', ' ', $set['initial'] );
							$initial_text = $set['initial'];
						} else {
							$initial_text = str_replace( '\n', '<br>', $set['initial'] );
						}

						?>


							<!--<h2 class="mdl-card__title-text">Test the Font</h2>
							<h5>Default Features</h5>
							<div class="type-tester__features--default"></div>
							<h5>Optional Features</h5>
							<div class="type-tester__features--optional"></div>-->

							<div class="current-font type-tester__content" contenteditable="true"
							<?php if ( ! isset( $set['multiline'] ) || ( isset( $set['multiline'] )
								&& $set['multiline'] != "1" ) ) :
								echo 'fontsampler-is-singleline'; endif; ?>"><?php echo $initial_text; ?></div>



						<!--
						<div class="fontsampler fontsampler-id-<?php echo $set['id']; ?>
							<?php if ( ! isset( $set['multiline'] ) || ( isset( $set['multiline'] ) && $set['multiline'] != "1" ) ) :
							 echo 'fontsampler-is-singleline'; endif; ?>"
						     data-options='<?php echo json_encode($replace); ?>'
							 data-font-files='<?php echo $initial_font_json; ?>'
							 dir="<?php echo ( ! isset( $set['is_ltr'] ) || $set['is_ltr'] == '1' ) ? 'ltr' : 'rtl'; ?>"
						><?php echo $initial_text; ?>
						</div>-->
						<?php
						break;

					default:
						break;
				}
			endforeach;
			?>
		</div>
	<?php endforeach; ?>
<?php endif; ?>
</div>