<?php

/**
 * Class FontsamplerMessages
 *
 * Simple unified way of outputting messages of difference priority
 */
class FontsamplerMessages {
	/*
	 * Render different confirmation messages
	 */
	public static function info( $message ) {
		echo '<strong class="info">' . $message . '</strong>';
	}

	public static function notice( $message ) {
		echo '<strong class="note">' . $message . '</strong>';
	}

	public static function error( $message ) {
		echo '<strong class="error">' . $message . '</strong>';
	}
}
