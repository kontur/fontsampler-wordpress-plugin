<?php

/**
 * Class FontsamplerMessages
 *
 * Simple unified way of outputting messages of difference priority
 */
class FontsamplerMessages {

	private $messages;

	function __construct() {
		$this->messages = array();
	}

	public function get_messages( $asString = false ) {
		if ( $asString === true ) {
			return implode( $this->messages, "\n" );
		}

		return $this->messages;
	}

	public function has_messages() {
		return sizeof( $this->get_messages() ) !== 0;
	}

	public function add_message( $string ) {
		if ( ! empty( $string ) ) {
			array_push( $this->messages, $string );
		}
	}

	/*
	 * Shortcuts for adding messages of a certain type to the $message buffer
	 */

	public function add_error( $message ) {
		ob_start();
		$this->error( $message );
		$this->add_message( ob_get_clean() );
	}

	public function add_info( $message ) {
		ob_start();
		$this->info( $message );
		$this->add_message( ob_get_clean() );
	}

	public function add_notice( $message ) {
		ob_start();
		$this->notice( $message );
		$this->add_message( ob_get_clean() );
	}


	/*
	 * Render different confirmation messages
	 */
	public static function info( $message ) {
		echo '<div class="notice notice-info"><p>' . $message . '</p></div>';
	}

	public static function notice( $message ) {
		echo '<div class="notice notice-warning"><p>' . $message . '</p></div>';
	}

	public static function error( $message ) {
		echo '<div class="notice notice-error"><p>' . $message . '</p></div>';
	}
}
