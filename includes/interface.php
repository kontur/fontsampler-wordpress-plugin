<?php global $f; ?>

<div class="type-tester"
	data-min-font-size="<?php echo $replace['font_size_min']; ?>"
	data-max-font-size="<?php echo $replace['font_size_max']; ?>"
	data-unit-font-size="<?php echo $replace['font_size_unit']; ?>"
	data-value-font-size="<?php echo $replace['font_size_initial']; ?>"
	data-step-font-size="1"

	data-min-letter-spacing="<?php echo $replace['letter_spacing_min']; ?>"
	data-max-letter-spacing="<?php echo $replace['letter_spacing_max']; ?>"
	data-unit-letter-spacing="<?php echo $replace['letter_spacing_unit']; ?>"
	data-value-letter-spacing="<?php echo $replace['letter_spacing_initial']; ?>"
	data-step-letter-spacing="1"

	data-min-line-height="<?php echo $replace['line_height_min']; ?>"
	data-max-line-height="<?php echo $replace['line_height_max']; ?>"
	data-unit-line-height="<?php echo $replace['line_height_unit']; ?>"
	data-value-line-height="<?php echo $replace['line_height_initial']; ?>"
	data-step-line-height="1">

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
						<?php endif;
						break;

					case 'letterspacing':
						if ( $set['letterspacing'] ) : ?>
							<label class="fontsampler-slider">
								<span class="slider-label"><?php echo $replace['letter_spacing_label']; ?></span>
								<span class="slider-value type-tester__label" data-target-property="letter-spacing"></span>
								<div class="type-tester__slider" data-target-property="letter-spacing"></div>
							</label>
						<?php endif;
						break;

					case 'lineheight':
						if ( $set['lineheight'] ) : ?>
							<label class="fontsampler-slider">
								<span class="slider-label"><?php echo $replace['line_height_label']; ?></span>
								<span class="slider-value type-tester__label" data-target-property="line-height"></span>
								<div class="type-tester__slider" data-target-property="line-height"></div>
							</label>
						<?php endif;
						break;

					case 'fontpicker':
						if ( sizeof( $fonts ) > 1 ) : ?>
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
						if ( $set['opentype']) : ?>
							<div class="fontsampler-multiselect one-item fontsampler-opentype feature-lister"
							     data-name="opentype">
								<button class="fontsampler-opentype-toggle">O</button>
								<div class="fontsampler-opentype-features">
									<fieldset class="feature-lister__features--default"></fieldset>
									<fieldset class="feature-lister__features--optional"></fieldset>
								</div>
							</div>
						<?php endif;
						break;

					case 'fontsampler':
						// NOTE echo with " and class with ' to output json as ""-enclosed strings

						if ( isset( $set['multiline'] ) && $set['multiline'] == 1) {
							preg_replace( '/\n/', ' ', $set['initial'] );
							$initial_text = $set['initial'];
						} else {
							$initial_text = str_replace( '\n', '<br>', $set['initial'] );
						}

						?>

						<div class="current-font type-tester__content<?php
							if ( ! isset( $set['multiline'] ) ||
							     ( isset( $set['multiline'] ) && $set['multiline'] != "1" ) ) :
								echo ' fontsampler-is-singleline';
							endif; ?>" contenteditable="true"
						><?php echo $initial_text; ?></div>

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
</div>