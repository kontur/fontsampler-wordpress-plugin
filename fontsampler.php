<?php
/*
Plugin Name: Fontsampler
Plugin URI:  http://URI_Of_Page_Describing_Plugin_and_Updates
Description: Create editable webfont previews via shortcodes
Version:     0.0.1
Author:      Johannes Neumeier
Author URI:  http://johannesneumeier.com
License:
License URI:
Text Domain: fontsampler
*/

/*
general level TODO's:

	- Implement nounce checks for all forms

*/
defined('ABSPATH') or die('Nope.');

global $wpdb;
$f = new Fontsampler($wpdb);

// frontend
wp_register_script( 'fontsampler-js', plugin_dir_url(__FILE__) . 'bower_components/jquery-fontsampler/dist/jquery.fontsampler.js', array( 'jquery' ));
wp_register_script( 'fontsampler-init-js', plugin_dir_url(__FILE__) . 'js/fontsampler-init.js', array( 'fontsampler-js'));
wp_register_script( 'fontsampler-rangeslider-js', plugin_dir_url(__FILE__) . 'bower_components/rangeslider.js/dist/rangeslider.min.js', array( 'jquery'));
wp_register_script( 'fontsampler-selectric-js', plugin_dir_url(__FILE__) . 'bower_components/jquery-selectric/public/jquery.selectric.min.js', array('jquery'));
wp_enqueue_style( 'fontsampler-css', plugin_dir_url(__FILE__) . 'fontsampler-interface.css');
add_shortcode( 'fontsampler', array($f, 'fontsampler_shortcode'));

// backend
add_action('admin_menu', array($f, 'fontsampler_plugin_setup_menu'));
add_action('admin_enqueue_scripts', array($f, 'fontsampler_admin_enqueues'));
add_filter('upload_mimes', array($f, 'allow_font_upload_types'));
register_activation_hook( __FILE__, array($f, 'fontsampler_activate'));
register_uninstall_hook(__FILE__, array($f, 'fontsampler_uninstall'));



class Fontsampler {

	private $db;
    private $table_sets;
    private $table_fonts;
    private $table_join;
    private $table_settings;
    private $booleanOptions;
    private $fontFormats;

	function Fontsampler ($wpdb) {
		$this->db = $wpdb;
        $this->table_sets = $this->db->prefix . "fontsampler_sets";
        $this->table_fonts = $this->db->prefix . "fontsampler_fonts";
        $this->table_join = $this->db->prefix . "fontsampler_sets_x_fonts";
        $this->table_settings = $this->db->prefix . "fontsampler_settings";

        $this->booleanOptions = array('size', 'letterspacing', 'lineheight', 'fontpicker', 'sampletexts', 'alignment',
            'invert', 'ot_liga', 'ot_hlig', 'ot_dlig', 'ot_calt', 'ot_frac', 'ot_sups', 'ot_subs');
        $this->fontFormats = array('woff2', 'woff', 'eot', 'svg', 'ttf');
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
		wp_enqueue_script( 'fontsampler-selectric-js' );
		wp_enqueue_script( 'fontsampler-rangeslider-js' );

		// merge in possibly passed in attributes
		$attributes = shortcode_atts( array('id' => '0'), $atts);
		// do nothing if missing id
		// TODO change or fallback to name= instead of id=
		if ($attributes['id'] != 0) {
			$set = $this->get_set(intval($attributes['id']), false);
			$fonts = $this->get_fontset(intval($attributes['id']));

			if ($set === false || $fonts === false) {
				if (current_user_can('edit_posts') || current_user_can('edit_pages')) {
					return '<div><strong>The typesampler with ID ' . $attributes['id'] . ' can not be displayed because some files or the type sampler set are missing!</strong> <em>You are seeing this notice because you have rights to edit posts - regular users will see an empty spot here.</em></div>';
				} else {
					return '<!-- typesampler #' . $attributes['id'] . ' failed to render -->';
				}
			}

			// TODO labels from options
            $defaults = $this->get_settings();
            // some of these get overwritten from defaults, but list them all here explicitly
			$replace = array_merge(array(
				'font_size_label'		    => 'Size',
				'font_size_min'			    => '8',
				'font_size_max'			    => '96',
				'font_size_initial'		    => '14',
				'font_size_unit'		    => 'px',
				'letter_spacing_label'  	=> 'Letter spacing',
				'letter_spacing_min'    	=> '-5',
				'letter_spacing_max'	    => '5',
				'letter_spacing_initial'	=> '0',
				'letter_spacing_unit'	    => 'px',
				'line_height_label'		    => 'Line height',
				'line_height_min'		    => '70',
				'line_height_max'		    => '300',
				'line_height_initial'	    => '110',
				'line_height_unit'		    => '%'
			), $defaults);

			// buffer output until return
			ob_start();

			// TODO option to pass in @fontface file stack for css generation javascript side
			echo '<div class="fontsampler-wrapper">';
			// include, aka echo, template with replaced values from $replace above
			include('includes/interface.php');

			echo "<div class='fontsampler' data-font-files='" . $this->fontfiles_JSON($fonts[0]) . "' data-multiline='" . $set['multiline'] . "'>FONTSAMPLER</div></div>";

			// return all that's been buffered
			return ob_get_clean();
		}
	}


