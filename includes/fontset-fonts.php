<?php
if ( ! isset( $loop_i) ) {
	$loop_i = 0;
}
?>
<label>Font name (mandatory)<br>
	<input name="fontname[]" data-validation="length" data-validation-length="3-50"
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
		<th>Remove existing file</th>
	</tr>
	</thead>
	<tbody>
	<?php foreach ( $formats as $format ) : ?>
		<tr>
			<td><code class="fileformat"><?php echo $format; ?></code></td>
			<?php if ( ! empty( $font['id'] ) ) : ?>
				<td class="fontsampler-fontset-current-file"><?php if ( ! empty( $font[ $format ] ) ) : ?>
						<span class="filename"><?php echo $font[ $format ]; ?></span>
						<input type="hidden" name="existing_file_<?php echo $format; ?>[]"
						       class="hidden-file-name" value="<?php echo $font[ $format ]; ?>">
					<?php endif; ?></td>
			<?php endif; ?>
			<td>
				<input type="file" name="<?php echo $format; ?>_<?php echo $loop_i; ?>" data-validation="mime" data-validation-allowing="<?php echo $format; ?>">
			</td>
			<td>
				<?php if ( ! empty( $font[ $format ] ) ) : ?><button class="fontsampler-fontset-remove-font">&minus;</button><?php endif; ?>
			</td>
		</tr>
	<?php endforeach; ?>
	</tbody>
</table>
<?php
$loop_i++;
?>
