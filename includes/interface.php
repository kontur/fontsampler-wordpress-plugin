
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

                case 'sampletexts':
                    $samples = explode("\n", $options['sample_texts']);
                    if ($set['sampletexts']) : ?>
                        <select name="sample-text" data-fsjs-ui="dropdown">
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

                        <select name="locl-select" data-fsjs="language">
                            <option selected="selected" value=""><?php echo !empty($set['locl_default_option']) ? $set['locl_default_option'] : $options['locl_default_option']; ?></option>
                            <?php foreach ($locales as $locl) : ?>
                                <option value="<?php echo trim($locl[0]); ?>"><?php echo trim($locl[1]); ?></option>
                            <?php endforeach; ?>
                        </select>							
                <?php
                    }
                    break;


                case 'invert':
                    if ($set['invert']) : ?>
                        <div class="fontsampler-multiselect two-items" data-fsjs-ui="buttongroup">
                            <button data-choice="positive"><i class="icon-invert-white"></i></button>
                            <button data-choice="negative"><i class="icon-invert-black"></i></button>
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
                    <div data-fsjs="tester" class="current-font type-tester__content <?php 
                        if (!isset($set['multiline']) ||
                                (isset($set['multiline']) && $set['multiline'] != '1')
                        ) :
                            echo ' fontsampler-is-singleline';

                        endif; ?>"
                    >   <?php /*if (!$set['is_ltr']): echo ' dir="rtl" '; endif; ?>

                            style="text-align: <?php echo $set['alignment_initial']; ?>;
                                font-size: <?php echo $data_initial['fontsize_initial'] . $data_initial['fontsize_unit']; ?>;
                                letter-spacing: <?php echo $data_initial['letterspacing_initial'] . $data_initial['letterspacing_unit']; ?>;
                                line-height: <?php echo $data_initial['lineheight_initial'] . $data_initial['lineheight_unit']; ?>;"
                        data-notdef="<?php echo $set['notdef'] !== null ? $set['notdef'] : $options['notdef']; ?>"
                    
                    */
                    echo $initial_text; ?>
                    </div>

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