<?php global $f; ?>

<div class="fontsampler-interface">
	<div class="fontsampler-interface-row fontsampler-interface-primary">
		<?php if ($set['size']): ?>
		<label class="fontsampler-slider">
			<span class="slider-label"><?php echo $replace['font-size-label']; ?></span>
			<span class="slider-value"><?php echo $replace['font-size-value']; ?>&nbsp;<?php echo $replace['font-size-unit']; ?></span>
			<input type="range" min="<?php echo $replace['font-size-min']; ?>" max="<?php echo $replace['font-size-max']; ?>" value="<?php echo $replace['font-size-value']; ?>" data-unit="<?php echo $replace['font-size-unit']; ?>" name="font-size">
		</label>
		<?php endif; ?>
		
		<?php if ($set['letterspacing']): ?>
		<label class="fontsampler-slider">
			<span class="slider-label"><?php echo $replace['letter-spacing-label']; ?></span>
			<span class="slider-value"><?php echo $replace['letter-spacing-value']; ?>&nbsp;<?php echo $replace['letter-spacing-unit']; ?></span>
			<input type="range" min="<?php echo $replace['letter-spacing-min']; ?>" max="<?php echo $replace['letter-spacing-max']; ?>" value="<?php echo $replace['letter-spacing-value']; ?>" data-unit="<?php echo $replace['letter-spacing-unit']; ?>" name="letter-spacing">
		</label>
		<?php endif; ?>

		<?php if ($set['lineheight']): ?>
		<label class="fontsampler-slider">
			<span class="slider-label"><?php echo $replace['line-height-label']; ?></span>
			<span class="slider-value"><?php echo $replace['line-height-value']; ?>&nbsp;<?php echo $replace['line-height-unit']; ?></span>
			<input type="range" min="<?php echo $replace['line-height-min']; ?>" max="<?php echo $replace['line-height-max']; ?>" value="<?php echo $replace['line-height-value']; ?>" data-unit="<?php echo $replace['line-height-unit']; ?>" name="line-height">
		</label>
		<?php endif; ?>
	</div>

	<div class="fontsampler-interface-row fontsampler-interface-secondary">
		<?php if ($set['fontpicker'] && sizeof($fonts) > 1): ?>
		<select name="font-selector">
			<?php foreach ($fonts as $font): ?>
                <option data-font-files='<?php echo $f->fontfiles_JSON($font); ?>'><?php echo $font['name']; ?></option>
            <?php endforeach; ?>
		</select>
		<?php endif; ?>

		<?php if ($set['sampletexts']): ?>
		<select name="sample-text">
			<option value="Sample text">Sample text</option>
			<option value="ABCDEFGHIJKLMNOPQRSTUVWXYZ">ABCDEF...</option>
			<option value="abcdefghijklmnopqrstuvwxyz">abcdef...</option>
		</select>
		<?php endif; ?>

		<?php if ($set['alignment']): ?>
		<div class="fontsampler-multiselect three-items" data-name="alignment">
			<button class="fontsampler-multiselect-selected" data-value="left"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/align-left.svg"></button>
			<button data-value="center"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/align-center.svg"></button>
			<button data-value="right"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/align-right.svg"></button>
		</div>
		<?php endif; ?>

		<?php if ($set['invert']): ?>
		<div class="fontsampler-multiselect two-items" data-name="invert">
			<button class="fontsampler-multiselect-selected" data-value="positive"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/invert-white.svg"></button>
			<button data-value="negative"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/invert-black.svg"></button>
		</div>
		<?php endif; ?>
	</div>

    <div class="fontsampler-interface-row fontsampler-interface-tertiary">
        <?php if ($set['ot_liga']): ?>
            <button class="fontsampler-toggle" data-feature="liga"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/ligatures.svg" alt="Ligatures"></button>
        <?php endif; ?>
        <?php if ($set['ot_dlig']): ?>
            <button class="fontsampler-toggle" data-feature="dlig"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/dligatures.svg" alt="Discretionary ligatures"></button>
        <?php endif; ?>
        <?php if ($set['ot_hlig']): ?>
            <button class="fontsampler-toggle" data-feature="hlig"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/hligatures.svg" alt="Historical ligatures"></button>
        <?php endif; ?>
        <?php if ($set['ot_calt']): ?>
            <button class="fontsampler-toggle" data-feature="calt"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/alternates.svg" alt="Contextual alternates"></button>
        <?php endif; ?>
        <?php if ($set['ot_frac']): ?>
            <button class="fontsampler-toggle" data-feature="frac"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/fractions.svg" alt="Fractions"></button>
        <?php endif; ?>
        <?php if ($set['ot_sups']): ?>
            <button class="fontsampler-toggle" data-feature="sups"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/sup.svg" alt="Superscript"></button>
        <?php endif; ?>
        <?php if ($set['ot_subs']): ?>
            <button class="fontsampler-toggle" data-feature="subs"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/sub.svg" alt="Subscript"></button>
        <?php endif; ?>
        <!--<button class="fontsampler-toggle" data-feature="swsh"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/.svg" alt="Swashes"></button>-->
        <!--<button class="fontsampler-toggle" data-feature="ss"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/.svg" alt="Stylistic sets"></button>-->
        <!--<button class="fontsampler-toggle" data-feature=""><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/.svg" alt="Oldstyle figures"></button>-->
        <!--<button class="fontsampler-toggle" data-feature="lnum"><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/.svg" alt="Lining figures"></button>-->
        <!--<button class="fontsampler-toggle" data-feature=""><img src="<?php echo plugin_dir_url(__FILE__); ?>../icons/.svg" alt="Localized forms"></button>-->
    </div>
</div>