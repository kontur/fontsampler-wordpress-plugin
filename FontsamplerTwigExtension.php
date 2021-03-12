<?php

require_once( 'vendor/autoload.php' );

class Fontsampler_Twig_Extension extends \Twig\Extension\AbstractExtension {

    public function getFunctions() {
        global $fontsampler;

        return [
            // mount some helpers to twig
            new \Twig\TwigFunction('fontfiles_json', [$fontsampler->helpers, 'fontset_fontfiles_json']),
            new \Twig\TwigFunction('file_from_path', [$fontsampler->helpers, 'file_from_path']),
            new \Twig\TwigFunction('submit_button', [$fontsampler->helpers, 'submit_button']),
            new \Twig\TwigFunction('is_current', [$fontsampler->helpers, 'is_current']),
            new \Twig\TwigFunction('wp_nonce_field', [$fontsampler->helpers, 'wp_nonce_field']),
            new \Twig\TwigFunction('is_legacy_format', [$fontsampler->helpers, 'is_legacy_format']),
            new \Twig\TwigFunction('upload_link', [$fontsampler->helpers, 'upload_link']),
            new \Twig\TwigFunction('image_src', [$fontsampler->helpers, 'image_src']),
            new \Twig\TwigFunction('admin_hide_legacy_formats', [$fontsampler->helpers, 'admin_hide_legacy_formats']),
            new \Twig\TwigFunction('admin_proxy_urls', [$fontsampler->helpers, 'admin_proxy_urls']),
            new \Twig\TwigFunction('admin_no_permalinks', [$fontsampler->helpers, 'admin_no_permalinks']),
            new \Twig\TwigFunction('image', [$fontsampler->helpers, 'image']),
            new \Twig\TwigFunction('num_notifications', [$fontsampler->helpers, 'num_notifications']),
            new \Twig\TwigFunction('has_new_changelog', [$fontsampler->helpers, 'has_new_changelog']),
            new \Twig\TwigFunction('wp_get_attachment_image_src', [$fontsampler->helpers, 'wp_get_attachment_image_src']),
            new \Twig\TwigFunction('has_messages', [$fontsampler->msg, 'has_messages']),
            new \Twig\TwigFunction('get_messages', [$fontsampler->helpers, 'get_messages']),
        ];
    }

}