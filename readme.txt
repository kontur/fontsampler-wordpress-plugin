=== Plugin Name ===
Contributors: kontur
Donate link: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LSK5YQHHCGGYS
Tags: fonts, typeface, preview, shortcode
Requires at least: 4.0
Tested up to: 4.7.2
Stable tag: 0.1.7
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

This is a plugin directed primarily at type designers, foundries or resellers to showcase webfonts by embedding interactive specimens via shortcodes.

== Description ==

This is a plugin directed primarily at type designers, foundries or resellers using Wordpress to showcase their fonts.

The plugin allows you to embed interactive webfont specimens on your site via shortcodes. Users can preview, type with,
and switch the webfonts in a preview, as well as use other interface options to manipulate the font sample.

After installing the plugin and creating a Fontsampler, you are able to showcase a set of webfonts by adding a simple
[fontsampler id=123] shortcode to any page or post.

More information and clickable examples available [on the plugin website](http://fontsampler.johannesneumeier.com).

Features include:

* Interactive text field where users can type to preview the font
* Controls for switching between fonts (if several are added to one Fontsampler)
* Slider controls for manipulating font size, letter spacing & line height
* Customizable dropdown with preset texts
* Automatic detection and controls for testing Opentype features
* Switches for alignment and inverting the text and background color
* Support for any language script and script direction
* Supports woff2, woff, eot and ttf files
* Unlimited Fontsamplers per page
* Customizable interface layout
* Customizable interface styling (colors)

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/fontsampler` directory, or install the plugin through the WordPress plugins screen directly.
1. Activate the plugin through the 'Plugins' screen in WordPress
1. In the admin sidebar go to Fontsampler to upload font files and create your Fontsamplers

== Frequently Asked Questions ==

= Can I control which user interface elements are visible? =

Absolutely. You can enable and arrange each interface element for every Fontsampler

= Do I have to configure each Fontsampler if I have several? =

There are defaults for the sliders as well as which interface elements are visible that get applied to all Fontsampler
that are set to use the default values.

== Screenshots ==

1. The Fontsampler plugin comes with plenty of customizable options to tweak the appearance and interface of your webfont previews
2. You can go minimal on the UI, or even without any options at all
3. The main elements of the UI can be styled site-wide from the settings
4. Manage your typeface samples via the admin panel
5. Settings for many defaults can be tweaked to your site's needs
6. This is how you include a Fontsampler in a page or post: Simply add the shortcode for the created Fontsampler to your text

== Changelog ==

= 0.1.7 =
- Hotfix to upload filetype filter

= 0.1.6 =
* Implemented workaround for WP core bug preventing file uploads for some users
* Fixed uninstall script to run without error messages

= 0.1.5 =
* Fixed PHP 7 compatibility issues
* Fixed issue that failed to apply css changes as a result from a plugin update
* Forced browsers with spellcheckers and autocorrect to ignore the fontsampler text input

= 0.1.4 =
* Updated to allow for more lenient italic detection (now also from Font name)
* Fix small possible alignment interference from theme CSS

= 0.1.3 =
* Fontsamplers now support families with different widths
* Each fontsampler instance is now wrapped in a DOM element with the fontsampler's ID for custom styling
* Fixed a small interface alignment issues

= 0.1.2 =
* Added editable default setting for alignment
* Fixed some alignment issues not properly respecting editable UI block height and underline

= 0.1.1 =
* Fontsampler layout preview and manipulation improved, including options for column count and column span of individual user interface elements
* Fontsampler layout preview now renders an actual mock Fontsampler in the admin interface to better visualise the layout
* Added option to add links for Buying and viewing a Specimen to the interface
* Added default label text and images for those two links to the settings
* Added column and row gutter, as well as row height as customisable settings
* Activating the "Invert" UI option will add "fontsampler-inverted" to the <body>, so you can define styles for when it's active (e.g. inverting the overall page background color)
* Improved under the hood generation of css files when customising Fontsampler styling
* Improved under the hood admin javascript loading

= 0.1.0 =
* Initial public release