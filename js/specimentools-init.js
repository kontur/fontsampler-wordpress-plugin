define([
    'specimenTools/loadFonts'
    , 'specimenTools/initDocumentWidgets'
    , 'specimenTools/services/PubSub'
    , 'specimenTools/services/FontsData'
    , 'specimenTools/services/WebfontProvider'
    , 'specimenTools/widgets/GlyphTables'
    , 'specimenTools/widgets/FamilyChooser'
    , 'specimenTools/widgets/GenericFontData'
    , 'specimenTools/widgets/CurrentWebFont'
    , 'specimenTools/widgets/TypeTester'
    , 'specimenTools/widgets/FontLister'
], function(
    loadFonts
    , initDocumentWidgets
    , PubSub
    , FontsData
    , WebFontProvider
    , GlyphTables
    , FamilyChooser
    , GenericFontData
    , CurrentWebFont
    , TypeTester
    , FontLister
) {
    "use strict";

    /**
     * A very basic initialization function without passing configuration
     * with the factories array
     */

    function main(window) {

        var wrappers = window.document.getElementsByClassName("fontsampler-wrapper");

        for (var i = 0; i < wrappers.length; i++) {
            var fonts = wrappers[i].dataset.fonts.split(",");

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
                , ['glyph-table', GlyphTables]
                , ['font-data', GenericFontData, fontsData]
                , ['current-font', CurrentWebFont, webFontProvider]
                , ['type-tester', TypeTester, fontsData]
            ];

            initDocumentWidgets(wrappers[i], factories, pubsub);

            pubsub.subscribe('allFontsLoaded', function () {
                this.publish('activateFont', 0);
            }.bind(pubsub));

            loadFonts.fromUrl(pubsub, fonts);
        }
    }

    return main;
});
