<?php

/**
 * Class FontsamplerNotifications
 *
 * Helper class for sanity checks and displaying them
 */
class FontsamplerNotifications {

	private $fontsampler;

	function __construct( $fontsampler ) {
		$this->fontsampler = $fontsampler;
	}

	public function get_notifications() {
		$notifications = array();
		$notifications['fonts_missing_files'] = $this->get_fonts_missing_files();
		$notifications['sets_missing_fonts'] = $this->get_sets_missing_fonts();
		$notifications['settings_defaults'] = $this->get_settings_problems();

		$notifications['num_notifications'] = 0;
		if ( false !== $notifications['fonts_missing_files'] ) {
			$notifications['num_notifications'] += sizeof($notifications['fonts_missing_files']);
		}
		if ( false !== $notifications['sets_missing_fonts'] ) {
			$notifications['num_notifications'] += sizeof($notifications['sets_missing_fonts']);
		}
		if ( false !== $notifications['settings_defaults'] ) {
			$notifications['num_notifications'] += sizeof($notifications['settings_defaults']);
		}
		
		return $notifications;
	}

	private function get_settings_problems() {
		return $this->fontsampler->db->get_default_settings_errors();
	}

	private function get_fonts_missing_files() {
		return $this->fontsampler->db->get_fontsets_missing_files();
	}

	private function get_sets_missing_fonts() {
		return $this->fontsampler->db->get_sets_missing_fonts();
	}
}