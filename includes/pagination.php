
<?php if ( isset( $pagination ) ) : ?>
<nav class="fontsampler-pagination">
	<?php foreach ( $pagination->pages() as $page ) : ?>
	<a data-target="fontsampler-admin-tbody-ajax"
	    <?php if ( $page['is_current'] ) : echo ' class="fontsampler-pagination-current-page" '; endif; ?>
		<?php
		$subpage = isset( $_GET['subpage'] ) ? $_GET['subpage'] : '';
		$url = '?page=fontsampler&amp;subpage=' . $subpage . '&amp;offset=';
		$url .= $page['first'] . '&amp;num_rows=' . $pagination->get_items_per_page();

		$label = $pagination->get_pagenumbers_as_labels() ? $page['page'] : $page['first_label'] . '&ndash;' . $page['last_label'];
        ?>
		href="<?php echo $url; ?>"><?php echo $label; ?></a>
	<?php endforeach; ?>
</nav>
<?php endif; ?>