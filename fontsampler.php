<?php
/*
Plugin Name: Fontsampler
Plugin URI:  http://URI_Of_Page_Describing_Plugin_and_Updates
Description: This describes my plugin in a short sentence
Version:     0.0.1
Author:      Johannes Neumeier
Author URI:  http://URI_Of_The_Plugin_Author
License:     GPL2
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Domain Path: /languages
Text Domain: fontsampler
*/
defined('ABSPATH') or die('Nope.');

$wpdb->show_errors();

$f = new Fontsampler($wpdb);

// frontend
wp_register_script( 'fontsampler-js', plugin_dir_url(__FILE__) . 'js/jquery.fontsampler.js', array( 'jquery' ));
wp_register_script( 'fontsampler-init-js', plugin_dir_url(__FILE__) . 'js/fontsampler-init.js', array( 'fontsampler-js'));
add_shortcode( 'fontsampler', array($f, 'fontsampler_shortcode'));

// backend
add_action('admin_menu', array($f, 'fontsampler_plugin_setup_menu'));
add_filter('upload_mimes', array($f, 'allow_font_upload_types'));
register_activation_hook( __FILE__, array($f, 'fontsampler_activate'));



class Fontsampler {

	private $db;

	function Fontsampler ($wpdb) {
		$this->db = $wpdb;
	}


	/*
	 * DIFFERENT HOOKS
	 */


	/*
	 * Register the [fontsampler id=XX] hook for use in pages and posts
	 */
	function fontsampler_shortcode( $atts ) {
		wp_enqueue_script( 'fontsampler-js' );
		wp_enqueue_script( 'fontsampler-init-js' );

		// merge in possibly passed in attributes
		$attributes = shortcode_atts( array('id' => '0'), $atts);
		// do nothing for missing id
		if ($attributes['id'] != 0) {
			$font = $this->get_font($attributes['id']);
			return '<div id="fontsampler" class="fontsampler" data-fontfile="' . $font['guid'] . '">FONTSAMPLER</div>';
		}
	}


	/*
	 * Add the fontsampler admin menu to the sidebar
	 */
	function fontsampler_plugin_setup_menu() {
        add_menu_page( 'Fontsampler plugin page', 'Fontsampler Plugin', 'manage_options', 'fontsampler', array($this, 'fontsampler_admin_init') );
	}


	/*
	 * Expand allowed upload types to include font files
	 */
	function allow_font_upload_types($existing_mimes=array()){
		$existing_mimes['woff'] = 'application/font-woff';
		$existing_mimes['woff2'] = 'application/font-woff2';
		return $existing_mimes;
	}


	/*
	 * React to the plugin being activated
	 */
	function fontsampler_activate() {
		echo 'hello activate';
		// TODO check table exists?
		$this->create_table();
	}

	// TODO deactivate()


	/*
	 * FLOW CONTROL
	 */

	function fontsampler_admin_init() {
		$this->handle_font_upload();
		$this->handle_set_delete();
		$this->handle_set_create();

		switch ($_GET['subpage']) {
			case 'create':
				echo include('create.php');
			break;

			default:
				//$fonts = $this->get_fonts();
				$sets = $this->get_sets();
				echo include('list-sets.php');
			break;
		}
		?>

		<a href="admin.php?page=fontsampler&subpage=create">Create fontsampler shortcode</a>

		<h1>Upload new font file</h1>
		<form method="post" enctype="multipart/form-data">
		<input type="file" name="fontfile">
		<?php submit_button('Upload'); ?>
		</form>
		<?php
	}


	/*
	 * DATABASE INTERACTION
	 */

	/*
	 * setup fontsampler sets table
	 */
	function create_table() {
		$sql = "CREATE TABLE " . $this->db->prefix . "`fontsampler` (
				  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
				  `upload_id` int(11) NOT NULL,
				  PRIMARY KEY (`id`)
				) ENGINE=InnoDB DEFAULT CHARSET=latin1;";
		$this->db->query($sql);
	}


	/*
	 * Read from fontsampler sets table
	 */
	function get_sets() {
		$sql = "SELECT * FROM " . $this->db->prefix . "fontsampler f
				LEFT JOIN " . $this->db->prefix . "posts p
				ON f.upload_id = p.ID";
		return $this->db->get_results($sql, ARRAY_A);
	}


	/*
	 * Remove a fontsampler set
	 */
	function delete_set($id) {
		return $this->db->delete($this->db->prefix . "fontsampler", array('id' => $id));
	}


	/*
	 * read from attachements
	 */
	function get_fonts() {
		$sql = "SELECT * FROM " . $this->db->prefix . "posts
				WHERE post_type = 'attachment' AND post_mime_type = 'application/font-woff'";
		return $this->db->get_results($sql, ARRAY_A);
	}


	/*
	 * read per id from custom table
	 */
	function get_font($id) {
		$sql = "SELECT p.post_name, p.guid FROM " . $this->db->prefix . "fontsampler f
				LEFT JOIN " . $this->db->prefix . "posts p
				ON f.upload_id = p.ID";
		return $this->db->get_row($sql, ARRAY_A);
	}


	/*
	 * PROCESSING FROMS
	 */

	/*
	 * Dealing with new fonts being uploaded explicitly via the plugin (instead of the media gallery)
	 */
	function handle_font_upload() {
		if (isset($_FILES['fontfile'])) {
			$uploaded = media_handle_upload('fontfile', 0);
			if (is_wp_error($uploaded)) {
				echo 'Error uploading file: ' . $uploaded->get_error_message();
			} else {
				echo 'uploaded';
			}
		}
	}

	/*
	 * Creating a fontsampler 
	 */
	function handle_set_create() {
		if ($_POST['fontfile']) {
			$this->db->insert($this->db->prefix . 'fontsampler', array('upload_id' => $_POST['fontfile']));
			echo "Created set with it " . $this->db->insert_id;
		}
	}

	function handle_set_update($setId) {

	}

	function handle_set_delete() {
		$id = (int)($_POST['id']);
		if ($_POST['action'] == 'deleteSet' && isset($id) && is_int($id) && $id > 0) {
			if ($this->delete_set($_POST['id'])) {
				echo 'Deleted ' . $id;
			}
		}
	}

}
?>