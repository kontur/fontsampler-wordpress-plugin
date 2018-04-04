<?php

/**
 * Class FontsamplerPlugin
 *
 * Main plugin class containing the frontend and backend routines
 * for rendering Fontsampler instances from shortcodes
 */
class FontsamplerPlugin {
    public $font_formats;
    public $settings_defaults;
    public $font_formats_legacy;
    public $default_features;
    public $admin_hide_legacy_formats;
    public $fontsampler_db_version;
    public $twig;

    // helper classes
    public $msg;
    public $db;
    public $helpers;
    public $notifications;
    private $forms;

    const FONTSAMPLER_OPTION_DB_VERSION = 'fontsampler_db_version';
    const FONTSAMPLER_OPTION_LAST_CHANGELOG = 'fontsampler_last_changelog'; // note, hardcoded also in FontsamplerHelpers.php:351 due to bug
    const FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS = 'fontsampler_hide_legacy_formats';

    public function __construct($wpdb, $twig) {
        $this->wpdb = $wpdb;
		$this->twig = $twig;
		
        // TODO combined default_features and boolean options as array of objects
        // with "isBoolean" attribute
        $this->default_features = array(
            'fontsize',
            'letterspacing',
            'lineheight',
            'sampletexts',
            'alignment',
            'invert',
            'multiline',
            'opentype',
            'locl',
            'fontpicker',
            'buy',
            'specimen',
        );
        // note: font_formats order matters: most preferred to least preferred
        // note: so far no feature detection and no fallbacks, so woff2 last until fixed
        $this->font_formats = array('woff', 'ttf', 'eot');//, 'woff2' );
        $this->font_formats_legacy = array('eot', 'ttf');

        $this->settings_defaults = array(
            /* translators: Default label for font size slider in the front end */
            'fontsize_label' => __('Size', 'fontsampler'),
            'fontsize_min' => '8',
            'fontsize_max' => '96',
            'fontsize_initial' => '14',
            'fontsize_unit' => 'px',
            /* translators: Default label for letter spacing slider in the front end */
            'letterspacing_label' => __('Letter spacing', 'fontsampler'),
            'letterspacing_min' => '-5',
            'letterspacing_max' => '5',
            'letterspacing_initial' => '0',
            'letterspacing_unit' => 'px',
            /* translators: Default label for the line height slider in the front end */
            'lineheight_label' => __('Line height', 'fontsampler'),
            'lineheight_min' => '70',
            'lineheight_max' => '300',
            'lineheight_initial' => '110',
            'lineheight_unit' => '%',
            'alignment_initial' => 'left',
            'sample_texts' => "hamburgerfontstiv\nabcdefghijklmnopqrstuvwxyz\nABCDEFGHIJKLMNOPQRSTUVWXYZ\nThe quick brown fox jumps over the lazy cat",
            /* translators: Default selection in the sample text dropdown */
            'sample_texts_default_option' => __('Select a sample text', 'fontsampler'),
            'locl_options' => null,
            /* translators: Default selection in the language (locl feature) dropdown */
            'locl_default_option' => __('Select language', 'fontsampler'),
            'css_color_text' => '#333333',
            'css_color_background' => '#ffffff',
            'css_color_label' => '#333333',
            'css_value_size_label' => 'inherit',
            'css_value_fontfamily_label' => 'inherit',
            'css_value_lineheight_label' => 'normal',
            'css_color_button_background' => '#efefef',
            'css_color_button_background_inactive' => '#dfdfdf',
            'css_color_highlight' => '#efefef',
            'css_color_highlight_hover' => '#dedede',
            'css_color_line' => '#333333',
            'css_color_handle' => '#333333',
            'css_value_column_gutter' => '10px',
            'css_value_row_height' => '30px',
            'css_value_row_gutter' => '10px',
            'css_color_notdef' => '#dedede',
            'fontsize' => 1,
            'letterspacing' => 1,
            'lineheight' => 1,
            'sampletexts' => 0,
            'locl' => 0,
            'alignment' => 0,
            'invert' => 0,
            'multiline' => 1,
            'opentype' => 0,
            'fontpicker' => 0,
            'buy' => 0,
            'specimen' => 0,
            'notdef' => 0,
            /* translators: Default label for the buy button in the front end */
            'buy_label' => __('Buy', 'fontsampler'),
            'buy_image' => null,
            'buy_url' => null,
            'buy_type' => 'label',
            'buy_target' => '_blank',
            /* translators: Default label for the specimen download button in the front end */
            'specimen_label' => __('Specimen', 'fontsampler'),
            'specimen_image' => null,
            'specimen_url' => null,
            'specimen_type' => 'label',
            'specimen_target' => '_blank',
            'ui_columns' => 3,
            'ui_order' => null,
            'is_ltr' => 1,
            'notdef' => 0, // by default do nothing on notdef glyph input
            'initial' => null // initial fontset_id
        );
    }

