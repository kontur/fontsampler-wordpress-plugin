define([
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/OTFeatureInfo'
], function(
    Parent
  , OTFeatureInfo
) {
    "use strict";

    /**
     * FeatureDisplay creates small cards demoing OpenType-Features found
     * in the font.
     * It searches it's host element for elements that have the CSS-class
     * `{bluePrintNodeClass}`. These blueprint nodes will be cloned and
     * augmented for each feature that is feasible to demo.
     * The cloned and augmented feature-cards will be inserted at the place
     * where the bluprint-node is located.
     * Since the bluprint-node is never removed, it should be set to
     * `style="display:none"`.
     * If more than one blueprint nodes are found, all are treated as described above.
     * If no blueprint node is found, a basic blueprint-node is generated
     * and appended to the host container.
     *
     * A blueprint node can define child elements with the follwing CSS-Classes
     * and behavior:
     *
     * `{itemTagNameClass}`: the element.textContent will be set to the
     *              feature tag name, like "dlig"
     * `{itemFriendlyNameTag}`: the element.textContent will be set to the
     *              friendly feature name, like "Discretionary Ligatures"
     * `{itemBeforeClass}`: the element.textContent will be set to the
     *              example text for the feature. The element.style will
     *              be set to the currently active webfont.
     * `{itemAfterClass}`: like `{itemBeforeClass}` except that the element.style
     *              will also be set to activate feature for the webfont.
     *
     * See _p_getApplicableFeatures below for a description how features
     * are selected for display and where the example texts are located.
     */
    function FeatureDisplay(container, pubSub, fontsData, webFontProvider, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontsData;
        this._webFontProvider = webFontProvider;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
        this._contentElements = [];
        this._itemParentContainer = null;
        this._bluePrintNodes = this._getBluePrintNodes();
    }


    var _p = FeatureDisplay.prototype = Object.create(Parent.prototype);
    _p.constructor = FeatureDisplay;

    FeatureDisplay.defaultOptions = {
        bluePrintNodeClass: 'feature-display__item-blueprint'
      , itemTagClassPrefix: 'feature-display__item-tag_'
      , itemBeforeClass: 'feature-display__item__before'
      , itemAfterClass: 'feature-display__item__after'
      , itemTagNameClass: 'feature-display__item__tag-name'
      , itemFriendlyNameClass: 'feature-display__item__friendly-name'
      , itemTagNameTag: 'h3'
      , itemFriendlyNameTag: 'p'
    };

    _p._getBluePrintNodes = function() {
        var nodes = this._container.getElementsByClassName(
                                    this._options.bluePrintNodeClass)
          , basicBlueprintChildren = [
                [this._options.itemTagNameTag
                            , this._options.itemTagNameClass]
              , [this._options.itemFriendlyNameTag
                            , this._options.itemFriendlyNameClass]
              , ['div', this._options.itemBeforeClass]
              , ['div', this._options.itemAfterClass]

            ]
          , i, l, node
          , result = []
          ;

        if(nodes.length) {
            for(i=0,l=nodes.length;i<l;i++) {
                // I expect the blueprint class to be "display: none"
                node = nodes[i].cloneNode(true);
                result.push([nodes[i], nodes[i].parentNode, node]);
                node.style.display = null;
                this._applyClasses(node, this._options.bluePrintNodeClass, true);
            }
        }
        else {
            // not found, create a basic blueprint node
            node = this._container.ownerDocument.createElement('div');
            for(i=0,l=basicBlueprintChildren.length;i<l;i++) {
                node.appendChild(this._container.ownerDocument.createElement(
                                                basicBlueprintChildren[i][0]));
                this._applyClasses(node.lastChild,  basicBlueprintChildren[i][1]);
            }
            result.push([null, this._container, node]);
        }
        return result;
    };

    /**
     *  Applicable features:
     *        -> optional features
     *        -> have an example text entry
     *        -> present in the font
     */
    _p._getApplicableFeatures = function(fontIndex) {
        var fontFeatures = this._fontsData.getFeatures(fontIndex)
          , availableFeatureTags = Object.keys(fontFeatures)
          , allFeatures = OTFeatureInfo.getSubset('optional', availableFeatureTags)
          , tag, order = []
          , i, l
          , result = []
          ;
        for(tag in allFeatures) {
            if(!allFeatures[tag].exampleText)
                continue;
            order.push(tag);
        }
        order.sort();
        for(i=0,l=order.length;i<l;i++) {
            tag = order[i];
            result.push([tag, allFeatures[tag]]);
        }
        return result;
    };

    function _mapToClass(parent, class_, func, thisArg) {
        var items = parent.getElementsByClassName(class_)
          , i, l
          ;
        for(i=0,l=items.length;i<l;i++)
            func.call(thisArg || null, items[i], i);
    }

    _p._createFeatureItem = function(bluePrintNode, fontIndex, tag, feature) {
        var item = bluePrintNode.cloneNode(true);

        _mapToClass(item, this._options.itemBeforeClass, function(item, i) {
            /*jshint unused:vars, validthis:true*/
           item.textContent = feature.exampleText;
           this._webFontProvider.setStyleOfElement(fontIndex, item);
        }, this);

        _mapToClass(item, this._options.itemAfterClass, function(item, i) {
            /*jshint unused:vars, validthis:true*/
           item.textContent = feature.exampleText;
           this._webFontProvider.setStyleOfElement(fontIndex, item);
           item.style.fontFeatureSettings = '"' + tag + '" '
                            + (feature.onByDefault ? '0' : '1');
        }, this);

        _mapToClass(item, this._options.itemTagNameClass, function(item, i) {
            /*jshint unused:vars*/
            item.textContent = tag;
        }, this);

        _mapToClass(item, this._options.itemFriendlyNameClass, function(item, i) {
            /*jshint unused:vars*/
            item.textContent = feature.friendlyName;
        }, this);

        return item;
    };

    _p._createFeatureItems =function (fontIndex, features) {
        // create new _contentElements
        var j, m, i, l, originalBluePrintNode, itemParentContainer
          , bluePrintNode, tag, feature, item
          , items = []
          ;

        for(j=0,m=this._bluePrintNodes.length;j<m;j++) {
            originalBluePrintNode = this._bluePrintNodes[j][0];
            itemParentContainer = this._bluePrintNodes[j][1];
            bluePrintNode = this._bluePrintNodes[j][2];
            for(i=0,l=features.length;i<l;i++) {
                tag = features[i][0];
                feature = features[i][1];
                item = this._createFeatureItem(bluePrintNode, fontIndex, tag, feature);
                this._applyClasses(item, this._options.itemTagClassPrefix + tag);
                if(originalBluePrintNode !== null)
                    itemParentContainer.insertBefore(item, originalBluePrintNode);
                else
                    itemParentContainer.appendChild(item);

                items.push(item);
            }
        }
        return items;
    };

    _p._onActivateFont = function(fontIndex) {
        var i, features;
        for(i=this._contentElements.length-1;i>=0;i--)
            this._contentElements[i].parentNode.removeChild(this._contentElements[i]);
        features = this._getApplicableFeatures(fontIndex);
        this._contentElements = this._createFeatureItems(fontIndex, features);
    };


    return FeatureDisplay;
});