    /*
     * Register scripts and styles needed in the admin panel
     */
    function fontsampler_admin_enqueues() {
        wp_enqueue_script( 'fontsampler-rangeslider-js' );
		wp_enqueue_script( 'fontsampler-preview-js', plugin_dir_url(__FILE__) . 'bower_components/jquery-fontsampler/dist/jquery.fontsampler.js', array( 'jquery' ));
		wp_enqueue_script( 'fontsampler-admin-js', plugin_dir_url(__FILE__) . 'js/fontsampler-admin.js', array( 'jquery' ));
        wp_register_style( 'fontsampler_admin_css', plugin_dir_url(__FILE__) . '/fontsampler-admin.css', false, '1.0.0' );
        wp_enqueue_style( 'fontsampler_admin_css' );
    }


	/*
	 * Add the fontsampler admin menu to the sidebar
	 */
	function fontsampler_plugin_setup_menu() {
        add_menu_page( 'Fontsampler plugin page', 'Fontsampler', 'manage_options', 'fontsampler', array($this, 'fontsampler_admin_init'), 'dashicons-editor-paragraph' );
	}


	/*
	 * Expand allowed upload types to include font files
	 */
	function allow_font_upload_types($existing_mimes=array()){
		$existing_mimes['woff'] = 'application/font-woff';
		$existing_mimes['woff2'] = 'application/font-woff2';
		$existing_mimes['eot'] = 'application/eot';
		$existing_mimes['svg'] = 'application/svg';
		$existing_mimes['ttf'] = 'application/ttf';
		return $existing_mimes;
	}


	/*
	 * React to the plugin being activated
	 */
	function fontsampler_activate() {
		$this->check_and_create_tables();
	}

	/*
	 *
	 */
	// TODO test this ;)
	function fontsampler_uninstall() {
		$this->delete_tables();
	}


	/*
	 * FLOW CONTROL
	 */