    public function init() {

        // instantiate all needed helper subclasses
        $this->msg = new FontsamplerMessages();
        $this->helpers = new FontsamplerHelpers($this);
        $this->db = new FontsamplerDatabase($this->wpdb, $this);
        $this->notifications = new FontsamplerNotifications($this);

        // keep track of db versions and migrations via this
        // simply set this to the current PLUGIN VERSION number when bumping it
        // i.e. a database update always bumps the version number of the plugin as well
        $this->fontsampler_db_version = '0.4.0';
        $current_db_version = get_option(self::FONTSAMPLER_OPTION_DB_VERSION);

        // if no previous db version has been registered assume new install and set
        // to current version
        if (!$current_db_version) {
            add_option(self::FONTSAMPLER_OPTION_DB_VERSION, $this->fontsampler_db_version);
            $current_db_version = $this->fontsampler_db_version;
        }
        if (version_compare($current_db_version, $this->fontsampler_db_version) < 0) {
            $this->db->migrate_db();
        }

        // check if to display legacy formats or not
        $option_legacy_formats = get_option(self::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS);

        // set the option in the db, if it's unset; default to hiding the legacy formats
        if ($option_legacy_formats === false) {
            add_option(self::FONTSAMPLER_OPTION_HIDE_LEGACY_FORMATS, '1');
            $this->admin_hide_legacy_formats = 1;
        } else {
            $this->admin_hide_legacy_formats = $option_legacy_formats;
        }

        // hoist some of those settings defaults to the twig engine, so some things
        // are available globally in all twig templates
        $this->helpers->extend_twig($this->twig);
    }

    /*
     * DIFFERENT HOOKS
     */

