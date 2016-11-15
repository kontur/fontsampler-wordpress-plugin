define([
  'specimenTools/_BaseWidget'
  , 'specimenTools/services/OTFeatureInfo'
], function(
  Parent
  , OTFeatureInfo
) {
  "use strict";

  /**
   * FeatureLister provides interfaces that help to test the current webfont.
   * See the CurrentWebFont widget.
   *
   * The interfaces provided are:
   *
   * - Switches to deactivate OpenType-Features that are activated by default.
   *      Use the CSS-class configured at `defaultFeaturesControlsClass`
   *      to have a de-/activating button appended to the host element
   *      for each OpenType Feature that is active by default.
   *      Initial button state is active.
   * - Switches to activate OpenType-Features that are optional.
   *      Use the CSS-class configured at `optionalFeaturesControlsClass`
   *      to have a de-/activating button appended to the host element
   *      for each OpenType Feature that is optional.
   *      Initial button state is inactive.
   *
   */
  function FeatureLister(container, pubSub, fontsData, options) {
    Parent.call(this, options);
    this._container = container;
    this._pubSub = pubSub;
    this._fontsData = fontsData;

    this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));

    this._controls = {
      features: {
        containers: Object.create(null)
        , active: Object.create(null)
        , buttons: null
        , tags: null
      }
    };

    this._activeFeatures = Object.create(null);
    this._values = Object.create(null);
    this._initFeaturesControl('default');
    this._initFeaturesControl('optional');
    this._applyValues();
  }

  var _p = FeatureLister.prototype = Object.create(Parent.prototype);
  _p.constructor = FeatureLister;

  FeatureLister.defaultOptions = {
      optionalFeaturesControlsClass: 'feature-lister__features--optional'
    , defaultFeaturesControlsClass: 'feature-lister__features--default'
    , emptyFeaturesClass: 'feature-lister__features-empty'
    , optionalFeatureButtonClasses: ''
    , defaultFeatureButtonClasses: ''
    , activateFeatureControls: null
    , featureButtonActiveClass: 'active'
  };

  /**
   * Setup the container references for OT features of @param type
   * @param type: 'optional' or 'default'
   */
  _p._initFeaturesControl = function(type) {
    var containers = type === 'default' ?
          this._getByClass(this._options.defaultFeaturesControlsClass) :
          this._getByClass(this._options.optionalFeaturesControlsClass)
      , element
      , i, l
      ;

    // for any containers for this type of feature present in the widget
    // add it to the control elements for later reference
    for (i=0,l=containers.length;i<l;i++) {
      element = containers[i];
      element.setAttribute('data-feature-type', type);
      if (!(type in this._controls.features.containers)) {
        this._controls.features.containers[type] = [];
      }
      this._controls.features.containers[type].push(element);
    }
  };


  _p._switchFeatureTagHandler = function(evt) {
    var tag = null
      , active = this._controls.features.active
      , type, cssFeatureValue, button
      ;

    tag = evt.target.value;

    // first find the feature tag
    button = evt.target;

    while(button && button !== this._container) {
      if(button.hasAttribute('data-feature-tag')) {
        tag = button.getAttribute('data-feature-tag');
        break;
      }
      button = button.parentElement;
    }

    if(tag === null)
      return;

    if(tag in active)
      delete active[tag];
    else {
      type = this._getFeatureTypeByTag(tag);
      if(type === 'default')
        cssFeatureValue = '0';
      else if(type === 'optional')
        cssFeatureValue = '1';
      else
        return;
      active[tag] = cssFeatureValue;
    }
    this._setFeatureButtonsState();
    this._setFeatures();
    this._applyValues();
  };

  _p._setFeatures = function() {
    var active = this._controls.features.active
      , buttons = this._controls.features.buttons
      , values = []
      , tag
      ;

    for (tag in active) {
      // if there is a button for the tag, we currently control it
      if(tag in buttons)
        values.push('"' + tag + '" ' + active[tag]);
    }
    this._values['font-feature-settings'] = values.join(', ');
  };

  /**
   *
   * @param container
   * @param type: "optional" | "default"
   * @param features
   * @param order
   * @returns {Array}
   * @private
   */
  _p._updateFeatureControlContainer = function(container, type, features, order) {
    var doc = container.ownerDocument
      , tag, i, l, feature, label, checkbox, wrapper
      , uiElementsToActivate = []
      ;

    if(!order) order = Object.keys(features).sort();

    // delete old ...
    for(i=container.children.length-1;i>=0;i--) {
      container.removeChild(container.children[i]);
    }
    for(i=0,l=order.length;i<l;i++) {
      tag = order[i];
      feature = features[tag];

      wrapper = doc.createElement('label');

      label = doc.createElement('span');
      label.textContent = feature.friendlyName;

      checkbox = doc.createElement('input');
      checkbox.setAttribute('type', 'checkbox');
      checkbox.setAttribute('data-feature-tag', tag);
      checkbox.setAttribute('data-feature-type', type);
      checkbox.setAttribute('value', tag);
      checkbox.addEventListener('change', this._switchFeatureTagHandler.bind(this));

      this._applyClasses(checkbox, this._options[type + 'FeaturecheckboxClasses']);

      //container.appendChild(checkbox);
      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      this._controls.features.containers[type][0].appendChild(wrapper);

      uiElementsToActivate.push(checkbox);
      if(!(tag in this._controls.features.buttons))
        this._controls.features.buttons[tag] = [];
      this._controls.features.buttons[tag].push(checkbox);
      // TODO: set this button to it's active state
      // maybe a general function after all buttons have been created
    }
    return uiElementsToActivate;
  };

  _p._getFeatureTypeByTag = function(tag) {
    var tags = this._controls.features.tags;
    if('default' in tags && tag in tags.default.features)
      return 'default';
    else if('optional' in tags && tag in tags.optional.features)
      return 'optional';
    else
      return null;
  };

  _p._updateFeatureControls = function(fontIndex) {
    // updata feature control ...
    var fontFeatures = this._fontsData.getFeatures(fontIndex)
      , availableFeatureTags = Object.keys(fontFeatures)
      , type
      , typesOrder = ['default', 'optional']
      , i, l, j, ll
      , featureData = this._controls.features
      , uiElements, uiElementsToActivate = []
      , featureContainers
      , features, order
      , containerClasses = this._container.className.split(' ')
      , emptyClassIndex = containerClasses .indexOf(this._options.emptyFeaturesClass)
      ;

    if ( availableFeatureTags.length === 0 ) {
      this._container.className += " " + this._options.emptyFeaturesClass;
    } else {
      if (emptyClassIndex > -1)
        containerClasses.splice(emptyClassIndex);

      this._container.className = containerClasses.join(' ');
    }

    // delete old tag => buttons registry
    featureData.buttons = Object.create(null);
    // these are all the features we care about
    featureData.tags = Object.create(null);


    // collect the features available for each category (type)
    for(i=0,l=typesOrder.length;i<l;i++) {
      type = typesOrder[i];
      features = OTFeatureInfo.getSubset(type, availableFeatureTags);
      order = Object.keys(features).sort();
      featureData.tags[type] = {
        features: features
        , order: order
      };

      featureContainers = featureData.containers[type] || [];
      for(j=0,ll=featureContainers.length;j<ll;j++) {
        uiElements = this._updateFeatureControlContainer(
          featureContainers[j]
          , type, features
          , order);
        // Could also just push all buttons?
        // This is used, at the moment, to let mdlFontSpecimen activate
        // these items via this._options.activateFeatureControls
        // OK would be if _updateFeatureControlContainer would return
        // the a list of relevant elements. BUT: it is hard to determine
        // which level is relevant. For MDL just the
        // plain buttons would be fine, so maybe I should stick with this.
        Array.prototype.push.apply(uiElementsToActivate, uiElements);
      }

    }
    if(this._options.activateFeatureControls)
      this._options.activateFeatureControls.call(this, uiElementsToActivate);
    // We could reset active features that are no longer available:
    // But for now we don't, remembering old settings between font
    // switching.
    //for(k in this._activeFeatures)
    //    if(!(k in features))
    //        delete this._activeFeatures[k]
    this._setFeatureButtonsState();
  };

  _p._setFeatureButtonActiveState = function(element, isActive) {
    this._applyClasses(element, this._options.featureButtonActiveClass, !isActive);
  };

  _p._setFeatureButtonsState = function() {
    var tag, active, buttons, buttonIsActive
      , featureData = this._controls.features
      , type, i, l
      ;

    for(tag in featureData.buttons) {
      buttons = featureData.buttons[tag];
      active = tag in featureData.active;
      type = this._getFeatureTypeByTag(tag);
      if(type === "default")
      // The button state should be "inactive" if this is a
      // default feature. Because, the default state is activated
        buttonIsActive = !active;
      else if(type === "optional")
      // button state and tag active state correlate
        buttonIsActive = active;
      else
      // don't know what to do (shouldn't happen unless we implment more tags)
        continue;
      for(i=0,l=buttons.length;i<l;i++)
        this._setFeatureButtonActiveState.call(this, buttons[i], buttonIsActive);
    }
  };

  _p._getByClass = function(className) {
    return this._container.getElementsByClassName(className);
  };

  _p._applyValues = function() {
    this._pubSub.publish("onChangeFontFeatures", this._values["font-feature-settings"]);
  };

  _p._onActivateFont = function(fontIndex) {
    this._updateFeatureControls(fontIndex);
    this._setFeatures();
    this._applyValues();
  };

  return FeatureLister;
});
