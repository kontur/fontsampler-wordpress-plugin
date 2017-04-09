<?php

/**
 * Class FontsamplerPagination
 *
 * Reusable pagination generator that is applied in the admin panel
 */
class FontsamplerPagination {

	private $pages_total;
	private $items_per_page;
	private $items;
	private $current_page;
	private $pagenumbers_as_labels;

	function __construct( $items, $items_per_page, $pagenumbers_as_labels = true, $current_offset = 0 ) {
		$this->items                 = $items;
		$this->pages_total           = (int) ceil( sizeof( $items ) / $items_per_page );
		$this->items_per_page        = $items_per_page;
		$this->pagenumbers_as_labels = $pagenumbers_as_labels;
		$this->current_page          = $current_offset === 0 ? 0 : (int) floor( $current_offset / $items_per_page );
	}

	function pages( $link, $threshold) {
		if ( $this->items_per_page >= $threshold) {
			return null;
		}

		$pages = array();
		for ( $i = 0; $i < $this->pages_total; $i ++ ) {
			$first       = $i * $this->items_per_page;
			$last        = ( ( $i + 1 ) * $this->items_per_page );
			$page        = $i + 1;
			$first_label = $this->items[ $first ]['label'];
			$last_label  = $i === $this->pages_total - 1 ? $this->items[ ( sizeof( $this->items ) - 1 ) ]['label'] : $this->items[ $last - 1 ]['label'];
			$label       = $this->pagenumbers_as_labels ? $i : $first_label . ' &ndash; ' . $last_label;

			$url = str_replace(
				array( '###first###', '###items###' ),
				array( $first, $this->items_per_page ),
				$link
			);

			$pages[ $i ] = array(
				'first'       => $first,
				'last'        => $last,
				'first_label' => $first_label,
				'last_label'  => $last_label,
				'is_current'  => $i === $this->current_page,
				'page'        => $page,
				'label'       => $label,
				'url'         => $url,
			);
		}

		return $pages;
	}

	function get_items_per_page() {
		return $this->items_per_page;
	}

	function get_pagenumbers_as_labels() {
		return $this->pagenumbers_as_labels;
	}

}