    /*
     * Register the [fontsampler id=XX] hook for use in pages and posts
     */
    public function fontsampler_shortcode($atts) {
        global $wp_styles;

        // on printing the shortcode enqueue the scripts to be output to the footer
        wp_enqueue_script('fontsampler-js');

        // when the shortcode was detected already in the header the styles should
        // be added already; if the styles are not enqueued (for example if called
        // via do_shortcode()) then add them now, regardless of them getting added
        // to the html body, which is less ideal
        if (!in_array('fontsampler-css', array_keys($wp_styles->registered))) {
            $this->enqueue_styles();
        }

        // merge in possibly passed in attributes
        $attributes = shortcode_atts(array('id' => '0', 'fonts' => null, 'text' => null), $atts);
        $id = intval($attributes['id']);

        // store any text that was passed in as part of the shortcode
        // this will overwrite the text defined in the settings of this fontsampler
        // or if only fonts are passed in as part of the shortcode the fontsampler
        // will used that text
        $attribute_text = $attributes['text'];

        // do nothing if missing id
        if (0 != $id) {
            $set = $this->db->get_set($id);
            $css = $this->helpers->get_custom_css($set); // returns false or link to generated custom css
            $fonts = $this->helpers->get_best_file_from_fonts($this->db->get_fontset_for_set(intval($attributes['id'])));

            if (false !== $css) {
                wp_enqueue_style('fontsampler-interface-' . $id, $css, array(), false);
            }

            if (false == $set || false == $fonts) {
                if (current_user_can('edit_posts') || current_user_can('edit_pages')) {
                    return '<div class="fontsampler-warning"><strong>The typesampler with ID ' . $attributes['id'] . ' can not be displayed because some files or the type sampler set are missing!</strong> <em>You are seeing this notice because you have rights to edit posts - regular users will see an empty spot here.</em></div>';
                } else {
                    return '<!-- typesampler #' . $attributes['id'] . ' failed to render -->';
                }
            }

            // some of these get overwritten from defaults, but list them all here explicitly
            $options = array_merge($set, $this->settings_defaults, $this->db->get_settings());
            $initialFont = isset($fonts[$set['initial_font']]) ? $fonts[$set['initial_font']] : false;
            if ($initialFont) {
                $firstFont = array_filter($set['fonts'], function ($item) use ($set) {
                    if ($item['id'] === $set['initial_font']) {
                        return $item;
                    }
                });
                $initialFontNameOverwrite = array_pop($firstFont)['name'];
            }

            $settings = $this->db->get_settings();
            $layout = new FontsamplerLayout();
            $blocks = $layout->stringToArray($set['ui_order'], $set);

            // get the calculated initial values for data-font-size- etc, where the set overwrites options
            // where available
            $data_initial = array();
            foreach ($set as $key => $value) {
                $data_initial[$key] = $value;
                if ($value === null && $options[$key] !== null) {
                    $data_initial[$key] = $options[$key];
                }
            }

            // create an array for fontnames to overwrite
            $fontNameOverwrites = array();
            foreach ($set['fonts'] as $font) {
                foreach ($this->font_formats as $format) {
                    if (!empty($font[$format])) {
                        $fileName = basename($font[$format]);
                        $fontNameOverwrites[$fileName] = $font['name'];
                    }
                }
            }

            // buffer output until return
            ob_start(); ?>
			<div class='fontsampler-wrapper on-loading'
			     data-fonts='<?php echo implode(',', $fonts); ?>'
				<?php if ($initialFont) : ?>
					data-initial-font='<?php echo $initialFont; ?>'
					data-initial-font-name-overwrite='<?php echo $initialFontNameOverwrite; ?>'
				<?php endif; ?>
				<?php if (!empty($fontNameOverwrites)): ?>
					data-overwrites='<?php echo json_encode($fontNameOverwrites); ?>'
				<?php endif; ?>
			>
			<?php

            // include, aka echo, template with replaced values from $replace above
            include 'includes/interface.php';

            echo '</div>';

            // return all that's been buffered
            return ob_get_clean();
        } elseif ($attributes['fonts'] !== null) {
            // you cannot pass in a json encoded string (because the square brackets would
            // be interpreted as the end of the shortcode), so the json encoded string is
            // EXPECTED to be a json encoded array, but missing the opening and ending
            // square brackets
            $fonts_passed_in = json_decode('[' . $attributes['fonts'] . ']');

            $fonts_passed_in = array_map(function ($item, $index) {
                $item = (array) $item;
                // the fake font id is needed for fontsampler internals,
                // but since these are not fonts exising in the DB the
                // passed in array index will suffice as ID
                $item['id'] = $index;

                return $item;
            }, $fonts_passed_in, array_keys($fonts_passed_in));

            // retrieve an array with the must suitable webfont files
            $fonts = $this->helpers->get_best_file_from_fonts($fonts_passed_in);

            // some of these get overwritten from defaults, but list them all here explicitly
            // $set   = $this->db->get_set( $id );
            $set = $this->db->get_settings();
            $set['id'] = 0;

            $options = array_merge($set, $this->settings_defaults, $this->db->get_settings());
            $settings = $this->db->get_settings();
            $layout = new FontsamplerLayout();
            $blocks = $layout->stringToArray($set['ui_order'], $set);

            $initialFont = array_filter($fonts_passed_in, function ($item) {
                return isset($item['initial']) && $item['initial'] === true;
            });
            $initialFont = array_shift($initialFont) ;
            $initialFontNameOverwrite = $initialFont['name'];
            $initialFont = $this->helpers->get_best_file_from_fonts(array($initialFont));
            $initialFont = is_array($initialFont) ? array_shift($initialFont) : '';

            $data_initial = $settings;

            // create an array for fontnames to overwrite
            $fontNameOverwrites = array();
            foreach ($fonts_passed_in as $font) {
                foreach ($this->font_formats as $format) {
                    if (!empty($font[$format])) {
                        $fileName = basename($font[$format]);
                        $fontNameOverwrites[$fileName] = $font['name'];
                    }
                }
            }

            ob_start(); ?>

			<div class='fontsampler-wrapper on-loading'
			     data-fonts='<?php echo implode(',', $fonts); ?>'
				<?php if ($initialFont) : ?>
					data-initial-font='<?php echo $initialFont; ?>'
				<?php endif; ?>
				<?php if (!empty($fontNameOverwrites)): ?>
					data-overwrites='<?php echo json_encode($fontNameOverwrites); ?>'
					data-initial-font-name-overwrite='<?php echo $initialFontNameOverwrite; ?>'
				<?php endif; ?>
			>

			<?php

            // include, aka echo, template with replaced values from $replace above
            include 'includes/interface.php';

            echo '</div>';

            return ob_get_clean();
        }
    }

