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
		$notifications                        = array();
		$notifications['fonts_missing_files'] = $this->get_fonts_missing_files();
		$notifications['sets_missing_fonts']  = $this->get_sets_missing_fonts();
		$notifications['settings_defaults']   = $this->get_settings_problems();
		$notifications['fonts_missing_name']  = $this->get_fonts_missing_name();
		$notifications['folder_permissions']  = $this->get_folders_missing_write_permissions();

		$notifications['num_notifications'] = 0;

		if ( false !== $notifications['folder_permissions'] ) {
			$notifications['num_notifications'] += sizeof( $notifications['folder_permissions'] );
		}
		if ( false !== $notifications['fonts_missing_files'] ) {
			$notifications['num_notifications'] += sizeof( $notifications['fonts_missing_files'] );
		}
		if ( false !== $notifications['fonts_missing_name'] ) {
			$notifications['num_notifications'] += sizeof( $notifications['fonts_missing_name'] );
		}
		if ( false !== $notifications['sets_missing_fonts'] ) {
			$notifications['num_notifications'] += sizeof( $notifications['sets_missing_fonts'] );
		}
		if ( false !== $notifications['settings_defaults'] ) {
			$notifications['num_notifications'] += sizeof( $notifications['settings_defaults'] );
		}

		return $notifications;
	}

	private function get_settings_problems() {
		return $this->fontsampler->db->get_default_settings_errors();
	}

	private function get_fonts_missing_files() {
		return $this->fontsampler->db->get_fontsets_missing_files();
	}

	private function get_fonts_missing_name() {
		return $this->fontsampler->db->get_fontsets_missing_name();
	}

	private function get_sets_missing_fonts() {
		return $this->fontsampler->db->get_sets_missing_fonts();
	}

	private function get_folders_missing_write_permissions() {
		$folders = array();
		$dirs    = array(
			plugin_dir_path( __FILE__ ) . 'css/fontsampler-css.css',
			plugin_dir_path( __FILE__ ) . 'css/custom',
		);
		foreach ( $dirs as $dir ) {
			if ( ! $this->fontsampler->helpers->check_is_writeable( $dir ) ) {
				array_push( $folders, substr($dir, strpos($dir, "/wp-content")) );
			};
		}

		return empty( $folders ) ? false : $folders;
	}
}