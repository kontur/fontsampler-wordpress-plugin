<?php global $f; ?>
<h1>Font sets &amp; files</h1>

<?php if ( ! $fonts ) : ?>
	<p>Font sets are all the webfont files associated with one font. Any Fontsampler you create can use one or more
	font sets.</p>
	<p>Different weights or styles each need their own font set (which can consist of woff2, woff, eot, svg and ttf files).</p>

<?php else : ?>

	<p>Listed here are the fonts and the file formats that are provided for displaying them.</p>

	<?php include('fontsets-pagination.php'); ?>

	<table>
		<thead>
		<tr>
			<th>Font name<br>
				<small>Equals the displayed name in the fontsampler dropdown <br>(when it has several fonts)</small>
			</th>
			<th>Preview</th>
			<th>Formats<br>
				<small>A list of all formats provided (and used) for rendering type samplers using this font. <br>You should at the very least provide a woff file.</small>
			</th>
			<th>Edit</th>
			<th>Delete</th>
		</tr>
		</thead>

		<tbody id="fontsampler-admin-fontsets-table">
		<?php foreach ( $fonts as $font ) : ?>
			<tr>
				<td><?php echo $font['name']; ?></td>
				<td>
					<div class="fontsampler-preview"
					     data-font-files='<?php echo $f->fontfiles_JSON( $font ); ?>'><?php echo $font['name']; ?></div>
				</td>
				<td>
					<ul>
						<?php foreach ( $formats as $format ) : if ( ! empty( $font[ $format ] ) ) : ?>
							<li>
								<span class="fileformat filename"><?php echo $format; ?></span>
								<span
									class="filename"><?php echo substr( $font[ $format ], strrpos( $font[ $format ], '/' ) + 1 ); ?></span>
							</li>
						<?php endif; endforeach; ?>
					</ul>
				</td>
				<td>
					<form method="post" action="?page=fontsampler&amp;subpage=font_edit&amp;id=<?php echo $font['id']; ?>">
						<?php submit_button( 'edit' ); ?>
					</form>
				</td>
				<td>
					<form method="post" action="?page=fontsampler&amp;subpage=font_delete&amp;id=<?php echo $font['id']; ?>">
						<input type="hidden" name="action" value="delete_font">
						<?php submit_button( 'delete', 'secondary' ); ?>
					</form>
				</td>
			</tr>
		<?php endforeach; ?>
		</tbody>
	</table>

	<?php include('fontsets-pagination.php'); ?>
	<br>
<?php endif; ?>

<a class="button button-primary" href="?page=fontsampler&subpage=font_create">Create a new font record</a>