    /**
     * To output the plugin styles only on pages that have the shortcode check
     * in the 'wp' action hook if this page seems to have the shortcode and enqueue
     * the styles if so
     */
    public function check_shortcodes_enqueue_styles() {
        global $post;
        if ($post) {
            if (has_shortcode($post->post_content, 'fontsampler') || apply_filters('fontsampler_enqueue_styles', false)) {
                $this->enqueue_styles();
            }
        }
    }

    /**
     * The actual style enqueue
     */
    public function enqueue_styles() {
        wp_enqueue_style('fontsampler-css', $this->helpers->get_css_file());
    }

    /*
     * Register scripts and styles needed in the admin panel
     */
    public function fontsampler_admin_enqueues($hook) {
        // Load only on fontsampler plugin page hooks
        if (preg_match('/fontsampler/i', $hook) === 0) {
            return;
        }

        wp_enqueue_script('fontsampler-clipboard', plugin_dir_url(__FILE__) . 'admin/js/clipboard.min.js');
        wp_enqueue_script('fontsampler-admin-main-js', plugin_dir_url(__FILE__) . 'admin/js/fontsampler-admin.js', array(
            'jquery',
            'wp-color-picker',
            'jquery-ui-sortable',
            'jquery-ui-accordion',
            'fontsampler-clipboard', // make clipboard a global requirement
        ), false, true);

        wp_enqueue_style('wp-color-picker');
        wp_enqueue_style('jquery-ui-accordion');
        wp_enqueue_style('fontsampler-css-admin', $this->helpers->get_css_file());
        wp_enqueue_style('fontsampler_admin_css', plugin_dir_url(__FILE__) . '/admin/css/fontsampler-admin.css', false, '1.0.0');

        wp_enqueue_media();
    }

    /*
     * Add the fontsampler admin menu to the sidebar
     */
    public function fontsampler_plugin_setup_menu() {
        $numNotifications = $this->notifications->get_notifications()['num_notifications'];
        $notifications = '';
        if ($numNotifications > 0) {
            $notifications = ' <span class="update-plugins count-' . $numNotifications . '">
				<span class="plugin-count">' . $numNotifications . '</span></span>';
        }

        add_menu_page(
            'Fontsampler plugin page',
            'Fontsampler' . $notifications,
            'manage_options',
            'fontsampler',
            array(
                $this,
                'fontsampler_admin_init',
            ),
            'dashicons-editor-paragraph'
        );

        add_submenu_page(
            'fontsampler',
            'New Fontsampler',
            'New Fontsampler',
            'manage_options',
            'fontsampler-new',
            array($this, 'fontsampler_admin_init')
        );

        add_submenu_page(
            'fontsampler',
            'Settings',
            'Settings',
            'manage_options',
            'fontsampler-settings',
            array($this, 'fontsampler_admin_init')
        );

        // replace default entry label for main Fontsampler menu entry
        global $submenu;
        $submenu['fontsampler'][0][0] = 'All Fontsamplers';
    }

