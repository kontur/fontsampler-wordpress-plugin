define([
    'specimenTools/loadFonts'
    , 'specimenTools/initDocumentWidgets'
    , 'specimenTools/services/PubSub'
    , 'specimenTools/services/FontsData'
    , 'specimenTools/services/WebfontProvider'
    // , 'specimenTools/widgets/GlyphTables'
    // , 'specimenTools/widgets/FamilyChooser'
    , 'specimenTools/widgets/GenericFontData'
    , 'specimenTools/widgets/CurrentWebFont'
    , 'specimenTools/widgets/TypeTester'
    , 'specimenTools/widgets/FontLister'
    , 'specimenTools/widgets/FeatureLister'
], function(
    loadFonts
    , initDocumentWidgets
    , PubSub
    , FontsData
    , WebFontProvider
    // , GlyphTables
    // , FamilyChooser
    , GenericFontData
    , CurrentWebFont
    , TypeTester
    , FontLister
    , FeatureLister
) {
    "use strict";

    /**
     * A very basic initialization function without passing configuration
     * with the factories array
     */

    function main(window, callback) {

        var wrappers = window.document.getElementsByClassName("fontsampler-wrapper");

        for (var i = 0; i < wrappers.length; i++) {
            var wrapper = wrappers[i],
                fonts = wrapper.dataset.fonts.split(","),
                initialFont = wrapper.dataset.initialFont,
                initialFontIndex = fonts.indexOf(initialFont);

            // This PubSub instance is the centrally connecting element between
            // all modules. The order in which modules subscribe to PubSub
            // channels is relevant in some cases. I.e. when a subscriber is
            // dependant on the state of another module.
            var pubsub = new PubSub()
                , factories
                , fontsData = new FontsData(pubsub, {useLaxDetection: true})
                , webFontProvider = new WebFontProvider(window, pubsub, fontsData)
                ;

            factories = [
                // [css-class of host element, Constructor(, further Constructor arguments, ...)]
                // All Constructors are given [dom-container, pubsub] as the first two arguments.
                  ['font-lister', FontLister, fontsData]
                , ['feature-lister', FeatureLister, fontsData]
                // , ['glyph-table', GlyphTables]
                , ['font-data', GenericFontData, fontsData]
                , ['current-font', CurrentWebFont, webFontProvider]
                , ['type-tester', TypeTester, fontsData]
            ];

            initDocumentWidgets(wrapper, factories, pubsub);

            // create an object to bind to the callback that has both this
            // instance's pubsub as well as distinct wrapper
            // the callback which sets up jquery based UI will then receive
            // the wrapper to bind events to that wrapper only
            var instance = {
                pubsub: pubsub,
                wrapper: wrapper,
                initialFont: initialFontIndex > -1 ? initialFontIndex : 0,
            };

            pubsub.subscribe('allFontsLoaded', function () {
                this.pubsub.publish('activateFont', this.initialFont);
                callback(this.wrapper);
            }.bind(instance));

            loadFonts.fromUrl(pubsub, fonts);
        }
    }

    return main;
});
