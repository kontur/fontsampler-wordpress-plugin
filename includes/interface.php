<div class="type-tester"
     data-min-font-size="<?php echo $data_initial['fontsize_min']; ?>"
     data-max-font-size="<?php echo $data_initial['fontsize_max']; ?>"
     data-unit-font-size="<?php echo $data_initial['fontsize_unit']; ?>"
     data-value-font-size="<?php echo $data_initial['fontsize_initial']; ?>"
     data-step-font-size="1"

     data-min-letter-spacing="<?php echo $data_initial['letterspacing_min']; ?>"
     data-max-letter-spacing="<?php echo $data_initial['letterspacing_max']; ?>"
     data-unit-letter-spacing="<?php echo $data_initial['letterspacing_unit']; ?>"
     data-value-letter-spacing="<?php echo $data_initial['letterspacing_initial']; ?>"
     data-step-letter-spacing="1"

     data-min-line-height="<?php echo $data_initial['lineheight_min']; ?>"
     data-max-line-height="<?php echo $data_initial['lineheight_max']; ?>"
     data-unit-line-height="<?php echo $data_initial['lineheight_unit']; ?>"
     data-value-line-height="<?php echo $data_initial['lineheight_initial']; ?>"
     data-step-line-height="1">

	<div class="fontsampler-interface columns-<?php echo $set['ui_columns'];
    echo ' fontsampler-id-' . $set['id']; ?>">

		<?php

        foreach ($blocks as $item => $class) :
            // loop through all UI elements in order of their row placement
            // check though that each is in fact enabled and not just a left over value in the ui_order field
            // (just to be sure: for example if the set is created and ui_order falls back to its default value
            // including all fields)

            if ($item == '|') {
                echo '<div class="fontsampler-interface-row-break"></div>';
            } else {
                echo '<div class="fontsampler-ui-block ' . $class . ' fontsampler-ui-block-' . $item . '" 
				data-block="' . $item . '">';

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
							<label class="fontsampler-slider">
								<span class="fontsampler-slider-header">
									<span class="slider-label"><?php echo !empty($set['letterspacing_label']) ? $set['letterspacing_label'] : $options['letterspacing_label']; ?></span>
									<span class="slider-value type-tester__label" data-target-property="letter-spacing"></span>
								</span>
								<div class="type-tester__slider" data-target-property="letter-spacing" 
									<?php if (is_rtl()): ?> data-direction="rtl" <?php endif; ?>></div>
							</label>
						<?php endif;
                        break;

                    case 'lineheight':
                        if ($set['lineheight']) : ?>
							<label class="fontsampler-slider">
								<span class="fontsampler-slider-header">
									<span class="slider-label"><?php echo !empty($set['lineheight_label']) ? $set['lineheight_label'] : $options['lineheight_label']; ?></span>
									<span class="slider-value type-tester__label" data-target-property="line-height"></span>
								</span>
								<div class="type-tester__slider" data-target-property="line-height" 
									<?php if (is_rtl()): ?> data-direction="rtl" <?php endif; ?>></div>
							</label>
						<?php endif;
                        break;

                    case 'fontpicker':
                        if ($set['fontpicker']) :
                            if (sizeof($fonts) > 1) : ?>
								<div class="font-lister"></div>
							<?php else: ?>
								<div class="fontsampler-font-label"><label></label></div>
							<?php endif; ?>
						<?php endif;
                        break;

                    case 'sampletexts':
                        $samples = explode("\n", $options['sample_texts']);
                        if ($set['sampletexts']) : ?>
							<select name="sample-text">
								<?php /* translators: The first and visible entry in the sample text drop down in the frontend */ ?>
								<option selected="selected"><?php echo !empty($set['sample_texts_default_option']) ? $set['sample_texts_default_option'] : $options['sample_texts_default_option']; ?></option>
								<?php foreach ($samples as $sample) : ?>
									<option value="<?php echo $sample; ?>"><?php echo $sample; ?></option>
								<?php endforeach; ?>
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
							<div class="fontsampler-multiselect three-items" data-name="alignment">
								<button <?php if ($is_ltr && $options['alignment_initial'] == 'left') :
                                    echo 'class="fontsampler-multiselect-selected"'; endif; ?>
									data-value="left"><i class="icon-align-left"></i>
								</button>
								<button <?php if ($options['alignment_initial'] == 'center') :
                                    echo 'class="fontsampler-multiselect-selected"'; endif; ?>
									data-value="center"><i class="icon-align-center"></i>
								</button>
								<button <?php if (!$is_ltr || $options['alignment_initial'] == 'right') :
                                    echo 'class="fontsampler-multiselect-selected"'; endif; ?>
									data-value="right"><i class="icon-align-right"></i>
								</button>
							</div>
						<?php endif;
                        break;

                    case 'invert':
                        if ($set['invert']) : ?>
							<div class="fontsampler-multiselect two-items" data-name="invert">
								<button class="fontsampler-multiselect-selected" data-value="positive">
									<i class="icon-invert-white"></i>
								</button>
								<button data-value="negative">
									<i class="icon-invert-black"></i>
								</button>
							</div>
						<?php endif;
                        break;

                    case 'opentype':
                        if ($set['opentype']) : ?>
							<div class="fontsampler-multiselect one-item fontsampler-opentype feature-lister"
							     data-name="opentype">
								<button class="fontsampler-opentype-toggle">
									<i class="icon-opentype"></i>
								</button>
								<div class="fontsampler-opentype-features">
									<fieldset class="feature-lister__features--default"></fieldset>
									<fieldset class="feature-lister__features--optional"></fieldset>
								</div>
							</div>
						<?php endif;
                        break;

                    case 'buy':
                        if ($set['buy'] && !empty($set['buy_url'])) : ?>
							<a href="<?php echo $set['buy_url']; ?>"
							   target="<?php echo !empty($set['buy_target']) ? $set['buy_target'] : $options['buy_target']; ?>">
								<?php
                                if ($set['buy_image']):
                                    $image_src = wp_get_attachment_image_src($set['buy_image'], 'full');
                                    ?>
									<img class="fontsampler-interface-link-image"
									     src="<?php echo $image_src[0]; ?>"
									     alt="<?php echo $options['buy_label']; ?>">
								<?php else: ?>
									<span class="fontsampler-interface-link-text"
									><?php echo !empty($set['buy_label']) ? $set['buy_label'] : $options['buy_label']; ?></span>
								<?php endif; ?>
							</a>
						<?php endif;
                        break;

                    case 'specimen':
                        if ($set['specimen'] && !empty($set['specimen_url'])) : ?>
							<a href="<?php echo $set['specimen_url']; ?>"
								target="<?php echo !empty($set['specimen_target']) ? $set['specimen_target'] : $options['specimen_target']; ?>">
								<?php
                                if ($set['specimen_image']):
                                    $image_src = wp_get_attachment_image_src($set['specimen_image'], 'full');
                                    ?>
									<img class="fontsampler-interface-link-image"
									     src="<?php echo $image_src[0]; ?>"
									     alt="<?php echo $options['specimen_label']; ?>">
								<?php else: ?>
									<span
										class="fontsampler-interface-link-text"><?php echo !empty($set['specimen_label']) ? $set['specimen_label'] : $options['specimen_label']; ?></span>
								<?php endif; ?>
							</a>
						<?php endif;
                        break;

                    case 'fontsampler':
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

							style="text-align: <?php echo $set['alignment_initial']; ?>;
								    font-size: <?php echo $data_initial['fontsize_initial'] . $data_initial['fontsize_unit']; ?>;
								    letter-spacing: <?php echo $data_initial['letterspacing_initial'] . $data_initial['letterspacing_unit']; ?>;
								    line-height: <?php echo $data_initial['lineheight_initial'] . $data_initial['lineheight_unit']; ?>;"
							data-notdef="<?php echo $set['notdef'] !== null ? $set['notdef'] : $options['notdef']; ?>"
						
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