    /**
     * Register the text deomain for translations
     */
    public function fontsampler_load_text_domain() {
        load_plugin_textdomain('fontsampler', false, dirname(plugin_basename(__FILE__)) . '/lang/');
    }

    /*
     * Expand allowed upload types to include font files
     */
    public function allow_font_upload_types($existing_mimes = array()) {
        $existing_mimes['woff'] = 'application/font-woff';
        $existing_mimes['woff2'] = 'application/font-woff2';
        $existing_mimes['eot'] = 'application/eot';
        $existing_mimes['ttf'] = 'application/ttf';

        return $existing_mimes;
    }

    /*
     * Augment the plugin description links
     */
    public function add_action_links($links) {
        $mylinks = array(
            '<a href="' . admin_url('admin.php?page=fontsampler') . '">Settings</a>',
        );

        return array_merge($links, $mylinks);
    }

    /*
     * React to the plugin being activated
     */
    public function fontsampler_activate() {
		// If this is a new install the changelog doesnot need to be shown, set the "viewed" option
        if (false === get_option('fontsampler_last_changelog')) {
            // this throws obscure error on PHP 5.6
            //$option = update_option( $this->fontsampler::FONTSAMPLER_OPTION_LAST_CHANGELOG, $plugin['Version'] );
            $plugin = get_plugin_data(realpath(dirname(__FILE__) . '/fontsampler.php'));

            update_option('fontsampler_last_changelog', $plugin['Version']);
		}
		$this->db = new FontsamplerDatabase($this->wpdb, $this);
		$this->helpers = new FontsamplerHelpers($this);
		
        $this->db->check_and_create_tables();
        $this->helpers->check_and_create_folders();
    }

    /*
     * FLOW CONTROL
     */

