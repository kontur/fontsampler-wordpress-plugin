=== Plugin Name ===
Contributors: kontur
Donate link: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LSK5YQHHCGGYS
Tags: fonts, typeface, preview, shortcode
Requires at least: 4.0
Tested up to: 4.8.2
Stable tag: 0.3.7
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
* Customizable interface styling

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/fontsampler` directory, or install the plugin through the WordPress plugins screen directly.
1. Activate the plugin through the 'Plugins' screen in WordPress
1. In the admin sidebar go to Fontsampler to upload font files and create your Fontsamplers

== Frequently Asked Questions ==

= Is the Fontsampler plugin free? =

Absolutely. Fontsampler is free to use Open Source software developed by Johannes Neumeier of
[Underscore Type](https://underscoretype.com). You can use it for personal as well as commercial websites.
A big portion of the initial development has been funded via an IndieGoGo campaign (see the About tab in the plugin)
and you can support development by donating to the plugin development (there is
[a link in the plugin page sidebar](https://wordpress.org/plugins/fontsampler/)).

= Can I control which user interface elements are visible? =

Absolutely. You can enable and arrange each interface element for every Fontsampler. You can set custom styles and options
for all Fontsamplers on your site, or customize them for each Fontsampler individually.

= Do I have to configure each Fontsampler if I have several? =

There are defaults for the sliders as well as which interface elements are visible that get applied to all Fontsampler
that are set to use the default values. Editing the defaults will update all your Fontsamplers that are set to use defaults.

= What webfont filetypes are supported? =

WOFF, EOT and TTF are supported, and support for WOFF2 will soon be fully implemented and is already available in the admin interface.
It is recommended that for now you use the WOFF format unless you need to support legacy browsers.

Note that Wordpress might not by default accept those file types and you might have to whitelist those file types to your themes functions.php.

= Does the plugin support displaying non-latin fonts? =

Absolutely. Right to left scripts are equally supported and improvements to the admin area for Wordpress installations with
right to left scripts are on the development roadmap. You can display your fonts' names in any script you wish to.

= How can I integrate the plugin with my e-commerce solution? =

You can use the shortcode anywhere on your Wordpress site, so adding it to the description fields of your e-commerce plugin
(e.g. WooCommerce and the like) will let you display the Fontsampler there. The user interface also has options to include a link
to a specimen (web link or pdf) as well as a purchase link, for example to an external retailer.

= Can you preview OpenType features in the tester? =

That is possible, you only need to activate the corresponding user interface element and Fontsampler will automatically
detect all available OpenType features from the provided webfont files.

= Are there any specific requirements for using Fontsampler? =

Fontsampler works with PHP 5.6 or higher, but PHP 7 is recommended. It is free software and does not require any license
other than the open source licenses shipped with it.

= Are my web fonts secure when displaying them with Fontsampler? =

Fontsampler uses web font technology to render and display fonts. These font formats are designed for usability, not security.
And as such, the web font files are loaded onto the users machines just like they would on any other website that uses web fonts.
Fontsampler makes no attempt at scrambling or obfuscating the web fonts served. Tech savy users can download those web fonts
and reverse engineer them into working Opentype files. If you are concerned about your intellectual property it is recommended
to only use limited charset and feature demo web font files.

= Why are font styles from the drop down are not switching in the preview =

Fontsampler relies on the information in the uploaded webfont files. As such, it will extract font names, style names and
weights from the files (even if you set a different display name), and the browser will use these attributes to switch
the preview font. If you have fonts in the same Fontsampler that are not explicit the browser fails to switch them. Make sure
font family names, weights and italic flags are set in your font editor when exporting the web fonts. Additionally, some
special cases like stencil, outline etc. variants might need that you give them a distinct family name from the regular,
 e.g. "Myfont regular/bold/italic/etc." and "MyfontStencil regular/bold/italic/etc." - you can still overwrite their display
  name after uploading them.

== Screenshots ==

1. The Fontsampler plugin comes with plenty of customizable options to tweak the appearance and interface of your webfont previews
2. You can go minimal on the UI, or even without any options at all
3. The main elements of the UI can be styled site-wide from the settings
4. Manage your typeface samples via the admin panel
5. Settings for many defaults can be tweaked to your site's needs
6. This is how you include a Fontsampler in a page or post: Simply add the shortcode for the created Fontsampler to your text

== Changelog ==

= 0.3.6 =
* Implemented a feature that strips pasted text of its original styling
* Fixed an issue that caused dropdowns to not work on mobile devices
* Fixed an issue in the admin area that overwrote font names when uploading several fonts at once
* Fixed several styling and preview issues in the admin area

= 0.3.1, 0.3.2, 0.3.3 =
* Hotfix to prevent buggy PHP 5.6 T_PAAMAYIM_NEKUDOTAYIM (::) error
* Hotfix to prevent directory permissions check to detect a false positive

= 0.3.0 =
* Added a "What's new" tab that is shown after an updated, informing users of recent changes
* Changed the default behaviour regarding font names. Font names in Fontsamplers will be shown as stored in the admin area, instead of being extracted from the PostScript names in the files themselves
* Adding a new font file in the admin area will automatically extract the PostScript font name from the file, but let's users store any arbitrary font name when creating the font set
* Adding a new font file in the admin area will immediately render a preview of the font
* Added PHP version check to avoid users running PHP versions lower than 5.6 trying to run Fontsampler
* Fixed permissions check and creation of custom css files for storing Fontsampler custom css settings
* Added the notifications highlight number also to the Fontsampler sidebar menu to attract attention to potential issues when browsing anywhere in the admin area
* Changed the display of Fontsamplers in the admin area: The font name is directly rendered in the font, additionally there is a flag showing if a Fontsampler uses custom or default options
* Updated Opentype.js dependency to fix a Safari specific bug that would fail to detect several different distinct styles of one font family
* Fixed an issue with the uninstall script that would prevent Fontsampler from being fully uninstalled in some circumstances
* Temporarily removed Woff2 until the Opentype.js implementation is fully working; any already uploaded and stored woff2 files will still be there once this feature is ready for prime time in an upcoming release
* Fontsampler is now officially brought to you as an Open Source initiative of Underscore Type - same developer, different name ;)


= 0.2.6 =
* Fixed an issue preventing the set custom initial size of a Fontsampler to work as intended
* Fixed "Add or replace" and "Delete" buttons not working in the Fonts & Files tab
* Fixed an issue where the Jquery dependency would not load for some users
* A Fontsampler with custom settings will by default inherit default styling implicitly rather than explicitly, thus keeping styling as default
* Implemented option to specify "buy" and "speciment" links' target, i.e. allowing those links to open either in the same or in a new browser window / tab
* Added a css color option for inactive buttons (e.g. in the alignment multiselect, or inverting multiselect)
* Added the Opentype dropdown dialog's text to inherit the UI label text css settings
* Confirmed compatibility for WP core 4.8.x

= 0.2.5 =
* Hotfix resolving an issue where on-the-fly generation of more than one custom css file would result in faulty custom css files
* Hotfix to make sure new custom css options added in 0.2.4 will use the default value upon update

= 0.2.4 =
* Fixed a database issue that prevented per Fontsampler custom settings from being saved
* Fixed an issue that prevented backend sliders from working properly
* Fixed an issue that prevented the invert button to work properly for per Fontsampler custom styling
* Automatically re-generate the reset CSS after resetting settings to the defaults
* Added (back) the possibility to set the font size, line height or letter spacing of a Fontsampler even though the respective user interface slider is disabled
* Added automatic sanity check to admin min, initial and max sliders to avoid impossible overlap
* Added more css options and tweaks to how some are applied to allow better customization

= 0.2.3 =
* All font files are now handled via the WP media gallery popup in the admin area
* Added option to delete all linked media gallery files when deleting a fontset
* Added option to selected existing webfont file from media gallery for several fontsets
* Added file and folder permissions check and notification to the admin area
* Fixed an issue where removing one file would remove all files of a fontset
* Fixed an issue where the initially selected font of a Fontsampler would not get saved
* Fixed an issue where a setting in the server's php.ini would limit the amount of inline fonts that could be uploaded inline while adding a new Fontsampler

= 0.2.2 =
* Hotfix fixing missing default setting units for font size, line height and letterspacing sliders after saving settings
* Implemented further checks for ensuring the default settings are valid
* Implemented "Fix from defaults" action in case some default settings were invalid

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

See the changelog tab to review the changes in prior updates.