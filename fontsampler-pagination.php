<?php

class FontsamplerPagination {

	private $pages_total;
	private $items_per_page;
	private $items;
	private $current_page;

	function FontsamplerPagination ( $items, $items_per_page, $current_offset = 0 ) {
		$this->items = $items;
		$this->pages_total = (int)ceil( sizeof( $items ) / $items_per_page );
		$this->items_per_page = $items_per_page;
		$this->current_page = $current_offset === 0 ? 0 : (int)floor( $current_offset / $items_per_page );
	}

	function pages() {
		$pages = array();

		for ( $i = 0; $i < $this->pages_total; $i++ ) {

			$first = $i * $this->items_per_page + 1;
			$last = ( ( $i + 1 ) * $this->items_per_page );

			$pages[ $i ] = array(
				'first'       => $first,
				'last'        => $last,
				'first_label' => $this->items[ $first ]['initial'],
				'last_label'  => $i === $this->pages_total - 1 ? $this->items[ ( sizeof( $this->items ) - 1 ) ]['initial'] : $this->items[ $last - 1]['initial'],
				'is_current'  => ( $i === $this->current_page )
			);
		}
		return $pages;
	}

	function get_items_per_page() {
		return $this->items_per_page;
	}

}