    /*
     * Rendering the admin interface and dealing for form interactions
     */
    public function fontsampler_admin_init() {
        global $title;

        // if entering this hook from the submenu callbacks, load different subpages
        if ($title === 'Settings') {
            $_GET['subpage'] = 'settings';
        }

        if ($title === 'New Fontsampler') {
            $_GET['subpage'] = 'set_create';
        }

        echo '<section id="fontsampler-admin" class="';
        echo $this->admin_hide_legacy_formats
            ? 'fontsampler-admin-hide-legacy-formats'
            : 'fontsampler-admin-show-legacy-formats';
        echo '">';

        $this->db->check_and_create_tables();

        // check upload folder is writable
        $dir = wp_upload_dir();
        $upload = $dir['basedir'];
        if (!is_dir($upload)) {
            echo '<p>Uploads folder does not exist! Make sure Wordpress has writing 
				permissions to create the uploads folder at: <em>' . $upload . '</em></p>';
        }

        // handle any kind of form processing and output any messages inside a notice, if there were any
        if ('POST' == $_SERVER['REQUEST_METHOD'] && isset($_POST['action'])) {
            $this->forms = new FontsamplerFormhandler($this, $_POST, $_FILES);

            // buffer the output generated during form processing, then, if
            // not empty, print any output wrapped in a notice element
            ob_start(function ($buffer) {
                if (!empty($buffer)) {
                    return '<div class="notice">' . $buffer . '</div>';
                }
            });

            $id = isset($_POST['id']) && intval($_POST['id']) > 0 ? intval($_POST['id']) : null;
            switch ($_POST['action']) {
                case 'edit_font':
                    if (!isset($id)) {
                        $this->forms->handle_font_insert();
                    } else {
                        $this->forms->handle_font_edit($id);
                    }
                    break;
                case 'delete_font':
                    $this->forms->handle_font_delete($id);
                    break;
                case 'edit_set':
                    if (!isset($id)) {
                        $this->forms->handle_set_insert();
                    } else {
                        $this->forms->handle_set_edit($id);
                    }
                    break;
                case 'delete_set':
                    $this->forms->handle_set_delete($id);
                    break;
                case 'edit_settings':
                    $this->forms->handle_settings_edit();
                    break;
                case 'reset_settings':
                    if ($this->forms->handle_settings_reset()) {
                        $this->msg->add_info('Settings successfully reset. You may have to refresh the page for the reset CSS to reload.');
                    }
                    break;
                case 'fix_default_settings':
                    if ($this->db->fix_settings_from_defaults()) {
                        $this->msg->add_info('Settings successfully restored from defaults');
                    }
                    break;
                case 'hide_changelog':
                    $this->helpers->hide_changelog();
                    break;
                default:
                    $this->msg->add_notice('Form submitted, but no matching action found for ' . $_POST['action']);
                    break;
            }
            ob_end_flush();
        }

        $subpage = isset($_GET['subpage']) ? $_GET['subpage'] : '';
        switch ($subpage) {
            case 'set_create':
                $defaults = $this->db->get_default_settings();

                $set = $defaults;
                $set['use_defaults'] = 1;
                $set['alignment_initial'] = null;

                // generate all necessary info for the live layout preview
                $layout = new FontsamplerLayout();
                $str = $layout->sanitizeString($set['ui_order'], $set);
                $layout->stringToArray($str);
                $ui_order = !empty($set['ui_order'])
                    ? $layout->sanitizeString($set['ui_order'], $set)
                    : $layout->arrayToString($layout->getDefaultBlocks(), $set);

                $blocks = array_merge($layout->getDefaultBlocks(), $layout->stringToArray($set['ui_order'], $set));

                echo $this->twig->render('set-edit.twig', array(
                    'set' => $set,
                    'defaults' => $defaults,
                    'fonts' => $this->db->get_fontfile_posts(),
                    'ui_order' => $ui_order,
                    'blocks' => $blocks
                ));
                break;

            case 'set_edit':
                $defaults = $this->db->get_settings();
                $set = $this->db->get_set(intval($_GET['id']));

                // generate all necessary info for the live layout preview
                $layout = new FontsamplerLayout();
                $str = $layout->sanitizeString($set['ui_order'], $set);
                $layout->stringToArray($str);
                $ui_order = !empty($set['ui_order'])
                    ? $layout->sanitizeString($set['ui_order'], $set)
                    : $layout->arrayToString($layout->getDefaultBlocks(), $set);

                $blocks = array_merge($layout->getDefaultBlocks(), $layout->stringToArray($set['ui_order'], $set));

                // grab all possible included fonts
                $fonts = $this->db->get_fontfile_posts();
                $fonts_order = implode(',', array_map(function ($font) {
                    return $font['id'];
                }, $set['fonts']));

                if (empty($set)) {
                    $this->msg->add_error('No set selected');
                }

                echo $this->twig->render('set-edit.twig', array(
                    'set' => $set,
                    'defaults' => $defaults,
                    'fonts' => $fonts,
                    'fonts_order' => $fonts_order,
                    'ui_order' => $ui_order,
                    'blocks' => $blocks
                ));
                break;

            case 'set_delete':
                $set = $this->db->get_set(intval($_GET['id']));
                echo $this->twig->render('set-delete.twig', array('set' => $set));
                break;

            case 'fonts':
                $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
                $num_rows = isset($_GET['num_rows']) ? intval($_GET['num_rows']) : 10;
                $initials = $this->db->get_fontsets_initials();
                $pagination = new FontsamplerPagination($initials, $num_rows, false, $offset);

                echo $this->twig->render(
                    'fontsets.twig',
                    array(
                        'fonts' => $this->db->get_fontsets($offset, $num_rows),
                        'pagination' => $pagination->pages('?page=fontsampler&amp;subpage=fonts&amp;offset=###first###&amp;num_rows=###items###', sizeof($initials)),
                    )
                );
                break;

            case 'font_create':
                echo $this->twig->render('fontset-edit.twig');
                break;

            case 'font_edit':
                echo $this->twig->render('fontset-edit.twig', array(
                    'font' => $this->db->get_fontset(intval($_GET['id']))
                ));
                break;

            case 'font_delete':
                $font = $this->db->get_fontset(intval($_GET['id']));
                echo $this->twig->render('fontset-delete.twig', array('font' => $font));
                break;

            case 'settings':
                // $this->helpers->check_is_writeable( plugin_dir_path( __FILE__ ) . 'css/fontsampler-css.css', true );
                $settings = $this->db->get_default_settings();

                // generate all necessary info for the live layout preview
                $layout = new FontsamplerLayout();
                $str = $layout->sanitizeString($settings['ui_order'], $settings);
                $layout->stringToArray($str);

                $ui_order = empty($settings['ui_order'])
                    ? $layout->arrayToString($layout->getDefaultBlocks(), $settings)
                    : $layout->sanitizeString($settings['ui_order'], $settings);

                $blocks = array_merge($layout->getDefaultBlocks(), $layout->stringToArray($settings['ui_order'], $settings));

                echo $this->twig->render('settings.twig', array(
                    'set' => $settings,
                    'defaults' => $settings, // for the most part use 'set', but some sliders read the "default" value
                    'ui_order' => $ui_order,
                    'blocks' => $blocks
                ));
                break;

            case 'settings_reset':
                echo $this->twig->render('settings-reset.twig');
                break;

            case 'changelog':
                echo $this->twig->render('changelog.twig');
                break;

            case 'about':
                echo $this->twig->render('about.twig');
                break;

            case 'notifications':
                $notifications = $this->notifications->get_notifications();
                echo $this->twig->render('notifications.twig', array(
                    'missing_files' => $notifications['fonts_missing_files'],
                    'missing_fonts' => $notifications['sets_missing_fonts'],
                    'missing_names' => $notifications['fonts_missing_name'],
                    'missing_settings' => $notifications['settings_defaults'],
                    'folder_permissions' => $notifications['folder_permissions']
                ));
                break;

            default:
                $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
                $num_rows = isset($_GET['num_rows']) ? intval($_GET['num_rows']) : 10;
                $initials = $this->db->get_samples_ids();
                $pagination = new FontsamplerPagination($initials, $num_rows, true, $offset);

                $sets = $this->db->get_sets($offset, $num_rows);

                echo $this->twig->render(
                    'sets.twig',
                    array(
                        'sets' => $sets,
                        'pagination' => $pagination->pages('?page=fontsampler&amp;subpage=sets&amp;offset=###first###&amp;num_rows=###items###', sizeof($initials)),
                    )
                );
                break;
        }

        echo '</section>';
    }

