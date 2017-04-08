<div class="type-tester"
     data-min-font-size="<?php echo $options['font_size_min']; ?>"
     data-max-font-size="<?php echo $options['font_size_max']; ?>"
     data-unit-font-size="<?php echo $options['font_size_unit']; ?>"
     data-value-font-size="<?php echo $options['font_size_initial']; ?>"
     data-step-font-size="1"

     data-min-letter-spacing="<?php echo $options['letter_spacing_min']; ?>"
     data-max-letter-spacing="<?php echo $options['letter_spacing_max']; ?>"
     data-unit-letter-spacing="<?php echo $options['letter_spacing_unit']; ?>"
     data-value-letter-spacing="<?php echo $options['letter_spacing_initial']; ?>"
     data-step-letter-spacing="1"

     data-min-line-height="<?php echo $options['line_height_min']; ?>"
     data-max-line-height="<?php echo $options['line_height_max']; ?>"
     data-unit-line-height="<?php echo $options['line_height_unit']; ?>"
     data-value-line-height="<?php echo $options['line_height_initial']; ?>"
     data-step-line-height="1">

	<div class="fontsampler-interface columns-<?php echo $set['ui_columns'];
	echo ' fontsampler-id-' . $set['id']; ?>">

		<?php

		foreach ( $blocks as $item => $class ) :
			// loop through all UI elements in order of their row placement
			// check though that each is in fact enabled and not just a left over value in the ui_order field
			// (just to be sure: for example if the set is created and ui_order falls back to its default value
			// including all fields)

			if ( $item == "|" ) {
				echo '<div class="fontsampler-interface-row-break"></div>';
			} else {
				echo '<div class="fontsampler-ui-block ' . $class . ' fontsampler-ui-block-' . $item . '" 
				data-block="' . $item . '">';

				switch ( $item ) {

					case 'size':
						if ( $set['size'] ) : ?>
							<label class="fontsampler-slider">
								<span class="slider-label"><?php echo $options['font_size_label']; ?></span>
								<span class="slider-value type-tester__label" data-target-property="font-size"></span>
								<div class="type-tester__slider" data-target-property="font-size"></div>
							</label>
						<?php endif;
						break;

					case 'letterspacing':
						if ( $set['letterspacing'] ) : ?>
							<label class="fontsampler-slider">
								<span class="slider-label"><?php echo $options['letter_spacing_label']; ?></span>
								<span class="slider-value type-tester__label"
								      data-target-property="letter-spacing"></span>
								<div class="type-tester__slider" data-target-property="letter-spacing"></div>
							</label>
						<?php endif;
						break;

					case 'lineheight':
						if ( $set['lineheight'] ) : ?>
							<label class="fontsampler-slider">
								<span class="slider-label"><?php echo $options['line_height_label']; ?></span>
								<span class="slider-value type-tester__label" data-target-property="line-height"></span>
								<div class="type-tester__slider" data-target-property="line-height"></div>
							</label>
						<?php endif;
						break;

					case 'fontpicker':
						if ( $set['fontpicker'] ) :
							if ( sizeof( $fonts ) > 1 ) : ?>
								<div class="font-lister"></div>
							<?php else: ?>
								<div class="fontsampler-font-label"><label></label></div>
							<?php endif; ?>
						<?php endif;
						break;

					case 'sampletexts':
						$samples = explode( "\n", $options['sample_texts'] );
						if ( $set['sampletexts'] ) : ?>
							<select name="sample-text">
								<option value="Select a sample text">Select a sample text</option>
								<?php foreach ( $samples as $sample ) : ?>
									<option value="<?php echo $sample; ?>"><?php echo $sample; ?></option>
								<?php endforeach; ?>
							</select>
						<?php endif;
						break;

					case 'alignment':
						if ( $set['alignment'] ) :
							$is_ltr = isset( $set['is_ltr'] ) && $set['is_ltr'] == "1";
							?>
							<div class="fontsampler-multiselect three-items" data-name="alignment">
								<button <?php if ( $is_ltr && $options['alignment_initial'] == "left" ) :
									echo 'class="fontsampler-multiselect-selected"'; endif; ?>
									data-value="left"><img
										src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-left.svg">
								</button>
								<button <?php if ( $options['alignment_initial'] == "center" ) :
									echo 'class="fontsampler-multiselect-selected"'; endif; ?>
									data-value="center"><img
										src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-center.svg">
								</button>
								<button <?php if ( ! $is_ltr || $options['alignment_initial'] == "right" ) :
									echo 'class="fontsampler-multiselect-selected"'; endif; ?>
									data-value="right"><img
										src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/align-right.svg">
								</button>
							</div>
						<?php endif;
						break;

					case 'invert':
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
						break;

					case 'opentype':
						if ( $set['opentype'] ) : ?>
							<div class="fontsampler-multiselect one-item fontsampler-opentype feature-lister"
							     data-name="opentype">
								<button class="fontsampler-opentype-toggle">
									<img src="<?php echo plugin_dir_url( __FILE__ ); ?>../icons/opentype.svg">
								</button>
								<div class="fontsampler-opentype-features">
									<fieldset class="feature-lister__features--default"></fieldset>
									<fieldset class="feature-lister__features--optional"></fieldset>
								</div>
							</div>
						<?php endif;
						break;

					case 'buy':
						if ( $set['buy'] && ! empty( $set['buy_url'] ) ) : ?>
							<a href="<?php echo $set['buy_url']; ?>" target="_blank">
								<?php
								if ( $set['buy_image'] ):
									$image_src = wp_get_attachment_image_src( $set['buy_image'], 'full' );
									?>
									<img class="fontsampler-interface-link-image"
									     src="<?php echo $image_src[0]; ?>"
									     alt="<?php echo $set['buy_label']; ?>">
								<?php else: ?>
									<span class="fontsampler-interface-link-text"
									><?php echo $set['buy_label']; ?></span>
								<?php endif; ?>
							</a>
						<?php endif;
						break;

					case 'specimen':
						if ( $set['specimen'] && ! empty( $set['specimen_url'])) : ?>
							<a href="<?php echo $set['specimen_url']; ?>" target="_blank">
								<?php
								if ( $options['specimen_image'] ):
									$image_src = wp_get_attachment_image_src( $options['specimen_image'], 'full' );
									?>
									<img class="fontsampler-interface-link-image"
									     src="<?php echo $image_src[0]; ?>"
									     alt="<?php echo $options['specimen_label']; ?>">
								<?php else: ?>
									<span
										class="fontsampler-interface-link-text"><?php echo $options['specimen_label']; ?></span>
								<?php endif; ?>
							</a>
						<?php endif;
						break;

					case 'fontsampler':
						// NOTE echo with " and class with ' to output json as ""-enclosed strings

						$initial_text_db = isset( $set['initial'] ) ? $set['initial'] : "";
						if ( isset( $set['multiline'] ) && $set['multiline'] == 1 ) {
							$initial_text = str_replace( "\n", '<br>', $initial_text_db );
						} else {
							$initial_text = preg_replace( '/\n/', ' ', $initial_text_db );
						}
						?>
						<div autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
						     class="current-font type-tester__content <?php
						     if ( ! isset( $set['multiline'] ) ||
						          ( isset( $set['multiline'] ) && $set['multiline'] != "1" )
						     ) :
							     echo ' fontsampler-is-singleline';

						     endif; ?>"
						     contenteditable="true"
							<?php if ( ! $set['is_ltr'] ): echo ' dir="rtl" '; endif; ?>

							 style="text-align: <?php echo $set['alignment_initial']; ?>;"
						><?php echo $initial_text; ?></div>

						<?php
						break;

					default:
						break;
				}
				echo '</div>';
			}


		endforeach;
		?>
	</div>
</div>