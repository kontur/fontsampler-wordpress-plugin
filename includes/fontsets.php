<?php global $f; ?>
<h1>Font sets &amp; files</h1>
<p>Listed here are the fonts and the file formats that are provided for displaying them.</p>
<p>In order to make font samplers you need to first create a font set (the different webfont format versions of the font
	you want to demo) and upload at least one format for the font. If you want to use a font sampler that has a font
	switcher, for example to preview different weights or styles of the same typeface, you need to create a font set for
	each of them.</p>

<?php if ( $fonts ) : ?>
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
		<tbody>
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

<?php else : ?>
	<p>You haven't created and fontsets yet.</p>
<?php endif; ?>

<a class="button button-primary" href="?page=fontsampler&subpage=font_create">Create a new font record</a>
