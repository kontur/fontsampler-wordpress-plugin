define([
], function(
) {
    "use strict";

    /**
     * Very basic <select> interface to switch between all loaded fonts.
     * See FamilyChooser for a more advanced interface.
     */

    function FontLister(container, pubSub) {
        this._container = container;
        this._pubSub = pubSub;

        this._elements = [];
        this._selectContainer = this._container.ownerDocument.createElement('select');
        this._selectContainer.addEventListener('change', this._selectFont.bind(this));
        this._selectContainer.enabled = false;
        this._container.appendChild(this._selectContainer);

        this._pubSub.subscribe('prepareFont', this._prepareLoadHook.bind(this));
        this._pubSub.subscribe('loadFont', this._onLoadFont.bind(this));
        this._pubSub.subscribe('allFontsLoaded', this._onAllFontsLoaded.bind(this));
    }

    var _p = FontLister.prototype;

    _p._prepareLoadHook = function(i, fontFileName) {
        var option = this._selectContainer.ownerDocument.createElement('option');
        option.textContent = '';
        option.value = i;
        option.addEventListener('click', this._activateFont.bind(this, i), true);
        this._elements.push(option);
        this._selectContainer.appendChild(option);
    };

    _p._onLoadFont = function(i, fontFileName, font) {
        /*jshint unused: vars*/
        this._elements[i].textContent = font.names.fullName.en;
    };

    _p._activateFont = function(i) {
        // this will call this._onActivateFont
        this._pubSub.publish('activateFont', i);
    };

    _p._onAllFontsLoaded = function() {
        this._selectContainer.enabled = true;
    };

    _p._selectFont = function(event) {
        this._pubSub.publish('activateFont', event.target.value);
    };

    return FontLister;
});
