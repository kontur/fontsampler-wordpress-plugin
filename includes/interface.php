<?php /*<div class="type-tester"
     data-min-font-size="<?php echo $data_initial['fontsize_min']; ?>"
     data-max-font-size="<?php echo $data_initial['fontsize_max']; ?>"
     data-unit-font-size="<?php echo $data_initial['fontsize_unit']; ?>"
     data-value-font-size="<?php echo $data_initial['fontsize_initial']; ?>"
     data-step-font-size="1"

     data-min-letter-spacing="<?php echo isset($data_initial['letterspacing_min']) ? $data_initial['letterspacing_min'] : ''; ?>"
     data-max-letter-spacing="<?php echo isset($data_initial['letterspacing_max']) ? $data_initial['letterspacing_max'] : ''; ?>"
     data-unit-letter-spacing="<?php echo isset($data_initial['letterspacing_unit']) ? $data_initial['letterspacing_unit'] : ''; ?>"
     data-value-letter-spacing="<?php echo isset($data_initial['letterspacing_initial']) ? $data_initial['letterspacing_initial'] : ''; ?>"
     data-step-letter-spacing="1"

     data-min-line-height="<?php echo $data_initial['lineheight_min']; ?>"
     data-max-line-height="<?php echo $data_initial['lineheight_max']; ?>"
     data-unit-line-height="<?php echo $data_initial['lineheight_unit']; ?>"
     data-value-line-height="<?php echo $data_initial['lineheight_initial']; ?>"
     data-step-line-height="1" >
     */?>

	<div class="fontsampler-interface columns-<?php echo !empty($set['ui_columns']) ? $set['ui_columns'] : '3';
    echo ' fontsampler-id-' . $set['id']; ?>" data-fontsampler-id="<?php echo $set['id']; ?>">

		<?php

        foreach ($blocks as $item => $class) :

            if ($item === 'fontpicker') {
                $item = 'fontfamily';
            }
            if ($item === 'fontsampler') {
                $item = 'tester';
            }
            if ($item === 'invert') {
                $class .= ' fsjs-block-type-buttongroup ';
            }

        foreach ($blocks as $item => $class) :
            // loop through all UI elements in order of their row placement
            // check though that each is in fact enabled and not just a left over value in the ui_order field
            // (just to be sure: for example if the set is created and ui_order falls back to its default value
            // including all fields)

            if ($item == '|') {
                echo '<div class="fontsampler-interface-row-break"></div>';
            } else {
                echo '<div class="fontsampler-ui-block ' . $class . ' fontsampler-ui-block-' . $item . '-wrapper fsjs-block" 
				data-fsjs-block="' . $item . '">';

                switch ($item) {
                    case 'fontsize':
                        if ($set['fontsize']) : ?>
							<label class="fontsampler-slider">
								<span class="fontsampler-slider-header">
									<span class="slider-label"><?php echo !empty($set['fontsize_label']) ? $set['fontsize_label'] : $options['fontsize_label']; ?></span>
									<span class="slider-value type-tester__label" data-target-property="font-size"></span>
								</span>
								<div class="type-tester__slider" data-target-property="font-size" 
									<?php if (is_rtl()): ?> data-direction="rtl" <?php endif; ?>></div>
							</label>
						<?php endif;
                        break;

                    case 'letterspacing':
                        if ($set['letterspacing']) : ?>
							<label class="fsjs-label" data-fsjs-for="letterspacing">
								<span class="fsjs-label-text"><?php echo !empty($set['letterspacing_label']) ? $set['letterspacing_label'] : $options['letterspacing_label']; ?></span>
								<span class="fsjs-label-value"></span>
								<span class="fsjs-label-unit"></span>
							</label>
							<input type="range" data-fsjs="letterspacing">
						<?php endif;
                        break;

                    case 'lineheight':
                        if ($set['lineheight']) : ?>
							<label class="fsjs-label" data-fsjs-for="lineheight">
								<span class="fsjs-label-text"><?php echo !empty($set['lineheight_label']) ? $set['lineheight_label'] : $options['lineheight_label']; ?></span>
								<span class="fsjs-label-value"></span>
								<span class="fsjs-label-unit"></span>
							</label>
							<input type="range" data-fsjs="lineheight">
						<?php endif;
                        break;

                    case 'fontpicker':
                        if ($set['fontpicker']) :
                            if (isset($fonts) && is_array($fonts) && sizeof($fonts) > 1) : ?>
								<div class="font-lister"></div>
							<?php else: ?>
								<div class="fontsampler-font-label"><label></label></div>
							<?php endif; ?>
						<?php endif;
                        break;

					case 'sampletexts':
						$samples = !empty($set['sample_texts']) ? $set['sample_texts'] : $options['sample_texts'];
						if ($samples) {
							$samples = explode( "\n", $samples );
						}						
						if ( $set['sampletexts'] ) : ?>
							<select name="sample-text">
								<?php /* translators: The first and visible entry in the sample text drop down in the frontend */ ?>
								<option selected="selected"><?php echo !empty( $set['sample_texts_default_option'] ) ? $set['sample_texts_default_option'] : $options['sample_texts_default_option']; ?></option>
								<?php if ($samples): foreach ( $samples as $sample ) : ?>
									<option value="<?php echo $sample; ?>"><?php echo $sample; ?></option>
								<?php endforeach; endif; ?>
							</select>
						<?php endif;
						break;

                    case 'locl':
                        $locl_options = !empty($set['locl_options']) ? $set['locl_options'] : $options['locl_options'];

                        if (!empty($locl_options)) {
                            $locales = explode("\n", $locl_options);
                            $locales = array_map(function ($item) {
                                return explode('|', $item);
                            }, $locales); ?>

							<select name="locl-select">
								<option selected="selected" value=""><?php echo !empty($set['locl_default_option']) ? $set['locl_default_option'] : $options['locl_default_option']; ?></option>
								<?php foreach ($locales as $locl) : ?>
									<option value="<?php echo trim($locl[0]); ?>"><?php echo trim($locl[1]); ?></option>
								<?php endforeach; ?>
							</select>							
					<?php
                        }
                        break;

                    case 'alignment':
                        if ($set['alignment']) :
                            $is_ltr = isset($set['is_ltr']) && $set['is_ltr'] == '1';
                            ?>
							<div class="fontsampler-multiselect three-items" data-fsjs="alignment">
								<button data-choice="left"><i class="icon-align-left"></i></button>
								<button data-choice="center"><i class="icon-align-center"></i></button>
								<button data-choice="right"><i class="icon-align-right"></i></button>
							</div>
						<?php endif;
                        break;

                    case 'invert':
                        if ($set['invert']) : ?>
							<div class="fontsampler-multiselect two-items" data-fsjs="invert" data-name="invert">
								<button data-choice="positive"><i class="icon-invert-white"></i></button>
								<button data-choice="negative"><i class="icon-invert-black"></i></button>
							</div>
						<?php endif;
                        break;

                    case 'opentype':
                        if ($set['opentype']) : ?>
							<div class="fontsampler-multiselect one-item fontsampler-opentype feature-lister fsjs-block-type-checkboxes"
							     data-name="opentype">
								<button class="fontsampler-opentype-toggle fsjs-button">
									<i class="icon-opentype"></i>
								</button>
								<div class="fontsampler-opentype-features" data-fsjs="opentype">
									<label><input type="checkbox" data-feature="liga" checked="checked"><span>Ligatures</span></label>
								</div>
							</div>
						<?php endif;
                        break;

                    case 'tester':
                        // NOTE echo with " and class with ' to output json as ""-enclosed strings

                        $initial_text_db = isset($set['initial']) ? $set['initial'] : '';
                        if (isset($set['multiline']) && $set['multiline'] == 1) {
                            $initial_text = str_replace("\n", '<br>', $initial_text_db);
                        } else {
                            $initial_text = preg_replace('/\n/', ' ', $initial_text_db);
                        }

                        // if the shortcode had a [ text=""] attribute passed in, use that overwrite
                        if (isset($attribute_text) && $attribute_text !== null) {
                            $initial_text = $attribute_text;
                        }
                        ?>
						<div autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
						    class="current-font type-tester__content <?php
                            if (!isset($set['multiline']) ||
                                  (isset($set['multiline']) && $set['multiline'] != '1')
                            ) :
                                echo ' fontsampler-is-singleline';

                            endif; ?>"
						    contenteditable="true"
							<?php if (!$set['is_ltr']): echo ' dir="rtl" '; endif; ?>

							style="text-align: <?php echo isset($set['alignment_initial']) ? $set['alignment_initial'] : ''; ?>;
								<?php if (isset($data_initial)): ?>
								    font-size: <?php echo $data_initial['fontsize_initial'] . $data_initial['fontsize_unit']; ?>;
								    letter-spacing: <?php echo $data_initial['letterspacing_initial'] . $data_initial['letterspacing_unit']; ?>;
								    line-height: <?php echo $data_initial['lineheight_initial'] . $data_initial['lineheight_unit']; ?>;"
								<?php endif; ?>
							data-notdef="<?php echo isset($set['notdef']) && $set['notdef'] !== null ? $set['notdef'] : $options['notdef']; ?>"
						
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