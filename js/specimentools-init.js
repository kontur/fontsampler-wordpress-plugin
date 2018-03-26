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

        var wrappers = window.document.getElementsByClassName("fontsampler-wrapper"),
            instances = [];

        for (var i = 0; i < wrappers.length; i++) {
            var wrapper = wrappers[i],
                fonts = wrapper.dataset.fonts.indexOf(",") !== 0 ? wrapper.dataset.fonts.split(",") : [ wrapper.dataset.fonts ],
                initialFont = wrapper.dataset.initialFont,
                initialFontIndex = fonts.indexOf(initialFont),
                overwrites = wrapper.dataset.overwrites ? JSON.parse(wrapper.dataset.overwrites) : {};

            // if this wrapper has already been initialized, skip to next loop
            if (wrapper.classList.contains("initialized")) {
                continue;
            }


            // This PubSub instance is the centrally connecting element between
            // all modules. The order in which modules subscribe to PubSub
            // channels is relevant in some cases. I.e. when a subscriber is
            // dependant on the state of another module.
            var pubsub = new PubSub()
                , factories
                , fontsData = new FontsData(pubsub, {useLaxDetection: true, overwrites: overwrites })
                , webFontProvider = new WebFontProvider(window, pubsub, fontsData)
                ;

            factories = [
                // [css-class of host element, Constructor(, further Constructor arguments, ...)]
                // All Constructors are given [dom-container, pubsub] as the first two arguments.
                  ['font-lister', FontLister, fontsData]
                , ['feature-lister', FeatureLister, fontsData]
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
                fontsData: fontsData,
                initialFont: initialFontIndex > -1 ? initialFontIndex : 0,
                webFontProvider: webFontProvider
            };

            pubsub.subscribe('allFontsLoaded', function () {
                this.pubsub.publish('activateFont', this.initialFont);
                this.wrapper.dataset['initialFontName'] = this.fontsData.getFont(this.initialFont).names.fullName.en;
                if (typeof callback === "function") {
                    callback(this.wrapper, this.pubsub, this.fontsData);
                }
            }.bind(instance));

            var globalCache = window.xhrFontCache;
            if(!globalCache) {
                globalCache = window.xhrFontCache = {};
            }
            loadFonts.fromUrl(pubsub, fonts, globalCache);

            wrapper.className += " initialized";

            instances.push( instance );
        }

        return instances;
    }

    return main;
});
