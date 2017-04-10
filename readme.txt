=== Plugin Name ===
Contributors: kontur
Donate link: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LSK5YQHHCGGYS
Tags: fonts, typeface, preview, shortcode
Requires at least: 4.0
Tested up to: 4.7.3
Stable tag: 0.2.1
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
* Supports (soon: woff2,) woff, eot and ttf files
* Unlimited Fontsamplers per page
* Customizable interface layout
* Customizable interface styling (colors)

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/fontsampler` directory, or install the plugin through the WordPress plugins screen directly.
1. Activate the plugin through the 'Plugins' screen in WordPress
1. In the admin sidebar go to Fontsampler to upload font files and create your Fontsamplers

== Frequently Asked Questions ==

= Can I control which user interface elements are visible? =

Absolutely. You can enable and arrange each interface element for every Fontsampler. You can even style the color theme for each Fontsampler.

= Do I have to configure each Fontsampler if I have several? =

There are defaults for the sliders as well as which interface elements are visible that get applied to all Fontsampler
that are set to use the default values. Editing the defaults will update all your Fontsamplers that are set to use defaults.

= What webfont filetypes are supported? =

WOFF, EOT and TTF are supported, and support for WOFF2 will soon be fully implemented and is already available in the admin interface.
It is recommended that for now you use the WOFF format unless you need to support legacy browsers.

= Does the plugin support displaying non-latin fonts? =

Absolutely. Right to left scripts are equally supported and improvements to the admin area for Wordpress installations with
right to left scripts are on the development roadmap.

= How can I integrate the plugin with my e-commerce solution? =

You can use the shortcode anywhere on your Wordpress site, so adding it to the description fields of your e-commerce plugin
(e.g. WooCommerce and the like) will let you display the Fontsampler there. The user interface also has options to include a link
to a specimen (web link or pdf) as well as a purchase link, for example to an external retailer.

= Can you preview OpenType features in the tester? =

That is possible, you only need to activate the corresponding user interface element and Fontsampler will automatically
detect all available OpenType features from the provided webfont files.

== Screenshots ==

1. The Fontsampler plugin comes with plenty of customizable options to tweak the appearance and interface of your webfont previews
2. You can go minimal on the UI, or even without any options at all
3. The main elements of the UI can be styled site-wide from the settings
4. Manage your typeface samples via the admin panel
5. Settings for many defaults can be tweaked to your site's needs
6. This is how you include a Fontsampler in a page or post: Simply add the shortcode for the created Fontsampler to your text

== Changelog ==

= 0.2.1 =
* Hotfix for Fontsampler sliders not working in the user-facing frontend
* Small fix to prevent unnecessarily breaking older versions of PHP

= 0.2.0 =
* Complete style overhaul for the admin area
* Supporting fully customisable settings on a per Fontsampler basis
* Color themes can be customised for each Fontsampler
* Added "Notifications" tab to admin area informing of any detected problems
* Implemented sorting and storing a default Fontsampler layout order in the settings
* Implemented action to reset the settings to the shipped defaults (in case you get carried away tweaking the settings ;) )
* Implemented copy-to-clipboard button in admin area for improved ease of use
* Fixed iOS 8 javascript errors from an included library
* Updated sponsors (Yay, thanks!)
* Internally restructured the database and templating system for more modular future development
* Improved the database migration routine to give better error messages to admin users

= 0.1.7 =
* Hotfix to upload filetype filter

See the changelog tab to review the changes in prior updates.