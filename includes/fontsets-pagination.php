
<?php if ( isset( $pagination ) ) : ?>
<nav class="fontsampler-pagination">
	<?php foreach ( $pagination->pages() as $page ) : ?>
	<a data-target="fontsampler-admin-fontsets-table"
	   <?php if ( $page['is_current'] ) : echo ' class="fontsampler-pagination-current-page" '; endif; ?>
	   href="?page=fontsampler&amp;subpage=fonts&amp;offset=<?php echo $page['first']; ?>&amp;num_rows=<?php echo $pagination->get_items_per_page(); ?>">
		<?php echo $page['first_label'] . '&ndash;' . $page['last_label']; ?></a>
	<?php endforeach; ?>
</nav>
<?php endif; ?>