	/*
	 * Rendering the admin interface
	 */
	function fontsampler_admin_init() {

        echo '<section id="fontsampler-admin">';

        include('includes/header.php');

        echo '<main>';

        $this->check_and_create_tables();

        // check upload folder is writable
        $dir = wp_upload_dir();
        $upload = $dir['basedir'];
        if (!is_dir($upload)) {
            echo '<p>Uploads folder does not exist! Make sure Wordpress has writing permissions to create the
                    uploads folder at: <em>' . $upload . '</em></p>';
        }


        if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['action'])) {
			$this->handle_font_edit();
			$this->handle_font_delete();
			$this->handle_set_edit();
			$this->handle_set_delete();
            $this->handle_settings_edit();
		}

		switch ($_GET['subpage']) {
            case 'create':
                $set = NULL;
                $fonts = $this->get_fontfile_posts();
                include('includes/sample-edit.php');
                break;

            case 'edit':
                $set = $this->get_set(intval($_GET['id']));
                $fonts = $this->get_fontfile_posts();
                include('includes/sample-edit.php');
                break;
/*
            case 'delete':
                include('includes/delete.php');
                break;
*/
            case 'fonts':
                $fonts = $this->get_fontsets();
                $formats = $this->fontFormats;
                include('includes/fontsets.php');
                break;

            case 'font_create':
                $font = NULL;
                $formats = $this->fontFormats;
                include('includes/fontset-edit.php');
                break;

            case 'font_edit':
                $font = $this->get_fontset(intval($_GET['id']));
                $font = $font[0];
                $formats = $this->fontFormats;
                include('includes/fontset-edit.php');
                break;

            case 'settings':
                $defaults = $this->get_settings();
                include('includes/settings.php');
                break;

            case 'about':
            	include('includes/about.php');
            	break;

			default:
				$sets = $this->get_sets();
				include('includes/samples.php');
			    break;
		}
		echo '</main>';

		include('includes/footer.php');
		echo '</section>';
	}


	/*
	 * DATABASE INTERACTION
	 */

	/*
	 * setup fontsampler sets table
	 */
	function create_table_sets() {
		$sql = "CREATE TABLE " . $this->table_sets . " (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
                `name` varchar(255) NOT NULL DEFAULT '',
                `size` tinyint(1) NOT NULL DEFAULT '0',
                `letterspacing` tinyint(1) NOT NULL DEFAULT '0',
                `lineheight` tinyint(1) NOT NULL DEFAULT '0',
                `fontpicker` tinyint(1) NOT NULL DEFAULT '0',
                `sampletexts` tinyint(1) NOT NULL DEFAULT '0',
                `alignment` tinyint(1) NOT NULL DEFAULT '0',
                `invert` tinyint(1) NOT NULL DEFAULT '0',
                `multiline` tinyint(1) NOT NULL DEFAULT '0',
                `ot_liga` tinyint(1) NOT NULL DEFAULT '0',
                `ot_dlig` tinyint(1) NOT NULL DEFAULT '0',
                `ot_hlig` tinyint(1) NOT NULL DEFAULT '0',
                `ot_calt` tinyint(1) NOT NULL DEFAULT '0',
                `ot_frac` tinyint(1) NOT NULL DEFAULT '0',
                `ot_sups` tinyint(1) NOT NULL DEFAULT '0',
                `ot_subs` tinyint(1) NOT NULL DEFAULT '0',
			  PRIMARY KEY (`id`)
			)";
		$this->db->query($sql);
	}


    function create_table_fonts() {
    	$sql = "CREATE TABLE " . $this->table_fonts . " (
			  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
			  `name` varchar(255) NOT NULL DEFAULT '',
			  `woff` int(11) unsigned DEFAULT NULL,
			  `woff2` int(11) unsigned DEFAULT NULL,
			  `eot` int(11) unsigned DEFAULT NULL,
			  `svg` int(11) unsigned DEFAULT NULL,
			  `ttf` int(11) unsigned DEFAULT NULL,
			  PRIMARY KEY (`id`)
			)";
		$this->db->query($sql);
    }


    function create_table_join() {
    	$sql = "CREATE TABLE " . $this->table_join . " (
			   `set_id` int(11) unsigned NOT NULL,
			   `font_id` int(11) unsigned NOT NULL
				)";
    	$this->db->query($sql);
    }


    function create_table_settings() {
        $sql = "CREATE TABLE " . $this->table_settings . " (
                `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
                `font_size_initial` smallint(5) unsigned NOT NULL DEFAULT '18',
                `font_size_min` smallint(5) unsigned NOT NULL DEFAULT '8',
                `font_size_max` smallint(5) unsigned NOT NULL DEFAULT '96',
                `letter_spacing_initial` tinyint(5) NOT NULL DEFAULT '0',
                `letter_spacing_min` tinyint(3) NOT NULL DEFAULT '-5',
                `letter_spacing_max` tinyint(3) NOT NULL DEFAULT '5',
                `line_height_initial` smallint(5) NOT NULL DEFAULT '110',
                `line_height_min` smallint(5) NOT NULL DEFAULT '0',
                `line_height_max` smallint(5) NOT NULL DEFAULT '300',
                `sample_texts` text NOT NULL,
                PRIMARY KEY (`id`)
                );";
        $this->db->query($sql);

        $data = array (
            'font_size_initial' => 18,
            'font_size_min' => 8,
            'font_size_max' => 96,
            'letter_spacing_initial' => 0,
            'letter_spacing_min' => -5,
            'letter_spacing_max' => 5,
            'line_height_initial' => 110,
            'line_height_min' => 0,
            'line_height_max' => 300,
            'sample_texts' => "hamburgerfontstiv\nabcdefghijklmnopqrstuvwxyz\nABCDEFGHIJKLMNOPQRSTUVWXYZ\nThe quick brown fox jumps over the lazy cat"
        );
        $this->db->insert($this->table_settings, $data);
    }


    function delete_tables() {
    	$sql = "DROP TABLE IF EXISTS " . $this->table_join;
    	$this->db->query($sql);

    	$sql = "DROP TABLE IF EXISTS " . $this->table_fonts;
    	$this->db->query($sql);

        $sql = "DROP TABLE IF EXISTS " . $this->table_sets;
        $this->db->query($sql);

        $sql = "DROP TABLE IF EXISTS " . $this->table_settings;
        $this->db->query($sql);
    }


    /*
     * Helper to check if tables exist
     * TODO: check if tables are in the correct structure
     */
	function check_table_exists($table) {
		$this->db->query("SHOW TABLES LIKE '" . $table . "'");
		return $this->db->num_rows == 0 ? false : true;
	}


	function check_and_create_tables() {
        // check the fontsampler tables exist, and if not, create them now
        if (!$this->check_table_exists($this->table_sets)) $this->create_table_sets();
        if (!$this->check_table_exists($this->table_fonts)) $this->create_table_fonts();
        if (!$this->check_table_exists($this->table_join)) $this->create_table_join();
        if (!$this->check_table_exists($this->table_settings)) $this->create_table_settings();
	}


    // TODO deactivate -> remove tables

    /*
     * Read from settings table (currently only one row with defaults)
     */
    function get_settings($id = 1) {
        $sql = "SELECT * FROM " . $this->table_settings . " WHERE `id` = " . $id;
        return $this->db->get_row($sql, ARRAY_A);
    }


	/*
	 * Read from fontsampler sets table
	 */
	function get_sets() {
		$sql = "SELECT * FROM " . $this->table_sets . " s";
		$sets = $this->db->get_results($sql, ARRAY_A);
		$setsWithFonts = array();
		foreach ($sets as $set) {
			$sql = "SELECT f.name, f.id, ";
			foreach ($this->fontFormats as $format) {
				$sql .= " (SELECT guid FROM " . $this->db->prefix . "posts p WHERE p.ID = f.". $format . ") AS " . $format . ",";
			}
			$sql = substr($sql, 0, -1);
			$sql .= " FROM " . $this->table_sets . " s
					LEFT JOIN " . $this->table_join . " j
					ON s.id = j.set_id
					LEFT JOIN " . $this->table_fonts . " f
					ON f.id = j.font_id
					WHERE j.set_id = " . intval($set['id']);

			$set['fonts'] = $this->db->get_results($sql, ARRAY_A);
			array_push($setsWithFonts, $set);
		}
		return $setsWithFonts;
	}


	function get_set($id, $includingFonts = true) {
		$sql = "SELECT * FROM " . $this->table_sets . " s
				WHERE s.id = " . $id;
		$set = $this->db->get_row($sql, ARRAY_A);
		if ($this->db->num_rows == 0) {
			return false;
		}

		if (!$includingFonts) {
			return $set;
		}

		$sql = "SELECT f.name, ";
		foreach ($this->fontFormats as $format) {
			$sql .= " (SELECT guid FROM " . $this->db->prefix . "posts p WHERE p.ID = f.". $format . ") AS " . $format . ",";
		}
		$sql = substr($sql, 0, -1);
		$sql .= " FROM " . $this->table_sets . " s
				LEFT JOIN " . $this->table_join . " j
				ON s.id = j.set_id
				LEFT JOIN " . $this->table_fonts . " f
				ON f.id = j.font_id
				WHERE j.set_id = " . intval($id);

		$set['fonts'] = $this->db->get_results($sql, ARRAY_A);

		return $set;
	}


	/*
	 * Remove a fontsampler set
	 */
	function delete_set($id) {
		return $this->db->delete($this->table_sets, array('id' => $id));
	}


	/*
	 * read font files from Wordpress attachements
	 */
	function get_fontfile_posts() {
		$sql = "SELECT *, ";
		foreach ($this->fontFormats as $format) {
			$sql .= " (SELECT guid FROM " . $this->db->prefix . "posts p WHERE p.ID = f.". $format . ") AS " . $format . ",";
		}
		$sql = substr($sql, 0, -1);
		$sql .= " FROM " . $this->table_fonts . " f ";
        $result = $this->db->get_results($sql, ARRAY_A);
        return $this->db->num_rows == 0 ? false : $result;
	}


	/*
	 * read per id from custom table
	 */
	function get_fontset($setId) {
		$sql = "SELECT f.id, f.name, ";
		foreach ($this->fontFormats as $format) {
			$sql .= " (SELECT guid FROM " . $this->db->prefix . "posts p WHERE p.ID = f.". $format . ") AS " . $format . ",";
		}
		$sql = substr($sql, 0, -1);
		$sql .= " FROM " . $this->table_fonts . " f
		        LEFT JOIN " . $this->table_join . " j
		        ON j.font_id = f.id
				WHERE j.set_id = " . intval($setId);
		$result = $this->db->get_results($sql, ARRAY_A);
		return $this->db->num_rows == 0 ? false : $result;
	}


	/*
	 * read all fontsets with font files
	 */
	function get_fontsets() {
		$sql = "SELECT f.id, f.name, ";
		foreach ($this->fontFormats as $format) {
			$sql .= " (SELECT guid FROM " . $this->db->prefix . "posts p WHERE p.ID = f.". $format . ") AS " . $format . ",";
		}
		$sql = substr($sql, 0, -1);
		$sql .= " FROM " . $this->table_fonts . " f";
		$result = $this->db->get_results($sql, ARRAY_A);
		return $this->db->num_rows == 0 ? false : $result;
	}


	// TODO check-routine that makes sure all sets and fonts are in order as defined in the database


	/*
	 * PROCESSING FROMS
	 */

	/*
	 * Dealing with new fonts being defined and uploaded explicitly via the plugin (instead of the media gallery)
	 */
	function handle_font_edit() {
        if ($_POST['action'] == 'font-edit' && !empty($_POST['fontname'])) {

            echo '<div class="notice">';

            $data = array('name' => $_POST['fontname']);

            foreach ($this->fontFormats as $label) {
                if (isset($_FILES[$label]) && $_FILES[$label]['size'] > 0) {
                    $uploaded = media_handle_upload($label, 0);
                    if (is_wp_error($uploaded)) {
                        $this->error('Error uploading ' . $label . ' file: ' . $uploaded->get_error_message());
                    } else {
                        $this->info('Uploaded ' . $label . ' file: '. $_FILES[$label]['name']);
                        $data[$label] = $uploaded;
                    }
                } elseif (!empty($_POST["existing_file_" . $label])) {
                	// don't overwrite current file reference
                	$this->info('Existing ' . $label . ' file remains unchanged.');
                } else {
                    $this->notice('No ' . $label . ' file provided. You can still add it later.');
                }
            }

            if ($_POST['id'] == 0) {
                $res = $this->db->insert($this->table_fonts, $data);
                $this->info('Created fontset ' . $_POST['fontname']);
            } else {
                $this->db->update($this->table_fonts, $data, array('ID' => $_POST['id']));
            }

            echo '</div>';
        }
	}


	// TODO confirm delete, also confirm delete from fontsampler sets
	/*
	 * Delete a set of fonts from the database
	 */
	function handle_font_delete() {
		if ($_POST['action'] == 'deleteFont' && !empty($_POST['id'])) {
			$id = intval($_POST['id']);
			$res = $this->db->delete($this->table_fonts, array('id' => $id));
			if (!$res) {
				$this->db->error('Error: No font sets deleted');
			} else {
				$this->db->delete($this->table_join, array('font_id' => $id));
				$this->info('Font set succesfully removed. Font set also removed from any fontsamplers using it.');
				$this->notice('Note that the font files themselves have not been removed from the Wordpress uploads folder (Media Gallery).');
			}
		}
	}


	// TODO handle_font_file_remove()


	/*
	 * Creating or editing a fontsampler set
	 */
	function handle_set_edit() {
		if (isset($_POST['action']) && $_POST['action'] == "editSet") {

			$data = array();
            foreach ($this->booleanOptions as $index) {
            	$data[$index] = isset($_POST[$index]);
            }

            if (sizeof($_POST['font_id']) > 1) {
                $data['fontpicker'] = true;
            }

            $id = NULL;

			if (!isset($_POST['id'])) {
				// insert new
				$res = $this->db->insert($this->table_sets, $data);
				if ($res) {
					$id = $this->db->insert_id;
					$this->info("Created set with id " . $id);
				} else {
					$this->error("Error: Failed to create new font set");
				}

			} else {
				// update existing
				$id = intval($_POST['id']);
				$this->db->update($this->table_sets, $data, array('id' => $id));
			}
            
			// wipe join table for this fontsampler, then add whatever now was instructed to be saved
			$this->db->delete($this->table_join, array('set_id' => $id));

            // filter possibly duplicate font selections, then add them into the join table
            foreach (array_unique($_POST['font_id']) as $fontId) {
            	if ($fontId != 0) {
            		$this->db->insert($this->table_join, array('set_id' => $id, 'font_id' => $fontId));
            	}
            }

		}
	}


	function handle_set_delete() {
		$id = (int)($_POST['id']);
		if ($_POST['action'] == 'deleteSet' && isset($id) && is_int($id) && $id > 0) {
			if ($this->delete_set(intval($_POST['id']))) {
				$this->info('Deleted ' . $id);
			}
		}
	}


    function handle_settings_edit() {
        // no settings ID's for now, just one default row
        $id = (int)($_POST['id']);
        if ($_POST['action'] == 'editSettings' && isset($id) && is_int($id) && $id > 0) {
            $settingsFields = array(
                'font_size_initial',
                'font_size_min',
                'font_size_max',
                'letter_spacing_initial',
                'letter_spacing_min',
                'letter_spacing_max',
                'line_height_initial',
                'line_height_min',
                'line_height_max',
                'sample_texts'
            );

            $data = array();
            foreach ($settingsFields as $field) {
                if (isset($_POST[$field])) {
                    $data[$field] = trim($_POST[$field]);
                }
            }

            // atm no inserts, only updating the defaults
            $this->db->update($this->table_settings, $data, array('id' => $id));
        }
    }


    /*
     * HELPERS
     */


	/*
	 * Helper that generates a json formatted strong with { formats: files, ... }
	 * for passed in $fonts (array)
	 */
	function fontfiles_JSON($fonts) {
		if (empty($fonts)) {
			return false;
		}
		$fontsObject = '{';
		foreach ($fonts as $format => $font) {
			if (in_array($format, $this->fontFormats) && !empty($font)) {
				$fontsObject .= '"' . $format . '": "' . $font . '",';
			}
		}
		$fontsObject = substr($fontsObject, 0, -1);
		$fontsObject .= '}';
		return $fontsObject;
	}


    /*
     * Render different confirmation messages
     */
    function info($message) {
        echo '<strong class="info">' . $message . '</strong>';
    }
    function notice($message) {
        echo '<strong class="note">' . $message . '</strong>';
    }
    function error($message) {
        echo '<strong class="error">' . $message . '</strong>';
    }

}
?>