    /**
     * Registered ajax action to get a mockup fontsampler in the admin interface
     * for layout previewing
     */
    public function ajax_get_mock_fontsampler() {
        check_ajax_referer('ajax_get_mock_fontsampler', 'action', false);

        $layout = new FontsamplerLayout();

        $data = $_POST['data'];

        // data['ui_order'] contains a string with all the blocks transmitted
        // from the admin UI
        $fields = array_keys($layout->stringToArray($data['ui_order']));

        // fill all these with a simple "1", like they would be fetched from a
        // set in the db that has those fields enabled (or content in them signifiying
        // they should render)
        $fieldsFromUI = array_combine($fields, array_fill(0, sizeof($fields), 1));

        // emulate a set from the passed in mock data
        // if any field like "specimen" got not just passed in ui_order but as explicit
        // field with content, that overwrites the "1" array value
        $set = array_merge($fieldsFromUI, $data, array(
            'multiline' => 0,
            'is_ltr' => 1
        ));

        $font = plugin_dir_url(__FILE__) . 'admin/fonts/PTS55F-webfont.woff';
        $set['fonts'] = array('woff' => $font);

        // from this set create all blocks; pass in the generated set to make
        // sure all fields sync
        $blocks = $layout->stringToArray($set['ui_order'], $set);
        $options = $this->db->get_settings();
        $settings = $options; ?>

			<div class='fontsampler-wrapper on-loading'
			     data-fonts='<?php echo $font; ?>'
				 data-initial-font='<?php echo $font; ?>'
			 >
				 <?php include 'includes/interface.php'; ?>
			</div>
				<?php
        die();
    }
}
