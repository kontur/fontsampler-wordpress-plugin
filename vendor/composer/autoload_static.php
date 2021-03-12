<?php

// autoload_static.php @generated by Composer

namespace Composer\Autoload;

class ComposerStaticInita0e07c8066b7ab52ff313687c30a0c87
{
    public static $files = array (
        '320cde22f66dd4f5d3fd621d3e88b98f' => __DIR__ . '/..' . '/symfony/polyfill-ctype/bootstrap.php',
        '0e6d7bf4a5811bfa5cf40c5ccd6fae6a' => __DIR__ . '/..' . '/symfony/polyfill-mbstring/bootstrap.php',
    );

    public static $prefixLengthsPsr4 = array (
        'T' => 
        array (
            'Twig\\' => 5,
        ),
        'S' => 
        array (
            'Symfony\\Polyfill\\Mbstring\\' => 26,
            'Symfony\\Polyfill\\Ctype\\' => 23,
        ),
    );

    public static $prefixDirsPsr4 = array (
        'Twig\\' => 
        array (
            0 => __DIR__ . '/..' . '/twig/twig/src',
        ),
        'Symfony\\Polyfill\\Mbstring\\' => 
        array (
            0 => __DIR__ . '/..' . '/symfony/polyfill-mbstring',
        ),
        'Symfony\\Polyfill\\Ctype\\' => 
        array (
            0 => __DIR__ . '/..' . '/symfony/polyfill-ctype',
        ),
    );

    public static $prefixesPsr0 = array (
        'L' => 
        array (
            'Less' => 
            array (
                0 => __DIR__ . '/..' . '/oyejorge/less.php/lib',
            ),
        ),
    );

    public static $classMap = array (
        'lessc' => __DIR__ . '/..' . '/oyejorge/less.php/lessc.inc.php',
    );

    public static function getInitializer(ClassLoader $loader)
    {
        return \Closure::bind(function () use ($loader) {
            $loader->prefixLengthsPsr4 = ComposerStaticInita0e07c8066b7ab52ff313687c30a0c87::$prefixLengthsPsr4;
            $loader->prefixDirsPsr4 = ComposerStaticInita0e07c8066b7ab52ff313687c30a0c87::$prefixDirsPsr4;
            $loader->prefixesPsr0 = ComposerStaticInita0e07c8066b7ab52ff313687c30a0c87::$prefixesPsr0;
            $loader->classMap = ComposerStaticInita0e07c8066b7ab52ff313687c30a0c87::$classMap;

        }, null, ClassLoader::class);
    }
}
