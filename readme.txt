=== Plugin Name ===
Contributors: kontur
Donate link: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=LSK5YQHHCGGYS
Tags: fonts, font, typeface, preview, shortcode
Requires at least: 4.0
Tested up to: 5.0
Stable tag: 0.4.4
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

This is a plugin directed primarily at type designers, lettering artists, foundries or resellers to showcase webfonts by embedding interactive type testers via shortcodes.

== Description ==

This is a plugin directed primarily at type designers, lettering artists, foundries or resellers using Wordpress to showcase their fonts without the need for coding knowledge.

The plugin allows you to embed interactive webfont specimens on your site via shortcodes. Users can preview, type with, and switch the webfonts in a preview, as well as use other interface options to manipulate the font sample.

After installing the plugin and creating a Fontsampler, you are able to showcase a set of webfonts by adding a simple [fontsampler id=123] shortcode to any page or post.

More information and clickable examples available [on the plugin website](http://fontsampler.johannesneumeier.com).

Features include:

* Interactive text field where users can type to preview the font
* Controls for switching between fonts (if several are added to one Fontsampler)
* Slider controls for manipulating font size, letter spacing & line height
* Switches for alignment, inverting the text and background color, selecting language for testing locl features
* Automatic detection and controls for testing Opentype features
* Supports any language script and script direction
* Supports woff files (woff2 support will hopefully be added soon, support for eot and ttf has been phased out)
* Unlimited Fontsamplers per page
* Customizable interface layout
* Customizable interface styling
* Customizable dropdown with preset texts

== Installation ==

The easiest way to install is going to: Plugins > Add new > Search for "Fontsampler" and install from there.

Alternatively you can:

1. Upload the plugin files to the `/wp-content/plugins/fontsampler` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress
3. In the admin sidebar go to Fontsampler to upload font files and create your Fontsamplers

== Frequently Asked Questions ==

= Is the Fontsampler plugin free? =

Absolutely. Fontsampler is free to use Open Source software developed by Johannes Neumeier of [Underscore Type](https://underscoretype.com). You can use it for personal as well as commercial websites. A big portion of the initial development has been funded via an IndieGoGo campaign (see the About tab in the plugin) and you can support development by donating to the plugin development (there is [a link in the plugin page sidebar](https://wordpress.org/plugins/fontsampler/)).

= Can I control which user interface elements are visible? =

Absolutely. You can enable and arrange each interface element for every Fontsampler. You can set custom styles and options for all Fontsamplers on your site, or customize them for each Fontsampler individually.

= Do I have to configure each Fontsampler if I have several? =

You can update site-wide settings for layout, features and styling that get applied to all Fontsamplers. All of those options can also be overwritten for each individual Fontsampler, so you can have more customized styling for some previews.

= What webfont filetypes are supported? =

Currently only the WOFF format is supported, and support for WOFF2 will hopefully soon follow. Legacy webfont formats EOT and TTF are being phased out beginning with version 0.4.0.

= Does the plugin support displaying non-latin fonts? =

Absolutely. You can display your fonts' names in any script you wish to, so you don't have to use PostScript names for your font display (your fonts do, however, need to have ASCII PostScript names in them to technically work). Right to left scripts are equally supported, and support for right to left scripts has been added to the backend as well. 

= Can I use the plugin with theme or plugin X? =

The plugin is coded to best Wordpress standards. Using it with any theme or plugin should work. If you encounter any problems with a particular theme or plugin please post in the support forum.

= How can I integrate the plugin with my e-commerce solution? =

You can use the shortcode anywhere on your Wordpress site, so adding it to the description fields of your e-commerce plugin (e.g. WooCommerce and the like) will let you display the Fontsampler there. 

For more advanced users / developers you can trigger the shortcode programmatically and pass in what font files to use dynamically.

= Can you preview OpenType features in the tester? =

That is possible, you only need to activate the corresponding user interface element and Fontsampler will automatically detect all available OpenType features from the provided webfont files. Using and testing locl features is implemented via a separate language dropdown.

= Are there any specific requirements for using Fontsampler? =

Fontsampler works with PHP 5.6.33 or higher, but PHP 7 is recommended. PHP is free software and does not require any license other than the open source licenses shipped with it. Those versions of PHP are also required for security reasons aside from Fontsampler, so keeping those up to date is a good idea either way.

= Are my web fonts secure when displaying them with Fontsampler? =

Fontsampler uses web font technology to render and display fonts. These font formats are designed for usability, not security. And as such, the web font files are loaded onto the users machines just like they would on any other website that uses web fonts. Fontsampler makes no attempt at scrambling or obfuscating the web fonts served. Tech savy users can download those web fonts and reverse engineer them into working Opentype files. If you are concerned about your intellectual property it is recommended to only use limited charset and feature demo web font files.

= Why are font styles from the drop down are not switching in the preview =

Fontsampler relies on the information in the uploaded webfont files. As such, it will extract font names, style names and weights from the files (even if you set a different display name), and the browser will use these attributes to switch the preview font. If you have fonts in the same Fontsampler that are not explicit the browser fails to switch them. Make sure font family names, weights and italic flags are set in your font editor when exporting the web fonts. Additionally, some special cases like stencil, outline etc. variants might need that you give them a distinct family name from the regular, e.g. "Myfont regular/bold/italic/etc." and "MyfontStencil regular/bold/italic/etc." - you can still overwrite their display name after uploading them.

= I'm a developer, how can I further customize and integrate the plugin to my site? =

The [Github repository](https://github.com/kontur/fontsampler-wordpress-plugin) has more documentation about available PHP hooks and Javascript callbacks. For example you can dynamically trigger the shortcode and pass in fonts or react to the Fontsampler finishing to load. Overwriting Fontsampler specific CSS in a theme should be trivial and provide more options than the Backend user interface. You can also style specific instances by their class `.fontsampler-interface.fontsampler-id-xxx`. If you are missing a feature or hook, let me know in the support forum.

== Screenshots ==

1. The Fontsampler plugin comes with plenty of customizable options to tweak the appearance and interface of your webfont previews
2. You can go minimal on the UI, or even without any options at all
3. The main elements of the UI can be styled site-wide from the settings
4. Manage your typeface samples via the admin panel
5. Settings for many defaults can be tweaked to your site's needs
6. This is how you include a Fontsampler in a page or post: Simply add the shortcode for the created Fontsampler to your text

== Changelog ==

= 0.4.4 =
* FIX: Made 'init' and 'fina' Opentype Features available in the context menu for fonts that support them

= 0.4.3 =
* TWEAK: Improved admin interface slider responsivness and sanity checks
* TWEAK: Fixed compability with misc plugins (css class conflicts)

= 0.4.1 & 0.4.2 =
* TWEAK: Hotfix to suppress a debug message

= 0.4.0 =
* FEATURE: Implemented option for handling notdef glyphs
* FEATURE: Implemented language locale picker, which allows previewing Opentype locl substitutions
* FEATURE: Implemented default translations for frontend strings
* FEATURE: Included translations: English, German, Finnish, Persian
* FEATURE: Added more Javascript events for various UI operations, making it easier to customise and extend the plugin
* FEATURE: Added 'fontsampler_enqueue_styles' filter hook to programatically trigger enqueuing the fontsampler styles (e.g. if you have programatically triggered the shortcode and want to ensure the styles are loaded in the head tag)
* FEATURE: Implemented automatic detection and rewrite for mixed content problems when serving a site over https, but font files are stored in the media gallery with http
* TWEAK: The Fontsampler UI CSS and HTML structure has changed slightly (mainly: using flex-box display)
* TWEAK: Improved shortcode detection and outputting of fontsampler styles to the header of pages on which the fontsampler shortcode is detected 
* TWEAK: Improved rendering for right-to-left languages in frontend and backend
* TWEAK: Fixed the warning about the minimum PHP version required for Fontsampler to be 5.6.33
* TWEAK: Warning and error messages now use the default Wordpress styling
* FIX: Fixed an issue where settings overwrites for the sample texts dropdown would incorrectly render the default settings' sample texts
* FIX: Fixed the appearance of color picker buttons in the Fontsampler admin area
* FIX: Improvement that prevents the same font file being loaded several times when used in several different Fontsamplers on the same page, potentially resulting in a MASSIVE performance improvement
* FIX: Implemented a fix that prevented "Oblique" styles from being detected as different than their roman counter-part 
* NOTICE: Deprecating Specimen and Link UI fields; those will get removed with 0.5.0 and replaced with hooks to enable customising
* NOTICE: Deprecating "Legacy formats" now still included (hidden by default) in the admin area; those will get removed with 0.5.0

= 0.3.7 & 0.3.8 =
* Implemented shortcode attribute to overwrite or dynamically set the default text
* Implemented shortcode attribute to overwrite or dynamically set the fonts and font files
* Implemented events called on the wrapper after initialisation and font change
* Now serving all frontend javascript assets as one minified file (previously 20+ dynamic file calls)
* Now serving all backend javascript assets as one minified file (previously 30+ dynamic file calls)
* Fixed a compability issue arising from other plugins using the same javascript dependency manager
* Fixed an issue where OpenType features that are enabled by default did not have their UI elements reflect that correctly
* Fixed an issue where switching fonts would revert selections made in the OpenType modal

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

See the changelog tab to review the changes in prior updates.