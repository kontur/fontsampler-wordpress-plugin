<h1><?php echo empty( $font['id'] ) ? 'Edit this font set' : 'Upload new font files'; ?></h1>
<form method="post" enctype="multipart/form-data" action="?page=fontsampler&amp;subpage=fonts" id="fontsampler-fontset-from" class="fontsampler-validate">
	<input type="hidden" name="action" value="font_edit">
	<?php if ( function_exists( 'wp_nonce_field' ) ) : wp_nonce_field( 'fontsampler-action-font_edit' ); endif; ?>
	<input type="hidden" name="id" value="<?php echo empty( $font['id'] ) ? 0 : $font['id']; ?>">

	<h2>Font name</h2>

	<p>Supply this mostly to make it able for you to tell different fonts apart for when you pick them
		into a font sampler. (e.g. "MyFont Regular Italic")</p>
	<label>Font name (mandatory)<br>
		<input name="fontname" data-validation="length" data-validation-length="3-50"
			<?php
			if ( empty( $font['name'] ) ) {
				echo ' placeholder="e.g. MyFont Regular Italic" ';
			} else {
				echo ' value="' . $font['name'] . '" ';
			}
			?>
			>
	</label>

	<h2>Font files</h2>
	<table>
		<thead>
		<tr>
			<th>Format</th>
			<?php if ( ! empty( $font['id'] ) ) : ?><th>Current file</th><?php endif; ?>
			<th>Upload new file</th>
		</tr>
		</thead>
		<tbody>
		<?php foreach ( $formats as $format ) : ?>
			<tr>
				<td><code class="fileformat"><?php echo $format; ?></code></td>
				<?php if ( ! empty( $font['id'] ) ) : ?>
				<td class="fontsampler-fontset-current-file"><?php if ( ! empty( $font[ $format ] ) ) : ?>
						<span class="filename"><?php echo $font[ $format ]; ?></span>
						<input type="hidden" name="existing_file_<?php echo $format; ?>"
						       value="<?php echo $font[ $format ]; ?>">
					<?php endif; ?></td>
				<?php endif; ?>
				<td><input type="file" name="<?php echo $format; ?>" data-validation="mime" data-validation-allowing="<?php echo $format; ?>"></td>
			</tr>
		<?php endforeach; ?>
		</tbody>
	</table>
	<p>The supplied files will be used to render the actual font sampler. Note that you don't have to
		provide all formats. Supplying at the very least the <code>woff</code> formats will
		cover a good amount of browsers. <a href="http://caniuse.com/#search=woff">See here for details.</a></p>

	<p><small>Note that these fonts are used for preview purposes only - what fonts you make available to customers
		is naturally independent from these files.</small></p>

	<p><small>Note further more that these files will be stored in your Wordpress Uploads folder. Once uploaded,
		you can re-use the same files also for defining other font sets and reuse them in any number of font sets and
		font samplers.</small></p>
	<?php if ( empty( $font['id'] ) ) : submit_button( 'Upload' );
	else : submit_button( 'Update' ); endif; ?>
</form>