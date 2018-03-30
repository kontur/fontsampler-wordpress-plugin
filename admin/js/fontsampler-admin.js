var fs;(function () { if (!fs || !fs.requirejs) {
if (!fs) { fs = {}; } else { require = fs; }
/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.3.5 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, https://github.com/requirejs/requirejs/blob/master/LICENSE
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global, setTimeout) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.3.5',
        commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    //Could match something like ')//comment', do not lose the prefix to comment.
    function commentReplace(match, singlePrefix) {
        return singlePrefix || '';
    }

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that is expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite an existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; i < ary.length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && ary[2] === '..') || ary[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI, normalizedBaseParts,
                baseParts = (baseName && baseName.split('/')),
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // If wanting node ID compatibility, strip .js from end
                // of IDs. Have to do this here, and not in nameToUrl
                // because node allows either .js or non .js to map
                // to same file.
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                // Starts with a '.' so need the baseName
                if (name[0].charAt(0) === '.' && baseParts) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = normalizedBaseParts.concat(name);
                }

                trimDots(name);
                name = name.join('/');
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);

                //Custom require that does not do map translation, since
                //ID is "absolute", already mapped/resolved.
                context.makeRequire(null, {
                    skipMap: true
                })([id]);

                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (isNormalized) {
                        normalizedName = name;
                    } else if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        // If nested plugin references, then do not try to
                        // normalize, as it will not normalize correctly. This
                        // places a restriction on resourceIds, and the longer
                        // term solution is not to normalize until plugins are
                        // loaded and all normalizations to allow for async
                        // loading of a loader plugin. But for now, fixes the
                        // common uses. Details in #1131
                        normalizedName = name.indexOf('!') === -1 ?
                                         normalize(name, parentName, applyMap) :
                                         name;
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                each(globalDefQueue, function(queueItem) {
                    var id = queueItem[0];
                    if (typeof id === 'string') {
                        context.defQueueMap[id] = true;
                    }
                    defQueue.push(queueItem);
                });
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    // Only fetch if not already in the defQueue.
                    if (!hasProp(context.defQueueMap, id)) {
                        this.fetch();
                    }
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                var resLoadMaps = [];
                                each(this.depMaps, function (depMap) {
                                    resLoadMaps.push(depMap.normalizedMap || depMap);
                                });
                                req.onResourceLoad(context, this.map, resLoadMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap,
                                                      true);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.map.normalizedMap = normalizedMap;
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            if (this.undefed) {
                                return;
                            }
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        } else if (this.events.error) {
                            // No direct errback on this module, but something
                            // else is listening for errors, so be sure to
                            // propagate the error correctly.
                            on(depMap, 'error', bind(this, function(err) {
                                this.emit('error', err);
                            }));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' +
                        args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
            context.defQueueMap = {};
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            defQueueMap: {},
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                // Convert old style urlArgs string to a function.
                if (typeof cfg.urlArgs === 'string') {
                    var urlArgs = cfg.urlArgs;
                    cfg.urlArgs = function(id, url) {
                        return (url.indexOf('?') === -1 ? '?' : '&') + urlArgs;
                    };
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? {name: pkgObj} : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id, null, true);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        mod.undefed = true;
                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if (args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });
                        delete context.defQueueMap[id];

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }
                context.defQueueMap = {};

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|^blob\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs && !/^blob\:/.test(url) ?
                       url + config.urlArgs(moduleName, url) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    var parents = [];
                    eachProp(registry, function(value, key) {
                        if (key.indexOf('_@r') !== 0) {
                            each(value.depMaps, function(depMap) {
                                if (depMap.id === data.id) {
                                    parents.push(key);
                                    return true;
                                }
                            });
                        }
                    });
                    return onError(makeError('scripterror', 'Script error for "' + data.id +
                                             (parents.length ?
                                             '", needed by: ' + parents.join(', ') :
                                             '"'), evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support fs.require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/requirejs/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/requirejs/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //Calling onNodeCreated after all properties on the node have been
            //set, but before it is placed in the DOM.
            if (config.onNodeCreated) {
                config.onNodeCreated(node, config, moduleName, url);
            }

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation is that a build has been done so
                //that only one script needs to be loaded anyway. This may need
                //to be reevaluated if other use cases become common.

                // Post a task to the event loop to work around a bug in WebKit
                // where the worker gets garbage-collected after calling
                // importScripts(): https://webkit.org/b/153317
                setTimeout(function() {}, 0);
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one,
                //but only do so if the data-main value is not a loader plugin
                //module ID.
                if (!cfg.baseUrl && mainScript.indexOf('!') === -1) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, commentReplace)
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        if (context) {
            context.defQueue.push([name, deps, callback]);
            context.defQueueMap[name] = true;
        } else {
            globalDefQueue.push([name, deps, callback]);
        }
    };

    define.amd = {
        jQuery: true
    };

    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this, (typeof setTimeout === 'undefined' ? undefined : setTimeout)));

fs.requirejs = requirejs;fs.require = require;fs.define = define;
}
}());
fs.define("requireLib", function(){});

/**
 * https://opentype.js.org v0.7.3 | (c) Frederik De Bleser and other contributors | MIT License | Uses tiny-inflate by Devon Govett
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof fs.define === 'function' && fs.define.amd ? fs.define('opentype',['exports'], factory) :
	(factory((global.opentype = global.opentype || {})));
}(this, (function (exports) { 'use strict';

var TINF_OK = 0;
var TINF_DATA_ERROR = -3;

function Tree() {
  this.table = new Uint16Array(16);   /* table of code length counts */
  this.trans = new Uint16Array(288);  /* code -> symbol translation table */
}

function Data(source, dest) {
  this.source = source;
  this.sourceIndex = 0;
  this.tag = 0;
  this.bitcount = 0;
  
  this.dest = dest;
  this.destLen = 0;
  
  this.ltree = new Tree();  /* dynamic length/symbol tree */
  this.dtree = new Tree();  /* dynamic distance tree */
}

/* --------------------------------------------------- *
 * -- uninitialized global data (static structures) -- *
 * --------------------------------------------------- */

var sltree = new Tree();
var sdtree = new Tree();

/* extra bits and base tables for length codes */
var length_bits = new Uint8Array(30);
var length_base = new Uint16Array(30);

/* extra bits and base tables for distance codes */
var dist_bits = new Uint8Array(30);
var dist_base = new Uint16Array(30);

/* special ordering of code length codes */
var clcidx = new Uint8Array([
  16, 17, 18, 0, 8, 7, 9, 6,
  10, 5, 11, 4, 12, 3, 13, 2,
  14, 1, 15
]);

/* used by tinf_decode_trees, avoids allocations every call */
var code_tree = new Tree();
var lengths = new Uint8Array(288 + 32);

/* ----------------------- *
 * -- utility functions -- *
 * ----------------------- */

/* build extra bits and base tables */
function tinf_build_bits_base(bits, base, delta, first) {
  var i, sum;

  /* build bits table */
  for (i = 0; i < delta; ++i) { bits[i] = 0; }
  for (i = 0; i < 30 - delta; ++i) { bits[i + delta] = i / delta | 0; }

  /* build base table */
  for (sum = first, i = 0; i < 30; ++i) {
    base[i] = sum;
    sum += 1 << bits[i];
  }
}

/* build the fixed huffman trees */
function tinf_build_fixed_trees(lt, dt) {
  var i;

  /* build fixed length tree */
  for (i = 0; i < 7; ++i) { lt.table[i] = 0; }

  lt.table[7] = 24;
  lt.table[8] = 152;
  lt.table[9] = 112;

  for (i = 0; i < 24; ++i) { lt.trans[i] = 256 + i; }
  for (i = 0; i < 144; ++i) { lt.trans[24 + i] = i; }
  for (i = 0; i < 8; ++i) { lt.trans[24 + 144 + i] = 280 + i; }
  for (i = 0; i < 112; ++i) { lt.trans[24 + 144 + 8 + i] = 144 + i; }

  /* build fixed distance tree */
  for (i = 0; i < 5; ++i) { dt.table[i] = 0; }

  dt.table[5] = 32;

  for (i = 0; i < 32; ++i) { dt.trans[i] = i; }
}

/* given an array of code lengths, build a tree */
var offs = new Uint16Array(16);

function tinf_build_tree(t, lengths, off, num) {
  var i, sum;

  /* clear code length count table */
  for (i = 0; i < 16; ++i) { t.table[i] = 0; }

  /* scan symbol lengths, and sum code length counts */
  for (i = 0; i < num; ++i) { t.table[lengths[off + i]]++; }

  t.table[0] = 0;

  /* compute offset table for distribution sort */
  for (sum = 0, i = 0; i < 16; ++i) {
    offs[i] = sum;
    sum += t.table[i];
  }

  /* create code->symbol translation table (symbols sorted by code) */
  for (i = 0; i < num; ++i) {
    if (lengths[off + i]) { t.trans[offs[lengths[off + i]]++] = i; }
  }
}

/* ---------------------- *
 * -- decode functions -- *
 * ---------------------- */

/* get one bit from source stream */
function tinf_getbit(d) {
  /* check if tag is empty */
  if (!d.bitcount--) {
    /* load next tag */
    d.tag = d.source[d.sourceIndex++];
    d.bitcount = 7;
  }

  /* shift bit out of tag */
  var bit = d.tag & 1;
  d.tag >>>= 1;

  return bit;
}

/* read a num bit value from a stream and add base */
function tinf_read_bits(d, num, base) {
  if (!num)
    { return base; }

  while (d.bitcount < 24) {
    d.tag |= d.source[d.sourceIndex++] << d.bitcount;
    d.bitcount += 8;
  }

  var val = d.tag & (0xffff >>> (16 - num));
  d.tag >>>= num;
  d.bitcount -= num;
  return val + base;
}

/* given a data stream and a tree, decode a symbol */
function tinf_decode_symbol(d, t) {
  while (d.bitcount < 24) {
    d.tag |= d.source[d.sourceIndex++] << d.bitcount;
    d.bitcount += 8;
  }
  
  var sum = 0, cur = 0, len = 0;
  var tag = d.tag;

  /* get more bits while code value is above sum */
  do {
    cur = 2 * cur + (tag & 1);
    tag >>>= 1;
    ++len;

    sum += t.table[len];
    cur -= t.table[len];
  } while (cur >= 0);
  
  d.tag = tag;
  d.bitcount -= len;

  return t.trans[sum + cur];
}

/* given a data stream, decode dynamic trees from it */
function tinf_decode_trees(d, lt, dt) {
  var hlit, hdist, hclen;
  var i, num, length;

  /* get 5 bits HLIT (257-286) */
  hlit = tinf_read_bits(d, 5, 257);

  /* get 5 bits HDIST (1-32) */
  hdist = tinf_read_bits(d, 5, 1);

  /* get 4 bits HCLEN (4-19) */
  hclen = tinf_read_bits(d, 4, 4);

  for (i = 0; i < 19; ++i) { lengths[i] = 0; }

  /* read code lengths for code length alphabet */
  for (i = 0; i < hclen; ++i) {
    /* get 3 bits code length (0-7) */
    var clen = tinf_read_bits(d, 3, 0);
    lengths[clcidx[i]] = clen;
  }

  /* build code length tree */
  tinf_build_tree(code_tree, lengths, 0, 19);

  /* decode code lengths for the dynamic trees */
  for (num = 0; num < hlit + hdist;) {
    var sym = tinf_decode_symbol(d, code_tree);

    switch (sym) {
      case 16:
        /* copy previous code length 3-6 times (read 2 bits) */
        var prev = lengths[num - 1];
        for (length = tinf_read_bits(d, 2, 3); length; --length) {
          lengths[num++] = prev;
        }
        break;
      case 17:
        /* repeat code length 0 for 3-10 times (read 3 bits) */
        for (length = tinf_read_bits(d, 3, 3); length; --length) {
          lengths[num++] = 0;
        }
        break;
      case 18:
        /* repeat code length 0 for 11-138 times (read 7 bits) */
        for (length = tinf_read_bits(d, 7, 11); length; --length) {
          lengths[num++] = 0;
        }
        break;
      default:
        /* values 0-15 represent the actual code lengths */
        lengths[num++] = sym;
        break;
    }
  }

  /* build dynamic trees */
  tinf_build_tree(lt, lengths, 0, hlit);
  tinf_build_tree(dt, lengths, hlit, hdist);
}

/* ----------------------------- *
 * -- block inflate functions -- *
 * ----------------------------- */

/* given a stream and two trees, inflate a block of data */
function tinf_inflate_block_data(d, lt, dt) {
  while (1) {
    var sym = tinf_decode_symbol(d, lt);

    /* check for end of block */
    if (sym === 256) {
      return TINF_OK;
    }

    if (sym < 256) {
      d.dest[d.destLen++] = sym;
    } else {
      var length, dist, offs;
      var i;

      sym -= 257;

      /* possibly get more bits from length code */
      length = tinf_read_bits(d, length_bits[sym], length_base[sym]);

      dist = tinf_decode_symbol(d, dt);

      /* possibly get more bits from distance code */
      offs = d.destLen - tinf_read_bits(d, dist_bits[dist], dist_base[dist]);

      /* copy match */
      for (i = offs; i < offs + length; ++i) {
        d.dest[d.destLen++] = d.dest[i];
      }
    }
  }
}

/* inflate an uncompressed block of data */
function tinf_inflate_uncompressed_block(d) {
  var length, invlength;
  var i;
  
  /* unread from bitbuffer */
  while (d.bitcount > 8) {
    d.sourceIndex--;
    d.bitcount -= 8;
  }

  /* get length */
  length = d.source[d.sourceIndex + 1];
  length = 256 * length + d.source[d.sourceIndex];

  /* get one's complement of length */
  invlength = d.source[d.sourceIndex + 3];
  invlength = 256 * invlength + d.source[d.sourceIndex + 2];

  /* check length */
  if (length !== (~invlength & 0x0000ffff))
    { return TINF_DATA_ERROR; }

  d.sourceIndex += 4;

  /* copy block */
  for (i = length; i; --i)
    { d.dest[d.destLen++] = d.source[d.sourceIndex++]; }

  /* make sure we start next block on a byte boundary */
  d.bitcount = 0;

  return TINF_OK;
}

/* inflate stream from source to dest */
function tinf_uncompress(source, dest) {
  var d = new Data(source, dest);
  var bfinal, btype, res;

  do {
    /* read final block flag */
    bfinal = tinf_getbit(d);

    /* read block type (2 bits) */
    btype = tinf_read_bits(d, 2, 0);

    /* decompress block */
    switch (btype) {
      case 0:
        /* decompress uncompressed block */
        res = tinf_inflate_uncompressed_block(d);
        break;
      case 1:
        /* decompress block with fixed huffman trees */
        res = tinf_inflate_block_data(d, sltree, sdtree);
        break;
      case 2:
        /* decompress block with dynamic huffman trees */
        tinf_decode_trees(d, d.ltree, d.dtree);
        res = tinf_inflate_block_data(d, d.ltree, d.dtree);
        break;
      default:
        res = TINF_DATA_ERROR;
    }

    if (res !== TINF_OK)
      { throw new Error('Data error'); }

  } while (!bfinal);

  if (d.destLen < d.dest.length) {
    if (typeof d.dest.slice === 'function')
      { return d.dest.slice(0, d.destLen); }
    else
      { return d.dest.subarray(0, d.destLen); }
  }
  
  return d.dest;
}

/* -------------------- *
 * -- initialization -- *
 * -------------------- */

/* build fixed huffman trees */
tinf_build_fixed_trees(sltree, sdtree);

/* build extra bits and base tables */
tinf_build_bits_base(length_bits, length_base, 4, 3);
tinf_build_bits_base(dist_bits, dist_base, 2, 1);

/* fix a special case */
length_bits[28] = 0;
length_base[28] = 258;

var index = tinf_uncompress;

// The Bounding Box object

function derive(v0, v1, v2, v3, t) {
    return Math.pow(1 - t, 3) * v0 +
        3 * Math.pow(1 - t, 2) * t * v1 +
        3 * (1 - t) * Math.pow(t, 2) * v2 +
        Math.pow(t, 3) * v3;
}
/**
 * A bounding box is an enclosing box that describes the smallest measure within which all the points lie.
 * It is used to calculate the bounding box of a glyph or text path.
 *
 * On initialization, x1/y1/x2/y2 will be NaN. Check if the bounding box is empty using `isEmpty()`.
 *
 * @exports opentype.BoundingBox
 * @class
 * @constructor
 */
function BoundingBox() {
    this.x1 = Number.NaN;
    this.y1 = Number.NaN;
    this.x2 = Number.NaN;
    this.y2 = Number.NaN;
}

/**
 * Returns true if the bounding box is empty, that is, no points have been added to the box yet.
 */
BoundingBox.prototype.isEmpty = function() {
    return isNaN(this.x1) || isNaN(this.y1) || isNaN(this.x2) || isNaN(this.y2);
};

/**
 * Add the point to the bounding box.
 * The x1/y1/x2/y2 coordinates of the bounding box will now encompass the given point.
 * @param {number} x - The X coordinate of the point.
 * @param {number} y - The Y coordinate of the point.
 */
BoundingBox.prototype.addPoint = function(x, y) {
    if (typeof x === 'number') {
        if (isNaN(this.x1) || isNaN(this.x2)) {
            this.x1 = x;
            this.x2 = x;
        }
        if (x < this.x1) {
            this.x1 = x;
        }
        if (x > this.x2) {
            this.x2 = x;
        }
    }
    if (typeof y === 'number') {
        if (isNaN(this.y1) || isNaN(this.y2)) {
            this.y1 = y;
            this.y2 = y;
        }
        if (y < this.y1) {
            this.y1 = y;
        }
        if (y > this.y2) {
            this.y2 = y;
        }
    }
};

/**
 * Add a X coordinate to the bounding box.
 * This extends the bounding box to include the X coordinate.
 * This function is used internally inside of addBezier.
 * @param {number} x - The X coordinate of the point.
 */
BoundingBox.prototype.addX = function(x) {
    this.addPoint(x, null);
};

/**
 * Add a Y coordinate to the bounding box.
 * This extends the bounding box to include the Y coordinate.
 * This function is used internally inside of addBezier.
 * @param {number} y - The Y coordinate of the point.
 */
BoundingBox.prototype.addY = function(y) {
    this.addPoint(null, y);
};

/**
 * Add a Bézier curve to the bounding box.
 * This extends the bounding box to include the entire Bézier.
 * @param {number} x0 - The starting X coordinate.
 * @param {number} y0 - The starting Y coordinate.
 * @param {number} x1 - The X coordinate of the first control point.
 * @param {number} y1 - The Y coordinate of the first control point.
 * @param {number} x2 - The X coordinate of the second control point.
 * @param {number} y2 - The Y coordinate of the second control point.
 * @param {number} x - The ending X coordinate.
 * @param {number} y - The ending Y coordinate.
 */
BoundingBox.prototype.addBezier = function(x0, y0, x1, y1, x2, y2, x, y) {
    var this$1 = this;

    // This code is based on http://nishiohirokazu.blogspot.com/2009/06/how-to-calculate-bezier-curves-bounding.html
    // and https://github.com/icons8/svg-path-bounding-box

    var p0 = [x0, y0];
    var p1 = [x1, y1];
    var p2 = [x2, y2];
    var p3 = [x, y];

    this.addPoint(x0, y0);
    this.addPoint(x, y);

    for (var i = 0; i <= 1; i++) {
        var b = 6 * p0[i] - 12 * p1[i] + 6 * p2[i];
        var a = -3 * p0[i] + 9 * p1[i] - 9 * p2[i] + 3 * p3[i];
        var c = 3 * p1[i] - 3 * p0[i];

        if (a === 0) {
            if (b === 0) { continue; }
            var t = -c / b;
            if (0 < t && t < 1) {
                if (i === 0) { this$1.addX(derive(p0[i], p1[i], p2[i], p3[i], t)); }
                if (i === 1) { this$1.addY(derive(p0[i], p1[i], p2[i], p3[i], t)); }
            }
            continue;
        }

        var b2ac = Math.pow(b, 2) - 4 * c * a;
        if (b2ac < 0) { continue; }
        var t1 = (-b + Math.sqrt(b2ac)) / (2 * a);
        if (0 < t1 && t1 < 1) {
            if (i === 0) { this$1.addX(derive(p0[i], p1[i], p2[i], p3[i], t1)); }
            if (i === 1) { this$1.addY(derive(p0[i], p1[i], p2[i], p3[i], t1)); }
        }
        var t2 = (-b - Math.sqrt(b2ac)) / (2 * a);
        if (0 < t2 && t2 < 1) {
            if (i === 0) { this$1.addX(derive(p0[i], p1[i], p2[i], p3[i], t2)); }
            if (i === 1) { this$1.addY(derive(p0[i], p1[i], p2[i], p3[i], t2)); }
        }
    }
};

/**
 * Add a quadratic curve to the bounding box.
 * This extends the bounding box to include the entire quadratic curve.
 * @param {number} x0 - The starting X coordinate.
 * @param {number} y0 - The starting Y coordinate.
 * @param {number} x1 - The X coordinate of the control point.
 * @param {number} y1 - The Y coordinate of the control point.
 * @param {number} x - The ending X coordinate.
 * @param {number} y - The ending Y coordinate.
 */
BoundingBox.prototype.addQuad = function(x0, y0, x1, y1, x, y) {
    var cp1x = x0 + 2 / 3 * (x1 - x0);
    var cp1y = y0 + 2 / 3 * (y1 - y0);
    var cp2x = cp1x + 1 / 3 * (x - x0);
    var cp2y = cp1y + 1 / 3 * (y - y0);
    this.addBezier(x0, y0, cp1x, cp1y, cp2x, cp2y, x, y);
};

// Geometric objects

/**
 * A bézier path containing a set of path commands similar to a SVG path.
 * Paths can be drawn on a context using `draw`.
 * @exports opentype.Path
 * @class
 * @constructor
 */
function Path() {
    this.commands = [];
    this.fill = 'black';
    this.stroke = null;
    this.strokeWidth = 1;
}

/**
 * @param  {number} x
 * @param  {number} y
 */
Path.prototype.moveTo = function(x, y) {
    this.commands.push({
        type: 'M',
        x: x,
        y: y
    });
};

/**
 * @param  {number} x
 * @param  {number} y
 */
Path.prototype.lineTo = function(x, y) {
    this.commands.push({
        type: 'L',
        x: x,
        y: y
    });
};

/**
 * Draws cubic curve
 * @function
 * curveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */

/**
 * Draws cubic curve
 * @function
 * bezierCurveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 * @see curveTo
 */
Path.prototype.curveTo = Path.prototype.bezierCurveTo = function(x1, y1, x2, y2, x, y) {
    this.commands.push({
        type: 'C',
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        x: x,
        y: y
    });
};

/**
 * Draws quadratic curve
 * @function
 * quadraticCurveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */

/**
 * Draws quadratic curve
 * @function
 * quadTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
Path.prototype.quadTo = Path.prototype.quadraticCurveTo = function(x1, y1, x, y) {
    this.commands.push({
        type: 'Q',
        x1: x1,
        y1: y1,
        x: x,
        y: y
    });
};

/**
 * Closes the path
 * @function closePath
 * @memberof opentype.Path.prototype
 */

/**
 * Close the path
 * @function close
 * @memberof opentype.Path.prototype
 */
Path.prototype.close = Path.prototype.closePath = function() {
    this.commands.push({
        type: 'Z'
    });
};

/**
 * Add the given path or list of commands to the commands of this path.
 * @param  {Array} pathOrCommands - another opentype.Path, an opentype.BoundingBox, or an array of commands.
 */
Path.prototype.extend = function(pathOrCommands) {
    if (pathOrCommands.commands) {
        pathOrCommands = pathOrCommands.commands;
    } else if (pathOrCommands instanceof BoundingBox) {
        var box = pathOrCommands;
        this.moveTo(box.x1, box.y1);
        this.lineTo(box.x2, box.y1);
        this.lineTo(box.x2, box.y2);
        this.lineTo(box.x1, box.y2);
        this.close();
        return;
    }

    Array.prototype.push.apply(this.commands, pathOrCommands);
};

/**
 * Calculate the bounding box of the path.
 * @returns {opentype.BoundingBox}
 */
Path.prototype.getBoundingBox = function() {
    var this$1 = this;

    var box = new BoundingBox();

    var startX = 0;
    var startY = 0;
    var prevX = 0;
    var prevY = 0;
    for (var i = 0; i < this.commands.length; i++) {
        var cmd = this$1.commands[i];
        switch (cmd.type) {
            case 'M':
                box.addPoint(cmd.x, cmd.y);
                startX = prevX = cmd.x;
                startY = prevY = cmd.y;
                break;
            case 'L':
                box.addPoint(cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'Q':
                box.addQuad(prevX, prevY, cmd.x1, cmd.y1, cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'C':
                box.addBezier(prevX, prevY, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'Z':
                prevX = startX;
                prevY = startY;
                break;
            default:
                throw new Error('Unexpected path command ' + cmd.type);
        }
    }
    if (box.isEmpty()) {
        box.addPoint(0, 0);
    }
    return box;
};

/**
 * Draw the path to a 2D context.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context.
 */
Path.prototype.draw = function(ctx) {
    var this$1 = this;

    ctx.beginPath();
    for (var i = 0; i < this.commands.length; i += 1) {
        var cmd = this$1.commands[i];
        if (cmd.type === 'M') {
            ctx.moveTo(cmd.x, cmd.y);
        } else if (cmd.type === 'L') {
            ctx.lineTo(cmd.x, cmd.y);
        } else if (cmd.type === 'C') {
            ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        } else if (cmd.type === 'Q') {
            ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
        } else if (cmd.type === 'Z') {
            ctx.closePath();
        }
    }

    if (this.fill) {
        ctx.fillStyle = this.fill;
        ctx.fill();
    }

    if (this.stroke) {
        ctx.strokeStyle = this.stroke;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();
    }
};

/**
 * Convert the Path to a string of path data instructions
 * See http://www.w3.org/TR/SVG/paths.html#PathData
 * @param  {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
 * @return {string}
 */
Path.prototype.toPathData = function(decimalPlaces) {
    var this$1 = this;

    decimalPlaces = decimalPlaces !== undefined ? decimalPlaces : 2;

    function floatToString(v) {
        if (Math.round(v) === v) {
            return '' + Math.round(v);
        } else {
            return v.toFixed(decimalPlaces);
        }
    }

    function packValues() {
        var arguments$1 = arguments;

        var s = '';
        for (var i = 0; i < arguments.length; i += 1) {
            var v = arguments$1[i];
            if (v >= 0 && i > 0) {
                s += ' ';
            }

            s += floatToString(v);
        }

        return s;
    }

    var d = '';
    for (var i = 0; i < this.commands.length; i += 1) {
        var cmd = this$1.commands[i];
        if (cmd.type === 'M') {
            d += 'M' + packValues(cmd.x, cmd.y);
        } else if (cmd.type === 'L') {
            d += 'L' + packValues(cmd.x, cmd.y);
        } else if (cmd.type === 'C') {
            d += 'C' + packValues(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        } else if (cmd.type === 'Q') {
            d += 'Q' + packValues(cmd.x1, cmd.y1, cmd.x, cmd.y);
        } else if (cmd.type === 'Z') {
            d += 'Z';
        }
    }

    return d;
};

/**
 * Convert the path to an SVG <path> element, as a string.
 * @param  {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
 * @return {string}
 */
Path.prototype.toSVG = function(decimalPlaces) {
    var svg = '<path d="';
    svg += this.toPathData(decimalPlaces);
    svg += '"';
    if (this.fill && this.fill !== 'black') {
        if (this.fill === null) {
            svg += ' fill="none"';
        } else {
            svg += ' fill="' + this.fill + '"';
        }
    }

    if (this.stroke) {
        svg += ' stroke="' + this.stroke + '" stroke-width="' + this.strokeWidth + '"';
    }

    svg += '/>';
    return svg;
};

/**
 * Convert the path to a DOM element.
 * @param  {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
 * @return {SVGPathElement}
 */
Path.prototype.toDOMElement = function(decimalPlaces) {
    var temporaryPath = this.toPathData(decimalPlaces);
    var newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    newPath.setAttribute('d', temporaryPath);

    return newPath;
};

// Run-time checking of preconditions.

function fail(message) {
    throw new Error(message);
}

// Precondition function that checks if the given predicate is true.
// If not, it will throw an error.
function argument(predicate, message) {
    if (!predicate) {
        fail(message);
    }
}

var check = { fail: fail, argument: argument, assert: argument };

// Data types used in the OpenType font file.
// All OpenType fonts use Motorola-style byte ordering (Big Endian)

var LIMIT16 = 32768; // The limit at which a 16-bit number switches signs == 2^15
var LIMIT32 = 2147483648; // The limit at which a 32-bit number switches signs == 2 ^ 31

/**
 * @exports opentype.decode
 * @class
 */
var decode = {};
/**
 * @exports opentype.encode
 * @class
 */
var encode = {};
/**
 * @exports opentype.sizeOf
 * @class
 */
var sizeOf = {};

// Return a function that always returns the same value.
function constant(v) {
    return function() {
        return v;
    };
}

// OpenType data types //////////////////////////////////////////////////////

/**
 * Convert an 8-bit unsigned integer to a list of 1 byte.
 * @param {number}
 * @returns {Array}
 */
encode.BYTE = function(v) {
    check.argument(v >= 0 && v <= 255, 'Byte value should be between 0 and 255.');
    return [v];
};
/**
 * @constant
 * @type {number}
 */
sizeOf.BYTE = constant(1);

/**
 * Convert a 8-bit signed integer to a list of 1 byte.
 * @param {string}
 * @returns {Array}
 */
encode.CHAR = function(v) {
    return [v.charCodeAt(0)];
};

/**
 * @constant
 * @type {number}
 */
sizeOf.CHAR = constant(1);

/**
 * Convert an ASCII string to a list of bytes.
 * @param {string}
 * @returns {Array}
 */
encode.CHARARRAY = function(v) {
    var b = [];
    for (var i = 0; i < v.length; i += 1) {
        b[i] = v.charCodeAt(i);
    }

    return b;
};

/**
 * @param {Array}
 * @returns {number}
 */
sizeOf.CHARARRAY = function(v) {
    return v.length;
};

/**
 * Convert a 16-bit unsigned integer to a list of 2 bytes.
 * @param {number}
 * @returns {Array}
 */
encode.USHORT = function(v) {
    return [(v >> 8) & 0xFF, v & 0xFF];
};

/**
 * @constant
 * @type {number}
 */
sizeOf.USHORT = constant(2);

/**
 * Convert a 16-bit signed integer to a list of 2 bytes.
 * @param {number}
 * @returns {Array}
 */
encode.SHORT = function(v) {
    // Two's complement
    if (v >= LIMIT16) {
        v = -(2 * LIMIT16 - v);
    }

    return [(v >> 8) & 0xFF, v & 0xFF];
};

/**
 * @constant
 * @type {number}
 */
sizeOf.SHORT = constant(2);

/**
 * Convert a 24-bit unsigned integer to a list of 3 bytes.
 * @param {number}
 * @returns {Array}
 */
encode.UINT24 = function(v) {
    return [(v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
};

/**
 * @constant
 * @type {number}
 */
sizeOf.UINT24 = constant(3);

/**
 * Convert a 32-bit unsigned integer to a list of 4 bytes.
 * @param {number}
 * @returns {Array}
 */
encode.ULONG = function(v) {
    return [(v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
};

/**
 * @constant
 * @type {number}
 */
sizeOf.ULONG = constant(4);

/**
 * Convert a 32-bit unsigned integer to a list of 4 bytes.
 * @param {number}
 * @returns {Array}
 */
encode.LONG = function(v) {
    // Two's complement
    if (v >= LIMIT32) {
        v = -(2 * LIMIT32 - v);
    }

    return [(v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
};

/**
 * @constant
 * @type {number}
 */
sizeOf.LONG = constant(4);

encode.FIXED = encode.ULONG;
sizeOf.FIXED = sizeOf.ULONG;

encode.FWORD = encode.SHORT;
sizeOf.FWORD = sizeOf.SHORT;

encode.UFWORD = encode.USHORT;
sizeOf.UFWORD = sizeOf.USHORT;

/**
 * Convert a 32-bit Apple Mac timestamp integer to a list of 8 bytes, 64-bit timestamp.
 * @param {number}
 * @returns {Array}
 */
encode.LONGDATETIME = function(v) {
    return [0, 0, 0, 0, (v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
};

/**
 * @constant
 * @type {number}
 */
sizeOf.LONGDATETIME = constant(8);

/**
 * Convert a 4-char tag to a list of 4 bytes.
 * @param {string}
 * @returns {Array}
 */
encode.TAG = function(v) {
    check.argument(v.length === 4, 'Tag should be exactly 4 ASCII characters.');
    return [v.charCodeAt(0),
            v.charCodeAt(1),
            v.charCodeAt(2),
            v.charCodeAt(3)];
};

/**
 * @constant
 * @type {number}
 */
sizeOf.TAG = constant(4);

// CFF data types ///////////////////////////////////////////////////////////

encode.Card8 = encode.BYTE;
sizeOf.Card8 = sizeOf.BYTE;

encode.Card16 = encode.USHORT;
sizeOf.Card16 = sizeOf.USHORT;

encode.OffSize = encode.BYTE;
sizeOf.OffSize = sizeOf.BYTE;

encode.SID = encode.USHORT;
sizeOf.SID = sizeOf.USHORT;

// Convert a numeric operand or charstring number to a variable-size list of bytes.
/**
 * Convert a numeric operand or charstring number to a variable-size list of bytes.
 * @param {number}
 * @returns {Array}
 */
encode.NUMBER = function(v) {
    if (v >= -107 && v <= 107) {
        return [v + 139];
    } else if (v >= 108 && v <= 1131) {
        v = v - 108;
        return [(v >> 8) + 247, v & 0xFF];
    } else if (v >= -1131 && v <= -108) {
        v = -v - 108;
        return [(v >> 8) + 251, v & 0xFF];
    } else if (v >= -32768 && v <= 32767) {
        return encode.NUMBER16(v);
    } else {
        return encode.NUMBER32(v);
    }
};

/**
 * @param {number}
 * @returns {number}
 */
sizeOf.NUMBER = function(v) {
    return encode.NUMBER(v).length;
};

/**
 * Convert a signed number between -32768 and +32767 to a three-byte value.
 * This ensures we always use three bytes, but is not the most compact format.
 * @param {number}
 * @returns {Array}
 */
encode.NUMBER16 = function(v) {
    return [28, (v >> 8) & 0xFF, v & 0xFF];
};

/**
 * @constant
 * @type {number}
 */
sizeOf.NUMBER16 = constant(3);

/**
 * Convert a signed number between -(2^31) and +(2^31-1) to a five-byte value.
 * This is useful if you want to be sure you always use four bytes,
 * at the expense of wasting a few bytes for smaller numbers.
 * @param {number}
 * @returns {Array}
 */
encode.NUMBER32 = function(v) {
    return [29, (v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
};

/**
 * @constant
 * @type {number}
 */
sizeOf.NUMBER32 = constant(5);

/**
 * @param {number}
 * @returns {Array}
 */
encode.REAL = function(v) {
    var value = v.toString();

    // Some numbers use an epsilon to encode the value. (e.g. JavaScript will store 0.0000001 as 1e-7)
    // This code converts it back to a number without the epsilon.
    var m = /\.(\d*?)(?:9{5,20}|0{5,20})\d{0,2}(?:e(.+)|$)/.exec(value);
    if (m) {
        var epsilon = parseFloat('1e' + ((m[2] ? +m[2] : 0) + m[1].length));
        value = (Math.round(v * epsilon) / epsilon).toString();
    }

    var nibbles = '';
    for (var i = 0, ii = value.length; i < ii; i += 1) {
        var c = value[i];
        if (c === 'e') {
            nibbles += value[++i] === '-' ? 'c' : 'b';
        } else if (c === '.') {
            nibbles += 'a';
        } else if (c === '-') {
            nibbles += 'e';
        } else {
            nibbles += c;
        }
    }

    nibbles += (nibbles.length & 1) ? 'f' : 'ff';
    var out = [30];
    for (var i$1 = 0, ii$1 = nibbles.length; i$1 < ii$1; i$1 += 2) {
        out.push(parseInt(nibbles.substr(i$1, 2), 16));
    }

    return out;
};

/**
 * @param {number}
 * @returns {number}
 */
sizeOf.REAL = function(v) {
    return encode.REAL(v).length;
};

encode.NAME = encode.CHARARRAY;
sizeOf.NAME = sizeOf.CHARARRAY;

encode.STRING = encode.CHARARRAY;
sizeOf.STRING = sizeOf.CHARARRAY;

/**
 * @param {DataView} data
 * @param {number} offset
 * @param {number} numBytes
 * @returns {string}
 */
decode.UTF8 = function(data, offset, numBytes) {
    var codePoints = [];
    var numChars = numBytes;
    for (var j = 0; j < numChars; j++, offset += 1) {
        codePoints[j] = data.getUint8(offset);
    }

    return String.fromCharCode.apply(null, codePoints);
};

/**
 * @param {DataView} data
 * @param {number} offset
 * @param {number} numBytes
 * @returns {string}
 */
decode.UTF16 = function(data, offset, numBytes) {
    var codePoints = [];
    var numChars = numBytes / 2;
    for (var j = 0; j < numChars; j++, offset += 2) {
        codePoints[j] = data.getUint16(offset);
    }

    return String.fromCharCode.apply(null, codePoints);
};

/**
 * Convert a JavaScript string to UTF16-BE.
 * @param {string}
 * @returns {Array}
 */
encode.UTF16 = function(v) {
    var b = [];
    for (var i = 0; i < v.length; i += 1) {
        var codepoint = v.charCodeAt(i);
        b[b.length] = (codepoint >> 8) & 0xFF;
        b[b.length] = codepoint & 0xFF;
    }

    return b;
};

/**
 * @param {string}
 * @returns {number}
 */
sizeOf.UTF16 = function(v) {
    return v.length * 2;
};

// Data for converting old eight-bit Macintosh encodings to Unicode.
// This representation is optimized for decoding; encoding is slower
// and needs more memory. The assumption is that all opentype.js users
// want to open fonts, but saving a font will be comparatively rare
// so it can be more expensive. Keyed by IANA character set name.
//
// Python script for generating these strings:
//
//     s = u''.join([chr(c).decode('mac_greek') for c in range(128, 256)])
//     print(s.encode('utf-8'))
/**
 * @private
 */
var eightBitMacEncodings = {
    'x-mac-croatian':  // Python: 'mac_croatian'
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®Š™´¨≠ŽØ∞±≤≥∆µ∂∑∏š∫ªºΩžø' +
    '¿¡¬√ƒ≈Ć«Č… ÀÃÕŒœĐ—“”‘’÷◊©⁄€‹›Æ»–·‚„‰ÂćÁčÈÍÎÏÌÓÔđÒÚÛÙıˆ˜¯πË˚¸Êæˇ',
    'x-mac-cyrillic':  // Python: 'mac_cyrillic'
    'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ†°Ґ£§•¶І®©™Ђђ≠Ѓѓ∞±≤≥іµґЈЄєЇїЉљЊњ' +
    'јЅ¬√ƒ≈∆«»… ЋћЌќѕ–—“”‘’÷„ЎўЏџ№Ёёяабвгдежзийклмнопрстуфхцчшщъыьэю',
    'x-mac-gaelic': // http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/GAELIC.TXT
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØḂ±≤≥ḃĊċḊḋḞḟĠġṀæø' +
    'ṁṖṗɼƒſṠ«»… ÀÃÕŒœ–—“”‘’ṡẛÿŸṪ€‹›Ŷŷṫ·Ỳỳ⁊ÂÊÁËÈÍÎÏÌÓÔ♣ÒÚÛÙıÝýŴŵẄẅẀẁẂẃ',
    'x-mac-greek':  // Python: 'mac_greek'
    'Ä¹²É³ÖÜ΅àâä΄¨çéèêë£™îï•½‰ôö¦€ùûü†ΓΔΘΛΞΠß®©ΣΪ§≠°·Α±≤≥¥ΒΕΖΗΙΚΜΦΫΨΩ' +
    'άΝ¬ΟΡ≈Τ«»… ΥΧΆΈœ–―“”‘’÷ΉΊΌΎέήίόΏύαβψδεφγηιξκλμνοπώρστθωςχυζϊϋΐΰ\u00AD',
    'x-mac-icelandic':  // Python: 'mac_iceland'
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûüÝ°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
    '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€ÐðÞþý·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ',
    'x-mac-inuit': // http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/INUIT.TXT
    'ᐃᐄᐅᐆᐊᐋᐱᐲᐳᐴᐸᐹᑉᑎᑏᑐᑑᑕᑖᑦᑭᑮᑯᑰᑲᑳᒃᒋᒌᒍᒎᒐᒑ°ᒡᒥᒦ•¶ᒧ®©™ᒨᒪᒫᒻᓂᓃᓄᓅᓇᓈᓐᓯᓰᓱᓲᓴᓵᔅᓕᓖᓗ' +
    'ᓘᓚᓛᓪᔨᔩᔪᔫᔭ… ᔮᔾᕕᕖᕗ–—“”‘’ᕘᕙᕚᕝᕆᕇᕈᕉᕋᕌᕐᕿᖀᖁᖂᖃᖄᖅᖏᖐᖑᖒᖓᖔᖕᙱᙲᙳᙴᙵᙶᖖᖠᖡᖢᖣᖤᖥᖦᕼŁł',
    'x-mac-ce':  // Python: 'mac_latin2'
    'ÄĀāÉĄÖÜáąČäčĆćéŹźĎíďĒēĖóėôöõúĚěü†°Ę£§•¶ß®©™ę¨≠ģĮįĪ≤≥īĶ∂∑łĻļĽľĹĺŅ' +
    'ņŃ¬√ńŇ∆«»… ňŐÕőŌ–—“”‘’÷◊ōŔŕŘ‹›řŖŗŠ‚„šŚśÁŤťÍŽžŪÓÔūŮÚůŰűŲųÝýķŻŁżĢˇ',
    macintosh:  // Python: 'mac_roman'
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
    '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ',
    'x-mac-romanian':  // Python: 'mac_romanian'
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ĂȘ∞±≤≥¥µ∂∑∏π∫ªºΩăș' +
    '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›Țț‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ',
    'x-mac-turkish':  // Python: 'mac_turkish'
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
    '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸĞğİıŞş‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙˆ˜¯˘˙˚¸˝˛ˇ'
};

/**
 * Decodes an old-style Macintosh string. Returns either a Unicode JavaScript
 * string, or 'undefined' if the encoding is unsupported. For example, we do
 * not support Chinese, Japanese or Korean because these would need large
 * mapping tables.
 * @param {DataView} dataView
 * @param {number} offset
 * @param {number} dataLength
 * @param {string} encoding
 * @returns {string}
 */
decode.MACSTRING = function(dataView, offset, dataLength, encoding) {
    var table = eightBitMacEncodings[encoding];
    if (table === undefined) {
        return undefined;
    }

    var result = '';
    for (var i = 0; i < dataLength; i++) {
        var c = dataView.getUint8(offset + i);
        // In all eight-bit Mac encodings, the characters 0x00..0x7F are
        // mapped to U+0000..U+007F; we only need to look up the others.
        if (c <= 0x7F) {
            result += String.fromCharCode(c);
        } else {
            result += table[c & 0x7F];
        }
    }

    return result;
};

// Helper function for encode.MACSTRING. Returns a dictionary for mapping
// Unicode character codes to their 8-bit MacOS equivalent. This table
// is not exactly a super cheap data structure, but we do not care because
// encoding Macintosh strings is only rarely needed in typical applications.
var macEncodingTableCache = typeof WeakMap === 'function' && new WeakMap();
var macEncodingCacheKeys;
var getMacEncodingTable = function (encoding) {
    // Since we use encoding as a cache key for WeakMap, it has to be
    // a String object and not a literal. And at least on NodeJS 2.10.1,
    // WeakMap requires that the same String instance is passed for cache hits.
    if (!macEncodingCacheKeys) {
        macEncodingCacheKeys = {};
        for (var e in eightBitMacEncodings) {
            /*jshint -W053 */  // Suppress "Do not use String as a constructor."
            macEncodingCacheKeys[e] = new String(e);
        }
    }

    var cacheKey = macEncodingCacheKeys[encoding];
    if (cacheKey === undefined) {
        return undefined;
    }

    // We can't do "if (cache.has(key)) {return cache.get(key)}" here:
    // since garbage collection may run at any time, it could also kick in
    // between the calls to cache.has() and cache.get(). In that case,
    // we would return 'undefined' even though we do support the encoding.
    if (macEncodingTableCache) {
        var cachedTable = macEncodingTableCache.get(cacheKey);
        if (cachedTable !== undefined) {
            return cachedTable;
        }
    }

    var decodingTable = eightBitMacEncodings[encoding];
    if (decodingTable === undefined) {
        return undefined;
    }

    var encodingTable = {};
    for (var i = 0; i < decodingTable.length; i++) {
        encodingTable[decodingTable.charCodeAt(i)] = i + 0x80;
    }

    if (macEncodingTableCache) {
        macEncodingTableCache.set(cacheKey, encodingTable);
    }

    return encodingTable;
};

/**
 * Encodes an old-style Macintosh string. Returns a byte array upon success.
 * If the requested encoding is unsupported, or if the input string contains
 * a character that cannot be expressed in the encoding, the function returns
 * 'undefined'.
 * @param {string} str
 * @param {string} encoding
 * @returns {Array}
 */
encode.MACSTRING = function(str, encoding) {
    var table = getMacEncodingTable(encoding);
    if (table === undefined) {
        return undefined;
    }

    var result = [];
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);

        // In all eight-bit Mac encodings, the characters 0x00..0x7F are
        // mapped to U+0000..U+007F; we only need to look up the others.
        if (c >= 0x80) {
            c = table[c];
            if (c === undefined) {
                // str contains a Unicode character that cannot be encoded
                // in the requested encoding.
                return undefined;
            }
        }
        result[i] = c;
        // result.push(c);
    }

    return result;
};

/**
 * @param {string} str
 * @param {string} encoding
 * @returns {number}
 */
sizeOf.MACSTRING = function(str, encoding) {
    var b = encode.MACSTRING(str, encoding);
    if (b !== undefined) {
        return b.length;
    } else {
        return 0;
    }
};

// Helper for encode.VARDELTAS
function isByteEncodable(value) {
    return value >= -128 && value <= 127;
}

// Helper for encode.VARDELTAS
function encodeVarDeltaRunAsZeroes(deltas, pos, result) {
    var runLength = 0;
    var numDeltas = deltas.length;
    while (pos < numDeltas && runLength < 64 && deltas[pos] === 0) {
        ++pos;
        ++runLength;
    }
    result.push(0x80 | (runLength - 1));
    return pos;
}

// Helper for encode.VARDELTAS
function encodeVarDeltaRunAsBytes(deltas, offset, result) {
    var runLength = 0;
    var numDeltas = deltas.length;
    var pos = offset;
    while (pos < numDeltas && runLength < 64) {
        var value = deltas[pos];
        if (!isByteEncodable(value)) {
            break;
        }

        // Within a byte-encoded run of deltas, a single zero is best
        // stored literally as 0x00 value. However, if we have two or
        // more zeroes in a sequence, it is better to start a new run.
        // Fore example, the sequence of deltas [15, 15, 0, 15, 15]
        // becomes 6 bytes (04 0F 0F 00 0F 0F) when storing the zero
        // within the current run, but 7 bytes (01 0F 0F 80 01 0F 0F)
        // when starting a new run.
        if (value === 0 && pos + 1 < numDeltas && deltas[pos + 1] === 0) {
            break;
        }

        ++pos;
        ++runLength;
    }
    result.push(runLength - 1);
    for (var i = offset; i < pos; ++i) {
        result.push((deltas[i] + 256) & 0xff);
    }
    return pos;
}

// Helper for encode.VARDELTAS
function encodeVarDeltaRunAsWords(deltas, offset, result) {
    var runLength = 0;
    var numDeltas = deltas.length;
    var pos = offset;
    while (pos < numDeltas && runLength < 64) {
        var value = deltas[pos];

        // Within a word-encoded run of deltas, it is easiest to start
        // a new run (with a different encoding) whenever we encounter
        // a zero value. For example, the sequence [0x6666, 0, 0x7777]
        // needs 7 bytes when storing the zero inside the current run
        // (42 66 66 00 00 77 77), and equally 7 bytes when starting a
        // new run (40 66 66 80 40 77 77).
        if (value === 0) {
            break;
        }

        // Within a word-encoded run of deltas, a single value in the
        // range (-128..127) should be encoded within the current run
        // because it is more compact. For example, the sequence
        // [0x6666, 2, 0x7777] becomes 7 bytes when storing the value
        // literally (42 66 66 00 02 77 77), but 8 bytes when starting
        // a new run (40 66 66 00 02 40 77 77).
        if (isByteEncodable(value) && pos + 1 < numDeltas && isByteEncodable(deltas[pos + 1])) {
            break;
        }

        ++pos;
        ++runLength;
    }
    result.push(0x40 | (runLength - 1));
    for (var i = offset; i < pos; ++i) {
        var val = deltas[i];
        result.push(((val + 0x10000) >> 8) & 0xff, (val + 0x100) & 0xff);
    }
    return pos;
}

/**
 * Encode a list of variation adjustment deltas.
 *
 * Variation adjustment deltas are used in ‘gvar’ and ‘cvar’ tables.
 * They indicate how points (in ‘gvar’) or values (in ‘cvar’) get adjusted
 * when generating instances of variation fonts.
 *
 * @see https://www.microsoft.com/typography/otspec/gvar.htm
 * @see https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6gvar.html
 * @param {Array}
 * @return {Array}
 */
encode.VARDELTAS = function(deltas) {
    var pos = 0;
    var result = [];
    while (pos < deltas.length) {
        var value = deltas[pos];
        if (value === 0) {
            pos = encodeVarDeltaRunAsZeroes(deltas, pos, result);
        } else if (value >= -128 && value <= 127) {
            pos = encodeVarDeltaRunAsBytes(deltas, pos, result);
        } else {
            pos = encodeVarDeltaRunAsWords(deltas, pos, result);
        }
    }
    return result;
};

// Convert a list of values to a CFF INDEX structure.
// The values should be objects containing name / type / value.
/**
 * @param {Array} l
 * @returns {Array}
 */
encode.INDEX = function(l) {
    //var offset, offsets, offsetEncoder, encodedOffsets, encodedOffset, data,
    //    i, v;
    // Because we have to know which data type to use to encode the offsets,
    // we have to go through the values twice: once to encode the data and
    // calculate the offsets, then again to encode the offsets using the fitting data type.
    var offset = 1; // First offset is always 1.
    var offsets = [offset];
    var data = [];
    for (var i = 0; i < l.length; i += 1) {
        var v = encode.OBJECT(l[i]);
        Array.prototype.push.apply(data, v);
        offset += v.length;
        offsets.push(offset);
    }

    if (data.length === 0) {
        return [0, 0];
    }

    var encodedOffsets = [];
    var offSize = (1 + Math.floor(Math.log(offset) / Math.log(2)) / 8) | 0;
    var offsetEncoder = [undefined, encode.BYTE, encode.USHORT, encode.UINT24, encode.ULONG][offSize];
    for (var i$1 = 0; i$1 < offsets.length; i$1 += 1) {
        var encodedOffset = offsetEncoder(offsets[i$1]);
        Array.prototype.push.apply(encodedOffsets, encodedOffset);
    }

    return Array.prototype.concat(encode.Card16(l.length),
                           encode.OffSize(offSize),
                           encodedOffsets,
                           data);
};

/**
 * @param {Array}
 * @returns {number}
 */
sizeOf.INDEX = function(v) {
    return encode.INDEX(v).length;
};

/**
 * Convert an object to a CFF DICT structure.
 * The keys should be numeric.
 * The values should be objects containing name / type / value.
 * @param {Object} m
 * @returns {Array}
 */
encode.DICT = function(m) {
    var d = [];
    var keys = Object.keys(m);
    var length = keys.length;

    for (var i = 0; i < length; i += 1) {
        // Object.keys() return string keys, but our keys are always numeric.
        var k = parseInt(keys[i], 0);
        var v = m[k];
        // Value comes before the key.
        d = d.concat(encode.OPERAND(v.value, v.type));
        d = d.concat(encode.OPERATOR(k));
    }

    return d;
};

/**
 * @param {Object}
 * @returns {number}
 */
sizeOf.DICT = function(m) {
    return encode.DICT(m).length;
};

/**
 * @param {number}
 * @returns {Array}
 */
encode.OPERATOR = function(v) {
    if (v < 1200) {
        return [v];
    } else {
        return [12, v - 1200];
    }
};

/**
 * @param {Array} v
 * @param {string}
 * @returns {Array}
 */
encode.OPERAND = function(v, type) {
    var d = [];
    if (Array.isArray(type)) {
        for (var i = 0; i < type.length; i += 1) {
            check.argument(v.length === type.length, 'Not enough arguments given for type' + type);
            d = d.concat(encode.OPERAND(v[i], type[i]));
        }
    } else {
        if (type === 'SID') {
            d = d.concat(encode.NUMBER(v));
        } else if (type === 'offset') {
            // We make it easy for ourselves and always encode offsets as
            // 4 bytes. This makes offset calculation for the top dict easier.
            d = d.concat(encode.NUMBER32(v));
        } else if (type === 'number') {
            d = d.concat(encode.NUMBER(v));
        } else if (type === 'real') {
            d = d.concat(encode.REAL(v));
        } else {
            throw new Error('Unknown operand type ' + type);
            // FIXME Add support for booleans
        }
    }

    return d;
};

encode.OP = encode.BYTE;
sizeOf.OP = sizeOf.BYTE;

// memoize charstring encoding using WeakMap if available
var wmm = typeof WeakMap === 'function' && new WeakMap();

/**
 * Convert a list of CharString operations to bytes.
 * @param {Array}
 * @returns {Array}
 */
encode.CHARSTRING = function(ops) {
    // See encode.MACSTRING for why we don't do "if (wmm && wmm.has(ops))".
    if (wmm) {
        var cachedValue = wmm.get(ops);
        if (cachedValue !== undefined) {
            return cachedValue;
        }
    }

    var d = [];
    var length = ops.length;

    for (var i = 0; i < length; i += 1) {
        var op = ops[i];
        d = d.concat(encode[op.type](op.value));
    }

    if (wmm) {
        wmm.set(ops, d);
    }

    return d;
};

/**
 * @param {Array}
 * @returns {number}
 */
sizeOf.CHARSTRING = function(ops) {
    return encode.CHARSTRING(ops).length;
};

// Utility functions ////////////////////////////////////////////////////////

/**
 * Convert an object containing name / type / value to bytes.
 * @param {Object}
 * @returns {Array}
 */
encode.OBJECT = function(v) {
    var encodingFunction = encode[v.type];
    check.argument(encodingFunction !== undefined, 'No encoding function for type ' + v.type);
    return encodingFunction(v.value);
};

/**
 * @param {Object}
 * @returns {number}
 */
sizeOf.OBJECT = function(v) {
    var sizeOfFunction = sizeOf[v.type];
    check.argument(sizeOfFunction !== undefined, 'No sizeOf function for type ' + v.type);
    return sizeOfFunction(v.value);
};

/**
 * Convert a table object to bytes.
 * A table contains a list of fields containing the metadata (name, type and default value).
 * The table itself has the field values set as attributes.
 * @param {opentype.Table}
 * @returns {Array}
 */
encode.TABLE = function(table) {
    var d = [];
    var length = table.fields.length;
    var subtables = [];
    var subtableOffsets = [];

    for (var i = 0; i < length; i += 1) {
        var field = table.fields[i];
        var encodingFunction = encode[field.type];
        check.argument(encodingFunction !== undefined, 'No encoding function for field type ' + field.type + ' (' + field.name + ')');
        var value = table[field.name];
        if (value === undefined) {
            value = field.value;
        }

        var bytes = encodingFunction(value);

        if (field.type === 'TABLE') {
            subtableOffsets.push(d.length);
            d = d.concat([0, 0]);
            subtables.push(bytes);
        } else {
            d = d.concat(bytes);
        }
    }

    for (var i$1 = 0; i$1 < subtables.length; i$1 += 1) {
        var o = subtableOffsets[i$1];
        var offset = d.length;
        check.argument(offset < 65536, 'Table ' + table.tableName + ' too big.');
        d[o] = offset >> 8;
        d[o + 1] = offset & 0xff;
        d = d.concat(subtables[i$1]);
    }

    return d;
};

/**
 * @param {opentype.Table}
 * @returns {number}
 */
sizeOf.TABLE = function(table) {
    var numBytes = 0;
    var length = table.fields.length;

    for (var i = 0; i < length; i += 1) {
        var field = table.fields[i];
        var sizeOfFunction = sizeOf[field.type];
        check.argument(sizeOfFunction !== undefined, 'No sizeOf function for field type ' + field.type + ' (' + field.name + ')');
        var value = table[field.name];
        if (value === undefined) {
            value = field.value;
        }

        numBytes += sizeOfFunction(value);

        // Subtables take 2 more bytes for offsets.
        if (field.type === 'TABLE') {
            numBytes += 2;
        }
    }

    return numBytes;
};

encode.RECORD = encode.TABLE;
sizeOf.RECORD = sizeOf.TABLE;

// Merge in a list of bytes.
encode.LITERAL = function(v) {
    return v;
};

sizeOf.LITERAL = function(v) {
    return v.length;
};

// Table metadata

/**
 * @exports opentype.Table
 * @class
 * @param {string} tableName
 * @param {Array} fields
 * @param {Object} options
 * @constructor
 */
function Table(tableName, fields, options) {
    var this$1 = this;

    for (var i = 0; i < fields.length; i += 1) {
        var field = fields[i];
        this$1[field.name] = field.value;
    }

    this.tableName = tableName;
    this.fields = fields;
    if (options) {
        var optionKeys = Object.keys(options);
        for (var i$1 = 0; i$1 < optionKeys.length; i$1 += 1) {
            var k = optionKeys[i$1];
            var v = options[k];
            if (this$1[k] !== undefined) {
                this$1[k] = v;
            }
        }
    }
}

/**
 * Encodes the table and returns an array of bytes
 * @return {Array}
 */
Table.prototype.encode = function() {
    return encode.TABLE(this);
};

/**
 * Get the size of the table.
 * @return {number}
 */
Table.prototype.sizeOf = function() {
    return sizeOf.TABLE(this);
};

/**
 * @private
 */
function ushortList(itemName, list, count) {
    if (count === undefined) {
        count = list.length;
    }
    var fields = new Array(list.length + 1);
    fields[0] = {name: itemName + 'Count', type: 'USHORT', value: count};
    for (var i = 0; i < list.length; i++) {
        fields[i + 1] = {name: itemName + i, type: 'USHORT', value: list[i]};
    }
    return fields;
}

/**
 * @private
 */
function tableList(itemName, records, itemCallback) {
    var count = records.length;
    var fields = new Array(count + 1);
    fields[0] = {name: itemName + 'Count', type: 'USHORT', value: count};
    for (var i = 0; i < count; i++) {
        fields[i + 1] = {name: itemName + i, type: 'TABLE', value: itemCallback(records[i], i)};
    }
    return fields;
}

/**
 * @private
 */
function recordList(itemName, records, itemCallback) {
    var count = records.length;
    var fields = [];
    fields[0] = {name: itemName + 'Count', type: 'USHORT', value: count};
    for (var i = 0; i < count; i++) {
        fields = fields.concat(itemCallback(records[i], i));
    }
    return fields;
}

// Common Layout Tables

/**
 * @exports opentype.Coverage
 * @class
 * @param {opentype.Table}
 * @constructor
 * @extends opentype.Table
 */
function Coverage(coverageTable) {
    if (coverageTable.format === 1) {
        Table.call(this, 'coverageTable',
            [{name: 'coverageFormat', type: 'USHORT', value: 1}]
            .concat(ushortList('glyph', coverageTable.glyphs))
        );
    } else {
        check.assert(false, 'Can\'t create coverage table format 2 yet.');
    }
}
Coverage.prototype = Object.create(Table.prototype);
Coverage.prototype.constructor = Coverage;

function ScriptList(scriptListTable) {
    Table.call(this, 'scriptListTable',
        recordList('scriptRecord', scriptListTable, function(scriptRecord, i) {
            var script = scriptRecord.script;
            var defaultLangSys = script.defaultLangSys;
            check.assert(!!defaultLangSys, 'Unable to write GSUB: script ' + scriptRecord.tag + ' has no default language system.');
            return [
                {name: 'scriptTag' + i, type: 'TAG', value: scriptRecord.tag},
                {name: 'script' + i, type: 'TABLE', value: new Table('scriptTable', [
                    {name: 'defaultLangSys', type: 'TABLE', value: new Table('defaultLangSys', [
                        {name: 'lookupOrder', type: 'USHORT', value: 0},
                        {name: 'reqFeatureIndex', type: 'USHORT', value: defaultLangSys.reqFeatureIndex}]
                        .concat(ushortList('featureIndex', defaultLangSys.featureIndexes)))}
                    ].concat(recordList('langSys', script.langSysRecords, function(langSysRecord, i) {
                        var langSys = langSysRecord.langSys;
                        return [
                            {name: 'langSysTag' + i, type: 'TAG', value: langSysRecord.tag},
                            {name: 'langSys' + i, type: 'TABLE', value: new Table('langSys', [
                                {name: 'lookupOrder', type: 'USHORT', value: 0},
                                {name: 'reqFeatureIndex', type: 'USHORT', value: langSys.reqFeatureIndex}
                                ].concat(ushortList('featureIndex', langSys.featureIndexes)))}
                        ];
                    })))}
            ];
        })
    );
}
ScriptList.prototype = Object.create(Table.prototype);
ScriptList.prototype.constructor = ScriptList;

/**
 * @exports opentype.FeatureList
 * @class
 * @param {opentype.Table}
 * @constructor
 * @extends opentype.Table
 */
function FeatureList(featureListTable) {
    Table.call(this, 'featureListTable',
        recordList('featureRecord', featureListTable, function(featureRecord, i) {
            var feature = featureRecord.feature;
            return [
                {name: 'featureTag' + i, type: 'TAG', value: featureRecord.tag},
                {name: 'feature' + i, type: 'TABLE', value: new Table('featureTable', [
                    {name: 'featureParams', type: 'USHORT', value: feature.featureParams} ].concat(ushortList('lookupListIndex', feature.lookupListIndexes)))}
            ];
        })
    );
}
FeatureList.prototype = Object.create(Table.prototype);
FeatureList.prototype.constructor = FeatureList;

/**
 * @exports opentype.LookupList
 * @class
 * @param {opentype.Table}
 * @param {Object}
 * @constructor
 * @extends opentype.Table
 */
function LookupList(lookupListTable, subtableMakers) {
    Table.call(this, 'lookupListTable', tableList('lookup', lookupListTable, function(lookupTable) {
        var subtableCallback = subtableMakers[lookupTable.lookupType];
        check.assert(!!subtableCallback, 'Unable to write GSUB lookup type ' + lookupTable.lookupType + ' tables.');
        return new Table('lookupTable', [
            {name: 'lookupType', type: 'USHORT', value: lookupTable.lookupType},
            {name: 'lookupFlag', type: 'USHORT', value: lookupTable.lookupFlag}
        ].concat(tableList('subtable', lookupTable.subtables, subtableCallback)));
    }));
}
LookupList.prototype = Object.create(Table.prototype);
LookupList.prototype.constructor = LookupList;

// Record = same as Table, but inlined (a Table has an offset and its data is further in the stream)
// Don't use offsets inside Records (probable bug), only in Tables.
var table = {
    Table: Table,
    Record: Table,
    Coverage: Coverage,
    ScriptList: ScriptList,
    FeatureList: FeatureList,
    LookupList: LookupList,
    ushortList: ushortList,
    tableList: tableList,
    recordList: recordList,
};

// Parsing utility functions

// Retrieve an unsigned byte from the DataView.
function getByte(dataView, offset) {
    return dataView.getUint8(offset);
}

// Retrieve an unsigned 16-bit short from the DataView.
// The value is stored in big endian.
function getUShort(dataView, offset) {
    return dataView.getUint16(offset, false);
}

// Retrieve a signed 16-bit short from the DataView.
// The value is stored in big endian.
function getShort(dataView, offset) {
    return dataView.getInt16(offset, false);
}

// Retrieve an unsigned 32-bit long from the DataView.
// The value is stored in big endian.
function getULong(dataView, offset) {
    return dataView.getUint32(offset, false);
}

// Retrieve a 32-bit signed fixed-point number (16.16) from the DataView.
// The value is stored in big endian.
function getFixed(dataView, offset) {
    var decimal = dataView.getInt16(offset, false);
    var fraction = dataView.getUint16(offset + 2, false);
    return decimal + fraction / 65535;
}

// Retrieve a 4-character tag from the DataView.
// Tags are used to identify tables.
function getTag(dataView, offset) {
    var tag = '';
    for (var i = offset; i < offset + 4; i += 1) {
        tag += String.fromCharCode(dataView.getInt8(i));
    }

    return tag;
}

// Retrieve an offset from the DataView.
// Offsets are 1 to 4 bytes in length, depending on the offSize argument.
function getOffset(dataView, offset, offSize) {
    var v = 0;
    for (var i = 0; i < offSize; i += 1) {
        v <<= 8;
        v += dataView.getUint8(offset + i);
    }

    return v;
}

// Retrieve a number of bytes from start offset to the end offset from the DataView.
function getBytes(dataView, startOffset, endOffset) {
    var bytes = [];
    for (var i = startOffset; i < endOffset; i += 1) {
        bytes.push(dataView.getUint8(i));
    }

    return bytes;
}

// Convert the list of bytes to a string.
function bytesToString(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 1) {
        s += String.fromCharCode(bytes[i]);
    }

    return s;
}

var typeOffsets = {
    byte: 1,
    uShort: 2,
    short: 2,
    uLong: 4,
    fixed: 4,
    longDateTime: 8,
    tag: 4
};

// A stateful parser that changes the offset whenever a value is retrieved.
// The data is a DataView.
function Parser(data, offset) {
    this.data = data;
    this.offset = offset;
    this.relativeOffset = 0;
}

Parser.prototype.parseByte = function() {
    var v = this.data.getUint8(this.offset + this.relativeOffset);
    this.relativeOffset += 1;
    return v;
};

Parser.prototype.parseChar = function() {
    var v = this.data.getInt8(this.offset + this.relativeOffset);
    this.relativeOffset += 1;
    return v;
};

Parser.prototype.parseCard8 = Parser.prototype.parseByte;

Parser.prototype.parseUShort = function() {
    var v = this.data.getUint16(this.offset + this.relativeOffset);
    this.relativeOffset += 2;
    return v;
};

Parser.prototype.parseCard16 = Parser.prototype.parseUShort;
Parser.prototype.parseSID = Parser.prototype.parseUShort;
Parser.prototype.parseOffset16 = Parser.prototype.parseUShort;

Parser.prototype.parseShort = function() {
    var v = this.data.getInt16(this.offset + this.relativeOffset);
    this.relativeOffset += 2;
    return v;
};

Parser.prototype.parseF2Dot14 = function() {
    var v = this.data.getInt16(this.offset + this.relativeOffset) / 16384;
    this.relativeOffset += 2;
    return v;
};

Parser.prototype.parseULong = function() {
    var v = getULong(this.data, this.offset + this.relativeOffset);
    this.relativeOffset += 4;
    return v;
};

Parser.prototype.parseFixed = function() {
    var v = getFixed(this.data, this.offset + this.relativeOffset);
    this.relativeOffset += 4;
    return v;
};

Parser.prototype.parseString = function(length) {
    var dataView = this.data;
    var offset = this.offset + this.relativeOffset;
    var string = '';
    this.relativeOffset += length;
    for (var i = 0; i < length; i++) {
        string += String.fromCharCode(dataView.getUint8(offset + i));
    }

    return string;
};

Parser.prototype.parseTag = function() {
    return this.parseString(4);
};

// LONGDATETIME is a 64-bit integer.
// JavaScript and unix timestamps traditionally use 32 bits, so we
// only take the last 32 bits.
// + Since until 2038 those bits will be filled by zeros we can ignore them.
Parser.prototype.parseLongDateTime = function() {
    var v = getULong(this.data, this.offset + this.relativeOffset + 4);
    // Subtract seconds between 01/01/1904 and 01/01/1970
    // to convert Apple Mac timestamp to Standard Unix timestamp
    v -= 2082844800;
    this.relativeOffset += 8;
    return v;
};

Parser.prototype.parseVersion = function() {
    var major = getUShort(this.data, this.offset + this.relativeOffset);

    // How to interpret the minor version is very vague in the spec. 0x5000 is 5, 0x1000 is 1
    // This returns the correct number if minor = 0xN000 where N is 0-9
    var minor = getUShort(this.data, this.offset + this.relativeOffset + 2);
    this.relativeOffset += 4;
    return major + minor / 0x1000 / 10;
};

Parser.prototype.skip = function(type, amount) {
    if (amount === undefined) {
        amount = 1;
    }

    this.relativeOffset += typeOffsets[type] * amount;
};

///// Parsing lists and records ///////////////////////////////

// Parse a list of 16 bit unsigned integers. The length of the list can be read on the stream
// or provided as an argument.
Parser.prototype.parseOffset16List =
Parser.prototype.parseUShortList = function(count) {
    if (count === undefined) { count = this.parseUShort(); }
    var offsets = new Array(count);
    var dataView = this.data;
    var offset = this.offset + this.relativeOffset;
    for (var i = 0; i < count; i++) {
        offsets[i] = dataView.getUint16(offset);
        offset += 2;
    }

    this.relativeOffset += count * 2;
    return offsets;
};

// Parses a list of 16 bit signed integers.
Parser.prototype.parseShortList = function(count) {
    var list = new Array(count);
    var dataView = this.data;
    var offset = this.offset + this.relativeOffset;
    for (var i = 0; i < count; i++) {
        list[i] = dataView.getInt16(offset);
        offset += 2;
    }

    this.relativeOffset += count * 2;
    return list;
};

// Parses a list of bytes.
Parser.prototype.parseByteList = function(count) {
    var list = new Array(count);
    var dataView = this.data;
    var offset = this.offset + this.relativeOffset;
    for (var i = 0; i < count; i++) {
        list[i] = dataView.getUint8(offset++);
    }

    this.relativeOffset += count;
    return list;
};

/**
 * Parse a list of items.
 * Record count is optional, if omitted it is read from the stream.
 * itemCallback is one of the Parser methods.
 */
Parser.prototype.parseList = function(count, itemCallback) {
    var this$1 = this;

    if (!itemCallback) {
        itemCallback = count;
        count = this.parseUShort();
    }
    var list = new Array(count);
    for (var i = 0; i < count; i++) {
        list[i] = itemCallback.call(this$1);
    }
    return list;
};

/**
 * Parse a list of records.
 * Record count is optional, if omitted it is read from the stream.
 * Example of recordDescription: { sequenceIndex: Parser.uShort, lookupListIndex: Parser.uShort }
 */
Parser.prototype.parseRecordList = function(count, recordDescription) {
    var this$1 = this;

    // If the count argument is absent, read it in the stream.
    if (!recordDescription) {
        recordDescription = count;
        count = this.parseUShort();
    }
    var records = new Array(count);
    var fields = Object.keys(recordDescription);
    for (var i = 0; i < count; i++) {
        var rec = {};
        for (var j = 0; j < fields.length; j++) {
            var fieldName = fields[j];
            var fieldType = recordDescription[fieldName];
            rec[fieldName] = fieldType.call(this$1);
        }
        records[i] = rec;
    }
    return records;
};

// Parse a data structure into an object
// Example of description: { sequenceIndex: Parser.uShort, lookupListIndex: Parser.uShort }
Parser.prototype.parseStruct = function(description) {
    var this$1 = this;

    if (typeof description === 'function') {
        return description.call(this);
    } else {
        var fields = Object.keys(description);
        var struct = {};
        for (var j = 0; j < fields.length; j++) {
            var fieldName = fields[j];
            var fieldType = description[fieldName];
            struct[fieldName] = fieldType.call(this$1);
        }
        return struct;
    }
};

Parser.prototype.parsePointer = function(description) {
    var structOffset = this.parseOffset16();
    if (structOffset > 0) {                         // NULL offset => return undefined
        return new Parser(this.data, this.offset + structOffset).parseStruct(description);
    }
    return undefined;
};

/**
 * Parse a list of offsets to lists of 16-bit integers,
 * or a list of offsets to lists of offsets to any kind of items.
 * If itemCallback is not provided, a list of list of UShort is assumed.
 * If provided, itemCallback is called on each item and must parse the item.
 * See examples in tables/gsub.js
 */
Parser.prototype.parseListOfLists = function(itemCallback) {
    var this$1 = this;

    var offsets = this.parseOffset16List();
    var count = offsets.length;
    var relativeOffset = this.relativeOffset;
    var list = new Array(count);
    for (var i = 0; i < count; i++) {
        var start = offsets[i];
        if (start === 0) {                  // NULL offset
            list[i] = undefined;            // Add i as owned property to list. Convenient with assert.
            continue;
        }
        this$1.relativeOffset = start;
        if (itemCallback) {
            var subOffsets = this$1.parseOffset16List();
            var subList = new Array(subOffsets.length);
            for (var j = 0; j < subOffsets.length; j++) {
                this$1.relativeOffset = start + subOffsets[j];
                subList[j] = itemCallback.call(this$1);
            }
            list[i] = subList;
        } else {
            list[i] = this$1.parseUShortList();
        }
    }
    this.relativeOffset = relativeOffset;
    return list;
};

///// Complex tables parsing //////////////////////////////////

// Parse a coverage table in a GSUB, GPOS or GDEF table.
// https://www.microsoft.com/typography/OTSPEC/chapter2.htm
// parser.offset must point to the start of the table containing the coverage.
Parser.prototype.parseCoverage = function() {
    var this$1 = this;

    var startOffset = this.offset + this.relativeOffset;
    var format = this.parseUShort();
    var count = this.parseUShort();
    if (format === 1) {
        return {
            format: 1,
            glyphs: this.parseUShortList(count)
        };
    } else if (format === 2) {
        var ranges = new Array(count);
        for (var i = 0; i < count; i++) {
            ranges[i] = {
                start: this$1.parseUShort(),
                end: this$1.parseUShort(),
                index: this$1.parseUShort()
            };
        }
        return {
            format: 2,
            ranges: ranges
        };
    }
    throw new Error('0x' + startOffset.toString(16) + ': Coverage format must be 1 or 2.');
};

// Parse a Class Definition Table in a GSUB, GPOS or GDEF table.
// https://www.microsoft.com/typography/OTSPEC/chapter2.htm
Parser.prototype.parseClassDef = function() {
    var startOffset = this.offset + this.relativeOffset;
    var format = this.parseUShort();
    if (format === 1) {
        return {
            format: 1,
            startGlyph: this.parseUShort(),
            classes: this.parseUShortList()
        };
    } else if (format === 2) {
        return {
            format: 2,
            ranges: this.parseRecordList({
                start: Parser.uShort,
                end: Parser.uShort,
                classId: Parser.uShort
            })
        };
    }
    throw new Error('0x' + startOffset.toString(16) + ': ClassDef format must be 1 or 2.');
};

///// Static methods ///////////////////////////////////
// These convenience methods can be used as callbacks and should be called with "this" context set to a Parser instance.

Parser.list = function(count, itemCallback) {
    return function() {
        return this.parseList(count, itemCallback);
    };
};

Parser.recordList = function(count, recordDescription) {
    return function() {
        return this.parseRecordList(count, recordDescription);
    };
};

Parser.pointer = function(description) {
    return function() {
        return this.parsePointer(description);
    };
};

Parser.tag = Parser.prototype.parseTag;
Parser.byte = Parser.prototype.parseByte;
Parser.uShort = Parser.offset16 = Parser.prototype.parseUShort;
Parser.uShortList = Parser.prototype.parseUShortList;
Parser.struct = Parser.prototype.parseStruct;
Parser.coverage = Parser.prototype.parseCoverage;
Parser.classDef = Parser.prototype.parseClassDef;

///// Script, Feature, Lookup lists ///////////////////////////////////////////////
// https://www.microsoft.com/typography/OTSPEC/chapter2.htm

var langSysTable = {
    reserved: Parser.uShort,
    reqFeatureIndex: Parser.uShort,
    featureIndexes: Parser.uShortList
};

Parser.prototype.parseScriptList = function() {
    return this.parsePointer(Parser.recordList({
        tag: Parser.tag,
        script: Parser.pointer({
            defaultLangSys: Parser.pointer(langSysTable),
            langSysRecords: Parser.recordList({
                tag: Parser.tag,
                langSys: Parser.pointer(langSysTable)
            })
        })
    }));
};

Parser.prototype.parseFeatureList = function() {
    return this.parsePointer(Parser.recordList({
        tag: Parser.tag,
        feature: Parser.pointer({
            featureParams: Parser.offset16,
            lookupListIndexes: Parser.uShortList
        })
    }));
};

Parser.prototype.parseLookupList = function(lookupTableParsers) {
    return this.parsePointer(Parser.list(Parser.pointer(function() {
        var lookupType = this.parseUShort();
        check.argument(1 <= lookupType && lookupType <= 8, 'GSUB lookup type ' + lookupType + ' unknown.');
        var lookupFlag = this.parseUShort();
        var useMarkFilteringSet = lookupFlag & 0x10;
        return {
            lookupType: lookupType,
            lookupFlag: lookupFlag,
            subtables: this.parseList(Parser.pointer(lookupTableParsers[lookupType])),
            markFilteringSet: useMarkFilteringSet ? this.parseUShort() : undefined
        };
    })));
};

var parse = {
    getByte: getByte,
    getCard8: getByte,
    getUShort: getUShort,
    getCard16: getUShort,
    getShort: getShort,
    getULong: getULong,
    getFixed: getFixed,
    getTag: getTag,
    getOffset: getOffset,
    getBytes: getBytes,
    bytesToString: bytesToString,
    Parser: Parser,
};

// The `cmap` table stores the mappings from characters to glyphs.
// https://www.microsoft.com/typography/OTSPEC/cmap.htm

function parseCmapTableFormat12(cmap, p) {
    //Skip reserved.
    p.parseUShort();

    // Length in bytes of the sub-tables.
    cmap.length = p.parseULong();
    cmap.language = p.parseULong();

    var groupCount;
    cmap.groupCount = groupCount = p.parseULong();
    cmap.glyphIndexMap = {};

    for (var i = 0; i < groupCount; i += 1) {
        var startCharCode = p.parseULong();
        var endCharCode = p.parseULong();
        var startGlyphId = p.parseULong();

        for (var c = startCharCode; c <= endCharCode; c += 1) {
            cmap.glyphIndexMap[c] = startGlyphId;
            startGlyphId++;
        }
    }
}

function parseCmapTableFormat4(cmap, p, data, start, offset) {
    // Length in bytes of the sub-tables.
    cmap.length = p.parseUShort();
    cmap.language = p.parseUShort();

    // segCount is stored x 2.
    var segCount;
    cmap.segCount = segCount = p.parseUShort() >> 1;

    // Skip searchRange, entrySelector, rangeShift.
    p.skip('uShort', 3);

    // The "unrolled" mapping from character codes to glyph indices.
    cmap.glyphIndexMap = {};
    var endCountParser = new parse.Parser(data, start + offset + 14);
    var startCountParser = new parse.Parser(data, start + offset + 16 + segCount * 2);
    var idDeltaParser = new parse.Parser(data, start + offset + 16 + segCount * 4);
    var idRangeOffsetParser = new parse.Parser(data, start + offset + 16 + segCount * 6);
    var glyphIndexOffset = start + offset + 16 + segCount * 8;
    for (var i = 0; i < segCount - 1; i += 1) {
        var glyphIndex = (void 0);
        var endCount = endCountParser.parseUShort();
        var startCount = startCountParser.parseUShort();
        var idDelta = idDeltaParser.parseShort();
        var idRangeOffset = idRangeOffsetParser.parseUShort();
        for (var c = startCount; c <= endCount; c += 1) {
            if (idRangeOffset !== 0) {
                // The idRangeOffset is relative to the current position in the idRangeOffset array.
                // Take the current offset in the idRangeOffset array.
                glyphIndexOffset = (idRangeOffsetParser.offset + idRangeOffsetParser.relativeOffset - 2);

                // Add the value of the idRangeOffset, which will move us into the glyphIndex array.
                glyphIndexOffset += idRangeOffset;

                // Then add the character index of the current segment, multiplied by 2 for USHORTs.
                glyphIndexOffset += (c - startCount) * 2;
                glyphIndex = parse.getUShort(data, glyphIndexOffset);
                if (glyphIndex !== 0) {
                    glyphIndex = (glyphIndex + idDelta) & 0xFFFF;
                }
            } else {
                glyphIndex = (c + idDelta) & 0xFFFF;
            }

            cmap.glyphIndexMap[c] = glyphIndex;
        }
    }
}

// Parse the `cmap` table. This table stores the mappings from characters to glyphs.
// There are many available formats, but we only support the Windows format 4 and 12.
// This function returns a `CmapEncoding` object or null if no supported format could be found.
function parseCmapTable(data, start) {
    var cmap = {};
    cmap.version = parse.getUShort(data, start);
    check.argument(cmap.version === 0, 'cmap table version should be 0.');

    // The cmap table can contain many sub-tables, each with their own format.
    // We're only interested in a "platform 3" table. This is a Windows format.
    cmap.numTables = parse.getUShort(data, start + 2);
    var offset = -1;
    for (var i = cmap.numTables - 1; i >= 0; i -= 1) {
        var platformId = parse.getUShort(data, start + 4 + (i * 8));
        var encodingId = parse.getUShort(data, start + 4 + (i * 8) + 2);
        if (platformId === 3 && (encodingId === 0 || encodingId === 1 || encodingId === 10)) {
            offset = parse.getULong(data, start + 4 + (i * 8) + 4);
            break;
        }
    }

    if (offset === -1) {
        // There is no cmap table in the font that we support.
        throw new Error('No valid cmap sub-tables found.');
    }

    var p = new parse.Parser(data, start + offset);
    cmap.format = p.parseUShort();

    if (cmap.format === 12) {
        parseCmapTableFormat12(cmap, p);
    } else if (cmap.format === 4) {
        parseCmapTableFormat4(cmap, p, data, start, offset);
    } else {
        throw new Error('Only format 4 and 12 cmap tables are supported (found format ' + cmap.format + ').');
    }

    return cmap;
}

function addSegment(t, code, glyphIndex) {
    t.segments.push({
        end: code,
        start: code,
        delta: -(code - glyphIndex),
        offset: 0
    });
}

function addTerminatorSegment(t) {
    t.segments.push({
        end: 0xFFFF,
        start: 0xFFFF,
        delta: 1,
        offset: 0
    });
}

function makeCmapTable(glyphs) {
    var t = new table.Table('cmap', [
        {name: 'version', type: 'USHORT', value: 0},
        {name: 'numTables', type: 'USHORT', value: 1},
        {name: 'platformID', type: 'USHORT', value: 3},
        {name: 'encodingID', type: 'USHORT', value: 1},
        {name: 'offset', type: 'ULONG', value: 12},
        {name: 'format', type: 'USHORT', value: 4},
        {name: 'length', type: 'USHORT', value: 0},
        {name: 'language', type: 'USHORT', value: 0},
        {name: 'segCountX2', type: 'USHORT', value: 0},
        {name: 'searchRange', type: 'USHORT', value: 0},
        {name: 'entrySelector', type: 'USHORT', value: 0},
        {name: 'rangeShift', type: 'USHORT', value: 0}
    ]);

    t.segments = [];
    for (var i = 0; i < glyphs.length; i += 1) {
        var glyph = glyphs.get(i);
        for (var j = 0; j < glyph.unicodes.length; j += 1) {
            addSegment(t, glyph.unicodes[j], i);
        }

        t.segments = t.segments.sort(function(a, b) {
            return a.start - b.start;
        });
    }

    addTerminatorSegment(t);

    var segCount;
    segCount = t.segments.length;
    t.segCountX2 = segCount * 2;
    t.searchRange = Math.pow(2, Math.floor(Math.log(segCount) / Math.log(2))) * 2;
    t.entrySelector = Math.log(t.searchRange / 2) / Math.log(2);
    t.rangeShift = t.segCountX2 - t.searchRange;

    // Set up parallel segment arrays.
    var endCounts = [];
    var startCounts = [];
    var idDeltas = [];
    var idRangeOffsets = [];
    var glyphIds = [];

    for (var i$1 = 0; i$1 < segCount; i$1 += 1) {
        var segment = t.segments[i$1];
        endCounts = endCounts.concat({name: 'end_' + i$1, type: 'USHORT', value: segment.end});
        startCounts = startCounts.concat({name: 'start_' + i$1, type: 'USHORT', value: segment.start});
        idDeltas = idDeltas.concat({name: 'idDelta_' + i$1, type: 'SHORT', value: segment.delta});
        idRangeOffsets = idRangeOffsets.concat({name: 'idRangeOffset_' + i$1, type: 'USHORT', value: segment.offset});
        if (segment.glyphId !== undefined) {
            glyphIds = glyphIds.concat({name: 'glyph_' + i$1, type: 'USHORT', value: segment.glyphId});
        }
    }

    t.fields = t.fields.concat(endCounts);
    t.fields.push({name: 'reservedPad', type: 'USHORT', value: 0});
    t.fields = t.fields.concat(startCounts);
    t.fields = t.fields.concat(idDeltas);
    t.fields = t.fields.concat(idRangeOffsets);
    t.fields = t.fields.concat(glyphIds);

    t.length = 14 + // Subtable header
        endCounts.length * 2 +
        2 + // reservedPad
        startCounts.length * 2 +
        idDeltas.length * 2 +
        idRangeOffsets.length * 2 +
        glyphIds.length * 2;

    return t;
}

var cmap = { parse: parseCmapTable, make: makeCmapTable };

// Glyph encoding

var cffStandardStrings = [
    '.notdef', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright',
    'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash', 'zero', 'one', 'two',
    'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater',
    'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
    'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright', 'asciicircum', 'underscore',
    'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde', 'exclamdown', 'cent', 'sterling',
    'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle', 'quotedblleft', 'guillemotleft',
    'guilsinglleft', 'guilsinglright', 'fi', 'fl', 'endash', 'dagger', 'daggerdbl', 'periodcentered', 'paragraph',
    'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright', 'guillemotright', 'ellipsis', 'perthousand',
    'questiondown', 'grave', 'acute', 'circumflex', 'tilde', 'macron', 'breve', 'dotaccent', 'dieresis', 'ring',
    'cedilla', 'hungarumlaut', 'ogonek', 'caron', 'emdash', 'AE', 'ordfeminine', 'Lslash', 'Oslash', 'OE',
    'ordmasculine', 'ae', 'dotlessi', 'lslash', 'oslash', 'oe', 'germandbls', 'onesuperior', 'logicalnot', 'mu',
    'trademark', 'Eth', 'onehalf', 'plusminus', 'Thorn', 'onequarter', 'divide', 'brokenbar', 'degree', 'thorn',
    'threequarters', 'twosuperior', 'registered', 'minus', 'eth', 'multiply', 'threesuperior', 'copyright',
    'Aacute', 'Acircumflex', 'Adieresis', 'Agrave', 'Aring', 'Atilde', 'Ccedilla', 'Eacute', 'Ecircumflex',
    'Edieresis', 'Egrave', 'Iacute', 'Icircumflex', 'Idieresis', 'Igrave', 'Ntilde', 'Oacute', 'Ocircumflex',
    'Odieresis', 'Ograve', 'Otilde', 'Scaron', 'Uacute', 'Ucircumflex', 'Udieresis', 'Ugrave', 'Yacute',
    'Ydieresis', 'Zcaron', 'aacute', 'acircumflex', 'adieresis', 'agrave', 'aring', 'atilde', 'ccedilla', 'eacute',
    'ecircumflex', 'edieresis', 'egrave', 'iacute', 'icircumflex', 'idieresis', 'igrave', 'ntilde', 'oacute',
    'ocircumflex', 'odieresis', 'ograve', 'otilde', 'scaron', 'uacute', 'ucircumflex', 'udieresis', 'ugrave',
    'yacute', 'ydieresis', 'zcaron', 'exclamsmall', 'Hungarumlautsmall', 'dollaroldstyle', 'dollarsuperior',
    'ampersandsmall', 'Acutesmall', 'parenleftsuperior', 'parenrightsuperior', '266 ff', 'onedotenleader',
    'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle', 'fouroldstyle', 'fiveoldstyle', 'sixoldstyle',
    'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'commasuperior', 'threequartersemdash', 'periodsuperior',
    'questionsmall', 'asuperior', 'bsuperior', 'centsuperior', 'dsuperior', 'esuperior', 'isuperior', 'lsuperior',
    'msuperior', 'nsuperior', 'osuperior', 'rsuperior', 'ssuperior', 'tsuperior', 'ff', 'ffi', 'ffl',
    'parenleftinferior', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall',
    'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall', 'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall',
    'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall', 'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall',
    'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall', 'exclamdownsmall',
    'centoldstyle', 'Lslashsmall', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall', 'Brevesmall', 'Caronsmall',
    'Dotaccentsmall', 'Macronsmall', 'figuredash', 'hypheninferior', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall',
    'questiondownsmall', 'oneeighth', 'threeeighths', 'fiveeighths', 'seveneighths', 'onethird', 'twothirds',
    'zerosuperior', 'foursuperior', 'fivesuperior', 'sixsuperior', 'sevensuperior', 'eightsuperior', 'ninesuperior',
    'zeroinferior', 'oneinferior', 'twoinferior', 'threeinferior', 'fourinferior', 'fiveinferior', 'sixinferior',
    'seveninferior', 'eightinferior', 'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior',
    'commainferior', 'Agravesmall', 'Aacutesmall', 'Acircumflexsmall', 'Atildesmall', 'Adieresissmall',
    'Aringsmall', 'AEsmall', 'Ccedillasmall', 'Egravesmall', 'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall',
    'Igravesmall', 'Iacutesmall', 'Icircumflexsmall', 'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall',
    'Oacutesmall', 'Ocircumflexsmall', 'Otildesmall', 'Odieresissmall', 'OEsmall', 'Oslashsmall', 'Ugravesmall',
    'Uacutesmall', 'Ucircumflexsmall', 'Udieresissmall', 'Yacutesmall', 'Thornsmall', 'Ydieresissmall', '001.000',
    '001.001', '001.002', '001.003', 'Black', 'Bold', 'Book', 'Light', 'Medium', 'Regular', 'Roman', 'Semibold'];

var cffStandardEncoding = [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '', '', '', '', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent', 'ampersand', 'quoteright',
    'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash', 'zero', 'one', 'two',
    'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less', 'equal', 'greater',
    'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
    'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright', 'asciicircum', 'underscore',
    'quoteleft', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde', '', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    'exclamdown', 'cent', 'sterling', 'fraction', 'yen', 'florin', 'section', 'currency', 'quotesingle',
    'quotedblleft', 'guillemotleft', 'guilsinglleft', 'guilsinglright', 'fi', 'fl', '', 'endash', 'dagger',
    'daggerdbl', 'periodcentered', '', 'paragraph', 'bullet', 'quotesinglbase', 'quotedblbase', 'quotedblright',
    'guillemotright', 'ellipsis', 'perthousand', '', 'questiondown', '', 'grave', 'acute', 'circumflex', 'tilde',
    'macron', 'breve', 'dotaccent', 'dieresis', '', 'ring', 'cedilla', '', 'hungarumlaut', 'ogonek', 'caron',
    'emdash', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'AE', '', 'ordfeminine', '', '', '',
    '', 'Lslash', 'Oslash', 'OE', 'ordmasculine', '', '', '', '', '', 'ae', '', '', '', 'dotlessi', '', '',
    'lslash', 'oslash', 'oe', 'germandbls'];

var cffExpertEncoding = [
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '', '', '', '', 'space', 'exclamsmall', 'Hungarumlautsmall', '', 'dollaroldstyle', 'dollarsuperior',
    'ampersandsmall', 'Acutesmall', 'parenleftsuperior', 'parenrightsuperior', 'twodotenleader', 'onedotenleader',
    'comma', 'hyphen', 'period', 'fraction', 'zerooldstyle', 'oneoldstyle', 'twooldstyle', 'threeoldstyle',
    'fouroldstyle', 'fiveoldstyle', 'sixoldstyle', 'sevenoldstyle', 'eightoldstyle', 'nineoldstyle', 'colon',
    'semicolon', 'commasuperior', 'threequartersemdash', 'periodsuperior', 'questionsmall', '', 'asuperior',
    'bsuperior', 'centsuperior', 'dsuperior', 'esuperior', '', '', 'isuperior', '', '', 'lsuperior', 'msuperior',
    'nsuperior', 'osuperior', '', '', 'rsuperior', 'ssuperior', 'tsuperior', '', 'ff', 'fi', 'fl', 'ffi', 'ffl',
    'parenleftinferior', '', 'parenrightinferior', 'Circumflexsmall', 'hyphensuperior', 'Gravesmall', 'Asmall',
    'Bsmall', 'Csmall', 'Dsmall', 'Esmall', 'Fsmall', 'Gsmall', 'Hsmall', 'Ismall', 'Jsmall', 'Ksmall', 'Lsmall',
    'Msmall', 'Nsmall', 'Osmall', 'Psmall', 'Qsmall', 'Rsmall', 'Ssmall', 'Tsmall', 'Usmall', 'Vsmall', 'Wsmall',
    'Xsmall', 'Ysmall', 'Zsmall', 'colonmonetary', 'onefitted', 'rupiah', 'Tildesmall', '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    'exclamdownsmall', 'centoldstyle', 'Lslashsmall', '', '', 'Scaronsmall', 'Zcaronsmall', 'Dieresissmall',
    'Brevesmall', 'Caronsmall', '', 'Dotaccentsmall', '', '', 'Macronsmall', '', '', 'figuredash', 'hypheninferior',
    '', '', 'Ogoneksmall', 'Ringsmall', 'Cedillasmall', '', '', '', 'onequarter', 'onehalf', 'threequarters',
    'questiondownsmall', 'oneeighth', 'threeeighths', 'fiveeighths', 'seveneighths', 'onethird', 'twothirds', '',
    '', 'zerosuperior', 'onesuperior', 'twosuperior', 'threesuperior', 'foursuperior', 'fivesuperior',
    'sixsuperior', 'sevensuperior', 'eightsuperior', 'ninesuperior', 'zeroinferior', 'oneinferior', 'twoinferior',
    'threeinferior', 'fourinferior', 'fiveinferior', 'sixinferior', 'seveninferior', 'eightinferior',
    'nineinferior', 'centinferior', 'dollarinferior', 'periodinferior', 'commainferior', 'Agravesmall',
    'Aacutesmall', 'Acircumflexsmall', 'Atildesmall', 'Adieresissmall', 'Aringsmall', 'AEsmall', 'Ccedillasmall',
    'Egravesmall', 'Eacutesmall', 'Ecircumflexsmall', 'Edieresissmall', 'Igravesmall', 'Iacutesmall',
    'Icircumflexsmall', 'Idieresissmall', 'Ethsmall', 'Ntildesmall', 'Ogravesmall', 'Oacutesmall',
    'Ocircumflexsmall', 'Otildesmall', 'Odieresissmall', 'OEsmall', 'Oslashsmall', 'Ugravesmall', 'Uacutesmall',
    'Ucircumflexsmall', 'Udieresissmall', 'Yacutesmall', 'Thornsmall', 'Ydieresissmall'];

var standardNames = [
    '.notdef', '.null', 'nonmarkingreturn', 'space', 'exclam', 'quotedbl', 'numbersign', 'dollar', 'percent',
    'ampersand', 'quotesingle', 'parenleft', 'parenright', 'asterisk', 'plus', 'comma', 'hyphen', 'period', 'slash',
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'colon', 'semicolon', 'less',
    'equal', 'greater', 'question', 'at', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
    'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'bracketleft', 'backslash', 'bracketright',
    'asciicircum', 'underscore', 'grave', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
    'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'braceleft', 'bar', 'braceright', 'asciitilde',
    'Adieresis', 'Aring', 'Ccedilla', 'Eacute', 'Ntilde', 'Odieresis', 'Udieresis', 'aacute', 'agrave',
    'acircumflex', 'adieresis', 'atilde', 'aring', 'ccedilla', 'eacute', 'egrave', 'ecircumflex', 'edieresis',
    'iacute', 'igrave', 'icircumflex', 'idieresis', 'ntilde', 'oacute', 'ograve', 'ocircumflex', 'odieresis',
    'otilde', 'uacute', 'ugrave', 'ucircumflex', 'udieresis', 'dagger', 'degree', 'cent', 'sterling', 'section',
    'bullet', 'paragraph', 'germandbls', 'registered', 'copyright', 'trademark', 'acute', 'dieresis', 'notequal',
    'AE', 'Oslash', 'infinity', 'plusminus', 'lessequal', 'greaterequal', 'yen', 'mu', 'partialdiff', 'summation',
    'product', 'pi', 'integral', 'ordfeminine', 'ordmasculine', 'Omega', 'ae', 'oslash', 'questiondown',
    'exclamdown', 'logicalnot', 'radical', 'florin', 'approxequal', 'Delta', 'guillemotleft', 'guillemotright',
    'ellipsis', 'nonbreakingspace', 'Agrave', 'Atilde', 'Otilde', 'OE', 'oe', 'endash', 'emdash', 'quotedblleft',
    'quotedblright', 'quoteleft', 'quoteright', 'divide', 'lozenge', 'ydieresis', 'Ydieresis', 'fraction',
    'currency', 'guilsinglleft', 'guilsinglright', 'fi', 'fl', 'daggerdbl', 'periodcentered', 'quotesinglbase',
    'quotedblbase', 'perthousand', 'Acircumflex', 'Ecircumflex', 'Aacute', 'Edieresis', 'Egrave', 'Iacute',
    'Icircumflex', 'Idieresis', 'Igrave', 'Oacute', 'Ocircumflex', 'apple', 'Ograve', 'Uacute', 'Ucircumflex',
    'Ugrave', 'dotlessi', 'circumflex', 'tilde', 'macron', 'breve', 'dotaccent', 'ring', 'cedilla', 'hungarumlaut',
    'ogonek', 'caron', 'Lslash', 'lslash', 'Scaron', 'scaron', 'Zcaron', 'zcaron', 'brokenbar', 'Eth', 'eth',
    'Yacute', 'yacute', 'Thorn', 'thorn', 'minus', 'multiply', 'onesuperior', 'twosuperior', 'threesuperior',
    'onehalf', 'onequarter', 'threequarters', 'franc', 'Gbreve', 'gbreve', 'Idotaccent', 'Scedilla', 'scedilla',
    'Cacute', 'cacute', 'Ccaron', 'ccaron', 'dcroat'];

/**
 * This is the encoding used for fonts created from scratch.
 * It loops through all glyphs and finds the appropriate unicode value.
 * Since it's linear time, other encodings will be faster.
 * @exports opentype.DefaultEncoding
 * @class
 * @constructor
 * @param {opentype.Font}
 */
function DefaultEncoding(font) {
    this.font = font;
}

DefaultEncoding.prototype.charToGlyphIndex = function(c) {
    var code = c.charCodeAt(0);
    var glyphs = this.font.glyphs;
    if (glyphs) {
        for (var i = 0; i < glyphs.length; i += 1) {
            var glyph = glyphs.get(i);
            for (var j = 0; j < glyph.unicodes.length; j += 1) {
                if (glyph.unicodes[j] === code) {
                    return i;
                }
            }
        }
    }
    return null;
};

/**
 * @exports opentype.CmapEncoding
 * @class
 * @constructor
 * @param {Object} cmap - a object with the cmap encoded data
 */
function CmapEncoding(cmap) {
    this.cmap = cmap;
}

/**
 * @param  {string} c - the character
 * @return {number} The glyph index.
 */
CmapEncoding.prototype.charToGlyphIndex = function(c) {
    return this.cmap.glyphIndexMap[c.charCodeAt(0)] || 0;
};

/**
 * @exports opentype.CffEncoding
 * @class
 * @constructor
 * @param {string} encoding - The encoding
 * @param {Array} charset - The character set.
 */
function CffEncoding(encoding, charset) {
    this.encoding = encoding;
    this.charset = charset;
}

/**
 * @param  {string} s - The character
 * @return {number} The index.
 */
CffEncoding.prototype.charToGlyphIndex = function(s) {
    var code = s.charCodeAt(0);
    var charName = this.encoding[code];
    return this.charset.indexOf(charName);
};

/**
 * @exports opentype.GlyphNames
 * @class
 * @constructor
 * @param {Object} post
 */
function GlyphNames(post) {
    var this$1 = this;

    switch (post.version) {
        case 1:
            this.names = standardNames.slice();
            break;
        case 2:
            this.names = new Array(post.numberOfGlyphs);
            for (var i = 0; i < post.numberOfGlyphs; i++) {
                if (post.glyphNameIndex[i] < standardNames.length) {
                    this$1.names[i] = standardNames[post.glyphNameIndex[i]];
                } else {
                    this$1.names[i] = post.names[post.glyphNameIndex[i] - standardNames.length];
                }
            }

            break;
        case 2.5:
            this.names = new Array(post.numberOfGlyphs);
            for (var i$1 = 0; i$1 < post.numberOfGlyphs; i$1++) {
                this$1.names[i$1] = standardNames[i$1 + post.glyphNameIndex[i$1]];
            }

            break;
        case 3:
            this.names = [];
            break;
        default:
            this.names = [];
            break;
    }
}

/**
 * Gets the index of a glyph by name.
 * @param  {string} name - The glyph name
 * @return {number} The index
 */
GlyphNames.prototype.nameToGlyphIndex = function(name) {
    return this.names.indexOf(name);
};

/**
 * @param  {number} gid
 * @return {string}
 */
GlyphNames.prototype.glyphIndexToName = function(gid) {
    return this.names[gid];
};

/**
 * @alias opentype.addGlyphNames
 * @param {opentype.Font}
 */
function addGlyphNames(font) {
    var glyph;
    var glyphIndexMap = font.tables.cmap.glyphIndexMap;
    var charCodes = Object.keys(glyphIndexMap);

    for (var i = 0; i < charCodes.length; i += 1) {
        var c = charCodes[i];
        var glyphIndex = glyphIndexMap[c];
        glyph = font.glyphs.get(glyphIndex);
        glyph.addUnicode(parseInt(c));
    }

    for (var i$1 = 0; i$1 < font.glyphs.length; i$1 += 1) {
        glyph = font.glyphs.get(i$1);
        if (font.cffEncoding) {
            if (font.isCIDFont) {
                glyph.name = 'gid' + i$1;
            } else {
                glyph.name = font.cffEncoding.charset[i$1];
            }
        } else if (font.glyphNames.names) {
            glyph.name = font.glyphNames.glyphIndexToName(i$1);
        }
    }
}

// Drawing utility functions.

// Draw a line on the given context from point `x1,y1` to point `x2,y2`.
function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

var draw = { line: line };

// The `glyf` table describes the glyphs in TrueType outline format.
// http://www.microsoft.com/typography/otspec/glyf.htm

// Parse the coordinate data for a glyph.
function parseGlyphCoordinate(p, flag, previousValue, shortVectorBitMask, sameBitMask) {
    var v;
    if ((flag & shortVectorBitMask) > 0) {
        // The coordinate is 1 byte long.
        v = p.parseByte();
        // The `same` bit is re-used for short values to signify the sign of the value.
        if ((flag & sameBitMask) === 0) {
            v = -v;
        }

        v = previousValue + v;
    } else {
        //  The coordinate is 2 bytes long.
        // If the `same` bit is set, the coordinate is the same as the previous coordinate.
        if ((flag & sameBitMask) > 0) {
            v = previousValue;
        } else {
            // Parse the coordinate as a signed 16-bit delta value.
            v = previousValue + p.parseShort();
        }
    }

    return v;
}

// Parse a TrueType glyph.
function parseGlyph(glyph, data, start) {
    var p = new parse.Parser(data, start);
    glyph.numberOfContours = p.parseShort();
    glyph._xMin = p.parseShort();
    glyph._yMin = p.parseShort();
    glyph._xMax = p.parseShort();
    glyph._yMax = p.parseShort();
    var flags;
    var flag;

    if (glyph.numberOfContours > 0) {
        // This glyph is not a composite.
        var endPointIndices = glyph.endPointIndices = [];
        for (var i = 0; i < glyph.numberOfContours; i += 1) {
            endPointIndices.push(p.parseUShort());
        }

        glyph.instructionLength = p.parseUShort();
        glyph.instructions = [];
        for (var i$1 = 0; i$1 < glyph.instructionLength; i$1 += 1) {
            glyph.instructions.push(p.parseByte());
        }

        var numberOfCoordinates = endPointIndices[endPointIndices.length - 1] + 1;
        flags = [];
        for (var i$2 = 0; i$2 < numberOfCoordinates; i$2 += 1) {
            flag = p.parseByte();
            flags.push(flag);
            // If bit 3 is set, we repeat this flag n times, where n is the next byte.
            if ((flag & 8) > 0) {
                var repeatCount = p.parseByte();
                for (var j = 0; j < repeatCount; j += 1) {
                    flags.push(flag);
                    i$2 += 1;
                }
            }
        }

        check.argument(flags.length === numberOfCoordinates, 'Bad flags.');

        if (endPointIndices.length > 0) {
            var points = [];
            var point;
            // X/Y coordinates are relative to the previous point, except for the first point which is relative to 0,0.
            if (numberOfCoordinates > 0) {
                for (var i$3 = 0; i$3 < numberOfCoordinates; i$3 += 1) {
                    flag = flags[i$3];
                    point = {};
                    point.onCurve = !!(flag & 1);
                    point.lastPointOfContour = endPointIndices.indexOf(i$3) >= 0;
                    points.push(point);
                }

                var px = 0;
                for (var i$4 = 0; i$4 < numberOfCoordinates; i$4 += 1) {
                    flag = flags[i$4];
                    point = points[i$4];
                    point.x = parseGlyphCoordinate(p, flag, px, 2, 16);
                    px = point.x;
                }

                var py = 0;
                for (var i$5 = 0; i$5 < numberOfCoordinates; i$5 += 1) {
                    flag = flags[i$5];
                    point = points[i$5];
                    point.y = parseGlyphCoordinate(p, flag, py, 4, 32);
                    py = point.y;
                }
            }

            glyph.points = points;
        } else {
            glyph.points = [];
        }
    } else if (glyph.numberOfContours === 0) {
        glyph.points = [];
    } else {
        glyph.isComposite = true;
        glyph.points = [];
        glyph.components = [];
        var moreComponents = true;
        while (moreComponents) {
            flags = p.parseUShort();
            var component = {
                glyphIndex: p.parseUShort(),
                xScale: 1,
                scale01: 0,
                scale10: 0,
                yScale: 1,
                dx: 0,
                dy: 0
            };
            if ((flags & 1) > 0) {
                // The arguments are words
                if ((flags & 2) > 0) {
                    // values are offset
                    component.dx = p.parseShort();
                    component.dy = p.parseShort();
                } else {
                    // values are matched points
                    component.matchedPoints = [p.parseUShort(), p.parseUShort()];
                }

            } else {
                // The arguments are bytes
                if ((flags & 2) > 0) {
                    // values are offset
                    component.dx = p.parseChar();
                    component.dy = p.parseChar();
                } else {
                    // values are matched points
                    component.matchedPoints = [p.parseByte(), p.parseByte()];
                }
            }

            if ((flags & 8) > 0) {
                // We have a scale
                component.xScale = component.yScale = p.parseF2Dot14();
            } else if ((flags & 64) > 0) {
                // We have an X / Y scale
                component.xScale = p.parseF2Dot14();
                component.yScale = p.parseF2Dot14();
            } else if ((flags & 128) > 0) {
                // We have a 2x2 transformation
                component.xScale = p.parseF2Dot14();
                component.scale01 = p.parseF2Dot14();
                component.scale10 = p.parseF2Dot14();
                component.yScale = p.parseF2Dot14();
            }

            glyph.components.push(component);
            moreComponents = !!(flags & 32);
        }
        if (flags & 0x100) {
            // We have instructions
            glyph.instructionLength = p.parseUShort();
            glyph.instructions = [];
            for (var i$6 = 0; i$6 < glyph.instructionLength; i$6 += 1) {
                glyph.instructions.push(p.parseByte());
            }
        }
    }
}

// Transform an array of points and return a new array.
function transformPoints(points, transform) {
    var newPoints = [];
    for (var i = 0; i < points.length; i += 1) {
        var pt = points[i];
        var newPt = {
            x: transform.xScale * pt.x + transform.scale01 * pt.y + transform.dx,
            y: transform.scale10 * pt.x + transform.yScale * pt.y + transform.dy,
            onCurve: pt.onCurve,
            lastPointOfContour: pt.lastPointOfContour
        };
        newPoints.push(newPt);
    }

    return newPoints;
}

function getContours(points) {
    var contours = [];
    var currentContour = [];
    for (var i = 0; i < points.length; i += 1) {
        var pt = points[i];
        currentContour.push(pt);
        if (pt.lastPointOfContour) {
            contours.push(currentContour);
            currentContour = [];
        }
    }

    check.argument(currentContour.length === 0, 'There are still points left in the current contour.');
    return contours;
}

// Convert the TrueType glyph outline to a Path.
function getPath(points) {
    var p = new Path();
    if (!points) {
        return p;
    }

    var contours = getContours(points);

    for (var contourIndex = 0; contourIndex < contours.length; ++contourIndex) {
        var contour = contours[contourIndex];

        var prev = null;
        var curr = contour[contour.length - 1];
        var next = contour[0];

        if (curr.onCurve) {
            p.moveTo(curr.x, curr.y);
        } else {
            if (next.onCurve) {
                p.moveTo(next.x, next.y);
            } else {
                // If both first and last points are off-curve, start at their middle.
                var start = {x: (curr.x + next.x) * 0.5, y: (curr.y + next.y) * 0.5};
                p.moveTo(start.x, start.y);
            }
        }

        for (var i = 0; i < contour.length; ++i) {
            prev = curr;
            curr = next;
            next = contour[(i + 1) % contour.length];

            if (curr.onCurve) {
                // This is a straight line.
                p.lineTo(curr.x, curr.y);
            } else {
                var prev2 = prev;
                var next2 = next;

                if (!prev.onCurve) {
                    prev2 = { x: (curr.x + prev.x) * 0.5, y: (curr.y + prev.y) * 0.5 };
                    p.lineTo(prev2.x, prev2.y);
                }

                if (!next.onCurve) {
                    next2 = { x: (curr.x + next.x) * 0.5, y: (curr.y + next.y) * 0.5 };
                }

                p.lineTo(prev2.x, prev2.y);
                p.quadraticCurveTo(curr.x, curr.y, next2.x, next2.y);
            }
        }

        p.closePath();
    }
    return p;
}

function buildPath(glyphs, glyph) {
    if (glyph.isComposite) {
        for (var j = 0; j < glyph.components.length; j += 1) {
            var component = glyph.components[j];
            var componentGlyph = glyphs.get(component.glyphIndex);
            // Force the ttfGlyphLoader to parse the glyph.
            componentGlyph.getPath();
            if (componentGlyph.points) {
                var transformedPoints = (void 0);
                if (component.matchedPoints === undefined) {
                    // component positioned by offset
                    transformedPoints = transformPoints(componentGlyph.points, component);
                } else {
                    // component positioned by matched points
                    if ((component.matchedPoints[0] > glyph.points.length - 1) ||
                        (component.matchedPoints[1] > componentGlyph.points.length - 1)) {
                        throw Error('Matched points out of range in ' + glyph.name);
                    }
                    var firstPt = glyph.points[component.matchedPoints[0]];
                    var secondPt = componentGlyph.points[component.matchedPoints[1]];
                    var transform = {
                        xScale: component.xScale, scale01: component.scale01,
                        scale10: component.scale10, yScale: component.yScale,
                        dx: 0, dy: 0
                    };
                    secondPt = transformPoints([secondPt], transform)[0];
                    transform.dx = firstPt.x - secondPt.x;
                    transform.dy = firstPt.y - secondPt.y;
                    transformedPoints = transformPoints(componentGlyph.points, transform);
                }
                glyph.points = glyph.points.concat(transformedPoints);
            }
        }
    }

    return getPath(glyph.points);
}

// Parse all the glyphs according to the offsets from the `loca` table.
function parseGlyfTable(data, start, loca, font) {
    var glyphs = new glyphset.GlyphSet(font);

    // The last element of the loca table is invalid.
    for (var i = 0; i < loca.length - 1; i += 1) {
        var offset = loca[i];
        var nextOffset = loca[i + 1];
        if (offset !== nextOffset) {
            glyphs.push(i, glyphset.ttfGlyphLoader(font, i, parseGlyph, data, start + offset, buildPath));
        } else {
            glyphs.push(i, glyphset.glyphLoader(font, i));
        }
    }

    return glyphs;
}

var glyf = { getPath: getPath, parse: parseGlyfTable };

// The Glyph object

function getPathDefinition(glyph, path) {
    var _path = path || {commands: []};
    return {
        configurable: true,

        get: function() {
            if (typeof _path === 'function') {
                _path = _path();
            }

            return _path;
        },

        set: function(p) {
            _path = p;
        }
    };
}
/**
 * @typedef GlyphOptions
 * @type Object
 * @property {string} [name] - The glyph name
 * @property {number} [unicode]
 * @property {Array} [unicodes]
 * @property {number} [xMin]
 * @property {number} [yMin]
 * @property {number} [xMax]
 * @property {number} [yMax]
 * @property {number} [advanceWidth]
 */

// A Glyph is an individual mark that often corresponds to a character.
// Some glyphs, such as ligatures, are a combination of many characters.
// Glyphs are the basic building blocks of a font.
//
// The `Glyph` class contains utility methods for drawing the path and its points.
/**
 * @exports opentype.Glyph
 * @class
 * @param {GlyphOptions}
 * @constructor
 */
function Glyph(options) {
    // By putting all the code on a prototype function (which is only declared once)
    // we reduce the memory requirements for larger fonts by some 2%
    this.bindConstructorValues(options);
}

/**
 * @param  {GlyphOptions}
 */
Glyph.prototype.bindConstructorValues = function(options) {
    this.index = options.index || 0;

    // These three values cannot be deferred for memory optimization:
    this.name = options.name || null;
    this.unicode = options.unicode || undefined;
    this.unicodes = options.unicodes || options.unicode !== undefined ? [options.unicode] : [];

    // But by binding these values only when necessary, we reduce can
    // the memory requirements by almost 3% for larger fonts.
    if (options.xMin) {
        this.xMin = options.xMin;
    }

    if (options.yMin) {
        this.yMin = options.yMin;
    }

    if (options.xMax) {
        this.xMax = options.xMax;
    }

    if (options.yMax) {
        this.yMax = options.yMax;
    }

    if (options.advanceWidth) {
        this.advanceWidth = options.advanceWidth;
    }

    // The path for a glyph is the most memory intensive, and is bound as a value
    // with a getter/setter to ensure we actually do path parsing only once the
    // path is actually needed by anything.
    Object.defineProperty(this, 'path', getPathDefinition(this, options.path));
};

/**
 * @param {number}
 */
Glyph.prototype.addUnicode = function(unicode) {
    if (this.unicodes.length === 0) {
        this.unicode = unicode;
    }

    this.unicodes.push(unicode);
};

/**
 * Calculate the minimum bounding box for this glyph.
 * @return {opentype.BoundingBox}
 */
Glyph.prototype.getBoundingBox = function() {
    return this.path.getBoundingBox();
};

/**
 * Convert the glyph to a Path we can draw on a drawing context.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {Object=} options - xScale, yScale to stretch the glyph.
 * @param  {opentype.Font} if hinting is to be used, the font
 * @return {opentype.Path}
 */
Glyph.prototype.getPath = function(x, y, fontSize, options, font) {
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    var commands;
    var hPoints;
    if (!options) { options = { }; }
    var xScale = options.xScale;
    var yScale = options.yScale;

    if (options.hinting && font && font.hinting) {
        // in case of hinting, the hinting engine takes care
        // of scaling the points (not the path) before hinting.
        hPoints = this.path && font.hinting.exec(this, fontSize);
        // in case the hinting engine failed hPoints is undefined
        // and thus reverts to plain rending
    }

    if (hPoints) {
        commands = glyf.getPath(hPoints).commands;
        x = Math.round(x);
        y = Math.round(y);
        // TODO in case of hinting xyScaling is not yet supported
        xScale = yScale = 1;
    } else {
        commands = this.path.commands;
        var scale = 1 / this.path.unitsPerEm * fontSize;
        if (xScale === undefined) { xScale = scale; }
        if (yScale === undefined) { yScale = scale; }
    }

    var p = new Path();
    for (var i = 0; i < commands.length; i += 1) {
        var cmd = commands[i];
        if (cmd.type === 'M') {
            p.moveTo(x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'L') {
            p.lineTo(x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'Q') {
            p.quadraticCurveTo(x + (cmd.x1 * xScale), y + (-cmd.y1 * yScale),
                               x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'C') {
            p.curveTo(x + (cmd.x1 * xScale), y + (-cmd.y1 * yScale),
                      x + (cmd.x2 * xScale), y + (-cmd.y2 * yScale),
                      x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'Z') {
            p.closePath();
        }
    }

    return p;
};

/**
 * Split the glyph into contours.
 * This function is here for backwards compatibility, and to
 * provide raw access to the TrueType glyph outlines.
 * @return {Array}
 */
Glyph.prototype.getContours = function() {
    var this$1 = this;

    if (this.points === undefined) {
        return [];
    }

    var contours = [];
    var currentContour = [];
    for (var i = 0; i < this.points.length; i += 1) {
        var pt = this$1.points[i];
        currentContour.push(pt);
        if (pt.lastPointOfContour) {
            contours.push(currentContour);
            currentContour = [];
        }
    }

    check.argument(currentContour.length === 0, 'There are still points left in the current contour.');
    return contours;
};

/**
 * Calculate the xMin/yMin/xMax/yMax/lsb/rsb for a Glyph.
 * @return {Object}
 */
Glyph.prototype.getMetrics = function() {
    var commands = this.path.commands;
    var xCoords = [];
    var yCoords = [];
    for (var i = 0; i < commands.length; i += 1) {
        var cmd = commands[i];
        if (cmd.type !== 'Z') {
            xCoords.push(cmd.x);
            yCoords.push(cmd.y);
        }

        if (cmd.type === 'Q' || cmd.type === 'C') {
            xCoords.push(cmd.x1);
            yCoords.push(cmd.y1);
        }

        if (cmd.type === 'C') {
            xCoords.push(cmd.x2);
            yCoords.push(cmd.y2);
        }
    }

    var metrics = {
        xMin: Math.min.apply(null, xCoords),
        yMin: Math.min.apply(null, yCoords),
        xMax: Math.max.apply(null, xCoords),
        yMax: Math.max.apply(null, yCoords),
        leftSideBearing: this.leftSideBearing
    };

    if (!isFinite(metrics.xMin)) {
        metrics.xMin = 0;
    }

    if (!isFinite(metrics.xMax)) {
        metrics.xMax = this.advanceWidth;
    }

    if (!isFinite(metrics.yMin)) {
        metrics.yMin = 0;
    }

    if (!isFinite(metrics.yMax)) {
        metrics.yMax = 0;
    }

    metrics.rightSideBearing = this.advanceWidth - metrics.leftSideBearing - (metrics.xMax - metrics.xMin);
    return metrics;
};

/**
 * Draw the glyph on the given context.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {Object=} options - xScale, yScale to stretch the glyph.
 */
Glyph.prototype.draw = function(ctx, x, y, fontSize, options) {
    this.getPath(x, y, fontSize, options).draw(ctx);
};

/**
 * Draw the points of the glyph.
 * On-curve points will be drawn in blue, off-curve points will be drawn in red.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 */
Glyph.prototype.drawPoints = function(ctx, x, y, fontSize) {
    function drawCircles(l, x, y, scale) {
        var PI_SQ = Math.PI * 2;
        ctx.beginPath();
        for (var j = 0; j < l.length; j += 1) {
            ctx.moveTo(x + (l[j].x * scale), y + (l[j].y * scale));
            ctx.arc(x + (l[j].x * scale), y + (l[j].y * scale), 2, 0, PI_SQ, false);
        }

        ctx.closePath();
        ctx.fill();
    }

    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    var scale = 1 / this.path.unitsPerEm * fontSize;

    var blueCircles = [];
    var redCircles = [];
    var path = this.path;
    for (var i = 0; i < path.commands.length; i += 1) {
        var cmd = path.commands[i];
        if (cmd.x !== undefined) {
            blueCircles.push({x: cmd.x, y: -cmd.y});
        }

        if (cmd.x1 !== undefined) {
            redCircles.push({x: cmd.x1, y: -cmd.y1});
        }

        if (cmd.x2 !== undefined) {
            redCircles.push({x: cmd.x2, y: -cmd.y2});
        }
    }

    ctx.fillStyle = 'blue';
    drawCircles(blueCircles, x, y, scale);
    ctx.fillStyle = 'red';
    drawCircles(redCircles, x, y, scale);
};

/**
 * Draw lines indicating important font measurements.
 * Black lines indicate the origin of the coordinate system (point 0,0).
 * Blue lines indicate the glyph bounding box.
 * Green line indicates the advance width of the glyph.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 */
Glyph.prototype.drawMetrics = function(ctx, x, y, fontSize) {
    var scale;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    scale = 1 / this.path.unitsPerEm * fontSize;
    ctx.lineWidth = 1;

    // Draw the origin
    ctx.strokeStyle = 'black';
    draw.line(ctx, x, -10000, x, 10000);
    draw.line(ctx, -10000, y, 10000, y);

    // This code is here due to memory optimization: by not using
    // defaults in the constructor, we save a notable amount of memory.
    var xMin = this.xMin || 0;
    var yMin = this.yMin || 0;
    var xMax = this.xMax || 0;
    var yMax = this.yMax || 0;
    var advanceWidth = this.advanceWidth || 0;

    // Draw the glyph box
    ctx.strokeStyle = 'blue';
    draw.line(ctx, x + (xMin * scale), -10000, x + (xMin * scale), 10000);
    draw.line(ctx, x + (xMax * scale), -10000, x + (xMax * scale), 10000);
    draw.line(ctx, -10000, y + (-yMin * scale), 10000, y + (-yMin * scale));
    draw.line(ctx, -10000, y + (-yMax * scale), 10000, y + (-yMax * scale));

    // Draw the advance width
    ctx.strokeStyle = 'green';
    draw.line(ctx, x + (advanceWidth * scale), -10000, x + (advanceWidth * scale), 10000);
};

// The GlyphSet object

// Define a property on the glyph that depends on the path being loaded.
function defineDependentProperty(glyph, externalName, internalName) {
    Object.defineProperty(glyph, externalName, {
        get: function() {
            // Request the path property to make sure the path is loaded.
            glyph.path; // jshint ignore:line
            return glyph[internalName];
        },
        set: function(newValue) {
            glyph[internalName] = newValue;
        },
        enumerable: true,
        configurable: true
    });
}

/**
 * A GlyphSet represents all glyphs available in the font, but modelled using
 * a deferred glyph loader, for retrieving glyphs only once they are absolutely
 * necessary, to keep the memory footprint down.
 * @exports opentype.GlyphSet
 * @class
 * @param {opentype.Font}
 * @param {Array}
 */
function GlyphSet(font, glyphs) {
    var this$1 = this;

    this.font = font;
    this.glyphs = {};
    if (Array.isArray(glyphs)) {
        for (var i = 0; i < glyphs.length; i++) {
            this$1.glyphs[i] = glyphs[i];
        }
    }

    this.length = (glyphs && glyphs.length) || 0;
}

/**
 * @param  {number} index
 * @return {opentype.Glyph}
 */
GlyphSet.prototype.get = function(index) {
    if (typeof this.glyphs[index] === 'function') {
        this.glyphs[index] = this.glyphs[index]();
    }

    return this.glyphs[index];
};

/**
 * @param  {number} index
 * @param  {Object}
 */
GlyphSet.prototype.push = function(index, loader) {
    this.glyphs[index] = loader;
    this.length++;
};

/**
 * @alias opentype.glyphLoader
 * @param  {opentype.Font} font
 * @param  {number} index
 * @return {opentype.Glyph}
 */
function glyphLoader(font, index) {
    return new Glyph({index: index, font: font});
}

/**
 * Generate a stub glyph that can be filled with all metadata *except*
 * the "points" and "path" properties, which must be loaded only once
 * the glyph's path is actually requested for text shaping.
 * @alias opentype.ttfGlyphLoader
 * @param  {opentype.Font} font
 * @param  {number} index
 * @param  {Function} parseGlyph
 * @param  {Object} data
 * @param  {number} position
 * @param  {Function} buildPath
 * @return {opentype.Glyph}
 */
function ttfGlyphLoader(font, index, parseGlyph, data, position, buildPath) {
    return function() {
        var glyph = new Glyph({index: index, font: font});

        glyph.path = function() {
            parseGlyph(glyph, data, position);
            var path = buildPath(font.glyphs, glyph);
            path.unitsPerEm = font.unitsPerEm;
            return path;
        };

        defineDependentProperty(glyph, 'xMin', '_xMin');
        defineDependentProperty(glyph, 'xMax', '_xMax');
        defineDependentProperty(glyph, 'yMin', '_yMin');
        defineDependentProperty(glyph, 'yMax', '_yMax');

        return glyph;
    };
}
/**
 * @alias opentype.cffGlyphLoader
 * @param  {opentype.Font} font
 * @param  {number} index
 * @param  {Function} parseCFFCharstring
 * @param  {string} charstring
 * @return {opentype.Glyph}
 */
function cffGlyphLoader(font, index, parseCFFCharstring, charstring) {
    return function() {
        var glyph = new Glyph({index: index, font: font});

        glyph.path = function() {
            var path = parseCFFCharstring(font, glyph, charstring);
            path.unitsPerEm = font.unitsPerEm;
            return path;
        };

        return glyph;
    };
}

var glyphset = { GlyphSet: GlyphSet, glyphLoader: glyphLoader, ttfGlyphLoader: ttfGlyphLoader, cffGlyphLoader: cffGlyphLoader };

// The `CFF` table contains the glyph outlines in PostScript format.
// https://www.microsoft.com/typography/OTSPEC/cff.htm
// http://download.microsoft.com/download/8/0/1/801a191c-029d-4af3-9642-555f6fe514ee/cff.pdf
// http://download.microsoft.com/download/8/0/1/801a191c-029d-4af3-9642-555f6fe514ee/type2.pdf

// Custom equals function that can also check lists.
function equals(a, b) {
    if (a === b) {
        return true;
    } else if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }

        for (var i = 0; i < a.length; i += 1) {
            if (!equals(a[i], b[i])) {
                return false;
            }
        }

        return true;
    } else {
        return false;
    }
}

// Subroutines are encoded using the negative half of the number space.
// See type 2 chapter 4.7 "Subroutine operators".
function calcCFFSubroutineBias(subrs) {
    var bias;
    if (subrs.length < 1240) {
        bias = 107;
    } else if (subrs.length < 33900) {
        bias = 1131;
    } else {
        bias = 32768;
    }

    return bias;
}

// Parse a `CFF` INDEX array.
// An index array consists of a list of offsets, then a list of objects at those offsets.
function parseCFFIndex(data, start, conversionFn) {
    var offsets = [];
    var objects = [];
    var count = parse.getCard16(data, start);
    var objectOffset;
    var endOffset;
    if (count !== 0) {
        var offsetSize = parse.getByte(data, start + 2);
        objectOffset = start + ((count + 1) * offsetSize) + 2;
        var pos = start + 3;
        for (var i = 0; i < count + 1; i += 1) {
            offsets.push(parse.getOffset(data, pos, offsetSize));
            pos += offsetSize;
        }

        // The total size of the index array is 4 header bytes + the value of the last offset.
        endOffset = objectOffset + offsets[count];
    } else {
        endOffset = start + 2;
    }

    for (var i$1 = 0; i$1 < offsets.length - 1; i$1 += 1) {
        var value = parse.getBytes(data, objectOffset + offsets[i$1], objectOffset + offsets[i$1 + 1]);
        if (conversionFn) {
            value = conversionFn(value);
        }

        objects.push(value);
    }

    return {objects: objects, startOffset: start, endOffset: endOffset};
}

// Parse a `CFF` DICT real value.
function parseFloatOperand(parser) {
    var s = '';
    var eof = 15;
    var lookup = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'E', 'E-', null, '-'];
    while (true) {
        var b = parser.parseByte();
        var n1 = b >> 4;
        var n2 = b & 15;

        if (n1 === eof) {
            break;
        }

        s += lookup[n1];

        if (n2 === eof) {
            break;
        }

        s += lookup[n2];
    }

    return parseFloat(s);
}

// Parse a `CFF` DICT operand.
function parseOperand(parser, b0) {
    var b1;
    var b2;
    var b3;
    var b4;
    if (b0 === 28) {
        b1 = parser.parseByte();
        b2 = parser.parseByte();
        return b1 << 8 | b2;
    }

    if (b0 === 29) {
        b1 = parser.parseByte();
        b2 = parser.parseByte();
        b3 = parser.parseByte();
        b4 = parser.parseByte();
        return b1 << 24 | b2 << 16 | b3 << 8 | b4;
    }

    if (b0 === 30) {
        return parseFloatOperand(parser);
    }

    if (b0 >= 32 && b0 <= 246) {
        return b0 - 139;
    }

    if (b0 >= 247 && b0 <= 250) {
        b1 = parser.parseByte();
        return (b0 - 247) * 256 + b1 + 108;
    }

    if (b0 >= 251 && b0 <= 254) {
        b1 = parser.parseByte();
        return -(b0 - 251) * 256 - b1 - 108;
    }

    throw new Error('Invalid b0 ' + b0);
}

// Convert the entries returned by `parseDict` to a proper dictionary.
// If a value is a list of one, it is unpacked.
function entriesToObject(entries) {
    var o = {};
    for (var i = 0; i < entries.length; i += 1) {
        var key = entries[i][0];
        var values = entries[i][1];
        var value = (void 0);
        if (values.length === 1) {
            value = values[0];
        } else {
            value = values;
        }

        if (o.hasOwnProperty(key) && !isNaN(o[key])) {
            throw new Error('Object ' + o + ' already has key ' + key);
        }

        o[key] = value;
    }

    return o;
}

// Parse a `CFF` DICT object.
// A dictionary contains key-value pairs in a compact tokenized format.
function parseCFFDict(data, start, size) {
    start = start !== undefined ? start : 0;
    var parser = new parse.Parser(data, start);
    var entries = [];
    var operands = [];
    size = size !== undefined ? size : data.length;

    while (parser.relativeOffset < size) {
        var op = parser.parseByte();

        // The first byte for each dict item distinguishes between operator (key) and operand (value).
        // Values <= 21 are operators.
        if (op <= 21) {
            // Two-byte operators have an initial escape byte of 12.
            if (op === 12) {
                op = 1200 + parser.parseByte();
            }

            entries.push([op, operands]);
            operands = [];
        } else {
            // Since the operands (values) come before the operators (keys), we store all operands in a list
            // until we encounter an operator.
            operands.push(parseOperand(parser, op));
        }
    }

    return entriesToObject(entries);
}

// Given a String Index (SID), return the value of the string.
// Strings below index 392 are standard CFF strings and are not encoded in the font.
function getCFFString(strings, index) {
    if (index <= 390) {
        index = cffStandardStrings[index];
    } else {
        index = strings[index - 391];
    }

    return index;
}

// Interpret a dictionary and return a new dictionary with readable keys and values for missing entries.
// This function takes `meta` which is a list of objects containing `operand`, `name` and `default`.
function interpretDict(dict, meta, strings) {
    var newDict = {};
    var value;

    // Because we also want to include missing values, we start out from the meta list
    // and lookup values in the dict.
    for (var i = 0; i < meta.length; i += 1) {
        var m = meta[i];

        if (Array.isArray(m.type)) {
            var values = [];
            values.length = m.type.length;
            for (var j = 0; j < m.type.length; j++) {
                value = dict[m.op] !== undefined ? dict[m.op][j] : undefined;
                if (value === undefined) {
                    value = m.value !== undefined && m.value[j] !== undefined ? m.value[j] : null;
                }
                if (m.type[j] === 'SID') {
                    value = getCFFString(strings, value);
                }
                values[j] = value;
            }
            newDict[m.name] = values;
        } else {
            value = dict[m.op];
            if (value === undefined) {
                value = m.value !== undefined ? m.value : null;
            }

            if (m.type === 'SID') {
                value = getCFFString(strings, value);
            }
            newDict[m.name] = value;
        }
    }

    return newDict;
}

// Parse the CFF header.
function parseCFFHeader(data, start) {
    var header = {};
    header.formatMajor = parse.getCard8(data, start);
    header.formatMinor = parse.getCard8(data, start + 1);
    header.size = parse.getCard8(data, start + 2);
    header.offsetSize = parse.getCard8(data, start + 3);
    header.startOffset = start;
    header.endOffset = start + 4;
    return header;
}

var TOP_DICT_META = [
    {name: 'version', op: 0, type: 'SID'},
    {name: 'notice', op: 1, type: 'SID'},
    {name: 'copyright', op: 1200, type: 'SID'},
    {name: 'fullName', op: 2, type: 'SID'},
    {name: 'familyName', op: 3, type: 'SID'},
    {name: 'weight', op: 4, type: 'SID'},
    {name: 'isFixedPitch', op: 1201, type: 'number', value: 0},
    {name: 'italicAngle', op: 1202, type: 'number', value: 0},
    {name: 'underlinePosition', op: 1203, type: 'number', value: -100},
    {name: 'underlineThickness', op: 1204, type: 'number', value: 50},
    {name: 'paintType', op: 1205, type: 'number', value: 0},
    {name: 'charstringType', op: 1206, type: 'number', value: 2},
    {
        name: 'fontMatrix',
        op: 1207,
        type: ['real', 'real', 'real', 'real', 'real', 'real'],
        value: [0.001, 0, 0, 0.001, 0, 0]
    },
    {name: 'uniqueId', op: 13, type: 'number'},
    {name: 'fontBBox', op: 5, type: ['number', 'number', 'number', 'number'], value: [0, 0, 0, 0]},
    {name: 'strokeWidth', op: 1208, type: 'number', value: 0},
    {name: 'xuid', op: 14, type: [], value: null},
    {name: 'charset', op: 15, type: 'offset', value: 0},
    {name: 'encoding', op: 16, type: 'offset', value: 0},
    {name: 'charStrings', op: 17, type: 'offset', value: 0},
    {name: 'private', op: 18, type: ['number', 'offset'], value: [0, 0]},
    {name: 'ros', op: 1230, type: ['SID', 'SID', 'number']},
    {name: 'cidFontVersion', op: 1231, type: 'number', value: 0},
    {name: 'cidFontRevision', op: 1232, type: 'number', value: 0},
    {name: 'cidFontType', op: 1233, type: 'number', value: 0},
    {name: 'cidCount', op: 1234, type: 'number', value: 8720},
    {name: 'uidBase', op: 1235, type: 'number'},
    {name: 'fdArray', op: 1236, type: 'offset'},
    {name: 'fdSelect', op: 1237, type: 'offset'},
    {name: 'fontName', op: 1238, type: 'SID'}
];

var PRIVATE_DICT_META = [
    {name: 'subrs', op: 19, type: 'offset', value: 0},
    {name: 'defaultWidthX', op: 20, type: 'number', value: 0},
    {name: 'nominalWidthX', op: 21, type: 'number', value: 0}
];

// Parse the CFF top dictionary. A CFF table can contain multiple fonts, each with their own top dictionary.
// The top dictionary contains the essential metadata for the font, together with the private dictionary.
function parseCFFTopDict(data, strings) {
    var dict = parseCFFDict(data, 0, data.byteLength);
    return interpretDict(dict, TOP_DICT_META, strings);
}

// Parse the CFF private dictionary. We don't fully parse out all the values, only the ones we need.
function parseCFFPrivateDict(data, start, size, strings) {
    var dict = parseCFFDict(data, start, size);
    return interpretDict(dict, PRIVATE_DICT_META, strings);
}

// Returns a list of "Top DICT"s found using an INDEX list.
// Used to read both the usual high-level Top DICTs and also the FDArray
// discovered inside CID-keyed fonts.  When a Top DICT has a reference to
// a Private DICT that is read and saved into the Top DICT.
//
// In addition to the expected/optional values as outlined in TOP_DICT_META
// the following values might be saved into the Top DICT.
//
//    _subrs []        array of local CFF subroutines from Private DICT
//    _subrsBias       bias value computed from number of subroutines
//                      (see calcCFFSubroutineBias() and parseCFFCharstring())
//    _defaultWidthX   default widths for CFF characters
//    _nominalWidthX   bias added to width embedded within glyph description
//
//    _privateDict     saved copy of parsed Private DICT from Top DICT
function gatherCFFTopDicts(data, start, cffIndex, strings) {
    var topDictArray = [];
    for (var iTopDict = 0; iTopDict < cffIndex.length; iTopDict += 1) {
        var topDictData = new DataView(new Uint8Array(cffIndex[iTopDict]).buffer);
        var topDict = parseCFFTopDict(topDictData, strings);
        topDict._subrs = [];
        topDict._subrsBias = 0;
        var privateSize = topDict.private[0];
        var privateOffset = topDict.private[1];
        if (privateSize !== 0 && privateOffset !== 0) {
            var privateDict = parseCFFPrivateDict(data, privateOffset + start, privateSize, strings);
            topDict._defaultWidthX = privateDict.defaultWidthX;
            topDict._nominalWidthX = privateDict.nominalWidthX;
            if (privateDict.subrs !== 0) {
                var subrOffset = privateOffset + privateDict.subrs;
                var subrIndex = parseCFFIndex(data, subrOffset + start);
                topDict._subrs = subrIndex.objects;
                topDict._subrsBias = calcCFFSubroutineBias(topDict._subrs);
            }
            topDict._privateDict = privateDict;
        }
        topDictArray.push(topDict);
    }
    return topDictArray;
}

// Parse the CFF charset table, which contains internal names for all the glyphs.
// This function will return a list of glyph names.
// See Adobe TN #5176 chapter 13, "Charsets".
function parseCFFCharset(data, start, nGlyphs, strings) {
    var sid;
    var count;
    var parser = new parse.Parser(data, start);

    // The .notdef glyph is not included, so subtract 1.
    nGlyphs -= 1;
    var charset = ['.notdef'];

    var format = parser.parseCard8();
    if (format === 0) {
        for (var i = 0; i < nGlyphs; i += 1) {
            sid = parser.parseSID();
            charset.push(getCFFString(strings, sid));
        }
    } else if (format === 1) {
        while (charset.length <= nGlyphs) {
            sid = parser.parseSID();
            count = parser.parseCard8();
            for (var i$1 = 0; i$1 <= count; i$1 += 1) {
                charset.push(getCFFString(strings, sid));
                sid += 1;
            }
        }
    } else if (format === 2) {
        while (charset.length <= nGlyphs) {
            sid = parser.parseSID();
            count = parser.parseCard16();
            for (var i$2 = 0; i$2 <= count; i$2 += 1) {
                charset.push(getCFFString(strings, sid));
                sid += 1;
            }
        }
    } else {
        throw new Error('Unknown charset format ' + format);
    }

    return charset;
}

// Parse the CFF encoding data. Only one encoding can be specified per font.
// See Adobe TN #5176 chapter 12, "Encodings".
function parseCFFEncoding(data, start, charset) {
    var code;
    var enc = {};
    var parser = new parse.Parser(data, start);
    var format = parser.parseCard8();
    if (format === 0) {
        var nCodes = parser.parseCard8();
        for (var i = 0; i < nCodes; i += 1) {
            code = parser.parseCard8();
            enc[code] = i;
        }
    } else if (format === 1) {
        var nRanges = parser.parseCard8();
        code = 1;
        for (var i$1 = 0; i$1 < nRanges; i$1 += 1) {
            var first = parser.parseCard8();
            var nLeft = parser.parseCard8();
            for (var j = first; j <= first + nLeft; j += 1) {
                enc[j] = code;
                code += 1;
            }
        }
    } else {
        throw new Error('Unknown encoding format ' + format);
    }

    return new CffEncoding(enc, charset);
}

// Take in charstring code and return a Glyph object.
// The encoding is described in the Type 2 Charstring Format
// https://www.microsoft.com/typography/OTSPEC/charstr2.htm
function parseCFFCharstring(font, glyph, code) {
    var c1x;
    var c1y;
    var c2x;
    var c2y;
    var p = new Path();
    var stack = [];
    var nStems = 0;
    var haveWidth = false;
    var open = false;
    var x = 0;
    var y = 0;
    var subrs;
    var subrsBias;
    var defaultWidthX;
    var nominalWidthX;
    if (font.isCIDFont) {
        var fdIndex = font.tables.cff.topDict._fdSelect[glyph.index];
        var fdDict = font.tables.cff.topDict._fdArray[fdIndex];
        subrs = fdDict._subrs;
        subrsBias = fdDict._subrsBias;
        defaultWidthX = fdDict._defaultWidthX;
        nominalWidthX = fdDict._nominalWidthX;
    } else {
        subrs = font.tables.cff.topDict._subrs;
        subrsBias = font.tables.cff.topDict._subrsBias;
        defaultWidthX = font.tables.cff.topDict._defaultWidthX;
        nominalWidthX = font.tables.cff.topDict._nominalWidthX;
    }
    var width = defaultWidthX;

    function newContour(x, y) {
        if (open) {
            p.closePath();
        }

        p.moveTo(x, y);
        open = true;
    }

    function parseStems() {
        var hasWidthArg;

        // The number of stem operators on the stack is always even.
        // If the value is uneven, that means a width is specified.
        hasWidthArg = stack.length % 2 !== 0;
        if (hasWidthArg && !haveWidth) {
            width = stack.shift() + nominalWidthX;
        }

        nStems += stack.length >> 1;
        stack.length = 0;
        haveWidth = true;
    }

    function parse$$1(code) {
        var b1;
        var b2;
        var b3;
        var b4;
        var codeIndex;
        var subrCode;
        var jpx;
        var jpy;
        var c3x;
        var c3y;
        var c4x;
        var c4y;

        var i = 0;
        while (i < code.length) {
            var v = code[i];
            i += 1;
            switch (v) {
                case 1: // hstem
                    parseStems();
                    break;
                case 3: // vstem
                    parseStems();
                    break;
                case 4: // vmoveto
                    if (stack.length > 1 && !haveWidth) {
                        width = stack.shift() + nominalWidthX;
                        haveWidth = true;
                    }

                    y += stack.pop();
                    newContour(x, y);
                    break;
                case 5: // rlineto
                    while (stack.length > 0) {
                        x += stack.shift();
                        y += stack.shift();
                        p.lineTo(x, y);
                    }

                    break;
                case 6: // hlineto
                    while (stack.length > 0) {
                        x += stack.shift();
                        p.lineTo(x, y);
                        if (stack.length === 0) {
                            break;
                        }

                        y += stack.shift();
                        p.lineTo(x, y);
                    }

                    break;
                case 7: // vlineto
                    while (stack.length > 0) {
                        y += stack.shift();
                        p.lineTo(x, y);
                        if (stack.length === 0) {
                            break;
                        }

                        x += stack.shift();
                        p.lineTo(x, y);
                    }

                    break;
                case 8: // rrcurveto
                    while (stack.length > 0) {
                        c1x = x + stack.shift();
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + stack.shift();
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    break;
                case 10: // callsubr
                    codeIndex = stack.pop() + subrsBias;
                    subrCode = subrs[codeIndex];
                    if (subrCode) {
                        parse$$1(subrCode);
                    }

                    break;
                case 11: // return
                    return;
                case 12: // flex operators
                    v = code[i];
                    i += 1;
                    switch (v) {
                        case 35: // flex
                            // |- dx1 dy1 dx2 dy2 dx3 dy3 dx4 dy4 dx5 dy5 dx6 dy6 fd flex (12 35) |-
                            c1x = x   + stack.shift();    // dx1
                            c1y = y   + stack.shift();    // dy1
                            c2x = c1x + stack.shift();    // dx2
                            c2y = c1y + stack.shift();    // dy2
                            jpx = c2x + stack.shift();    // dx3
                            jpy = c2y + stack.shift();    // dy3
                            c3x = jpx + stack.shift();    // dx4
                            c3y = jpy + stack.shift();    // dy4
                            c4x = c3x + stack.shift();    // dx5
                            c4y = c3y + stack.shift();    // dy5
                            x = c4x   + stack.shift();    // dx6
                            y = c4y   + stack.shift();    // dy6
                            stack.shift();                // flex depth
                            p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                            p.curveTo(c3x, c3y, c4x, c4y, x, y);
                            break;
                        case 34: // hflex
                            // |- dx1 dx2 dy2 dx3 dx4 dx5 dx6 hflex (12 34) |-
                            c1x = x   + stack.shift();    // dx1
                            c1y = y;                      // dy1
                            c2x = c1x + stack.shift();    // dx2
                            c2y = c1y + stack.shift();    // dy2
                            jpx = c2x + stack.shift();    // dx3
                            jpy = c2y;                    // dy3
                            c3x = jpx + stack.shift();    // dx4
                            c3y = c2y;                    // dy4
                            c4x = c3x + stack.shift();    // dx5
                            c4y = y;                      // dy5
                            x = c4x + stack.shift();      // dx6
                            p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                            p.curveTo(c3x, c3y, c4x, c4y, x, y);
                            break;
                        case 36: // hflex1
                            // |- dx1 dy1 dx2 dy2 dx3 dx4 dx5 dy5 dx6 hflex1 (12 36) |-
                            c1x = x   + stack.shift();    // dx1
                            c1y = y   + stack.shift();    // dy1
                            c2x = c1x + stack.shift();    // dx2
                            c2y = c1y + stack.shift();    // dy2
                            jpx = c2x + stack.shift();    // dx3
                            jpy = c2y;                    // dy3
                            c3x = jpx + stack.shift();    // dx4
                            c3y = c2y;                    // dy4
                            c4x = c3x + stack.shift();    // dx5
                            c4y = c3y + stack.shift();    // dy5
                            x = c4x + stack.shift();      // dx6
                            p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                            p.curveTo(c3x, c3y, c4x, c4y, x, y);
                            break;
                        case 37: // flex1
                            // |- dx1 dy1 dx2 dy2 dx3 dy3 dx4 dy4 dx5 dy5 d6 flex1 (12 37) |-
                            c1x = x   + stack.shift();    // dx1
                            c1y = y   + stack.shift();    // dy1
                            c2x = c1x + stack.shift();    // dx2
                            c2y = c1y + stack.shift();    // dy2
                            jpx = c2x + stack.shift();    // dx3
                            jpy = c2y + stack.shift();    // dy3
                            c3x = jpx + stack.shift();    // dx4
                            c3y = jpy + stack.shift();    // dy4
                            c4x = c3x + stack.shift();    // dx5
                            c4y = c3y + stack.shift();    // dy5
                            if (Math.abs(c4x - x) > Math.abs(c4y - y)) {
                                x = c4x + stack.shift();
                            } else {
                                y = c4y + stack.shift();
                            }

                            p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                            p.curveTo(c3x, c3y, c4x, c4y, x, y);
                            break;
                        default:
                            console.log('Glyph ' + glyph.index + ': unknown operator ' + 1200 + v);
                            stack.length = 0;
                    }
                    break;
                case 14: // endchar
                    if (stack.length > 0 && !haveWidth) {
                        width = stack.shift() + nominalWidthX;
                        haveWidth = true;
                    }

                    if (open) {
                        p.closePath();
                        open = false;
                    }

                    break;
                case 18: // hstemhm
                    parseStems();
                    break;
                case 19: // hintmask
                case 20: // cntrmask
                    parseStems();
                    i += (nStems + 7) >> 3;
                    break;
                case 21: // rmoveto
                    if (stack.length > 2 && !haveWidth) {
                        width = stack.shift() + nominalWidthX;
                        haveWidth = true;
                    }

                    y += stack.pop();
                    x += stack.pop();
                    newContour(x, y);
                    break;
                case 22: // hmoveto
                    if (stack.length > 1 && !haveWidth) {
                        width = stack.shift() + nominalWidthX;
                        haveWidth = true;
                    }

                    x += stack.pop();
                    newContour(x, y);
                    break;
                case 23: // vstemhm
                    parseStems();
                    break;
                case 24: // rcurveline
                    while (stack.length > 2) {
                        c1x = x + stack.shift();
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + stack.shift();
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    x += stack.shift();
                    y += stack.shift();
                    p.lineTo(x, y);
                    break;
                case 25: // rlinecurve
                    while (stack.length > 6) {
                        x += stack.shift();
                        y += stack.shift();
                        p.lineTo(x, y);
                    }

                    c1x = x + stack.shift();
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y + stack.shift();
                    p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    break;
                case 26: // vvcurveto
                    if (stack.length % 2) {
                        x += stack.shift();
                    }

                    while (stack.length > 0) {
                        c1x = x;
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x;
                        y = c2y + stack.shift();
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    break;
                case 27: // hhcurveto
                    if (stack.length % 2) {
                        y += stack.shift();
                    }

                    while (stack.length > 0) {
                        c1x = x + stack.shift();
                        c1y = y;
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y;
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    break;
                case 28: // shortint
                    b1 = code[i];
                    b2 = code[i + 1];
                    stack.push(((b1 << 24) | (b2 << 16)) >> 16);
                    i += 2;
                    break;
                case 29: // callgsubr
                    codeIndex = stack.pop() + font.gsubrsBias;
                    subrCode = font.gsubrs[codeIndex];
                    if (subrCode) {
                        parse$$1(subrCode);
                    }

                    break;
                case 30: // vhcurveto
                    while (stack.length > 0) {
                        c1x = x;
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + (stack.length === 1 ? stack.shift() : 0);
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                        if (stack.length === 0) {
                            break;
                        }

                        c1x = x + stack.shift();
                        c1y = y;
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        y = c2y + stack.shift();
                        x = c2x + (stack.length === 1 ? stack.shift() : 0);
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    break;
                case 31: // hvcurveto
                    while (stack.length > 0) {
                        c1x = x + stack.shift();
                        c1y = y;
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        y = c2y + stack.shift();
                        x = c2x + (stack.length === 1 ? stack.shift() : 0);
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                        if (stack.length === 0) {
                            break;
                        }

                        c1x = x;
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + (stack.length === 1 ? stack.shift() : 0);
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    break;
                default:
                    if (v < 32) {
                        console.log('Glyph ' + glyph.index + ': unknown operator ' + v);
                    } else if (v < 247) {
                        stack.push(v - 139);
                    } else if (v < 251) {
                        b1 = code[i];
                        i += 1;
                        stack.push((v - 247) * 256 + b1 + 108);
                    } else if (v < 255) {
                        b1 = code[i];
                        i += 1;
                        stack.push(-(v - 251) * 256 - b1 - 108);
                    } else {
                        b1 = code[i];
                        b2 = code[i + 1];
                        b3 = code[i + 2];
                        b4 = code[i + 3];
                        i += 4;
                        stack.push(((b1 << 24) | (b2 << 16) | (b3 << 8) | b4) / 65536);
                    }
            }
        }
    }

    parse$$1(code);

    glyph.advanceWidth = width;
    return p;
}

function parseCFFFDSelect(data, start, nGlyphs, fdArrayCount) {
    var fdSelect = [];
    var fdIndex;
    var parser = new parse.Parser(data, start);
    var format = parser.parseCard8();
    if (format === 0) {
        // Simple list of nGlyphs elements
        for (var iGid = 0; iGid < nGlyphs; iGid++) {
            fdIndex = parser.parseCard8();
            if (fdIndex >= fdArrayCount) {
                throw new Error('CFF table CID Font FDSelect has bad FD index value ' + fdIndex + ' (FD count ' + fdArrayCount + ')');
            }
            fdSelect.push(fdIndex);
        }
    } else if (format === 3) {
        // Ranges
        var nRanges = parser.parseCard16();
        var first = parser.parseCard16();
        if (first !== 0) {
            throw new Error('CFF Table CID Font FDSelect format 3 range has bad initial GID ' + first);
        }
        var next;
        for (var iRange = 0; iRange < nRanges; iRange++) {
            fdIndex = parser.parseCard8();
            next = parser.parseCard16();
            if (fdIndex >= fdArrayCount) {
                throw new Error('CFF table CID Font FDSelect has bad FD index value ' + fdIndex + ' (FD count ' + fdArrayCount + ')');
            }
            if (next > nGlyphs) {
                throw new Error('CFF Table CID Font FDSelect format 3 range has bad GID ' + next);
            }
            for (; first < next; first++) {
                fdSelect.push(fdIndex);
            }
            first = next;
        }
        if (next !== nGlyphs) {
            throw new Error('CFF Table CID Font FDSelect format 3 range has bad final GID ' + next);
        }
    } else {
        throw new Error('CFF Table CID Font FDSelect table has unsupported format ' + format);
    }
    return fdSelect;
}

// Parse the `CFF` table, which contains the glyph outlines in PostScript format.
function parseCFFTable(data, start, font) {
    font.tables.cff = {};
    var header = parseCFFHeader(data, start);
    var nameIndex = parseCFFIndex(data, header.endOffset, parse.bytesToString);
    var topDictIndex = parseCFFIndex(data, nameIndex.endOffset);
    var stringIndex = parseCFFIndex(data, topDictIndex.endOffset, parse.bytesToString);
    var globalSubrIndex = parseCFFIndex(data, stringIndex.endOffset);
    font.gsubrs = globalSubrIndex.objects;
    font.gsubrsBias = calcCFFSubroutineBias(font.gsubrs);

    var topDictArray = gatherCFFTopDicts(data, start, topDictIndex.objects, stringIndex.objects);
    if (topDictArray.length !== 1) {
        throw new Error('CFF table has too many fonts in \'FontSet\' - count of fonts NameIndex.length = ' + topDictArray.length);
    }

    var topDict = topDictArray[0];
    font.tables.cff.topDict = topDict;

    if (topDict._privateDict) {
        font.defaultWidthX = topDict._privateDict.defaultWidthX;
        font.nominalWidthX = topDict._privateDict.nominalWidthX;
    }

    if (topDict.ros[0] !== undefined && topDict.ros[1] !== undefined) {
        font.isCIDFont = true;
    }

    if (font.isCIDFont) {
        var fdArrayOffset = topDict.fdArray;
        var fdSelectOffset = topDict.fdSelect;
        if (fdArrayOffset === 0 || fdSelectOffset === 0) {
            throw new Error('Font is marked as a CID font, but FDArray and/or FDSelect information is missing');
        }
        fdArrayOffset += start;
        var fdArrayIndex = parseCFFIndex(data, fdArrayOffset);
        var fdArray = gatherCFFTopDicts(data, start, fdArrayIndex.objects, stringIndex.objects);
        topDict._fdArray = fdArray;
        fdSelectOffset += start;
        topDict._fdSelect = parseCFFFDSelect(data, fdSelectOffset, font.numGlyphs, fdArray.length);
    }

    var privateDictOffset = start + topDict.private[1];
    var privateDict = parseCFFPrivateDict(data, privateDictOffset, topDict.private[0], stringIndex.objects);
    font.defaultWidthX = privateDict.defaultWidthX;
    font.nominalWidthX = privateDict.nominalWidthX;

    if (privateDict.subrs !== 0) {
        var subrOffset = privateDictOffset + privateDict.subrs;
        var subrIndex = parseCFFIndex(data, subrOffset);
        font.subrs = subrIndex.objects;
        font.subrsBias = calcCFFSubroutineBias(font.subrs);
    } else {
        font.subrs = [];
        font.subrsBias = 0;
    }

    // Offsets in the top dict are relative to the beginning of the CFF data, so add the CFF start offset.
    var charStringsIndex = parseCFFIndex(data, start + topDict.charStrings);
    font.nGlyphs = charStringsIndex.objects.length;

    var charset = parseCFFCharset(data, start + topDict.charset, font.nGlyphs, stringIndex.objects);
    if (topDict.encoding === 0) { // Standard encoding
        font.cffEncoding = new CffEncoding(cffStandardEncoding, charset);
    } else if (topDict.encoding === 1) { // Expert encoding
        font.cffEncoding = new CffEncoding(cffExpertEncoding, charset);
    } else {
        font.cffEncoding = parseCFFEncoding(data, start + topDict.encoding, charset);
    }

    // Prefer the CMAP encoding to the CFF encoding.
    font.encoding = font.encoding || font.cffEncoding;

    font.glyphs = new glyphset.GlyphSet(font);
    for (var i = 0; i < font.nGlyphs; i += 1) {
        var charString = charStringsIndex.objects[i];
        font.glyphs.push(i, glyphset.cffGlyphLoader(font, i, parseCFFCharstring, charString));
    }
}

// Convert a string to a String ID (SID).
// The list of strings is modified in place.
function encodeString(s, strings) {
    var sid;

    // Is the string in the CFF standard strings?
    var i = cffStandardStrings.indexOf(s);
    if (i >= 0) {
        sid = i;
    }

    // Is the string already in the string index?
    i = strings.indexOf(s);
    if (i >= 0) {
        sid = i + cffStandardStrings.length;
    } else {
        sid = cffStandardStrings.length + strings.length;
        strings.push(s);
    }

    return sid;
}

function makeHeader() {
    return new table.Record('Header', [
        {name: 'major', type: 'Card8', value: 1},
        {name: 'minor', type: 'Card8', value: 0},
        {name: 'hdrSize', type: 'Card8', value: 4},
        {name: 'major', type: 'Card8', value: 1}
    ]);
}

function makeNameIndex(fontNames) {
    var t = new table.Record('Name INDEX', [
        {name: 'names', type: 'INDEX', value: []}
    ]);
    t.names = [];
    for (var i = 0; i < fontNames.length; i += 1) {
        t.names.push({name: 'name_' + i, type: 'NAME', value: fontNames[i]});
    }

    return t;
}

// Given a dictionary's metadata, create a DICT structure.
function makeDict(meta, attrs, strings) {
    var m = {};
    for (var i = 0; i < meta.length; i += 1) {
        var entry = meta[i];
        var value = attrs[entry.name];
        if (value !== undefined && !equals(value, entry.value)) {
            if (entry.type === 'SID') {
                value = encodeString(value, strings);
            }

            m[entry.op] = {name: entry.name, type: entry.type, value: value};
        }
    }

    return m;
}

// The Top DICT houses the global font attributes.
function makeTopDict(attrs, strings) {
    var t = new table.Record('Top DICT', [
        {name: 'dict', type: 'DICT', value: {}}
    ]);
    t.dict = makeDict(TOP_DICT_META, attrs, strings);
    return t;
}

function makeTopDictIndex(topDict) {
    var t = new table.Record('Top DICT INDEX', [
        {name: 'topDicts', type: 'INDEX', value: []}
    ]);
    t.topDicts = [{name: 'topDict_0', type: 'TABLE', value: topDict}];
    return t;
}

function makeStringIndex(strings) {
    var t = new table.Record('String INDEX', [
        {name: 'strings', type: 'INDEX', value: []}
    ]);
    t.strings = [];
    for (var i = 0; i < strings.length; i += 1) {
        t.strings.push({name: 'string_' + i, type: 'STRING', value: strings[i]});
    }

    return t;
}

function makeGlobalSubrIndex() {
    // Currently we don't use subroutines.
    return new table.Record('Global Subr INDEX', [
        {name: 'subrs', type: 'INDEX', value: []}
    ]);
}

function makeCharsets(glyphNames, strings) {
    var t = new table.Record('Charsets', [
        {name: 'format', type: 'Card8', value: 0}
    ]);
    for (var i = 0; i < glyphNames.length; i += 1) {
        var glyphName = glyphNames[i];
        var glyphSID = encodeString(glyphName, strings);
        t.fields.push({name: 'glyph_' + i, type: 'SID', value: glyphSID});
    }

    return t;
}

function glyphToOps(glyph) {
    var ops = [];
    var path = glyph.path;
    ops.push({name: 'width', type: 'NUMBER', value: glyph.advanceWidth});
    var x = 0;
    var y = 0;
    for (var i = 0; i < path.commands.length; i += 1) {
        var dx = (void 0);
        var dy = (void 0);
        var cmd = path.commands[i];
        if (cmd.type === 'Q') {
            // CFF only supports bézier curves, so convert the quad to a bézier.
            var _13 = 1 / 3;
            var _23 = 2 / 3;

            // We're going to create a new command so we don't change the original path.
            cmd = {
                type: 'C',
                x: cmd.x,
                y: cmd.y,
                x1: _13 * x + _23 * cmd.x1,
                y1: _13 * y + _23 * cmd.y1,
                x2: _13 * cmd.x + _23 * cmd.x1,
                y2: _13 * cmd.y + _23 * cmd.y1
            };
        }

        if (cmd.type === 'M') {
            dx = Math.round(cmd.x - x);
            dy = Math.round(cmd.y - y);
            ops.push({name: 'dx', type: 'NUMBER', value: dx});
            ops.push({name: 'dy', type: 'NUMBER', value: dy});
            ops.push({name: 'rmoveto', type: 'OP', value: 21});
            x = Math.round(cmd.x);
            y = Math.round(cmd.y);
        } else if (cmd.type === 'L') {
            dx = Math.round(cmd.x - x);
            dy = Math.round(cmd.y - y);
            ops.push({name: 'dx', type: 'NUMBER', value: dx});
            ops.push({name: 'dy', type: 'NUMBER', value: dy});
            ops.push({name: 'rlineto', type: 'OP', value: 5});
            x = Math.round(cmd.x);
            y = Math.round(cmd.y);
        } else if (cmd.type === 'C') {
            var dx1 = Math.round(cmd.x1 - x);
            var dy1 = Math.round(cmd.y1 - y);
            var dx2 = Math.round(cmd.x2 - cmd.x1);
            var dy2 = Math.round(cmd.y2 - cmd.y1);
            dx = Math.round(cmd.x - cmd.x2);
            dy = Math.round(cmd.y - cmd.y2);
            ops.push({name: 'dx1', type: 'NUMBER', value: dx1});
            ops.push({name: 'dy1', type: 'NUMBER', value: dy1});
            ops.push({name: 'dx2', type: 'NUMBER', value: dx2});
            ops.push({name: 'dy2', type: 'NUMBER', value: dy2});
            ops.push({name: 'dx', type: 'NUMBER', value: dx});
            ops.push({name: 'dy', type: 'NUMBER', value: dy});
            ops.push({name: 'rrcurveto', type: 'OP', value: 8});
            x = Math.round(cmd.x);
            y = Math.round(cmd.y);
        }

        // Contours are closed automatically.
    }

    ops.push({name: 'endchar', type: 'OP', value: 14});
    return ops;
}

function makeCharStringsIndex(glyphs) {
    var t = new table.Record('CharStrings INDEX', [
        {name: 'charStrings', type: 'INDEX', value: []}
    ]);

    for (var i = 0; i < glyphs.length; i += 1) {
        var glyph = glyphs.get(i);
        var ops = glyphToOps(glyph);
        t.charStrings.push({name: glyph.name, type: 'CHARSTRING', value: ops});
    }

    return t;
}

function makePrivateDict(attrs, strings) {
    var t = new table.Record('Private DICT', [
        {name: 'dict', type: 'DICT', value: {}}
    ]);
    t.dict = makeDict(PRIVATE_DICT_META, attrs, strings);
    return t;
}

function makeCFFTable(glyphs, options) {
    var t = new table.Table('CFF ', [
        {name: 'header', type: 'RECORD'},
        {name: 'nameIndex', type: 'RECORD'},
        {name: 'topDictIndex', type: 'RECORD'},
        {name: 'stringIndex', type: 'RECORD'},
        {name: 'globalSubrIndex', type: 'RECORD'},
        {name: 'charsets', type: 'RECORD'},
        {name: 'charStringsIndex', type: 'RECORD'},
        {name: 'privateDict', type: 'RECORD'}
    ]);

    var fontScale = 1 / options.unitsPerEm;
    // We use non-zero values for the offsets so that the DICT encodes them.
    // This is important because the size of the Top DICT plays a role in offset calculation,
    // and the size shouldn't change after we've written correct offsets.
    var attrs = {
        version: options.version,
        fullName: options.fullName,
        familyName: options.familyName,
        weight: options.weightName,
        fontBBox: options.fontBBox || [0, 0, 0, 0],
        fontMatrix: [fontScale, 0, 0, fontScale, 0, 0],
        charset: 999,
        encoding: 0,
        charStrings: 999,
        private: [0, 999]
    };

    var privateAttrs = {};

    var glyphNames = [];
    var glyph;

    // Skip first glyph (.notdef)
    for (var i = 1; i < glyphs.length; i += 1) {
        glyph = glyphs.get(i);
        glyphNames.push(glyph.name);
    }

    var strings = [];

    t.header = makeHeader();
    t.nameIndex = makeNameIndex([options.postScriptName]);
    var topDict = makeTopDict(attrs, strings);
    t.topDictIndex = makeTopDictIndex(topDict);
    t.globalSubrIndex = makeGlobalSubrIndex();
    t.charsets = makeCharsets(glyphNames, strings);
    t.charStringsIndex = makeCharStringsIndex(glyphs);
    t.privateDict = makePrivateDict(privateAttrs, strings);

    // Needs to come at the end, to encode all custom strings used in the font.
    t.stringIndex = makeStringIndex(strings);

    var startOffset = t.header.sizeOf() +
        t.nameIndex.sizeOf() +
        t.topDictIndex.sizeOf() +
        t.stringIndex.sizeOf() +
        t.globalSubrIndex.sizeOf();
    attrs.charset = startOffset;

    // We use the CFF standard encoding; proper encoding will be handled in cmap.
    attrs.encoding = 0;
    attrs.charStrings = attrs.charset + t.charsets.sizeOf();
    attrs.private[1] = attrs.charStrings + t.charStringsIndex.sizeOf();

    // Recreate the Top DICT INDEX with the correct offsets.
    topDict = makeTopDict(attrs, strings);
    t.topDictIndex = makeTopDictIndex(topDict);

    return t;
}

var cff = { parse: parseCFFTable, make: makeCFFTable };

// The `head` table contains global information about the font.
// https://www.microsoft.com/typography/OTSPEC/head.htm

// Parse the header `head` table
function parseHeadTable(data, start) {
    var head = {};
    var p = new parse.Parser(data, start);
    head.version = p.parseVersion();
    head.fontRevision = Math.round(p.parseFixed() * 1000) / 1000;
    head.checkSumAdjustment = p.parseULong();
    head.magicNumber = p.parseULong();
    check.argument(head.magicNumber === 0x5F0F3CF5, 'Font header has wrong magic number.');
    head.flags = p.parseUShort();
    head.unitsPerEm = p.parseUShort();
    head.created = p.parseLongDateTime();
    head.modified = p.parseLongDateTime();
    head.xMin = p.parseShort();
    head.yMin = p.parseShort();
    head.xMax = p.parseShort();
    head.yMax = p.parseShort();
    head.macStyle = p.parseUShort();
    head.lowestRecPPEM = p.parseUShort();
    head.fontDirectionHint = p.parseShort();
    head.indexToLocFormat = p.parseShort();
    head.glyphDataFormat = p.parseShort();
    return head;
}

function makeHeadTable(options) {
    // Apple Mac timestamp epoch is 01/01/1904 not 01/01/1970
    var timestamp = Math.round(new Date().getTime() / 1000) + 2082844800;
    var createdTimestamp = timestamp;

    if (options.createdTimestamp) {
        createdTimestamp = options.createdTimestamp + 2082844800;
    }

    return new table.Table('head', [
        {name: 'version', type: 'FIXED', value: 0x00010000},
        {name: 'fontRevision', type: 'FIXED', value: 0x00010000},
        {name: 'checkSumAdjustment', type: 'ULONG', value: 0},
        {name: 'magicNumber', type: 'ULONG', value: 0x5F0F3CF5},
        {name: 'flags', type: 'USHORT', value: 0},
        {name: 'unitsPerEm', type: 'USHORT', value: 1000},
        {name: 'created', type: 'LONGDATETIME', value: createdTimestamp},
        {name: 'modified', type: 'LONGDATETIME', value: timestamp},
        {name: 'xMin', type: 'SHORT', value: 0},
        {name: 'yMin', type: 'SHORT', value: 0},
        {name: 'xMax', type: 'SHORT', value: 0},
        {name: 'yMax', type: 'SHORT', value: 0},
        {name: 'macStyle', type: 'USHORT', value: 0},
        {name: 'lowestRecPPEM', type: 'USHORT', value: 0},
        {name: 'fontDirectionHint', type: 'SHORT', value: 2},
        {name: 'indexToLocFormat', type: 'SHORT', value: 0},
        {name: 'glyphDataFormat', type: 'SHORT', value: 0}
    ], options);
}

var head = { parse: parseHeadTable, make: makeHeadTable };

// The `hhea` table contains information for horizontal layout.
// https://www.microsoft.com/typography/OTSPEC/hhea.htm

// Parse the horizontal header `hhea` table
function parseHheaTable(data, start) {
    var hhea = {};
    var p = new parse.Parser(data, start);
    hhea.version = p.parseVersion();
    hhea.ascender = p.parseShort();
    hhea.descender = p.parseShort();
    hhea.lineGap = p.parseShort();
    hhea.advanceWidthMax = p.parseUShort();
    hhea.minLeftSideBearing = p.parseShort();
    hhea.minRightSideBearing = p.parseShort();
    hhea.xMaxExtent = p.parseShort();
    hhea.caretSlopeRise = p.parseShort();
    hhea.caretSlopeRun = p.parseShort();
    hhea.caretOffset = p.parseShort();
    p.relativeOffset += 8;
    hhea.metricDataFormat = p.parseShort();
    hhea.numberOfHMetrics = p.parseUShort();
    return hhea;
}

function makeHheaTable(options) {
    return new table.Table('hhea', [
        {name: 'version', type: 'FIXED', value: 0x00010000},
        {name: 'ascender', type: 'FWORD', value: 0},
        {name: 'descender', type: 'FWORD', value: 0},
        {name: 'lineGap', type: 'FWORD', value: 0},
        {name: 'advanceWidthMax', type: 'UFWORD', value: 0},
        {name: 'minLeftSideBearing', type: 'FWORD', value: 0},
        {name: 'minRightSideBearing', type: 'FWORD', value: 0},
        {name: 'xMaxExtent', type: 'FWORD', value: 0},
        {name: 'caretSlopeRise', type: 'SHORT', value: 1},
        {name: 'caretSlopeRun', type: 'SHORT', value: 0},
        {name: 'caretOffset', type: 'SHORT', value: 0},
        {name: 'reserved1', type: 'SHORT', value: 0},
        {name: 'reserved2', type: 'SHORT', value: 0},
        {name: 'reserved3', type: 'SHORT', value: 0},
        {name: 'reserved4', type: 'SHORT', value: 0},
        {name: 'metricDataFormat', type: 'SHORT', value: 0},
        {name: 'numberOfHMetrics', type: 'USHORT', value: 0}
    ], options);
}

var hhea = { parse: parseHheaTable, make: makeHheaTable };

// The `hmtx` table contains the horizontal metrics for all glyphs.
// https://www.microsoft.com/typography/OTSPEC/hmtx.htm

// Parse the `hmtx` table, which contains the horizontal metrics for all glyphs.
// This function augments the glyph array, adding the advanceWidth and leftSideBearing to each glyph.
function parseHmtxTable(data, start, numMetrics, numGlyphs, glyphs) {
    var advanceWidth;
    var leftSideBearing;
    var p = new parse.Parser(data, start);
    for (var i = 0; i < numGlyphs; i += 1) {
        // If the font is monospaced, only one entry is needed. This last entry applies to all subsequent glyphs.
        if (i < numMetrics) {
            advanceWidth = p.parseUShort();
            leftSideBearing = p.parseShort();
        }

        var glyph = glyphs.get(i);
        glyph.advanceWidth = advanceWidth;
        glyph.leftSideBearing = leftSideBearing;
    }
}

function makeHmtxTable(glyphs) {
    var t = new table.Table('hmtx', []);
    for (var i = 0; i < glyphs.length; i += 1) {
        var glyph = glyphs.get(i);
        var advanceWidth = glyph.advanceWidth || 0;
        var leftSideBearing = glyph.leftSideBearing || 0;
        t.fields.push({name: 'advanceWidth_' + i, type: 'USHORT', value: advanceWidth});
        t.fields.push({name: 'leftSideBearing_' + i, type: 'SHORT', value: leftSideBearing});
    }

    return t;
}

var hmtx = { parse: parseHmtxTable, make: makeHmtxTable };

// The `ltag` table stores IETF BCP-47 language tags. It allows supporting
// languages for which TrueType does not assign a numeric code.
// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6ltag.html
// http://www.w3.org/International/articles/language-tags/
// http://www.iana.org/assignments/language-subtag-registry/language-subtag-registry

function makeLtagTable(tags) {
    var result = new table.Table('ltag', [
        {name: 'version', type: 'ULONG', value: 1},
        {name: 'flags', type: 'ULONG', value: 0},
        {name: 'numTags', type: 'ULONG', value: tags.length}
    ]);

    var stringPool = '';
    var stringPoolOffset = 12 + tags.length * 4;
    for (var i = 0; i < tags.length; ++i) {
        var pos = stringPool.indexOf(tags[i]);
        if (pos < 0) {
            pos = stringPool.length;
            stringPool += tags[i];
        }

        result.fields.push({name: 'offset ' + i, type: 'USHORT', value: stringPoolOffset + pos});
        result.fields.push({name: 'length ' + i, type: 'USHORT', value: tags[i].length});
    }

    result.fields.push({name: 'stringPool', type: 'CHARARRAY', value: stringPool});
    return result;
}

function parseLtagTable(data, start) {
    var p = new parse.Parser(data, start);
    var tableVersion = p.parseULong();
    check.argument(tableVersion === 1, 'Unsupported ltag table version.');
    // The 'ltag' specification does not define any flags; skip the field.
    p.skip('uLong', 1);
    var numTags = p.parseULong();

    var tags = [];
    for (var i = 0; i < numTags; i++) {
        var tag = '';
        var offset = start + p.parseUShort();
        var length = p.parseUShort();
        for (var j = offset; j < offset + length; ++j) {
            tag += String.fromCharCode(data.getInt8(j));
        }

        tags.push(tag);
    }

    return tags;
}

var ltag = { make: makeLtagTable, parse: parseLtagTable };

// The `maxp` table establishes the memory requirements for the font.
// We need it just to get the number of glyphs in the font.
// https://www.microsoft.com/typography/OTSPEC/maxp.htm

// Parse the maximum profile `maxp` table.
function parseMaxpTable(data, start) {
    var maxp = {};
    var p = new parse.Parser(data, start);
    maxp.version = p.parseVersion();
    maxp.numGlyphs = p.parseUShort();
    if (maxp.version === 1.0) {
        maxp.maxPoints = p.parseUShort();
        maxp.maxContours = p.parseUShort();
        maxp.maxCompositePoints = p.parseUShort();
        maxp.maxCompositeContours = p.parseUShort();
        maxp.maxZones = p.parseUShort();
        maxp.maxTwilightPoints = p.parseUShort();
        maxp.maxStorage = p.parseUShort();
        maxp.maxFunctionDefs = p.parseUShort();
        maxp.maxInstructionDefs = p.parseUShort();
        maxp.maxStackElements = p.parseUShort();
        maxp.maxSizeOfInstructions = p.parseUShort();
        maxp.maxComponentElements = p.parseUShort();
        maxp.maxComponentDepth = p.parseUShort();
    }

    return maxp;
}

function makeMaxpTable(numGlyphs) {
    return new table.Table('maxp', [
        {name: 'version', type: 'FIXED', value: 0x00005000},
        {name: 'numGlyphs', type: 'USHORT', value: numGlyphs}
    ]);
}

var maxp = { parse: parseMaxpTable, make: makeMaxpTable };

// The `name` naming table.
// https://www.microsoft.com/typography/OTSPEC/name.htm

// NameIDs for the name table.
var nameTableNames = [
    'copyright',              // 0
    'fontFamily',             // 1
    'fontSubfamily',          // 2
    'uniqueID',               // 3
    'fullName',               // 4
    'version',                // 5
    'postScriptName',         // 6
    'trademark',              // 7
    'manufacturer',           // 8
    'designer',               // 9
    'description',            // 10
    'manufacturerURL',        // 11
    'designerURL',            // 12
    'license',                // 13
    'licenseURL',             // 14
    'reserved',               // 15
    'preferredFamily',        // 16
    'preferredSubfamily',     // 17
    'compatibleFullName',     // 18
    'sampleText',             // 19
    'postScriptFindFontName', // 20
    'wwsFamily',              // 21
    'wwsSubfamily'            // 22
];

var macLanguages = {
    0: 'en',
    1: 'fr',
    2: 'de',
    3: 'it',
    4: 'nl',
    5: 'sv',
    6: 'es',
    7: 'da',
    8: 'pt',
    9: 'no',
    10: 'he',
    11: 'ja',
    12: 'ar',
    13: 'fi',
    14: 'el',
    15: 'is',
    16: 'mt',
    17: 'tr',
    18: 'hr',
    19: 'zh-Hant',
    20: 'ur',
    21: 'hi',
    22: 'th',
    23: 'ko',
    24: 'lt',
    25: 'pl',
    26: 'hu',
    27: 'es',
    28: 'lv',
    29: 'se',
    30: 'fo',
    31: 'fa',
    32: 'ru',
    33: 'zh',
    34: 'nl-BE',
    35: 'ga',
    36: 'sq',
    37: 'ro',
    38: 'cz',
    39: 'sk',
    40: 'si',
    41: 'yi',
    42: 'sr',
    43: 'mk',
    44: 'bg',
    45: 'uk',
    46: 'be',
    47: 'uz',
    48: 'kk',
    49: 'az-Cyrl',
    50: 'az-Arab',
    51: 'hy',
    52: 'ka',
    53: 'mo',
    54: 'ky',
    55: 'tg',
    56: 'tk',
    57: 'mn-CN',
    58: 'mn',
    59: 'ps',
    60: 'ks',
    61: 'ku',
    62: 'sd',
    63: 'bo',
    64: 'ne',
    65: 'sa',
    66: 'mr',
    67: 'bn',
    68: 'as',
    69: 'gu',
    70: 'pa',
    71: 'or',
    72: 'ml',
    73: 'kn',
    74: 'ta',
    75: 'te',
    76: 'si',
    77: 'my',
    78: 'km',
    79: 'lo',
    80: 'vi',
    81: 'id',
    82: 'tl',
    83: 'ms',
    84: 'ms-Arab',
    85: 'am',
    86: 'ti',
    87: 'om',
    88: 'so',
    89: 'sw',
    90: 'rw',
    91: 'rn',
    92: 'ny',
    93: 'mg',
    94: 'eo',
    128: 'cy',
    129: 'eu',
    130: 'ca',
    131: 'la',
    132: 'qu',
    133: 'gn',
    134: 'ay',
    135: 'tt',
    136: 'ug',
    137: 'dz',
    138: 'jv',
    139: 'su',
    140: 'gl',
    141: 'af',
    142: 'br',
    143: 'iu',
    144: 'gd',
    145: 'gv',
    146: 'ga',
    147: 'to',
    148: 'el-polyton',
    149: 'kl',
    150: 'az',
    151: 'nn'
};

// MacOS language ID → MacOS script ID
//
// Note that the script ID is not sufficient to determine what encoding
// to use in TrueType files. For some languages, MacOS used a modification
// of a mainstream script. For example, an Icelandic name would be stored
// with smRoman in the TrueType naming table, but the actual encoding
// is a special Icelandic version of the normal Macintosh Roman encoding.
// As another example, Inuktitut uses an 8-bit encoding for Canadian Aboriginal
// Syllables but MacOS had run out of available script codes, so this was
// done as a (pretty radical) "modification" of Ethiopic.
//
// http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/Readme.txt
var macLanguageToScript = {
    0: 0,  // langEnglish → smRoman
    1: 0,  // langFrench → smRoman
    2: 0,  // langGerman → smRoman
    3: 0,  // langItalian → smRoman
    4: 0,  // langDutch → smRoman
    5: 0,  // langSwedish → smRoman
    6: 0,  // langSpanish → smRoman
    7: 0,  // langDanish → smRoman
    8: 0,  // langPortuguese → smRoman
    9: 0,  // langNorwegian → smRoman
    10: 5,  // langHebrew → smHebrew
    11: 1,  // langJapanese → smJapanese
    12: 4,  // langArabic → smArabic
    13: 0,  // langFinnish → smRoman
    14: 6,  // langGreek → smGreek
    15: 0,  // langIcelandic → smRoman (modified)
    16: 0,  // langMaltese → smRoman
    17: 0,  // langTurkish → smRoman (modified)
    18: 0,  // langCroatian → smRoman (modified)
    19: 2,  // langTradChinese → smTradChinese
    20: 4,  // langUrdu → smArabic
    21: 9,  // langHindi → smDevanagari
    22: 21,  // langThai → smThai
    23: 3,  // langKorean → smKorean
    24: 29,  // langLithuanian → smCentralEuroRoman
    25: 29,  // langPolish → smCentralEuroRoman
    26: 29,  // langHungarian → smCentralEuroRoman
    27: 29,  // langEstonian → smCentralEuroRoman
    28: 29,  // langLatvian → smCentralEuroRoman
    29: 0,  // langSami → smRoman
    30: 0,  // langFaroese → smRoman (modified)
    31: 4,  // langFarsi → smArabic (modified)
    32: 7,  // langRussian → smCyrillic
    33: 25,  // langSimpChinese → smSimpChinese
    34: 0,  // langFlemish → smRoman
    35: 0,  // langIrishGaelic → smRoman (modified)
    36: 0,  // langAlbanian → smRoman
    37: 0,  // langRomanian → smRoman (modified)
    38: 29,  // langCzech → smCentralEuroRoman
    39: 29,  // langSlovak → smCentralEuroRoman
    40: 0,  // langSlovenian → smRoman (modified)
    41: 5,  // langYiddish → smHebrew
    42: 7,  // langSerbian → smCyrillic
    43: 7,  // langMacedonian → smCyrillic
    44: 7,  // langBulgarian → smCyrillic
    45: 7,  // langUkrainian → smCyrillic (modified)
    46: 7,  // langByelorussian → smCyrillic
    47: 7,  // langUzbek → smCyrillic
    48: 7,  // langKazakh → smCyrillic
    49: 7,  // langAzerbaijani → smCyrillic
    50: 4,  // langAzerbaijanAr → smArabic
    51: 24,  // langArmenian → smArmenian
    52: 23,  // langGeorgian → smGeorgian
    53: 7,  // langMoldavian → smCyrillic
    54: 7,  // langKirghiz → smCyrillic
    55: 7,  // langTajiki → smCyrillic
    56: 7,  // langTurkmen → smCyrillic
    57: 27,  // langMongolian → smMongolian
    58: 7,  // langMongolianCyr → smCyrillic
    59: 4,  // langPashto → smArabic
    60: 4,  // langKurdish → smArabic
    61: 4,  // langKashmiri → smArabic
    62: 4,  // langSindhi → smArabic
    63: 26,  // langTibetan → smTibetan
    64: 9,  // langNepali → smDevanagari
    65: 9,  // langSanskrit → smDevanagari
    66: 9,  // langMarathi → smDevanagari
    67: 13,  // langBengali → smBengali
    68: 13,  // langAssamese → smBengali
    69: 11,  // langGujarati → smGujarati
    70: 10,  // langPunjabi → smGurmukhi
    71: 12,  // langOriya → smOriya
    72: 17,  // langMalayalam → smMalayalam
    73: 16,  // langKannada → smKannada
    74: 14,  // langTamil → smTamil
    75: 15,  // langTelugu → smTelugu
    76: 18,  // langSinhalese → smSinhalese
    77: 19,  // langBurmese → smBurmese
    78: 20,  // langKhmer → smKhmer
    79: 22,  // langLao → smLao
    80: 30,  // langVietnamese → smVietnamese
    81: 0,  // langIndonesian → smRoman
    82: 0,  // langTagalog → smRoman
    83: 0,  // langMalayRoman → smRoman
    84: 4,  // langMalayArabic → smArabic
    85: 28,  // langAmharic → smEthiopic
    86: 28,  // langTigrinya → smEthiopic
    87: 28,  // langOromo → smEthiopic
    88: 0,  // langSomali → smRoman
    89: 0,  // langSwahili → smRoman
    90: 0,  // langKinyarwanda → smRoman
    91: 0,  // langRundi → smRoman
    92: 0,  // langNyanja → smRoman
    93: 0,  // langMalagasy → smRoman
    94: 0,  // langEsperanto → smRoman
    128: 0,  // langWelsh → smRoman (modified)
    129: 0,  // langBasque → smRoman
    130: 0,  // langCatalan → smRoman
    131: 0,  // langLatin → smRoman
    132: 0,  // langQuechua → smRoman
    133: 0,  // langGuarani → smRoman
    134: 0,  // langAymara → smRoman
    135: 7,  // langTatar → smCyrillic
    136: 4,  // langUighur → smArabic
    137: 26,  // langDzongkha → smTibetan
    138: 0,  // langJavaneseRom → smRoman
    139: 0,  // langSundaneseRom → smRoman
    140: 0,  // langGalician → smRoman
    141: 0,  // langAfrikaans → smRoman
    142: 0,  // langBreton → smRoman (modified)
    143: 28,  // langInuktitut → smEthiopic (modified)
    144: 0,  // langScottishGaelic → smRoman (modified)
    145: 0,  // langManxGaelic → smRoman (modified)
    146: 0,  // langIrishGaelicScript → smRoman (modified)
    147: 0,  // langTongan → smRoman
    148: 6,  // langGreekAncient → smRoman
    149: 0,  // langGreenlandic → smRoman
    150: 0,  // langAzerbaijanRoman → smRoman
    151: 0   // langNynorsk → smRoman
};

// While Microsoft indicates a region/country for all its language
// IDs, we omit the region code if it's equal to the "most likely
// region subtag" according to Unicode CLDR. For scripts, we omit
// the subtag if it is equal to the Suppress-Script entry in the
// IANA language subtag registry for IETF BCP 47.
//
// For example, Microsoft states that its language code 0x041A is
// Croatian in Croatia. We transform this to the BCP 47 language code 'hr'
// and not 'hr-HR' because Croatia is the default country for Croatian,
// according to Unicode CLDR. As another example, Microsoft states
// that 0x101A is Croatian (Latin) in Bosnia-Herzegovina. We transform
// this to 'hr-BA' and not 'hr-Latn-BA' because Latin is the default script
// for the Croatian language, according to IANA.
//
// http://www.unicode.org/cldr/charts/latest/supplemental/likely_subtags.html
// http://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
var windowsLanguages = {
    0x0436: 'af',
    0x041C: 'sq',
    0x0484: 'gsw',
    0x045E: 'am',
    0x1401: 'ar-DZ',
    0x3C01: 'ar-BH',
    0x0C01: 'ar',
    0x0801: 'ar-IQ',
    0x2C01: 'ar-JO',
    0x3401: 'ar-KW',
    0x3001: 'ar-LB',
    0x1001: 'ar-LY',
    0x1801: 'ary',
    0x2001: 'ar-OM',
    0x4001: 'ar-QA',
    0x0401: 'ar-SA',
    0x2801: 'ar-SY',
    0x1C01: 'aeb',
    0x3801: 'ar-AE',
    0x2401: 'ar-YE',
    0x042B: 'hy',
    0x044D: 'as',
    0x082C: 'az-Cyrl',
    0x042C: 'az',
    0x046D: 'ba',
    0x042D: 'eu',
    0x0423: 'be',
    0x0845: 'bn',
    0x0445: 'bn-IN',
    0x201A: 'bs-Cyrl',
    0x141A: 'bs',
    0x047E: 'br',
    0x0402: 'bg',
    0x0403: 'ca',
    0x0C04: 'zh-HK',
    0x1404: 'zh-MO',
    0x0804: 'zh',
    0x1004: 'zh-SG',
    0x0404: 'zh-TW',
    0x0483: 'co',
    0x041A: 'hr',
    0x101A: 'hr-BA',
    0x0405: 'cs',
    0x0406: 'da',
    0x048C: 'prs',
    0x0465: 'dv',
    0x0813: 'nl-BE',
    0x0413: 'nl',
    0x0C09: 'en-AU',
    0x2809: 'en-BZ',
    0x1009: 'en-CA',
    0x2409: 'en-029',
    0x4009: 'en-IN',
    0x1809: 'en-IE',
    0x2009: 'en-JM',
    0x4409: 'en-MY',
    0x1409: 'en-NZ',
    0x3409: 'en-PH',
    0x4809: 'en-SG',
    0x1C09: 'en-ZA',
    0x2C09: 'en-TT',
    0x0809: 'en-GB',
    0x0409: 'en',
    0x3009: 'en-ZW',
    0x0425: 'et',
    0x0438: 'fo',
    0x0464: 'fil',
    0x040B: 'fi',
    0x080C: 'fr-BE',
    0x0C0C: 'fr-CA',
    0x040C: 'fr',
    0x140C: 'fr-LU',
    0x180C: 'fr-MC',
    0x100C: 'fr-CH',
    0x0462: 'fy',
    0x0456: 'gl',
    0x0437: 'ka',
    0x0C07: 'de-AT',
    0x0407: 'de',
    0x1407: 'de-LI',
    0x1007: 'de-LU',
    0x0807: 'de-CH',
    0x0408: 'el',
    0x046F: 'kl',
    0x0447: 'gu',
    0x0468: 'ha',
    0x040D: 'he',
    0x0439: 'hi',
    0x040E: 'hu',
    0x040F: 'is',
    0x0470: 'ig',
    0x0421: 'id',
    0x045D: 'iu',
    0x085D: 'iu-Latn',
    0x083C: 'ga',
    0x0434: 'xh',
    0x0435: 'zu',
    0x0410: 'it',
    0x0810: 'it-CH',
    0x0411: 'ja',
    0x044B: 'kn',
    0x043F: 'kk',
    0x0453: 'km',
    0x0486: 'quc',
    0x0487: 'rw',
    0x0441: 'sw',
    0x0457: 'kok',
    0x0412: 'ko',
    0x0440: 'ky',
    0x0454: 'lo',
    0x0426: 'lv',
    0x0427: 'lt',
    0x082E: 'dsb',
    0x046E: 'lb',
    0x042F: 'mk',
    0x083E: 'ms-BN',
    0x043E: 'ms',
    0x044C: 'ml',
    0x043A: 'mt',
    0x0481: 'mi',
    0x047A: 'arn',
    0x044E: 'mr',
    0x047C: 'moh',
    0x0450: 'mn',
    0x0850: 'mn-CN',
    0x0461: 'ne',
    0x0414: 'nb',
    0x0814: 'nn',
    0x0482: 'oc',
    0x0448: 'or',
    0x0463: 'ps',
    0x0415: 'pl',
    0x0416: 'pt',
    0x0816: 'pt-PT',
    0x0446: 'pa',
    0x046B: 'qu-BO',
    0x086B: 'qu-EC',
    0x0C6B: 'qu',
    0x0418: 'ro',
    0x0417: 'rm',
    0x0419: 'ru',
    0x243B: 'smn',
    0x103B: 'smj-NO',
    0x143B: 'smj',
    0x0C3B: 'se-FI',
    0x043B: 'se',
    0x083B: 'se-SE',
    0x203B: 'sms',
    0x183B: 'sma-NO',
    0x1C3B: 'sms',
    0x044F: 'sa',
    0x1C1A: 'sr-Cyrl-BA',
    0x0C1A: 'sr',
    0x181A: 'sr-Latn-BA',
    0x081A: 'sr-Latn',
    0x046C: 'nso',
    0x0432: 'tn',
    0x045B: 'si',
    0x041B: 'sk',
    0x0424: 'sl',
    0x2C0A: 'es-AR',
    0x400A: 'es-BO',
    0x340A: 'es-CL',
    0x240A: 'es-CO',
    0x140A: 'es-CR',
    0x1C0A: 'es-DO',
    0x300A: 'es-EC',
    0x440A: 'es-SV',
    0x100A: 'es-GT',
    0x480A: 'es-HN',
    0x080A: 'es-MX',
    0x4C0A: 'es-NI',
    0x180A: 'es-PA',
    0x3C0A: 'es-PY',
    0x280A: 'es-PE',
    0x500A: 'es-PR',

    // Microsoft has defined two different language codes for
    // “Spanish with modern sorting” and “Spanish with traditional
    // sorting”. This makes sense for collation APIs, and it would be
    // possible to express this in BCP 47 language tags via Unicode
    // extensions (eg., es-u-co-trad is Spanish with traditional
    // sorting). However, for storing names in fonts, the distinction
    // does not make sense, so we give “es” in both cases.
    0x0C0A: 'es',
    0x040A: 'es',

    0x540A: 'es-US',
    0x380A: 'es-UY',
    0x200A: 'es-VE',
    0x081D: 'sv-FI',
    0x041D: 'sv',
    0x045A: 'syr',
    0x0428: 'tg',
    0x085F: 'tzm',
    0x0449: 'ta',
    0x0444: 'tt',
    0x044A: 'te',
    0x041E: 'th',
    0x0451: 'bo',
    0x041F: 'tr',
    0x0442: 'tk',
    0x0480: 'ug',
    0x0422: 'uk',
    0x042E: 'hsb',
    0x0420: 'ur',
    0x0843: 'uz-Cyrl',
    0x0443: 'uz',
    0x042A: 'vi',
    0x0452: 'cy',
    0x0488: 'wo',
    0x0485: 'sah',
    0x0478: 'ii',
    0x046A: 'yo'
};

// Returns a IETF BCP 47 language code, for example 'zh-Hant'
// for 'Chinese in the traditional script'.
function getLanguageCode(platformID, languageID, ltag) {
    switch (platformID) {
        case 0:  // Unicode
            if (languageID === 0xFFFF) {
                return 'und';
            } else if (ltag) {
                return ltag[languageID];
            }

            break;

        case 1:  // Macintosh
            return macLanguages[languageID];

        case 3:  // Windows
            return windowsLanguages[languageID];
    }

    return undefined;
}

var utf16 = 'utf-16';

// MacOS script ID → encoding. This table stores the default case,
// which can be overridden by macLanguageEncodings.
var macScriptEncodings = {
    0: 'macintosh',           // smRoman
    1: 'x-mac-japanese',      // smJapanese
    2: 'x-mac-chinesetrad',   // smTradChinese
    3: 'x-mac-korean',        // smKorean
    6: 'x-mac-greek',         // smGreek
    7: 'x-mac-cyrillic',      // smCyrillic
    9: 'x-mac-devanagai',     // smDevanagari
    10: 'x-mac-gurmukhi',     // smGurmukhi
    11: 'x-mac-gujarati',     // smGujarati
    12: 'x-mac-oriya',        // smOriya
    13: 'x-mac-bengali',      // smBengali
    14: 'x-mac-tamil',        // smTamil
    15: 'x-mac-telugu',       // smTelugu
    16: 'x-mac-kannada',      // smKannada
    17: 'x-mac-malayalam',    // smMalayalam
    18: 'x-mac-sinhalese',    // smSinhalese
    19: 'x-mac-burmese',      // smBurmese
    20: 'x-mac-khmer',        // smKhmer
    21: 'x-mac-thai',         // smThai
    22: 'x-mac-lao',          // smLao
    23: 'x-mac-georgian',     // smGeorgian
    24: 'x-mac-armenian',     // smArmenian
    25: 'x-mac-chinesesimp',  // smSimpChinese
    26: 'x-mac-tibetan',      // smTibetan
    27: 'x-mac-mongolian',    // smMongolian
    28: 'x-mac-ethiopic',     // smEthiopic
    29: 'x-mac-ce',           // smCentralEuroRoman
    30: 'x-mac-vietnamese',   // smVietnamese
    31: 'x-mac-extarabic'     // smExtArabic
};

// MacOS language ID → encoding. This table stores the exceptional
// cases, which override macScriptEncodings. For writing MacOS naming
// tables, we need to emit a MacOS script ID. Therefore, we cannot
// merge macScriptEncodings into macLanguageEncodings.
//
// http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/Readme.txt
var macLanguageEncodings = {
    15: 'x-mac-icelandic',    // langIcelandic
    17: 'x-mac-turkish',      // langTurkish
    18: 'x-mac-croatian',     // langCroatian
    24: 'x-mac-ce',           // langLithuanian
    25: 'x-mac-ce',           // langPolish
    26: 'x-mac-ce',           // langHungarian
    27: 'x-mac-ce',           // langEstonian
    28: 'x-mac-ce',           // langLatvian
    30: 'x-mac-icelandic',    // langFaroese
    37: 'x-mac-romanian',     // langRomanian
    38: 'x-mac-ce',           // langCzech
    39: 'x-mac-ce',           // langSlovak
    40: 'x-mac-ce',           // langSlovenian
    143: 'x-mac-inuit',       // langInuktitut
    146: 'x-mac-gaelic'       // langIrishGaelicScript
};

function getEncoding(platformID, encodingID, languageID) {
    switch (platformID) {
        case 0:  // Unicode
            return utf16;

        case 1:  // Apple Macintosh
            return macLanguageEncodings[languageID] || macScriptEncodings[encodingID];

        case 3:  // Microsoft Windows
            if (encodingID === 1 || encodingID === 10) {
                return utf16;
            }

            break;
    }

    return undefined;
}

// Parse the naming `name` table.
// FIXME: Format 1 additional fields are not supported yet.
// ltag is the content of the `ltag' table, such as ['en', 'zh-Hans', 'de-CH-1904'].
function parseNameTable(data, start, ltag) {
    var name = {};
    var p = new parse.Parser(data, start);
    var format = p.parseUShort();
    var count = p.parseUShort();
    var stringOffset = p.offset + p.parseUShort();
    for (var i = 0; i < count; i++) {
        var platformID = p.parseUShort();
        var encodingID = p.parseUShort();
        var languageID = p.parseUShort();
        var nameID = p.parseUShort();
        var property = nameTableNames[nameID] || nameID;
        var byteLength = p.parseUShort();
        var offset = p.parseUShort();
        var language = getLanguageCode(platformID, languageID, ltag);
        var encoding = getEncoding(platformID, encodingID, languageID);
        if (encoding !== undefined && language !== undefined) {
            var text = (void 0);
            if (encoding === utf16) {
                text = decode.UTF16(data, stringOffset + offset, byteLength);
            } else {
                text = decode.MACSTRING(data, stringOffset + offset, byteLength, encoding);
            }

            if (text) {
                var translations = name[property];
                if (translations === undefined) {
                    translations = name[property] = {};
                }

                translations[language] = text;
            }
        }
    }

    var langTagCount = 0;
    if (format === 1) {
        // FIXME: Also handle Microsoft's 'name' table 1.
        langTagCount = p.parseUShort();
    }

    return name;
}

// {23: 'foo'} → {'foo': 23}
// ['bar', 'baz'] → {'bar': 0, 'baz': 1}
function reverseDict(dict) {
    var result = {};
    for (var key in dict) {
        result[dict[key]] = parseInt(key);
    }

    return result;
}

function makeNameRecord(platformID, encodingID, languageID, nameID, length, offset) {
    return new table.Record('NameRecord', [
        {name: 'platformID', type: 'USHORT', value: platformID},
        {name: 'encodingID', type: 'USHORT', value: encodingID},
        {name: 'languageID', type: 'USHORT', value: languageID},
        {name: 'nameID', type: 'USHORT', value: nameID},
        {name: 'length', type: 'USHORT', value: length},
        {name: 'offset', type: 'USHORT', value: offset}
    ]);
}

// Finds the position of needle in haystack, or -1 if not there.
// Like String.indexOf(), but for arrays.
function findSubArray(needle, haystack) {
    var needleLength = needle.length;
    var limit = haystack.length - needleLength + 1;

    loop:
    for (var pos = 0; pos < limit; pos++) {
        for (; pos < limit; pos++) {
            for (var k = 0; k < needleLength; k++) {
                if (haystack[pos + k] !== needle[k]) {
                    continue loop;
                }
            }

            return pos;
        }
    }

    return -1;
}

function addStringToPool(s, pool) {
    var offset = findSubArray(s, pool);
    if (offset < 0) {
        offset = pool.length;
        var i = 0;
        var len = s.length;
        for (; i < len; ++i) {
            pool.push(s[i]);
        }

    }

    return offset;
}

function makeNameTable(names, ltag) {
    var nameID;
    var nameIDs = [];

    var namesWithNumericKeys = {};
    var nameTableIds = reverseDict(nameTableNames);
    for (var key in names) {
        var id = nameTableIds[key];
        if (id === undefined) {
            id = key;
        }

        nameID = parseInt(id);

        if (isNaN(nameID)) {
            throw new Error('Name table entry "' + key + '" does not exist, see nameTableNames for complete list.');
        }

        namesWithNumericKeys[nameID] = names[key];
        nameIDs.push(nameID);
    }

    var macLanguageIds = reverseDict(macLanguages);
    var windowsLanguageIds = reverseDict(windowsLanguages);

    var nameRecords = [];
    var stringPool = [];

    for (var i = 0; i < nameIDs.length; i++) {
        nameID = nameIDs[i];
        var translations = namesWithNumericKeys[nameID];
        for (var lang in translations) {
            var text = translations[lang];

            // For MacOS, we try to emit the name in the form that was introduced
            // in the initial version of the TrueType spec (in the late 1980s).
            // However, this can fail for various reasons: the requested BCP 47
            // language code might not have an old-style Mac equivalent;
            // we might not have a codec for the needed character encoding;
            // or the name might contain characters that cannot be expressed
            // in the old-style Macintosh encoding. In case of failure, we emit
            // the name in a more modern fashion (Unicode encoding with BCP 47
            // language tags) that is recognized by MacOS 10.5, released in 2009.
            // If fonts were only read by operating systems, we could simply
            // emit all names in the modern form; this would be much easier.
            // However, there are many applications and libraries that read
            // 'name' tables directly, and these will usually only recognize
            // the ancient form (silently skipping the unrecognized names).
            var macPlatform = 1;  // Macintosh
            var macLanguage = macLanguageIds[lang];
            var macScript = macLanguageToScript[macLanguage];
            var macEncoding = getEncoding(macPlatform, macScript, macLanguage);
            var macName = encode.MACSTRING(text, macEncoding);
            if (macName === undefined) {
                macPlatform = 0;  // Unicode
                macLanguage = ltag.indexOf(lang);
                if (macLanguage < 0) {
                    macLanguage = ltag.length;
                    ltag.push(lang);
                }

                macScript = 4;  // Unicode 2.0 and later
                macName = encode.UTF16(text);
            }

            var macNameOffset = addStringToPool(macName, stringPool);
            nameRecords.push(makeNameRecord(macPlatform, macScript, macLanguage,
                                            nameID, macName.length, macNameOffset));

            var winLanguage = windowsLanguageIds[lang];
            if (winLanguage !== undefined) {
                var winName = encode.UTF16(text);
                var winNameOffset = addStringToPool(winName, stringPool);
                nameRecords.push(makeNameRecord(3, 1, winLanguage,
                                                nameID, winName.length, winNameOffset));
            }
        }
    }

    nameRecords.sort(function(a, b) {
        return ((a.platformID - b.platformID) ||
                (a.encodingID - b.encodingID) ||
                (a.languageID - b.languageID) ||
                (a.nameID - b.nameID));
    });

    var t = new table.Table('name', [
        {name: 'format', type: 'USHORT', value: 0},
        {name: 'count', type: 'USHORT', value: nameRecords.length},
        {name: 'stringOffset', type: 'USHORT', value: 6 + nameRecords.length * 12}
    ]);

    for (var r = 0; r < nameRecords.length; r++) {
        t.fields.push({name: 'record_' + r, type: 'RECORD', value: nameRecords[r]});
    }

    t.fields.push({name: 'strings', type: 'LITERAL', value: stringPool});
    return t;
}

var _name = { parse: parseNameTable, make: makeNameTable };

// The `OS/2` table contains metrics required in OpenType fonts.
// https://www.microsoft.com/typography/OTSPEC/os2.htm

var unicodeRanges = [
    {begin: 0x0000, end: 0x007F}, // Basic Latin
    {begin: 0x0080, end: 0x00FF}, // Latin-1 Supplement
    {begin: 0x0100, end: 0x017F}, // Latin Extended-A
    {begin: 0x0180, end: 0x024F}, // Latin Extended-B
    {begin: 0x0250, end: 0x02AF}, // IPA Extensions
    {begin: 0x02B0, end: 0x02FF}, // Spacing Modifier Letters
    {begin: 0x0300, end: 0x036F}, // Combining Diacritical Marks
    {begin: 0x0370, end: 0x03FF}, // Greek and Coptic
    {begin: 0x2C80, end: 0x2CFF}, // Coptic
    {begin: 0x0400, end: 0x04FF}, // Cyrillic
    {begin: 0x0530, end: 0x058F}, // Armenian
    {begin: 0x0590, end: 0x05FF}, // Hebrew
    {begin: 0xA500, end: 0xA63F}, // Vai
    {begin: 0x0600, end: 0x06FF}, // Arabic
    {begin: 0x07C0, end: 0x07FF}, // NKo
    {begin: 0x0900, end: 0x097F}, // Devanagari
    {begin: 0x0980, end: 0x09FF}, // Bengali
    {begin: 0x0A00, end: 0x0A7F}, // Gurmukhi
    {begin: 0x0A80, end: 0x0AFF}, // Gujarati
    {begin: 0x0B00, end: 0x0B7F}, // Oriya
    {begin: 0x0B80, end: 0x0BFF}, // Tamil
    {begin: 0x0C00, end: 0x0C7F}, // Telugu
    {begin: 0x0C80, end: 0x0CFF}, // Kannada
    {begin: 0x0D00, end: 0x0D7F}, // Malayalam
    {begin: 0x0E00, end: 0x0E7F}, // Thai
    {begin: 0x0E80, end: 0x0EFF}, // Lao
    {begin: 0x10A0, end: 0x10FF}, // Georgian
    {begin: 0x1B00, end: 0x1B7F}, // Balinese
    {begin: 0x1100, end: 0x11FF}, // Hangul Jamo
    {begin: 0x1E00, end: 0x1EFF}, // Latin Extended Additional
    {begin: 0x1F00, end: 0x1FFF}, // Greek Extended
    {begin: 0x2000, end: 0x206F}, // General Punctuation
    {begin: 0x2070, end: 0x209F}, // Superscripts And Subscripts
    {begin: 0x20A0, end: 0x20CF}, // Currency Symbol
    {begin: 0x20D0, end: 0x20FF}, // Combining Diacritical Marks For Symbols
    {begin: 0x2100, end: 0x214F}, // Letterlike Symbols
    {begin: 0x2150, end: 0x218F}, // Number Forms
    {begin: 0x2190, end: 0x21FF}, // Arrows
    {begin: 0x2200, end: 0x22FF}, // Mathematical Operators
    {begin: 0x2300, end: 0x23FF}, // Miscellaneous Technical
    {begin: 0x2400, end: 0x243F}, // Control Pictures
    {begin: 0x2440, end: 0x245F}, // Optical Character Recognition
    {begin: 0x2460, end: 0x24FF}, // Enclosed Alphanumerics
    {begin: 0x2500, end: 0x257F}, // Box Drawing
    {begin: 0x2580, end: 0x259F}, // Block Elements
    {begin: 0x25A0, end: 0x25FF}, // Geometric Shapes
    {begin: 0x2600, end: 0x26FF}, // Miscellaneous Symbols
    {begin: 0x2700, end: 0x27BF}, // Dingbats
    {begin: 0x3000, end: 0x303F}, // CJK Symbols And Punctuation
    {begin: 0x3040, end: 0x309F}, // Hiragana
    {begin: 0x30A0, end: 0x30FF}, // Katakana
    {begin: 0x3100, end: 0x312F}, // Bopomofo
    {begin: 0x3130, end: 0x318F}, // Hangul Compatibility Jamo
    {begin: 0xA840, end: 0xA87F}, // Phags-pa
    {begin: 0x3200, end: 0x32FF}, // Enclosed CJK Letters And Months
    {begin: 0x3300, end: 0x33FF}, // CJK Compatibility
    {begin: 0xAC00, end: 0xD7AF}, // Hangul Syllables
    {begin: 0xD800, end: 0xDFFF}, // Non-Plane 0 *
    {begin: 0x10900, end: 0x1091F}, // Phoenicia
    {begin: 0x4E00, end: 0x9FFF}, // CJK Unified Ideographs
    {begin: 0xE000, end: 0xF8FF}, // Private Use Area (plane 0)
    {begin: 0x31C0, end: 0x31EF}, // CJK Strokes
    {begin: 0xFB00, end: 0xFB4F}, // Alphabetic Presentation Forms
    {begin: 0xFB50, end: 0xFDFF}, // Arabic Presentation Forms-A
    {begin: 0xFE20, end: 0xFE2F}, // Combining Half Marks
    {begin: 0xFE10, end: 0xFE1F}, // Vertical Forms
    {begin: 0xFE50, end: 0xFE6F}, // Small Form Variants
    {begin: 0xFE70, end: 0xFEFF}, // Arabic Presentation Forms-B
    {begin: 0xFF00, end: 0xFFEF}, // Halfwidth And Fullwidth Forms
    {begin: 0xFFF0, end: 0xFFFF}, // Specials
    {begin: 0x0F00, end: 0x0FFF}, // Tibetan
    {begin: 0x0700, end: 0x074F}, // Syriac
    {begin: 0x0780, end: 0x07BF}, // Thaana
    {begin: 0x0D80, end: 0x0DFF}, // Sinhala
    {begin: 0x1000, end: 0x109F}, // Myanmar
    {begin: 0x1200, end: 0x137F}, // Ethiopic
    {begin: 0x13A0, end: 0x13FF}, // Cherokee
    {begin: 0x1400, end: 0x167F}, // Unified Canadian Aboriginal Syllabics
    {begin: 0x1680, end: 0x169F}, // Ogham
    {begin: 0x16A0, end: 0x16FF}, // Runic
    {begin: 0x1780, end: 0x17FF}, // Khmer
    {begin: 0x1800, end: 0x18AF}, // Mongolian
    {begin: 0x2800, end: 0x28FF}, // Braille Patterns
    {begin: 0xA000, end: 0xA48F}, // Yi Syllables
    {begin: 0x1700, end: 0x171F}, // Tagalog
    {begin: 0x10300, end: 0x1032F}, // Old Italic
    {begin: 0x10330, end: 0x1034F}, // Gothic
    {begin: 0x10400, end: 0x1044F}, // Deseret
    {begin: 0x1D000, end: 0x1D0FF}, // Byzantine Musical Symbols
    {begin: 0x1D400, end: 0x1D7FF}, // Mathematical Alphanumeric Symbols
    {begin: 0xFF000, end: 0xFFFFD}, // Private Use (plane 15)
    {begin: 0xFE00, end: 0xFE0F}, // Variation Selectors
    {begin: 0xE0000, end: 0xE007F}, // Tags
    {begin: 0x1900, end: 0x194F}, // Limbu
    {begin: 0x1950, end: 0x197F}, // Tai Le
    {begin: 0x1980, end: 0x19DF}, // New Tai Lue
    {begin: 0x1A00, end: 0x1A1F}, // Buginese
    {begin: 0x2C00, end: 0x2C5F}, // Glagolitic
    {begin: 0x2D30, end: 0x2D7F}, // Tifinagh
    {begin: 0x4DC0, end: 0x4DFF}, // Yijing Hexagram Symbols
    {begin: 0xA800, end: 0xA82F}, // Syloti Nagri
    {begin: 0x10000, end: 0x1007F}, // Linear B Syllabary
    {begin: 0x10140, end: 0x1018F}, // Ancient Greek Numbers
    {begin: 0x10380, end: 0x1039F}, // Ugaritic
    {begin: 0x103A0, end: 0x103DF}, // Old Persian
    {begin: 0x10450, end: 0x1047F}, // Shavian
    {begin: 0x10480, end: 0x104AF}, // Osmanya
    {begin: 0x10800, end: 0x1083F}, // Cypriot Syllabary
    {begin: 0x10A00, end: 0x10A5F}, // Kharoshthi
    {begin: 0x1D300, end: 0x1D35F}, // Tai Xuan Jing Symbols
    {begin: 0x12000, end: 0x123FF}, // Cuneiform
    {begin: 0x1D360, end: 0x1D37F}, // Counting Rod Numerals
    {begin: 0x1B80, end: 0x1BBF}, // Sundanese
    {begin: 0x1C00, end: 0x1C4F}, // Lepcha
    {begin: 0x1C50, end: 0x1C7F}, // Ol Chiki
    {begin: 0xA880, end: 0xA8DF}, // Saurashtra
    {begin: 0xA900, end: 0xA92F}, // Kayah Li
    {begin: 0xA930, end: 0xA95F}, // Rejang
    {begin: 0xAA00, end: 0xAA5F}, // Cham
    {begin: 0x10190, end: 0x101CF}, // Ancient Symbols
    {begin: 0x101D0, end: 0x101FF}, // Phaistos Disc
    {begin: 0x102A0, end: 0x102DF}, // Carian
    {begin: 0x1F030, end: 0x1F09F}  // Domino Tiles
];

function getUnicodeRange(unicode) {
    for (var i = 0; i < unicodeRanges.length; i += 1) {
        var range = unicodeRanges[i];
        if (unicode >= range.begin && unicode < range.end) {
            return i;
        }
    }

    return -1;
}

// Parse the OS/2 and Windows metrics `OS/2` table
function parseOS2Table(data, start) {
    var os2 = {};
    var p = new parse.Parser(data, start);
    os2.version = p.parseUShort();
    os2.xAvgCharWidth = p.parseShort();
    os2.usWeightClass = p.parseUShort();
    os2.usWidthClass = p.parseUShort();
    os2.fsType = p.parseUShort();
    os2.ySubscriptXSize = p.parseShort();
    os2.ySubscriptYSize = p.parseShort();
    os2.ySubscriptXOffset = p.parseShort();
    os2.ySubscriptYOffset = p.parseShort();
    os2.ySuperscriptXSize = p.parseShort();
    os2.ySuperscriptYSize = p.parseShort();
    os2.ySuperscriptXOffset = p.parseShort();
    os2.ySuperscriptYOffset = p.parseShort();
    os2.yStrikeoutSize = p.parseShort();
    os2.yStrikeoutPosition = p.parseShort();
    os2.sFamilyClass = p.parseShort();
    os2.panose = [];
    for (var i = 0; i < 10; i++) {
        os2.panose[i] = p.parseByte();
    }

    os2.ulUnicodeRange1 = p.parseULong();
    os2.ulUnicodeRange2 = p.parseULong();
    os2.ulUnicodeRange3 = p.parseULong();
    os2.ulUnicodeRange4 = p.parseULong();
    os2.achVendID = String.fromCharCode(p.parseByte(), p.parseByte(), p.parseByte(), p.parseByte());
    os2.fsSelection = p.parseUShort();
    os2.usFirstCharIndex = p.parseUShort();
    os2.usLastCharIndex = p.parseUShort();
    os2.sTypoAscender = p.parseShort();
    os2.sTypoDescender = p.parseShort();
    os2.sTypoLineGap = p.parseShort();
    os2.usWinAscent = p.parseUShort();
    os2.usWinDescent = p.parseUShort();
    if (os2.version >= 1) {
        os2.ulCodePageRange1 = p.parseULong();
        os2.ulCodePageRange2 = p.parseULong();
    }

    if (os2.version >= 2) {
        os2.sxHeight = p.parseShort();
        os2.sCapHeight = p.parseShort();
        os2.usDefaultChar = p.parseUShort();
        os2.usBreakChar = p.parseUShort();
        os2.usMaxContent = p.parseUShort();
    }

    return os2;
}

function makeOS2Table(options) {
    return new table.Table('OS/2', [
        {name: 'version', type: 'USHORT', value: 0x0003},
        {name: 'xAvgCharWidth', type: 'SHORT', value: 0},
        {name: 'usWeightClass', type: 'USHORT', value: 0},
        {name: 'usWidthClass', type: 'USHORT', value: 0},
        {name: 'fsType', type: 'USHORT', value: 0},
        {name: 'ySubscriptXSize', type: 'SHORT', value: 650},
        {name: 'ySubscriptYSize', type: 'SHORT', value: 699},
        {name: 'ySubscriptXOffset', type: 'SHORT', value: 0},
        {name: 'ySubscriptYOffset', type: 'SHORT', value: 140},
        {name: 'ySuperscriptXSize', type: 'SHORT', value: 650},
        {name: 'ySuperscriptYSize', type: 'SHORT', value: 699},
        {name: 'ySuperscriptXOffset', type: 'SHORT', value: 0},
        {name: 'ySuperscriptYOffset', type: 'SHORT', value: 479},
        {name: 'yStrikeoutSize', type: 'SHORT', value: 49},
        {name: 'yStrikeoutPosition', type: 'SHORT', value: 258},
        {name: 'sFamilyClass', type: 'SHORT', value: 0},
        {name: 'bFamilyType', type: 'BYTE', value: 0},
        {name: 'bSerifStyle', type: 'BYTE', value: 0},
        {name: 'bWeight', type: 'BYTE', value: 0},
        {name: 'bProportion', type: 'BYTE', value: 0},
        {name: 'bContrast', type: 'BYTE', value: 0},
        {name: 'bStrokeVariation', type: 'BYTE', value: 0},
        {name: 'bArmStyle', type: 'BYTE', value: 0},
        {name: 'bLetterform', type: 'BYTE', value: 0},
        {name: 'bMidline', type: 'BYTE', value: 0},
        {name: 'bXHeight', type: 'BYTE', value: 0},
        {name: 'ulUnicodeRange1', type: 'ULONG', value: 0},
        {name: 'ulUnicodeRange2', type: 'ULONG', value: 0},
        {name: 'ulUnicodeRange3', type: 'ULONG', value: 0},
        {name: 'ulUnicodeRange4', type: 'ULONG', value: 0},
        {name: 'achVendID', type: 'CHARARRAY', value: 'XXXX'},
        {name: 'fsSelection', type: 'USHORT', value: 0},
        {name: 'usFirstCharIndex', type: 'USHORT', value: 0},
        {name: 'usLastCharIndex', type: 'USHORT', value: 0},
        {name: 'sTypoAscender', type: 'SHORT', value: 0},
        {name: 'sTypoDescender', type: 'SHORT', value: 0},
        {name: 'sTypoLineGap', type: 'SHORT', value: 0},
        {name: 'usWinAscent', type: 'USHORT', value: 0},
        {name: 'usWinDescent', type: 'USHORT', value: 0},
        {name: 'ulCodePageRange1', type: 'ULONG', value: 0},
        {name: 'ulCodePageRange2', type: 'ULONG', value: 0},
        {name: 'sxHeight', type: 'SHORT', value: 0},
        {name: 'sCapHeight', type: 'SHORT', value: 0},
        {name: 'usDefaultChar', type: 'USHORT', value: 0},
        {name: 'usBreakChar', type: 'USHORT', value: 0},
        {name: 'usMaxContext', type: 'USHORT', value: 0}
    ], options);
}

var os2 = { parse: parseOS2Table, make: makeOS2Table, unicodeRanges: unicodeRanges, getUnicodeRange: getUnicodeRange };

// The `post` table stores additional PostScript information, such as glyph names.
// https://www.microsoft.com/typography/OTSPEC/post.htm

// Parse the PostScript `post` table
function parsePostTable(data, start) {
    var post = {};
    var p = new parse.Parser(data, start);
    post.version = p.parseVersion();
    post.italicAngle = p.parseFixed();
    post.underlinePosition = p.parseShort();
    post.underlineThickness = p.parseShort();
    post.isFixedPitch = p.parseULong();
    post.minMemType42 = p.parseULong();
    post.maxMemType42 = p.parseULong();
    post.minMemType1 = p.parseULong();
    post.maxMemType1 = p.parseULong();
    switch (post.version) {
        case 1:
            post.names = standardNames.slice();
            break;
        case 2:
            post.numberOfGlyphs = p.parseUShort();
            post.glyphNameIndex = new Array(post.numberOfGlyphs);
            for (var i = 0; i < post.numberOfGlyphs; i++) {
                post.glyphNameIndex[i] = p.parseUShort();
            }

            post.names = [];
            for (var i$1 = 0; i$1 < post.numberOfGlyphs; i$1++) {
                if (post.glyphNameIndex[i$1] >= standardNames.length) {
                    var nameLength = p.parseChar();
                    post.names.push(p.parseString(nameLength));
                }
            }

            break;
        case 2.5:
            post.numberOfGlyphs = p.parseUShort();
            post.offset = new Array(post.numberOfGlyphs);
            for (var i$2 = 0; i$2 < post.numberOfGlyphs; i$2++) {
                post.offset[i$2] = p.parseChar();
            }

            break;
    }
    return post;
}

function makePostTable() {
    return new table.Table('post', [
        {name: 'version', type: 'FIXED', value: 0x00030000},
        {name: 'italicAngle', type: 'FIXED', value: 0},
        {name: 'underlinePosition', type: 'FWORD', value: 0},
        {name: 'underlineThickness', type: 'FWORD', value: 0},
        {name: 'isFixedPitch', type: 'ULONG', value: 0},
        {name: 'minMemType42', type: 'ULONG', value: 0},
        {name: 'maxMemType42', type: 'ULONG', value: 0},
        {name: 'minMemType1', type: 'ULONG', value: 0},
        {name: 'maxMemType1', type: 'ULONG', value: 0}
    ]);
}

var post = { parse: parsePostTable, make: makePostTable };

// The `GSUB` table contains ligatures, among other things.
// https://www.microsoft.com/typography/OTSPEC/gsub.htm

var subtableParsers = new Array(9);         // subtableParsers[0] is unused

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#SS
subtableParsers[1] = function parseLookup1() {
    var start = this.offset + this.relativeOffset;
    var substFormat = this.parseUShort();
    if (substFormat === 1) {
        return {
            substFormat: 1,
            coverage: this.parsePointer(Parser.coverage),
            deltaGlyphId: this.parseUShort()
        };
    } else if (substFormat === 2) {
        return {
            substFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            substitute: this.parseOffset16List()
        };
    }
    check.assert(false, '0x' + start.toString(16) + ': lookup type 1 format must be 1 or 2.');
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#MS
subtableParsers[2] = function parseLookup2() {
    var substFormat = this.parseUShort();
    check.argument(substFormat === 1, 'GSUB Multiple Substitution Subtable identifier-format must be 1');
    return {
        substFormat: substFormat,
        coverage: this.parsePointer(Parser.coverage),
        sequences: this.parseListOfLists()
    };
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#AS
subtableParsers[3] = function parseLookup3() {
    var substFormat = this.parseUShort();
    check.argument(substFormat === 1, 'GSUB Alternate Substitution Subtable identifier-format must be 1');
    return {
        substFormat: substFormat,
        coverage: this.parsePointer(Parser.coverage),
        alternateSets: this.parseListOfLists()
    };
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#LS
subtableParsers[4] = function parseLookup4() {
    var substFormat = this.parseUShort();
    check.argument(substFormat === 1, 'GSUB ligature table identifier-format must be 1');
    return {
        substFormat: substFormat,
        coverage: this.parsePointer(Parser.coverage),
        ligatureSets: this.parseListOfLists(function() {
            return {
                ligGlyph: this.parseUShort(),
                components: this.parseUShortList(this.parseUShort() - 1)
            };
        })
    };
};

var lookupRecordDesc = {
    sequenceIndex: Parser.uShort,
    lookupListIndex: Parser.uShort
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#CSF
subtableParsers[5] = function parseLookup5() {
    var start = this.offset + this.relativeOffset;
    var substFormat = this.parseUShort();

    if (substFormat === 1) {
        return {
            substFormat: substFormat,
            coverage: this.parsePointer(Parser.coverage),
            ruleSets: this.parseListOfLists(function() {
                var glyphCount = this.parseUShort();
                var substCount = this.parseUShort();
                return {
                    input: this.parseUShortList(glyphCount - 1),
                    lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 2) {
        return {
            substFormat: substFormat,
            coverage: this.parsePointer(Parser.coverage),
            classDef: this.parsePointer(Parser.classDef),
            classSets: this.parseListOfLists(function() {
                var glyphCount = this.parseUShort();
                var substCount = this.parseUShort();
                return {
                    classes: this.parseUShortList(glyphCount - 1),
                    lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 3) {
        var glyphCount = this.parseUShort();
        var substCount = this.parseUShort();
        return {
            substFormat: substFormat,
            coverages: this.parseList(glyphCount, Parser.pointer(Parser.coverage)),
            lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
        };
    }
    check.assert(false, '0x' + start.toString(16) + ': lookup type 5 format must be 1, 2 or 3.');
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#CC
subtableParsers[6] = function parseLookup6() {
    var start = this.offset + this.relativeOffset;
    var substFormat = this.parseUShort();
    if (substFormat === 1) {
        return {
            substFormat: 1,
            coverage: this.parsePointer(Parser.coverage),
            chainRuleSets: this.parseListOfLists(function() {
                return {
                    backtrack: this.parseUShortList(),
                    input: this.parseUShortList(this.parseShort() - 1),
                    lookahead: this.parseUShortList(),
                    lookupRecords: this.parseRecordList(lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 2) {
        return {
            substFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            backtrackClassDef: this.parsePointer(Parser.classDef),
            inputClassDef: this.parsePointer(Parser.classDef),
            lookaheadClassDef: this.parsePointer(Parser.classDef),
            chainClassSet: this.parseListOfLists(function() {
                return {
                    backtrack: this.parseUShortList(),
                    input: this.parseUShortList(this.parseShort() - 1),
                    lookahead: this.parseUShortList(),
                    lookupRecords: this.parseRecordList(lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 3) {
        return {
            substFormat: 3,
            backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            inputCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            lookupRecords: this.parseRecordList(lookupRecordDesc)
        };
    }
    check.assert(false, '0x' + start.toString(16) + ': lookup type 6 format must be 1, 2 or 3.');
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#ES
subtableParsers[7] = function parseLookup7() {
    // Extension Substitution subtable
    var substFormat = this.parseUShort();
    check.argument(substFormat === 1, 'GSUB Extension Substitution subtable identifier-format must be 1');
    var extensionLookupType = this.parseUShort();
    var extensionParser = new Parser(this.data, this.offset + this.parseULong());
    return {
        substFormat: 1,
        lookupType: extensionLookupType,
        extension: subtableParsers[extensionLookupType].call(extensionParser)
    };
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#RCCS
subtableParsers[8] = function parseLookup8() {
    var substFormat = this.parseUShort();
    check.argument(substFormat === 1, 'GSUB Reverse Chaining Contextual Single Substitution Subtable identifier-format must be 1');
    return {
        substFormat: substFormat,
        coverage: this.parsePointer(Parser.coverage),
        backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
        lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
        substitutes: this.parseUShortList()
    };
};

// https://www.microsoft.com/typography/OTSPEC/gsub.htm
function parseGsubTable(data, start) {
    start = start || 0;
    var p = new Parser(data, start);
    var tableVersion = p.parseVersion();
    check.argument(tableVersion === 1, 'Unsupported GSUB table version.');
    return {
        version: tableVersion,
        scripts: p.parseScriptList(),
        features: p.parseFeatureList(),
        lookups: p.parseLookupList(subtableParsers)
    };
}

// GSUB Writing //////////////////////////////////////////////
var subtableMakers = new Array(9);

subtableMakers[1] = function makeLookup1(subtable) {
    if (subtable.substFormat === 1) {
        return new table.Table('substitutionTable', [
            {name: 'substFormat', type: 'USHORT', value: 1},
            {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)},
            {name: 'deltaGlyphID', type: 'USHORT', value: subtable.deltaGlyphId}
        ]);
    } else {
        return new table.Table('substitutionTable', [
            {name: 'substFormat', type: 'USHORT', value: 2},
            {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)}
        ].concat(table.ushortList('substitute', subtable.substitute)));
    }
    check.fail('Lookup type 1 substFormat must be 1 or 2.');
};

subtableMakers[3] = function makeLookup3(subtable) {
    check.assert(subtable.substFormat === 1, 'Lookup type 3 substFormat must be 1.');
    return new table.Table('substitutionTable', [
        {name: 'substFormat', type: 'USHORT', value: 1},
        {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)}
    ].concat(table.tableList('altSet', subtable.alternateSets, function(alternateSet) {
        return new table.Table('alternateSetTable', table.ushortList('alternate', alternateSet));
    })));
};

subtableMakers[4] = function makeLookup4(subtable) {
    check.assert(subtable.substFormat === 1, 'Lookup type 4 substFormat must be 1.');
    return new table.Table('substitutionTable', [
        {name: 'substFormat', type: 'USHORT', value: 1},
        {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)}
    ].concat(table.tableList('ligSet', subtable.ligatureSets, function(ligatureSet) {
        return new table.Table('ligatureSetTable', table.tableList('ligature', ligatureSet, function(ligature) {
            return new table.Table('ligatureTable',
                [{name: 'ligGlyph', type: 'USHORT', value: ligature.ligGlyph}]
                .concat(table.ushortList('component', ligature.components, ligature.components.length + 1))
            );
        }));
    })));
};

function makeGsubTable(gsub) {
    return new table.Table('GSUB', [
        {name: 'version', type: 'ULONG', value: 0x10000},
        {name: 'scripts', type: 'TABLE', value: new table.ScriptList(gsub.scripts)},
        {name: 'features', type: 'TABLE', value: new table.FeatureList(gsub.features)},
        {name: 'lookups', type: 'TABLE', value: new table.LookupList(gsub.lookups, subtableMakers)}
    ]);
}

var gsub = { parse: parseGsubTable, make: makeGsubTable };

// The `GPOS` table contains kerning pairs, among other things.
// https://www.microsoft.com/typography/OTSPEC/gpos.htm

// Parse the metadata `meta` table.
// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6meta.html
function parseMetaTable(data, start) {
    var p = new parse.Parser(data, start);
    var tableVersion = p.parseULong();
    check.argument(tableVersion === 1, 'Unsupported META table version.');
    p.parseULong(); // flags - currently unused and set to 0
    p.parseULong(); // tableOffset
    var numDataMaps = p.parseULong();

    var tags = {};
    for (var i = 0; i < numDataMaps; i++) {
        var tag = p.parseTag();
        var dataOffset = p.parseULong();
        var dataLength = p.parseULong();
        var text = decode.UTF8(data, start + dataOffset, dataLength);

        tags[tag] = text;
    }
    return tags;
}

function makeMetaTable(tags) {
    var numTags = Object.keys(tags).length;
    var stringPool = '';
    var stringPoolOffset = 16 + numTags * 12;

    var result = new table.Table('meta', [
        {name: 'version', type: 'ULONG', value: 1},
        {name: 'flags', type: 'ULONG', value: 0},
        {name: 'offset', type: 'ULONG', value: stringPoolOffset},
        {name: 'numTags', type: 'ULONG', value: numTags}
    ]);

    for (var tag in tags) {
        var pos = stringPool.length;
        stringPool += tags[tag];

        result.fields.push({name: 'tag ' + tag, type: 'TAG', value: tag});
        result.fields.push({name: 'offset ' + tag, type: 'ULONG', value: stringPoolOffset + pos});
        result.fields.push({name: 'length ' + tag, type: 'ULONG', value: tags[tag].length});
    }

    result.fields.push({name: 'stringPool', type: 'CHARARRAY', value: stringPool});

    return result;
}

var meta = { parse: parseMetaTable, make: makeMetaTable };

// The `sfnt` wrapper provides organization for the tables in the font.
// It is the top-level data structure in a font.
// https://www.microsoft.com/typography/OTSPEC/otff.htm
// Recommendations for creating OpenType Fonts:
// http://www.microsoft.com/typography/otspec140/recom.htm

function log2(v) {
    return Math.log(v) / Math.log(2) | 0;
}

function computeCheckSum(bytes) {
    while (bytes.length % 4 !== 0) {
        bytes.push(0);
    }

    var sum = 0;
    for (var i = 0; i < bytes.length; i += 4) {
        sum += (bytes[i] << 24) +
            (bytes[i + 1] << 16) +
            (bytes[i + 2] << 8) +
            (bytes[i + 3]);
    }

    sum %= Math.pow(2, 32);
    return sum;
}

function makeTableRecord(tag, checkSum, offset, length) {
    return new table.Record('Table Record', [
        {name: 'tag', type: 'TAG', value: tag !== undefined ? tag : ''},
        {name: 'checkSum', type: 'ULONG', value: checkSum !== undefined ? checkSum : 0},
        {name: 'offset', type: 'ULONG', value: offset !== undefined ? offset : 0},
        {name: 'length', type: 'ULONG', value: length !== undefined ? length : 0}
    ]);
}

function makeSfntTable(tables) {
    var sfnt = new table.Table('sfnt', [
        {name: 'version', type: 'TAG', value: 'OTTO'},
        {name: 'numTables', type: 'USHORT', value: 0},
        {name: 'searchRange', type: 'USHORT', value: 0},
        {name: 'entrySelector', type: 'USHORT', value: 0},
        {name: 'rangeShift', type: 'USHORT', value: 0}
    ]);
    sfnt.tables = tables;
    sfnt.numTables = tables.length;
    var highestPowerOf2 = Math.pow(2, log2(sfnt.numTables));
    sfnt.searchRange = 16 * highestPowerOf2;
    sfnt.entrySelector = log2(highestPowerOf2);
    sfnt.rangeShift = sfnt.numTables * 16 - sfnt.searchRange;

    var recordFields = [];
    var tableFields = [];

    var offset = sfnt.sizeOf() + (makeTableRecord().sizeOf() * sfnt.numTables);
    while (offset % 4 !== 0) {
        offset += 1;
        tableFields.push({name: 'padding', type: 'BYTE', value: 0});
    }

    for (var i = 0; i < tables.length; i += 1) {
        var t = tables[i];
        check.argument(t.tableName.length === 4, 'Table name' + t.tableName + ' is invalid.');
        var tableLength = t.sizeOf();
        var tableRecord = makeTableRecord(t.tableName, computeCheckSum(t.encode()), offset, tableLength);
        recordFields.push({name: tableRecord.tag + ' Table Record', type: 'RECORD', value: tableRecord});
        tableFields.push({name: t.tableName + ' table', type: 'RECORD', value: t});
        offset += tableLength;
        check.argument(!isNaN(offset), 'Something went wrong calculating the offset.');
        while (offset % 4 !== 0) {
            offset += 1;
            tableFields.push({name: 'padding', type: 'BYTE', value: 0});
        }
    }

    // Table records need to be sorted alphabetically.
    recordFields.sort(function(r1, r2) {
        if (r1.value.tag > r2.value.tag) {
            return 1;
        } else {
            return -1;
        }
    });

    sfnt.fields = sfnt.fields.concat(recordFields);
    sfnt.fields = sfnt.fields.concat(tableFields);
    return sfnt;
}

// Get the metrics for a character. If the string has more than one character
// this function returns metrics for the first available character.
// You can provide optional fallback metrics if no characters are available.
function metricsForChar(font, chars, notFoundMetrics) {
    for (var i = 0; i < chars.length; i += 1) {
        var glyphIndex = font.charToGlyphIndex(chars[i]);
        if (glyphIndex > 0) {
            var glyph = font.glyphs.get(glyphIndex);
            return glyph.getMetrics();
        }
    }

    return notFoundMetrics;
}

function average(vs) {
    var sum = 0;
    for (var i = 0; i < vs.length; i += 1) {
        sum += vs[i];
    }

    return sum / vs.length;
}

// Convert the font object to a SFNT data structure.
// This structure contains all the necessary tables and metadata to create a binary OTF file.
function fontToSfntTable(font) {
    var xMins = [];
    var yMins = [];
    var xMaxs = [];
    var yMaxs = [];
    var advanceWidths = [];
    var leftSideBearings = [];
    var rightSideBearings = [];
    var firstCharIndex;
    var lastCharIndex = 0;
    var ulUnicodeRange1 = 0;
    var ulUnicodeRange2 = 0;
    var ulUnicodeRange3 = 0;
    var ulUnicodeRange4 = 0;

    for (var i = 0; i < font.glyphs.length; i += 1) {
        var glyph = font.glyphs.get(i);
        var unicode = glyph.unicode | 0;

        if (isNaN(glyph.advanceWidth)) {
            throw new Error('Glyph ' + glyph.name + ' (' + i + '): advanceWidth is not a number.');
        }

        if (firstCharIndex > unicode || firstCharIndex === undefined) {
            // ignore .notdef char
            if (unicode > 0) {
                firstCharIndex = unicode;
            }
        }

        if (lastCharIndex < unicode) {
            lastCharIndex = unicode;
        }

        var position = os2.getUnicodeRange(unicode);
        if (position < 32) {
            ulUnicodeRange1 |= 1 << position;
        } else if (position < 64) {
            ulUnicodeRange2 |= 1 << position - 32;
        } else if (position < 96) {
            ulUnicodeRange3 |= 1 << position - 64;
        } else if (position < 123) {
            ulUnicodeRange4 |= 1 << position - 96;
        } else {
            throw new Error('Unicode ranges bits > 123 are reserved for internal usage');
        }
        // Skip non-important characters.
        if (glyph.name === '.notdef') { continue; }
        var metrics = glyph.getMetrics();
        xMins.push(metrics.xMin);
        yMins.push(metrics.yMin);
        xMaxs.push(metrics.xMax);
        yMaxs.push(metrics.yMax);
        leftSideBearings.push(metrics.leftSideBearing);
        rightSideBearings.push(metrics.rightSideBearing);
        advanceWidths.push(glyph.advanceWidth);
    }

    var globals = {
        xMin: Math.min.apply(null, xMins),
        yMin: Math.min.apply(null, yMins),
        xMax: Math.max.apply(null, xMaxs),
        yMax: Math.max.apply(null, yMaxs),
        advanceWidthMax: Math.max.apply(null, advanceWidths),
        advanceWidthAvg: average(advanceWidths),
        minLeftSideBearing: Math.min.apply(null, leftSideBearings),
        maxLeftSideBearing: Math.max.apply(null, leftSideBearings),
        minRightSideBearing: Math.min.apply(null, rightSideBearings)
    };
    globals.ascender = font.ascender;
    globals.descender = font.descender;

    var headTable = head.make({
        flags: 3, // 00000011 (baseline for font at y=0; left sidebearing point at x=0)
        unitsPerEm: font.unitsPerEm,
        xMin: globals.xMin,
        yMin: globals.yMin,
        xMax: globals.xMax,
        yMax: globals.yMax,
        lowestRecPPEM: 3,
        createdTimestamp: font.createdTimestamp
    });

    var hheaTable = hhea.make({
        ascender: globals.ascender,
        descender: globals.descender,
        advanceWidthMax: globals.advanceWidthMax,
        minLeftSideBearing: globals.minLeftSideBearing,
        minRightSideBearing: globals.minRightSideBearing,
        xMaxExtent: globals.maxLeftSideBearing + (globals.xMax - globals.xMin),
        numberOfHMetrics: font.glyphs.length
    });

    var maxpTable = maxp.make(font.glyphs.length);

    var os2Table = os2.make({
        xAvgCharWidth: Math.round(globals.advanceWidthAvg),
        usWeightClass: font.tables.os2.usWeightClass,
        usWidthClass: font.tables.os2.usWidthClass,
        usFirstCharIndex: firstCharIndex,
        usLastCharIndex: lastCharIndex,
        ulUnicodeRange1: ulUnicodeRange1,
        ulUnicodeRange2: ulUnicodeRange2,
        ulUnicodeRange3: ulUnicodeRange3,
        ulUnicodeRange4: ulUnicodeRange4,
        fsSelection: font.tables.os2.fsSelection, // REGULAR
        // See http://typophile.com/node/13081 for more info on vertical metrics.
        // We get metrics for typical characters (such as "x" for xHeight).
        // We provide some fallback characters if characters are unavailable: their
        // ordering was chosen experimentally.
        sTypoAscender: globals.ascender,
        sTypoDescender: globals.descender,
        sTypoLineGap: 0,
        usWinAscent: globals.yMax,
        usWinDescent: Math.abs(globals.yMin),
        ulCodePageRange1: 1, // FIXME: hard-code Latin 1 support for now
        sxHeight: metricsForChar(font, 'xyvw', {yMax: Math.round(globals.ascender / 2)}).yMax,
        sCapHeight: metricsForChar(font, 'HIKLEFJMNTZBDPRAGOQSUVWXY', globals).yMax,
        usDefaultChar: font.hasChar(' ') ? 32 : 0, // Use space as the default character, if available.
        usBreakChar: font.hasChar(' ') ? 32 : 0 // Use space as the break character, if available.
    });

    var hmtxTable = hmtx.make(font.glyphs);
    var cmapTable = cmap.make(font.glyphs);

    var englishFamilyName = font.getEnglishName('fontFamily');
    var englishStyleName = font.getEnglishName('fontSubfamily');
    var englishFullName = englishFamilyName + ' ' + englishStyleName;
    var postScriptName = font.getEnglishName('postScriptName');
    if (!postScriptName) {
        postScriptName = englishFamilyName.replace(/\s/g, '') + '-' + englishStyleName;
    }

    var names = {};
    for (var n in font.names) {
        names[n] = font.names[n];
    }

    if (!names.uniqueID) {
        names.uniqueID = {en: font.getEnglishName('manufacturer') + ':' + englishFullName};
    }

    if (!names.postScriptName) {
        names.postScriptName = {en: postScriptName};
    }

    if (!names.preferredFamily) {
        names.preferredFamily = font.names.fontFamily;
    }

    if (!names.preferredSubfamily) {
        names.preferredSubfamily = font.names.fontSubfamily;
    }

    var languageTags = [];
    var nameTable = _name.make(names, languageTags);
    var ltagTable = (languageTags.length > 0 ? ltag.make(languageTags) : undefined);

    var postTable = post.make();
    var cffTable = cff.make(font.glyphs, {
        version: font.getEnglishName('version'),
        fullName: englishFullName,
        familyName: englishFamilyName,
        weightName: englishStyleName,
        postScriptName: postScriptName,
        unitsPerEm: font.unitsPerEm,
        fontBBox: [0, globals.yMin, globals.ascender, globals.advanceWidthMax]
    });

    var metaTable = (font.metas && Object.keys(font.metas).length > 0) ? meta.make(font.metas) : undefined;

    // The order does not matter because makeSfntTable() will sort them.
    var tables = [headTable, hheaTable, maxpTable, os2Table, nameTable, cmapTable, postTable, cffTable, hmtxTable];
    if (ltagTable) {
        tables.push(ltagTable);
    }
    // Optional tables
    if (font.tables.gsub) {
        tables.push(gsub.make(font.tables.gsub));
    }
    if (metaTable) {
        tables.push(metaTable);
    }

    var sfntTable = makeSfntTable(tables);

    // Compute the font's checkSum and store it in head.checkSumAdjustment.
    var bytes = sfntTable.encode();
    var checkSum = computeCheckSum(bytes);
    var tableFields = sfntTable.fields;
    var checkSumAdjusted = false;
    for (var i$1 = 0; i$1 < tableFields.length; i$1 += 1) {
        if (tableFields[i$1].name === 'head table') {
            tableFields[i$1].value.checkSumAdjustment = 0xB1B0AFBA - checkSum;
            checkSumAdjusted = true;
            break;
        }
    }

    if (!checkSumAdjusted) {
        throw new Error('Could not find head table with checkSum to adjust.');
    }

    return sfntTable;
}

var sfnt = { make: makeSfntTable, fontToTable: fontToSfntTable, computeCheckSum: computeCheckSum };

// The Layout object is the prototype of Substitution objects, and provides
// utility methods to manipulate common layout tables (GPOS, GSUB, GDEF...)

function searchTag(arr, tag) {
    /* jshint bitwise: false */
    var imin = 0;
    var imax = arr.length - 1;
    while (imin <= imax) {
        var imid = (imin + imax) >>> 1;
        var val = arr[imid].tag;
        if (val === tag) {
            return imid;
        } else if (val < tag) {
            imin = imid + 1;
        } else { imax = imid - 1; }
    }
    // Not found: return -1-insertion point
    return -imin - 1;
}

function binSearch(arr, value) {
    /* jshint bitwise: false */
    var imin = 0;
    var imax = arr.length - 1;
    while (imin <= imax) {
        var imid = (imin + imax) >>> 1;
        var val = arr[imid];
        if (val === value) {
            return imid;
        } else if (val < value) {
            imin = imid + 1;
        } else { imax = imid - 1; }
    }
    // Not found: return -1-insertion point
    return -imin - 1;
}

/**
 * @exports opentype.Layout
 * @class
 */
function Layout(font, tableName) {
    this.font = font;
    this.tableName = tableName;
}

Layout.prototype = {

    /**
     * Binary search an object by "tag" property
     * @instance
     * @function searchTag
     * @memberof opentype.Layout
     * @param  {Array} arr
     * @param  {string} tag
     * @return {number}
     */
    searchTag: searchTag,

    /**
     * Binary search in a list of numbers
     * @instance
     * @function binSearch
     * @memberof opentype.Layout
     * @param  {Array} arr
     * @param  {number} value
     * @return {number}
     */
    binSearch: binSearch,

    /**
     * Get or create the Layout table (GSUB, GPOS etc).
     * @param  {boolean} create - Whether to create a new one.
     * @return {Object} The GSUB or GPOS table.
     */
    getTable: function(create) {
        var layout = this.font.tables[this.tableName];
        if (!layout && create) {
            layout = this.font.tables[this.tableName] = this.createDefaultTable();
        }
        return layout;
    },

    /**
     * Returns all scripts in the substitution table.
     * @instance
     * @return {Array}
     */
    getScriptNames: function() {
        var layout = this.getTable();
        if (!layout) { return []; }
        return layout.scripts.map(function(script) {
            return script.tag;
        });
    },

    /**
     * Returns the best bet for a script name.
     * Returns 'DFLT' if it exists.
     * If not, returns 'latn' if it exists.
     * If neither exist, returns undefined.
     */
    getDefaultScriptName: function() {
        var layout = this.getTable();
        if (!layout) { return; }
        var hasLatn = false;
        for (var i = 0; i < layout.scripts.length; i++) {
            var name = layout.scripts[i].tag;
            if (name === 'DFLT') { return name; }
            if (name === 'latn') { hasLatn = true; }
        }
        if (hasLatn) { return 'latn'; }
    },

    /**
     * Returns all LangSysRecords in the given script.
     * @instance
     * @param {string} [script='DFLT']
     * @param {boolean} create - forces the creation of this script table if it doesn't exist.
     * @return {Object} An object with tag and script properties.
     */
    getScriptTable: function(script, create) {
        var layout = this.getTable(create);
        if (layout) {
            script = script || 'DFLT';
            var scripts = layout.scripts;
            var pos = searchTag(layout.scripts, script);
            if (pos >= 0) {
                return scripts[pos].script;
            } else if (create) {
                var scr = {
                    tag: script,
                    script: {
                        defaultLangSys: {reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: []},
                        langSysRecords: []
                    }
                };
                scripts.splice(-1 - pos, 0, scr);
                return scr.script;
            }
        }
    },

    /**
     * Returns a language system table
     * @instance
     * @param {string} [script='DFLT']
     * @param {string} [language='dlft']
     * @param {boolean} create - forces the creation of this langSysTable if it doesn't exist.
     * @return {Object}
     */
    getLangSysTable: function(script, language, create) {
        var scriptTable = this.getScriptTable(script, create);
        if (scriptTable) {
            if (!language || language === 'dflt' || language === 'DFLT') {
                return scriptTable.defaultLangSys;
            }
            var pos = searchTag(scriptTable.langSysRecords, language);
            if (pos >= 0) {
                return scriptTable.langSysRecords[pos].langSys;
            } else if (create) {
                var langSysRecord = {
                    tag: language,
                    langSys: {reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: []}
                };
                scriptTable.langSysRecords.splice(-1 - pos, 0, langSysRecord);
                return langSysRecord.langSys;
            }
        }
    },

    /**
     * Get a specific feature table.
     * @instance
     * @param {string} [script='DFLT']
     * @param {string} [language='dlft']
     * @param {string} feature - One of the codes listed at https://www.microsoft.com/typography/OTSPEC/featurelist.htm
     * @param {boolean} create - forces the creation of the feature table if it doesn't exist.
     * @return {Object}
     */
    getFeatureTable: function(script, language, feature, create) {
        var langSysTable = this.getLangSysTable(script, language, create);
        if (langSysTable) {
            var featureRecord;
            var featIndexes = langSysTable.featureIndexes;
            var allFeatures = this.font.tables[this.tableName].features;
            // The FeatureIndex array of indices is in arbitrary order,
            // even if allFeatures is sorted alphabetically by feature tag.
            for (var i = 0; i < featIndexes.length; i++) {
                featureRecord = allFeatures[featIndexes[i]];
                if (featureRecord.tag === feature) {
                    return featureRecord.feature;
                }
            }
            if (create) {
                var index = allFeatures.length;
                // Automatic ordering of features would require to shift feature indexes in the script list.
                check.assert(index === 0 || feature >= allFeatures[index - 1].tag, 'Features must be added in alphabetical order.');
                featureRecord = {
                    tag: feature,
                    feature: { params: 0, lookupListIndexes: [] }
                };
                allFeatures.push(featureRecord);
                featIndexes.push(index);
                return featureRecord.feature;
            }
        }
    },

    /**
     * Get the lookup tables of a given type for a script/language/feature.
     * @instance
     * @param {string} [script='DFLT']
     * @param {string} [language='dlft']
     * @param {string} feature - 4-letter feature code
     * @param {number} lookupType - 1 to 8
     * @param {boolean} create - forces the creation of the lookup table if it doesn't exist, with no subtables.
     * @return {Object[]}
     */
    getLookupTables: function(script, language, feature, lookupType, create) {
        var featureTable = this.getFeatureTable(script, language, feature, create);
        var tables = [];
        if (featureTable) {
            var lookupTable;
            var lookupListIndexes = featureTable.lookupListIndexes;
            var allLookups = this.font.tables[this.tableName].lookups;
            // lookupListIndexes are in no particular order, so use naive search.
            for (var i = 0; i < lookupListIndexes.length; i++) {
                lookupTable = allLookups[lookupListIndexes[i]];
                if (lookupTable.lookupType === lookupType) {
                    tables.push(lookupTable);
                }
            }
            if (tables.length === 0 && create) {
                lookupTable = {
                    lookupType: lookupType,
                    lookupFlag: 0,
                    subtables: [],
                    markFilteringSet: undefined
                };
                var index = allLookups.length;
                allLookups.push(lookupTable);
                lookupListIndexes.push(index);
                return [lookupTable];
            }
        }
        return tables;
    },

    /**
     * Returns the list of glyph indexes of a coverage table.
     * Format 1: the list is stored raw
     * Format 2: compact list as range records.
     * @instance
     * @param  {Object} coverageTable
     * @return {Array}
     */
    expandCoverage: function(coverageTable) {
        if (coverageTable.format === 1) {
            return coverageTable.glyphs;
        } else {
            var glyphs = [];
            var ranges = coverageTable.ranges;
            for (var i = 0; i < ranges.length; i++) {
                var range = ranges[i];
                var start = range.start;
                var end = range.end;
                for (var j = start; j <= end; j++) {
                    glyphs.push(j);
                }
            }
            return glyphs;
        }
    }

};

// The Substitution object provides utility methods to manipulate
// the GSUB substitution table.

/**
 * @exports opentype.Substitution
 * @class
 * @extends opentype.Layout
 * @param {opentype.Font}
 * @constructor
 */
function Substitution(font) {
    Layout.call(this, font, 'gsub');
}

// Check if 2 arrays of primitives are equal.
function arraysEqual(ar1, ar2) {
    var n = ar1.length;
    if (n !== ar2.length) { return false; }
    for (var i = 0; i < n; i++) {
        if (ar1[i] !== ar2[i]) { return false; }
    }
    return true;
}

// Find the first subtable of a lookup table in a particular format.
function getSubstFormat(lookupTable, format, defaultSubtable) {
    var subtables = lookupTable.subtables;
    for (var i = 0; i < subtables.length; i++) {
        var subtable = subtables[i];
        if (subtable.substFormat === format) {
            return subtable;
        }
    }
    if (defaultSubtable) {
        subtables.push(defaultSubtable);
        return defaultSubtable;
    }
    return undefined;
}

Substitution.prototype = Layout.prototype;

/**
 * Create a default GSUB table.
 * @return {Object} gsub - The GSUB table.
 */
Substitution.prototype.createDefaultTable = function() {
    // Generate a default empty GSUB table with just a DFLT script and dflt lang sys.
    return {
        version: 1,
        scripts: [{
            tag: 'DFLT',
            script: {
                defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [] },
                langSysRecords: []
            }
        }],
        features: [],
        lookups: []
    };
};

/**
 * List all single substitutions (lookup type 1) for a given script, language, and feature.
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @param {string} feature - 4-character feature name ('aalt', 'salt', 'ss01'...)
 * @return {Array} substitutions - The list of substitutions.
 */
Substitution.prototype.getSingle = function(feature, script, language) {
    var this$1 = this;

    var substitutions = [];
    var lookupTables = this.getLookupTables(script, language, feature, 1);
    for (var idx = 0; idx < lookupTables.length; idx++) {
        var subtables = lookupTables[idx].subtables;
        for (var i = 0; i < subtables.length; i++) {
            var subtable = subtables[i];
            var glyphs = this$1.expandCoverage(subtable.coverage);
            var j = (void 0);
            if (subtable.substFormat === 1) {
                var delta = subtable.deltaGlyphId;
                for (j = 0; j < glyphs.length; j++) {
                    var glyph = glyphs[j];
                    substitutions.push({ sub: glyph, by: glyph + delta });
                }
            } else {
                var substitute = subtable.substitute;
                for (j = 0; j < glyphs.length; j++) {
                    substitutions.push({ sub: glyphs[j], by: substitute[j] });
                }
            }
        }
    }
    return substitutions;
};

/**
 * List all alternates (lookup type 3) for a given script, language, and feature.
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @param {string} feature - 4-character feature name ('aalt', 'salt'...)
 * @return {Array} alternates - The list of alternates
 */
Substitution.prototype.getAlternates = function(feature, script, language) {
    var this$1 = this;

    var alternates = [];
    var lookupTables = this.getLookupTables(script, language, feature, 3);
    for (var idx = 0; idx < lookupTables.length; idx++) {
        var subtables = lookupTables[idx].subtables;
        for (var i = 0; i < subtables.length; i++) {
            var subtable = subtables[i];
            var glyphs = this$1.expandCoverage(subtable.coverage);
            var alternateSets = subtable.alternateSets;
            for (var j = 0; j < glyphs.length; j++) {
                alternates.push({ sub: glyphs[j], by: alternateSets[j] });
            }
        }
    }
    return alternates;
};

/**
 * List all ligatures (lookup type 4) for a given script, language, and feature.
 * The result is an array of ligature objects like { sub: [ids], by: id }
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @return {Array} ligatures - The list of ligatures.
 */
Substitution.prototype.getLigatures = function(feature, script, language) {
    var this$1 = this;

    var ligatures = [];
    var lookupTables = this.getLookupTables(script, language, feature, 4);
    for (var idx = 0; idx < lookupTables.length; idx++) {
        var subtables = lookupTables[idx].subtables;
        for (var i = 0; i < subtables.length; i++) {
            var subtable = subtables[i];
            var glyphs = this$1.expandCoverage(subtable.coverage);
            var ligatureSets = subtable.ligatureSets;
            for (var j = 0; j < glyphs.length; j++) {
                var startGlyph = glyphs[j];
                var ligSet = ligatureSets[j];
                for (var k = 0; k < ligSet.length; k++) {
                    var lig = ligSet[k];
                    ligatures.push({
                        sub: [startGlyph].concat(lig.components),
                        by: lig.ligGlyph
                    });
                }
            }
        }
    }
    return ligatures;
};

/**
 * Add or modify a single substitution (lookup type 1)
 * Format 2, more flexible, is always used.
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {Object} substitution - { sub: id, delta: number } for format 1 or { sub: id, by: id } for format 2.
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
Substitution.prototype.addSingle = function(feature, substitution, script, language) {
    var lookupTable = this.getLookupTables(script, language, feature, 1, true)[0];
    var subtable = getSubstFormat(lookupTable, 2, {                // lookup type 1 subtable, format 2, coverage format 1
        substFormat: 2,
        coverage: {format: 1, glyphs: []},
        substitute: []
    });
    check.assert(subtable.coverage.format === 1, 'Ligature: unable to modify coverage table format ' + subtable.coverage.format);
    var coverageGlyph = substitution.sub;
    var pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
    if (pos < 0) {
        pos = -1 - pos;
        subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
        subtable.substitute.splice(pos, 0, 0);
    }
    subtable.substitute[pos] = substitution.by;
};

/**
 * Add or modify an alternate substitution (lookup type 1)
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {Object} substitution - { sub: id, by: [ids] }
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
Substitution.prototype.addAlternate = function(feature, substitution, script, language) {
    var lookupTable = this.getLookupTables(script, language, feature, 3, true)[0];
    var subtable = getSubstFormat(lookupTable, 1, {                // lookup type 3 subtable, format 1, coverage format 1
        substFormat: 1,
        coverage: {format: 1, glyphs: []},
        alternateSets: []
    });
    check.assert(subtable.coverage.format === 1, 'Ligature: unable to modify coverage table format ' + subtable.coverage.format);
    var coverageGlyph = substitution.sub;
    var pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
    if (pos < 0) {
        pos = -1 - pos;
        subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
        subtable.alternateSets.splice(pos, 0, 0);
    }
    subtable.alternateSets[pos] = substitution.by;
};

/**
 * Add a ligature (lookup type 4)
 * Ligatures with more components must be stored ahead of those with fewer components in order to be found
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {Object} ligature - { sub: [ids], by: id }
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
Substitution.prototype.addLigature = function(feature, ligature, script, language) {
    var lookupTable = this.getLookupTables(script, language, feature, 4, true)[0];
    var subtable = lookupTable.subtables[0];
    if (!subtable) {
        subtable = {                // lookup type 4 subtable, format 1, coverage format 1
            substFormat: 1,
            coverage: { format: 1, glyphs: [] },
            ligatureSets: []
        };
        lookupTable.subtables[0] = subtable;
    }
    check.assert(subtable.coverage.format === 1, 'Ligature: unable to modify coverage table format ' + subtable.coverage.format);
    var coverageGlyph = ligature.sub[0];
    var ligComponents = ligature.sub.slice(1);
    var ligatureTable = {
        ligGlyph: ligature.by,
        components: ligComponents
    };
    var pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
    if (pos >= 0) {
        // ligatureSet already exists
        var ligatureSet = subtable.ligatureSets[pos];
        for (var i = 0; i < ligatureSet.length; i++) {
            // If ligature already exists, return.
            if (arraysEqual(ligatureSet[i].components, ligComponents)) {
                return;
            }
        }
        // ligature does not exist: add it.
        ligatureSet.push(ligatureTable);
    } else {
        // Create a new ligatureSet and add coverage for the first glyph.
        pos = -1 - pos;
        subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
        subtable.ligatureSets.splice(pos, 0, [ligatureTable]);
    }
};

/**
 * List all feature data for a given script and language.
 * @param {string} feature - 4-letter feature name
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @return {Array} substitutions - The list of substitutions.
 */
Substitution.prototype.getFeature = function(feature, script, language) {
    if (/ss\d\d/.test(feature)) {               // ss01 - ss20
        return this.getSingle(feature, script, language);
    }
    switch (feature) {
        case 'aalt':
        case 'salt':
            return this.getSingle(feature, script, language)
                    .concat(this.getAlternates(feature, script, language));
        case 'dlig':
        case 'liga':
        case 'rlig': return this.getLigatures(feature, script, language);
    }
    return undefined;
};

/**
 * Add a substitution to a feature for a given script and language.
 * @param {string} feature - 4-letter feature name
 * @param {Object} sub - the substitution to add (an object like { sub: id or [ids], by: id or [ids] })
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
Substitution.prototype.add = function(feature, sub, script, language) {
    if (/ss\d\d/.test(feature)) {               // ss01 - ss20
        return this.addSingle(feature, sub, script, language);
    }
    switch (feature) {
        case 'aalt':
        case 'salt':
            if (typeof sub.by === 'number') {
                return this.addSingle(feature, sub, script, language);
            }
            return this.addAlternate(feature, sub, script, language);
        case 'dlig':
        case 'liga':
        case 'rlig':
            return this.addLigature(feature, sub, script, language);
    }
    return undefined;
};

function isBrowser() {
    return typeof window !== 'undefined';
}

function nodeBufferToArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }

    return ab;
}

function arrayBufferToNodeBuffer(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }

    return buffer;
}

function checkArgument(expression, message) {
    if (!expression) {
        throw message;
    }
}

/* A TrueType font hinting interpreter.
*
* (c) 2017 Axel Kittenberger
*
* This interpreter has been implemented according to this documentation:
* https://developer.apple.com/fonts/TrueType-Reference-Manual/RM05/Chap5.html
*
* According to the documentation F24DOT6 values are used for pixels.
* That means calculation is 1/64 pixel accurate and uses integer operations.
* However, Javascript has floating point operations by default and only
* those are available. One could make a case to simulate the 1/64 accuracy
* exactly by truncating after every division operation
* (for example with << 0) to get pixel exactly results as other TrueType
* implementations. It may make sense since some fonts are pixel optimized
* by hand using DELTAP instructions. The current implementation doesn't
* and rather uses full floating point precision.
*
* xScale, yScale and rotation is currently ignored.
*
* A few non-trivial instructions are missing as I didn't encounter yet
* a font that used them to test a possible implementation.
*
* Some fonts seem to use undocumented features regarding the twilight zone.
* Only some of them are implemented as they were encountered.
*
* The exports.DEBUG statements are removed on the minified distribution file.
*/
var instructionTable;
var exec;
var execGlyph;
var execComponent;

/*
* Creates a hinting object.
*
* There ought to be exactly one
* for each truetype font that is used for hinting.
*/
function Hinting(font) {
    // the font this hinting object is for
    this.font = font;

    // cached states
    this._fpgmState  =
    this._prepState  =
        undefined;

    // errorState
    // 0 ... all okay
    // 1 ... had an error in a glyf,
    //       continue working but stop spamming
    //       the console
    // 2 ... error at prep, stop hinting at this ppem
    // 3 ... error at fpeg, stop hinting for this font at all
    this._errorState = 0;
}

/*
* Not rounding.
*/
function roundOff(v) {
    return v;
}

/*
* Rounding to grid.
*/
function roundToGrid(v) {
    //Rounding in TT is supposed to "symmetrical around zero"
    return Math.sign(v) * Math.round(Math.abs(v));
}

/*
* Rounding to double grid.
*/
function roundToDoubleGrid(v) {
    return Math.sign(v) * Math.round(Math.abs(v * 2)) / 2;
}

/*
* Rounding to half grid.
*/
function roundToHalfGrid(v) {
    return Math.sign(v) * (Math.round(Math.abs(v) + 0.5) - 0.5);
}

/*
* Rounding to up to grid.
*/
function roundUpToGrid(v) {
    return Math.sign(v) * Math.ceil(Math.abs(v));
}

/*
* Rounding to down to grid.
*/
function roundDownToGrid(v) {
    return Math.sign(v) * Math.floor(Math.abs(v));
}

/*
* Super rounding.
*/
var roundSuper = function (v) {
    var period = this.srPeriod;
    var phase = this.srPhase;
    var threshold = this.srThreshold;
    var sign = 1;

    if (v < 0) {
        v = -v;
        sign = -1;
    }

    v += threshold - phase;

    v = Math.trunc(v / period) * period;

    v += phase;

    // according to http://xgridfit.sourceforge.net/round.html
    if (sign > 0 && v < 0) { return phase; }
    if (sign < 0 && v > 0) { return -phase; }

    return v * sign;
};

/*
* Unit vector of x-axis.
*/
var xUnitVector = {
    x: 1,

    y: 0,

    axis: 'x',

    // Gets the projected distance between two points.
    // o1/o2 ... if true, respective original position is used.
    distance: function (p1, p2, o1, o2) {
        return (o1 ? p1.xo : p1.x) - (o2 ? p2.xo : p2.x);
    },

    // Moves point p so the moved position has the same relative
    // position to the moved positions of rp1 and rp2 than the
    // original positions had.
    //
    // See APPENDIX on INTERPOLATE at the bottom of this file.
    interpolate: function (p, rp1, rp2, pv) {
        var do1;
        var do2;
        var doa1;
        var doa2;
        var dm1;
        var dm2;
        var dt;

        if (!pv || pv === this) {
            do1 = p.xo - rp1.xo;
            do2 = p.xo - rp2.xo;
            dm1 = rp1.x - rp1.xo;
            dm2 = rp2.x - rp2.xo;
            doa1 = Math.abs(do1);
            doa2 = Math.abs(do2);
            dt = doa1 + doa2;

            if (dt === 0) {
                p.x = p.xo + (dm1 + dm2) / 2;
                return;
            }

            p.x = p.xo + (dm1 * doa2 + dm2 * doa1) / dt;
            return;
        }

        do1 = pv.distance(p, rp1, true, true);
        do2 = pv.distance(p, rp2, true, true);
        dm1 = pv.distance(rp1, rp1, false, true);
        dm2 = pv.distance(rp2, rp2, false, true);
        doa1 = Math.abs(do1);
        doa2 = Math.abs(do2);
        dt = doa1 + doa2;

        if (dt === 0) {
            xUnitVector.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
            return;
        }

        xUnitVector.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
    },

    // Slope of line normal to this
    normalSlope: Number.NEGATIVE_INFINITY,

    // Sets the point 'p' relative to point 'rp'
    // by the distance 'd'.
    //
    // See APPENDIX on SETRELATIVE at the bottom of this file.
    //
    // p   ... point to set
    // rp  ... reference point
    // d   ... distance on projection vector
    // pv  ... projection vector (undefined = this)
    // org ... if true, uses the original position of rp as reference.
    setRelative: function (p, rp, d, pv, org) {
        if (!pv || pv === this) {
            p.x = (org ? rp.xo : rp.x) + d;
            return;
        }

        var rpx = org ? rp.xo : rp.x;
        var rpy = org ? rp.yo : rp.y;
        var rpdx = rpx + d * pv.x;
        var rpdy = rpy + d * pv.y;

        p.x = rpdx + (p.y - rpdy) / pv.normalSlope;
    },

    // Slope of vector line.
    slope: 0,

    // Touches the point p.
    touch: function (p) {
        p.xTouched = true;
    },

    // Tests if a point p is touched.
    touched: function (p) {
        return p.xTouched;
    },

    // Untouches the point p.
    untouch: function (p) {
        p.xTouched = false;
    }
};

/*
* Unit vector of y-axis.
*/
var yUnitVector = {
    x: 0,

    y: 1,

    axis: 'y',

    // Gets the projected distance between two points.
    // o1/o2 ... if true, respective original position is used.
    distance: function (p1, p2, o1, o2) {
        return (o1 ? p1.yo : p1.y) - (o2 ? p2.yo : p2.y);
    },

    // Moves point p so the moved position has the same relative
    // position to the moved positions of rp1 and rp2 than the
    // original positions had.
    //
    // See APPENDIX on INTERPOLATE at the bottom of this file.
    interpolate: function (p, rp1, rp2, pv) {
        var do1;
        var do2;
        var doa1;
        var doa2;
        var dm1;
        var dm2;
        var dt;

        if (!pv || pv === this) {
            do1 = p.yo - rp1.yo;
            do2 = p.yo - rp2.yo;
            dm1 = rp1.y - rp1.yo;
            dm2 = rp2.y - rp2.yo;
            doa1 = Math.abs(do1);
            doa2 = Math.abs(do2);
            dt = doa1 + doa2;

            if (dt === 0) {
                p.y = p.yo + (dm1 + dm2) / 2;
                return;
            }

            p.y = p.yo + (dm1 * doa2 + dm2 * doa1) / dt;
            return;
        }

        do1 = pv.distance(p, rp1, true, true);
        do2 = pv.distance(p, rp2, true, true);
        dm1 = pv.distance(rp1, rp1, false, true);
        dm2 = pv.distance(rp2, rp2, false, true);
        doa1 = Math.abs(do1);
        doa2 = Math.abs(do2);
        dt = doa1 + doa2;

        if (dt === 0) {
            yUnitVector.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
            return;
        }

        yUnitVector.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
    },

    // Slope of line normal to this.
    normalSlope: 0,

    // Sets the point 'p' relative to point 'rp'
    // by the distance 'd'
    //
    // See APPENDIX on SETRELATIVE at the bottom of this file.
    //
    // p   ... point to set
    // rp  ... reference point
    // d   ... distance on projection vector
    // pv  ... projection vector (undefined = this)
    // org ... if true, uses the original position of rp as reference.
    setRelative: function (p, rp, d, pv, org) {
        if (!pv || pv === this) {
            p.y = (org ? rp.yo : rp.y) + d;
            return;
        }

        var rpx = org ? rp.xo : rp.x;
        var rpy = org ? rp.yo : rp.y;
        var rpdx = rpx + d * pv.x;
        var rpdy = rpy + d * pv.y;

        p.y = rpdy + pv.normalSlope * (p.x - rpdx);
    },

    // Slope of vector line.
    slope: Number.POSITIVE_INFINITY,

    // Touches the point p.
    touch: function (p) {
        p.yTouched = true;
    },

    // Tests if a point p is touched.
    touched: function (p) {
        return p.yTouched;
    },

    // Untouches the point p.
    untouch: function (p) {
        p.yTouched = false;
    }
};

Object.freeze(xUnitVector);
Object.freeze(yUnitVector);

/*
* Creates a unit vector that is not x- or y-axis.
*/
function UnitVector(x, y) {
    this.x = x;
    this.y = y;
    this.axis = undefined;
    this.slope = y / x;
    this.normalSlope = -x / y;
    Object.freeze(this);
}

/*
* Gets the projected distance between two points.
* o1/o2 ... if true, respective original position is used.
*/
UnitVector.prototype.distance = function(p1, p2, o1, o2) {
    return (
        this.x * xUnitVector.distance(p1, p2, o1, o2) +
        this.y * yUnitVector.distance(p1, p2, o1, o2)
    );
};

/*
* Moves point p so the moved position has the same relative
* position to the moved positions of rp1 and rp2 than the
* original positions had.
*
* See APPENDIX on INTERPOLATE at the bottom of this file.
*/
UnitVector.prototype.interpolate = function(p, rp1, rp2, pv) {
    var dm1;
    var dm2;
    var do1;
    var do2;
    var doa1;
    var doa2;
    var dt;

    do1 = pv.distance(p, rp1, true, true);
    do2 = pv.distance(p, rp2, true, true);
    dm1 = pv.distance(rp1, rp1, false, true);
    dm2 = pv.distance(rp2, rp2, false, true);
    doa1 = Math.abs(do1);
    doa2 = Math.abs(do2);
    dt = doa1 + doa2;

    if (dt === 0) {
        this.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
        return;
    }

    this.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
};

/*
* Sets the point 'p' relative to point 'rp'
* by the distance 'd'
*
* See APPENDIX on SETRELATIVE at the bottom of this file.
*
* p   ...  point to set
* rp  ... reference point
* d   ... distance on projection vector
* pv  ... projection vector (undefined = this)
* org ... if true, uses the original position of rp as reference.
*/
UnitVector.prototype.setRelative = function(p, rp, d, pv, org) {
    pv = pv || this;

    var rpx = org ? rp.xo : rp.x;
    var rpy = org ? rp.yo : rp.y;
    var rpdx = rpx + d * pv.x;
    var rpdy = rpy + d * pv.y;

    var pvns = pv.normalSlope;
    var fvs = this.slope;

    var px = p.x;
    var py = p.y;

    p.x = (fvs * px - pvns * rpdx + rpdy - py) / (fvs - pvns);
    p.y = fvs * (p.x - px) + py;
};

/*
* Touches the point p.
*/
UnitVector.prototype.touch = function(p) {
    p.xTouched = true;
    p.yTouched = true;
};

/*
* Returns a unit vector with x/y coordinates.
*/
function getUnitVector(x, y) {
    var d = Math.sqrt(x * x + y * y);

    x /= d;
    y /= d;

    if (x === 1 && y === 0) { return xUnitVector; }
    else if (x === 0 && y === 1) { return yUnitVector; }
    else { return new UnitVector(x, y); }
}

/*
* Creates a point in the hinting engine.
*/
function HPoint(
    x,
    y,
    lastPointOfContour,
    onCurve
) {
    this.x = this.xo = Math.round(x * 64) / 64; // hinted x value and original x-value
    this.y = this.yo = Math.round(y * 64) / 64; // hinted y value and original y-value

    this.lastPointOfContour = lastPointOfContour;
    this.onCurve = onCurve;
    this.prevPointOnContour = undefined;
    this.nextPointOnContour = undefined;
    this.xTouched = false;
    this.yTouched = false;

    Object.preventExtensions(this);
}

/*
* Returns the next touched point on the contour.
*
* v  ... unit vector to test touch axis.
*/
HPoint.prototype.nextTouched = function(v) {
    var p = this.nextPointOnContour;

    while (!v.touched(p) && p !== this) { p = p.nextPointOnContour; }

    return p;
};

/*
* Returns the previous touched point on the contour
*
* v  ... unit vector to test touch axis.
*/
HPoint.prototype.prevTouched = function(v) {
    var p = this.prevPointOnContour;

    while (!v.touched(p) && p !== this) { p = p.prevPointOnContour; }

    return p;
};

/*
* The zero point.
*/
var HPZero = Object.freeze(new HPoint(0, 0));

/*
* The default state of the interpreter.
*
* Note: Freezing the defaultState and then deriving from it
* makes the V8 Javascript engine going awkward,
* so this is avoided, albeit the defaultState shouldn't
* ever change.
*/
var defaultState = {
    cvCutIn: 17 / 16,    // control value cut in
    deltaBase: 9,
    deltaShift: 0.125,
    loop: 1,             // loops some instructions
    minDis: 1,           // minimum distance
    autoFlip: true
};

/*
* The current state of the interpreter.
*
* env  ... 'fpgm' or 'prep' or 'glyf'
* prog ... the program
*/
function State(env, prog) {
    this.env = env;
    this.stack = [];
    this.prog = prog;

    switch (env) {
        case 'glyf' :
            this.zp0 = this.zp1 = this.zp2 = 1;
            this.rp0 = this.rp1 = this.rp2 = 0;
            /* fall through */
        case 'prep' :
            this.fv = this.pv = this.dpv = xUnitVector;
            this.round = roundToGrid;
    }
}

/*
* Executes a glyph program.
*
* This does the hinting for each glyph.
*
* Returns an array of moved points.
*
* glyph: the glyph to hint
* ppem: the size the glyph is rendered for
*/
Hinting.prototype.exec = function(glyph, ppem) {
    if (typeof ppem !== 'number') {
        throw new Error('Point size is not a number!');
    }

    // Received a fatal error, don't do any hinting anymore.
    if (this._errorState > 2) { return; }

    var font = this.font;
    var prepState = this._prepState;

    if (!prepState || prepState.ppem !== ppem) {
        var fpgmState = this._fpgmState;

        if (!fpgmState) {
            // Executes the fpgm state.
            // This is used by fonts to define functions.
            State.prototype = defaultState;

            fpgmState =
            this._fpgmState =
                new State('fpgm', font.tables.fpgm);

            fpgmState.funcs = [ ];
            fpgmState.font = font;

            if (exports.DEBUG) {
                console.log('---EXEC FPGM---');
                fpgmState.step = -1;
            }

            try {
                exec(fpgmState);
            } catch (e) {
                console.log('Hinting error in FPGM:' + e);
                this._errorState = 3;
                return;
            }
        }

        // Executes the prep program for this ppem setting.
        // This is used by fonts to set cvt values
        // depending on to be rendered font size.

        State.prototype = fpgmState;
        prepState =
        this._prepState =
            new State('prep', font.tables.prep);

        prepState.ppem = ppem;

        // Creates a copy of the cvt table
        // and scales it to the current ppem setting.
        var oCvt = font.tables.cvt;
        if (oCvt) {
            var cvt = prepState.cvt = new Array(oCvt.length);
            var scale = ppem / font.unitsPerEm;
            for (var c = 0; c < oCvt.length; c++) {
                cvt[c] = oCvt[c] * scale;
            }
        } else {
            prepState.cvt = [];
        }

        if (exports.DEBUG) {
            console.log('---EXEC PREP---');
            prepState.step = -1;
        }

        try {
            exec(prepState);
        } catch (e) {
            if (this._errorState < 2) {
                console.log('Hinting error in PREP:' + e);
            }
            this._errorState = 2;
        }
    }

    if (this._errorState > 1) { return; }

    try {
        return execGlyph(glyph, prepState);
    } catch (e) {
        if (this._errorState < 1) {
            console.log('Hinting error:' + e);
            console.log('Note: further hinting errors are silenced');
        }
        this._errorState = 1;
        return undefined;
    }
};

/*
* Executes the hinting program for a glyph.
*/
execGlyph = function(glyph, prepState) {
    // original point positions
    var xScale = prepState.ppem / prepState.font.unitsPerEm;
    var yScale = xScale;
    var components = glyph.components;
    var contours;
    var gZone;
    var state;

    State.prototype = prepState;
    if (!components) {
        state = new State('glyf', glyph.instructions);
        if (exports.DEBUG) {
            console.log('---EXEC GLYPH---');
            state.step = -1;
        }
        execComponent(glyph, state, xScale, yScale);
        gZone = state.gZone;
    } else {
        var font = prepState.font;
        gZone = [];
        contours = [];
        for (var i = 0; i < components.length; i++) {
            var c = components[i];
            var cg = font.glyphs.get(c.glyphIndex);

            state = new State('glyf', cg.instructions);

            if (exports.DEBUG) {
                console.log('---EXEC COMP ' + i + '---');
                state.step = -1;
            }

            execComponent(cg, state, xScale, yScale);
            // appends the computed points to the result array
            // post processes the component points
            var dx = Math.round(c.dx * xScale);
            var dy = Math.round(c.dy * yScale);
            var gz = state.gZone;
            var cc = state.contours;
            for (var pi = 0; pi < gz.length; pi++) {
                var p = gz[pi];
                p.xTouched = p.yTouched = false;
                p.xo = p.x = p.x + dx;
                p.yo = p.y = p.y + dy;
            }

            var gLen = gZone.length;
            gZone.push.apply(gZone, gz);
            for (var j = 0; j < cc.length; j++) {
                contours.push(cc[j] + gLen);
            }
        }

        if (glyph.instructions && !state.inhibitGridFit) {
            // the composite has instructions on its own
            state = new State('glyf', glyph.instructions);

            state.gZone = state.z0 = state.z1 = state.z2 = gZone;

            state.contours = contours;

            // note: HPZero cannot be used here, since
            //       the point might be modified
            gZone.push(
                new HPoint(0, 0),
                new HPoint(Math.round(glyph.advanceWidth * xScale), 0)
            );

            if (exports.DEBUG) {
                console.log('---EXEC COMPOSITE---');
                state.step = -1;
            }

            exec(state);

            gZone.length -= 2;
        }
    }

    return gZone;
};

/*
* Executes the hinting program for a component of a multi-component glyph
* or of the glyph itself by a non-component glyph.
*/
execComponent = function(glyph, state, xScale, yScale)
{
    var points = glyph.points || [];
    var pLen = points.length;
    var gZone = state.gZone = state.z0 = state.z1 = state.z2 = [];
    var contours = state.contours = [];

    // Scales the original points and
    // makes copies for the hinted points.
    var cp; // current point
    for (var i = 0; i < pLen; i++) {
        cp = points[i];

        gZone[i] = new HPoint(
            cp.x * xScale,
            cp.y * yScale,
            cp.lastPointOfContour,
            cp.onCurve
        );
    }

    // Chain links the contours.
    var sp; // start point
    var np; // next point

    for (var i$1 = 0; i$1 < pLen; i$1++) {
        cp = gZone[i$1];

        if (!sp) {
            sp = cp;
            contours.push(i$1);
        }

        if (cp.lastPointOfContour) {
            cp.nextPointOnContour = sp;
            sp.prevPointOnContour = cp;
            sp = undefined;
        } else {
            np = gZone[i$1 + 1];
            cp.nextPointOnContour = np;
            np.prevPointOnContour = cp;
        }
    }

    if (state.inhibitGridFit) { return; }

    gZone.push(
        new HPoint(0, 0),
        new HPoint(Math.round(glyph.advanceWidth * xScale), 0)
    );

    exec(state);

    // Removes the extra points.
    gZone.length -= 2;

    if (exports.DEBUG) {
        console.log('FINISHED GLYPH', state.stack);
        for (var i$2 = 0; i$2 < pLen; i$2++) {
            console.log(i$2, gZone[i$2].x, gZone[i$2].y);
        }
    }
};

/*
* Executes the program loaded in state.
*/
exec = function(state) {
    var prog = state.prog;

    if (!prog) { return; }

    var pLen = prog.length;
    var ins;

    for (state.ip = 0; state.ip < pLen; state.ip++) {
        if (exports.DEBUG) { state.step++; }
        ins = instructionTable[prog[state.ip]];

        if (!ins) {
            throw new Error(
                'unknown instruction: 0x' +
                Number(prog[state.ip]).toString(16)
            );
        }

        ins(state);

        // very extensive debugging for each step
        /*
        if (exports.DEBUG) {
            var da;
            if (state.gZone) {
                da = [];
                for (let i = 0; i < state.gZone.length; i++)
                {
                    da.push(i + ' ' +
                        state.gZone[i].x * 64 + ' ' +
                        state.gZone[i].y * 64 + ' ' +
                        (state.gZone[i].xTouched ? 'x' : '') +
                        (state.gZone[i].yTouched ? 'y' : '')
                    );
                }
                console.log('GZ', da);
            }

            if (state.tZone) {
                da = [];
                for (let i = 0; i < state.tZone.length; i++) {
                    da.push(i + ' ' +
                        state.tZone[i].x * 64 + ' ' +
                        state.tZone[i].y * 64 + ' ' +
                        (state.tZone[i].xTouched ? 'x' : '') +
                        (state.tZone[i].yTouched ? 'y' : '')
                    );
                }
                console.log('TZ', da);
            }

            if (state.stack.length > 10) {
                console.log(
                    state.stack.length,
                    '...', state.stack.slice(state.stack.length - 10)
                );
            } else {
                console.log(state.stack.length, state.stack);
            }
        }
        */
    }
};

/*
* Initializes the twilight zone.
*
* This is only done if a SZPx instruction
* refers to the twilight zone.
*/
function initTZone(state)
{
    var tZone = state.tZone = new Array(state.gZone.length);

    // no idea if this is actually correct...
    for (var i = 0; i < tZone.length; i++)
    {
        tZone[i] = new HPoint(0, 0);
    }
}

/*
* Skips the instruction pointer ahead over an IF/ELSE block.
* handleElse .. if true breaks on matching ELSE
*/
function skip(state, handleElse)
{
    var prog = state.prog;
    var ip = state.ip;
    var nesting = 1;
    var ins;

    do {
        ins = prog[++ip];
        if (ins === 0x58) // IF
            { nesting++; }
        else if (ins === 0x59) // EIF
            { nesting--; }
        else if (ins === 0x40) // NPUSHB
            { ip += prog[ip + 1] + 1; }
        else if (ins === 0x41) // NPUSHW
            { ip += 2 * prog[ip + 1] + 1; }
        else if (ins >= 0xB0 && ins <= 0xB7) // PUSHB
            { ip += ins - 0xB0 + 1; }
        else if (ins >= 0xB8 && ins <= 0xBF) // PUSHW
            { ip += (ins - 0xB8 + 1) * 2; }
        else if (handleElse && nesting === 1 && ins === 0x1B) // ELSE
            { break; }
    } while (nesting > 0);

    state.ip = ip;
}

/*----------------------------------------------------------*
*          And then a lot of instructions...                *
*----------------------------------------------------------*/

// SVTCA[a] Set freedom and projection Vectors To Coordinate Axis
// 0x00-0x01
function SVTCA(v, state) {
    if (exports.DEBUG) { console.log(state.step, 'SVTCA[' + v.axis + ']'); }

    state.fv = state.pv = state.dpv = v;
}

// SPVTCA[a] Set Projection Vector to Coordinate Axis
// 0x02-0x03
function SPVTCA(v, state) {
    if (exports.DEBUG) { console.log(state.step, 'SPVTCA[' + v.axis + ']'); }

    state.pv = state.dpv = v;
}

// SFVTCA[a] Set Freedom Vector to Coordinate Axis
// 0x04-0x05
function SFVTCA(v, state) {
    if (exports.DEBUG) { console.log(state.step, 'SFVTCA[' + v.axis + ']'); }

    state.fv = v;
}

// SPVTL[a] Set Projection Vector To Line
// 0x06-0x07
function SPVTL(a, state) {
    var stack = state.stack;
    var p2i = stack.pop();
    var p1i = stack.pop();
    var p2 = state.z2[p2i];
    var p1 = state.z1[p1i];

    if (exports.DEBUG) { console.log('SPVTL[' + a + ']', p2i, p1i); }

    var dx;
    var dy;

    if (!a) {
        dx = p1.x - p2.x;
        dy = p1.y - p2.y;
    } else {
        dx = p2.y - p1.y;
        dy = p1.x - p2.x;
    }

    state.pv = state.dpv = getUnitVector(dx, dy);
}

// SFVTL[a] Set Freedom Vector To Line
// 0x08-0x09
function SFVTL(a, state) {
    var stack = state.stack;
    var p2i = stack.pop();
    var p1i = stack.pop();
    var p2 = state.z2[p2i];
    var p1 = state.z1[p1i];

    if (exports.DEBUG) { console.log('SFVTL[' + a + ']', p2i, p1i); }

    var dx;
    var dy;

    if (!a) {
        dx = p1.x - p2.x;
        dy = p1.y - p2.y;
    } else {
        dx = p2.y - p1.y;
        dy = p1.x - p2.x;
    }

    state.fv = getUnitVector(dx, dy);
}

// SPVFS[] Set Projection Vector From Stack
// 0x0A
function SPVFS(state) {
    var stack = state.stack;
    var y = stack.pop();
    var x = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SPVFS[]', y, x); }

    state.pv = state.dpv = getUnitVector(x, y);
}

// SFVFS[] Set Freedom Vector From Stack
// 0x0B
function SFVFS(state) {
    var stack = state.stack;
    var y = stack.pop();
    var x = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SPVFS[]', y, x); }

    state.fv = getUnitVector(x, y);
}

// GPV[] Get Projection Vector
// 0x0C
function GPV(state) {
    var stack = state.stack;
    var pv = state.pv;

    if (exports.DEBUG) { console.log(state.step, 'GPV[]'); }

    stack.push(pv.x * 0x4000);
    stack.push(pv.y * 0x4000);
}

// GFV[] Get Freedom Vector
// 0x0C
function GFV(state) {
    var stack = state.stack;
    var fv = state.fv;

    if (exports.DEBUG) { console.log(state.step, 'GFV[]'); }

    stack.push(fv.x * 0x4000);
    stack.push(fv.y * 0x4000);
}

// SFVTPV[] Set Freedom Vector To Projection Vector
// 0x0E
function SFVTPV(state) {
    state.fv = state.pv;

    if (exports.DEBUG) { console.log(state.step, 'SFVTPV[]'); }
}

// ISECT[] moves point p to the InterSECTion of two lines
// 0x0F
function ISECT(state)
{
    var stack = state.stack;
    var pa0i = stack.pop();
    var pa1i = stack.pop();
    var pb0i = stack.pop();
    var pb1i = stack.pop();
    var pi = stack.pop();
    var z0 = state.z0;
    var z1 = state.z1;
    var pa0 = z0[pa0i];
    var pa1 = z0[pa1i];
    var pb0 = z1[pb0i];
    var pb1 = z1[pb1i];
    var p = state.z2[pi];

    if (exports.DEBUG) { console.log('ISECT[], ', pa0i, pa1i, pb0i, pb1i, pi); }

    // math from
    // en.wikipedia.org/wiki/Line%E2%80%93line_intersection#Given_two_points_on_each_line

    var x1 = pa0.x;
    var y1 = pa0.y;
    var x2 = pa1.x;
    var y2 = pa1.y;
    var x3 = pb0.x;
    var y3 = pb0.y;
    var x4 = pb1.x;
    var y4 = pb1.y;

    var div = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    var f1 = x1 * y2 - y1 * x2;
    var f2 = x3 * y4 - y3 * x4;

    p.x = (f1 * (x3 - x4) - f2 * (x1 - x2)) / div;
    p.y = (f1 * (y3 - y4) - f2 * (y1 - y2)) / div;
}

// SRP0[] Set Reference Point 0
// 0x10
function SRP0(state) {
    state.rp0 = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SRP0[]', state.rp0); }
}

// SRP1[] Set Reference Point 1
// 0x11
function SRP1(state) {
    state.rp1 = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SRP1[]', state.rp1); }
}

// SRP1[] Set Reference Point 2
// 0x12
function SRP2(state) {
    state.rp2 = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SRP2[]', state.rp2); }
}

// SZP0[] Set Zone Pointer 0
// 0x13
function SZP0(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SZP0[]', n); }

    state.zp0 = n;

    switch (n) {
        case 0:
            if (!state.tZone) { initTZone(state); }
            state.z0 = state.tZone;
            break;
        case 1 :
            state.z0 = state.gZone;
            break;
        default :
            throw new Error('Invalid zone pointer');
    }
}

// SZP1[] Set Zone Pointer 1
// 0x14
function SZP1(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SZP1[]', n); }

    state.zp1 = n;

    switch (n) {
        case 0:
            if (!state.tZone) { initTZone(state); }
            state.z1 = state.tZone;
            break;
        case 1 :
            state.z1 = state.gZone;
            break;
        default :
            throw new Error('Invalid zone pointer');
    }
}

// SZP2[] Set Zone Pointer 2
// 0x15
function SZP2(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SZP2[]', n); }

    state.zp2 = n;

    switch (n) {
        case 0:
            if (!state.tZone) { initTZone(state); }
            state.z2 = state.tZone;
            break;
        case 1 :
            state.z2 = state.gZone;
            break;
        default :
            throw new Error('Invalid zone pointer');
    }
}

// SZPS[] Set Zone PointerS
// 0x16
function SZPS(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SZPS[]', n); }

    state.zp0 = state.zp1 = state.zp2 = n;

    switch (n) {
        case 0:
            if (!state.tZone) { initTZone(state); }
            state.z0 = state.z1 = state.z2 = state.tZone;
            break;
        case 1 :
            state.z0 = state.z1 = state.z2 = state.gZone;
            break;
        default :
            throw new Error('Invalid zone pointer');
    }
}

// SLOOP[] Set LOOP variable
// 0x17
function SLOOP(state) {
    state.loop = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SLOOP[]', state.loop); }
}

// RTG[] Round To Grid
// 0x18
function RTG(state) {
    if (exports.DEBUG) { console.log(state.step, 'RTG[]'); }

    state.round = roundToGrid;
}

// RTHG[] Round To Half Grid
// 0x19
function RTHG(state) {
    if (exports.DEBUG) { console.log(state.step, 'RTHG[]'); }

    state.round = roundToHalfGrid;
}

// SMD[] Set Minimum Distance
// 0x1A
function SMD(state) {
    var d = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SMD[]', d); }

    state.minDis = d / 0x40;
}

// ELSE[] ELSE clause
// 0x1B
function ELSE(state) {
    // This instruction has been reached by executing a then branch
    // so it just skips ahead until matching EIF.
    //
    // In case the IF was negative the IF[] instruction already
    // skipped forward over the ELSE[]

    if (exports.DEBUG) { console.log(state.step, 'ELSE[]'); }

    skip(state, false);
}

// JMPR[] JuMP Relative
// 0x1C
function JMPR(state) {
    var o = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'JMPR[]', o); }

    // A jump by 1 would do nothing.
    state.ip += o - 1;
}

// SCVTCI[] Set Control Value Table Cut-In
// 0x1D
function SCVTCI(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SCVTCI[]', n); }

    state.cvCutIn = n / 0x40;
}

// DUP[] DUPlicate top stack element
// 0x20
function DUP(state) {
    var stack = state.stack;

    if (exports.DEBUG) { console.log(state.step, 'DUP[]'); }

    stack.push(stack[stack.length - 1]);
}

// POP[] POP top stack element
// 0x21
function POP(state) {
    if (exports.DEBUG) { console.log(state.step, 'POP[]'); }

    state.stack.pop();
}

// CLEAR[] CLEAR the stack
// 0x22
function CLEAR(state) {
    if (exports.DEBUG) { console.log(state.step, 'CLEAR[]'); }

    state.stack.length = 0;
}

// SWAP[] SWAP the top two elements on the stack
// 0x23
function SWAP(state) {
    var stack = state.stack;

    var a = stack.pop();
    var b = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SWAP[]'); }

    stack.push(a);
    stack.push(b);
}

// DEPTH[] DEPTH of the stack
// 0x24
function DEPTH(state) {
    var stack = state.stack;

    if (exports.DEBUG) { console.log(state.step, 'DEPTH[]'); }

    stack.push(stack.length);
}

// LOOPCALL[] LOOPCALL function
// 0x2A
function LOOPCALL(state) {
    var stack = state.stack;
    var fn = stack.pop();
    var c = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'LOOPCALL[]', fn, c); }

    // saves callers program
    var cip = state.ip;
    var cprog = state.prog;

    state.prog = state.funcs[fn];

    // executes the function
    for (var i = 0; i < c; i++) {
        exec(state);

        if (exports.DEBUG) { console.log(
            ++state.step,
            i + 1 < c ? 'next loopcall' : 'done loopcall',
            i
        ); }
    }

    // restores the callers program
    state.ip = cip;
    state.prog = cprog;
}

// CALL[] CALL function
// 0x2B
function CALL(state) {
    var fn = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'CALL[]', fn); }

    // saves callers program
    var cip = state.ip;
    var cprog = state.prog;

    state.prog = state.funcs[fn];

    // executes the function
    exec(state);

    // restores the callers program
    state.ip = cip;
    state.prog = cprog;

    if (exports.DEBUG) { console.log(++state.step, 'returning from', fn); }
}

// CINDEX[] Copy the INDEXed element to the top of the stack
// 0x25
function CINDEX(state) {
    var stack = state.stack;
    var k = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'CINDEX[]', k); }

    // In case of k == 1, it copies the last element after popping
    // thus stack.length - k.
    stack.push(stack[stack.length - k]);
}

// MINDEX[] Move the INDEXed element to the top of the stack
// 0x26
function MINDEX(state) {
    var stack = state.stack;
    var k = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'MINDEX[]', k); }

    stack.push(stack.splice(stack.length - k, 1)[0]);
}

// FDEF[] Function DEFinition
// 0x2C
function FDEF(state) {
    if (state.env !== 'fpgm') { throw new Error('FDEF not allowed here'); }
    var stack = state.stack;
    var prog = state.prog;
    var ip = state.ip;

    var fn = stack.pop();
    var ipBegin = ip;

    if (exports.DEBUG) { console.log(state.step, 'FDEF[]', fn); }

    while (prog[++ip] !== 0x2D){  }

    state.ip = ip;
    state.funcs[fn] = prog.slice(ipBegin + 1, ip);
}

// MDAP[a] Move Direct Absolute Point
// 0x2E-0x2F
function MDAP(round, state) {
    var pi = state.stack.pop();
    var p = state.z0[pi];
    var fv = state.fv;
    var pv = state.pv;

    if (exports.DEBUG) { console.log(state.step, 'MDAP[' + round + ']', pi); }

    var d = pv.distance(p, HPZero);

    if (round) { d = state.round(d); }

    fv.setRelative(p, HPZero, d, pv);
    fv.touch(p);

    state.rp0 = state.rp1 = pi;
}

// IUP[a] Interpolate Untouched Points through the outline
// 0x30
function IUP(v, state) {
    var z2 = state.z2;
    var pLen = z2.length - 2;
    var cp;
    var pp;
    var np;

    if (exports.DEBUG) { console.log(state.step, 'IUP[' + v.axis + ']'); }

    for (var i = 0; i < pLen; i++) {
        cp = z2[i]; // current point

        // if this point has been touched go on
        if (v.touched(cp)) { continue; }

        pp = cp.prevTouched(v);

        // no point on the contour has been touched?
        if (pp === cp) { continue; }

        np = cp.nextTouched(v);

        if (pp === np) {
            // only one point on the contour has been touched
            // so simply moves the point like that

            v.setRelative(cp, cp, v.distance(pp, pp, false, true), v, true);
        }

        v.interpolate(cp, pp, np, v);
    }
}

// SHP[] SHift Point using reference point
// 0x32-0x33
function SHP(a, state) {
    var stack = state.stack;
    var rpi = a ? state.rp1 : state.rp2;
    var rp = (a ? state.z0 : state.z1)[rpi];
    var fv = state.fv;
    var pv = state.pv;
    var loop = state.loop;
    var z2 = state.z2;

    while (loop--)
    {
        var pi = stack.pop();
        var p = z2[pi];

        var d = pv.distance(rp, rp, false, true);
        fv.setRelative(p, p, d, pv);
        fv.touch(p);

        if (exports.DEBUG) {
            console.log(
                state.step,
                (state.loop > 1 ?
                   'loop ' + (state.loop - loop) + ': ' :
                   ''
                ) +
                'SHP[' + (a ? 'rp1' : 'rp2') + ']', pi
            );
        }
    }

    state.loop = 1;
}

// SHC[] SHift Contour using reference point
// 0x36-0x37
function SHC(a, state) {
    var stack = state.stack;
    var rpi = a ? state.rp1 : state.rp2;
    var rp = (a ? state.z0 : state.z1)[rpi];
    var fv = state.fv;
    var pv = state.pv;
    var ci = stack.pop();
    var sp = state.z2[state.contours[ci]];
    var p = sp;

    if (exports.DEBUG) { console.log(state.step, 'SHC[' + a + ']', ci); }

    var d = pv.distance(rp, rp, false, true);

    do {
        if (p !== rp) { fv.setRelative(p, p, d, pv); }
        p = p.nextPointOnContour;
    } while (p !== sp);
}

// SHZ[] SHift Zone using reference point
// 0x36-0x37
function SHZ(a, state) {
    var stack = state.stack;
    var rpi = a ? state.rp1 : state.rp2;
    var rp = (a ? state.z0 : state.z1)[rpi];
    var fv = state.fv;
    var pv = state.pv;

    var e = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SHZ[' + a + ']', e); }

    var z;
    switch (e) {
        case 0 : z = state.tZone; break;
        case 1 : z = state.gZone; break;
        default : throw new Error('Invalid zone');
    }

    var p;
    var d = pv.distance(rp, rp, false, true);
    var pLen = z.length - 2;
    for (var i = 0; i < pLen; i++)
    {
        p = z[i];
        if (p !== rp) { fv.setRelative(p, p, d, pv); }
    }
}

// SHPIX[] SHift point by a PIXel amount
// 0x38
function SHPIX(state) {
    var stack = state.stack;
    var loop = state.loop;
    var fv = state.fv;
    var d = stack.pop() / 0x40;
    var z2 = state.z2;

    while (loop--) {
        var pi = stack.pop();
        var p = z2[pi];

        if (exports.DEBUG) {
            console.log(
                state.step,
                (state.loop > 1 ? 'loop ' + (state.loop - loop) + ': ' : '') +
                'SHPIX[]', pi, d
            );
        }

        fv.setRelative(p, p, d);
        fv.touch(p);
    }

    state.loop = 1;
}

// IP[] Interpolate Point
// 0x39
function IP(state) {
    var stack = state.stack;
    var rp1i = state.rp1;
    var rp2i = state.rp2;
    var loop = state.loop;
    var rp1 = state.z0[rp1i];
    var rp2 = state.z1[rp2i];
    var fv = state.fv;
    var pv = state.dpv;
    var z2 = state.z2;

    while (loop--) {
        var pi = stack.pop();
        var p = z2[pi];

        if (exports.DEBUG) {
            console.log(
                state.step,
                (state.loop > 1 ? 'loop ' + (state.loop - loop) + ': ' : '') +
                'IP[]', pi, rp1i, '<->', rp2i
            );
        }

        fv.interpolate(p, rp1, rp2, pv);

        fv.touch(p);
    }

    state.loop = 1;
}

// MSIRP[a] Move Stack Indirect Relative Point
// 0x3A-0x3B
function MSIRP(a, state) {
    var stack = state.stack;
    var d = stack.pop() / 64;
    var pi = stack.pop();
    var p = state.z1[pi];
    var rp0 = state.z0[state.rp0];
    var fv = state.fv;
    var pv = state.pv;

    fv.setRelative(p, rp0, d, pv);
    fv.touch(p);

    if (exports.DEBUG) { console.log(state.step, 'MSIRP[' + a + ']', d, pi); }

    state.rp1 = state.rp0;
    state.rp2 = pi;
    if (a) { state.rp0 = pi; }
}

// ALIGNRP[] Align to reference point.
// 0x3C
function ALIGNRP(state) {
    var stack = state.stack;
    var rp0i = state.rp0;
    var rp0 = state.z0[rp0i];
    var loop = state.loop;
    var fv = state.fv;
    var pv = state.pv;
    var z1 = state.z1;

    while (loop--) {
        var pi = stack.pop();
        var p = z1[pi];

        if (exports.DEBUG) {
            console.log(
                state.step,
                (state.loop > 1 ? 'loop ' + (state.loop - loop) + ': ' : '') +
                'ALIGNRP[]', pi
            );
        }

        fv.setRelative(p, rp0, 0, pv);
        fv.touch(p);
    }

    state.loop = 1;
}

// RTG[] Round To Double Grid
// 0x3D
function RTDG(state) {
    if (exports.DEBUG) { console.log(state.step, 'RTDG[]'); }

    state.round = roundToDoubleGrid;
}

// MIAP[a] Move Indirect Absolute Point
// 0x3E-0x3F
function MIAP(round, state) {
    var stack = state.stack;
    var n = stack.pop();
    var pi = stack.pop();
    var p = state.z0[pi];
    var fv = state.fv;
    var pv = state.pv;
    var cv = state.cvt[n];

    // TODO cvtcutin should be considered here
    if (round) { cv = state.round(cv); }

    if (exports.DEBUG) {
        console.log(
            state.step,
            'MIAP[' + round + ']',
            n, '(', cv, ')', pi
        );
    }

    fv.setRelative(p, HPZero, cv, pv);

    if (state.zp0 === 0) {
        p.xo = p.x;
        p.yo = p.y;
    }

    fv.touch(p);

    state.rp0 = state.rp1 = pi;
}

// NPUSB[] PUSH N Bytes
// 0x40
function NPUSHB(state) {
    var prog = state.prog;
    var ip = state.ip;
    var stack = state.stack;

    var n = prog[++ip];

    if (exports.DEBUG) { console.log(state.step, 'NPUSHB[]', n); }

    for (var i = 0; i < n; i++) { stack.push(prog[++ip]); }

    state.ip = ip;
}

// NPUSHW[] PUSH N Words
// 0x41
function NPUSHW(state) {
    var ip = state.ip;
    var prog = state.prog;
    var stack = state.stack;
    var n = prog[++ip];

    if (exports.DEBUG) { console.log(state.step, 'NPUSHW[]', n); }

    for (var i = 0; i < n; i++) {
        var w = (prog[++ip] << 8) | prog[++ip];
        if (w & 0x8000) { w = -((w ^ 0xffff) + 1); }
        stack.push(w);
    }

    state.ip = ip;
}

// WS[] Write Store
// 0x42
function WS(state) {
    var stack = state.stack;
    var store = state.store;

    if (!store) { store = state.store = []; }

    var v = stack.pop();
    var l = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'WS', v, l); }

    store[l] = v;
}

// RS[] Read Store
// 0x43
function RS(state) {
    var stack = state.stack;
    var store = state.store;

    var l = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'RS', l); }

    var v = (store && store[l]) || 0;

    stack.push(v);
}

// WCVTP[] Write Control Value Table in Pixel units
// 0x44
function WCVTP(state) {
    var stack = state.stack;

    var v = stack.pop();
    var l = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'WCVTP', v, l); }

    state.cvt[l] = v / 0x40;
}

// RCVT[] Read Control Value Table entry
// 0x45
function RCVT(state) {
    var stack = state.stack;
    var cvte = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'RCVT', cvte); }

    stack.push(state.cvt[cvte] * 0x40);
}

// GC[] Get Coordinate projected onto the projection vector
// 0x46-0x47
function GC(a, state) {
    var stack = state.stack;
    var pi = stack.pop();
    var p = state.z2[pi];

    if (exports.DEBUG) { console.log(state.step, 'GC[' + a + ']', pi); }

    stack.push(state.dpv.distance(p, HPZero, a, false) * 0x40);
}

// MD[a] Measure Distance
// 0x49-0x4A
function MD(a, state) {
    var stack = state.stack;
    var pi2 = stack.pop();
    var pi1 = stack.pop();
    var p2 = state.z1[pi2];
    var p1 = state.z0[pi1];
    var d = state.dpv.distance(p1, p2, a, a);

    if (exports.DEBUG) { console.log(state.step, 'MD[' + a + ']', pi2, pi1, '->', d); }

    state.stack.push(Math.round(d * 64));
}

// MPPEM[] Measure Pixels Per EM
// 0x4B
function MPPEM(state) {
    if (exports.DEBUG) { console.log(state.step, 'MPPEM[]'); }
    state.stack.push(state.ppem);
}

// FLIPON[] set the auto FLIP Boolean to ON
// 0x4D
function FLIPON(state) {
    if (exports.DEBUG) { console.log(state.step, 'FLIPON[]'); }
    state.autoFlip = true;
}

// LT[] Less Than
// 0x50
function LT(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'LT[]', e2, e1); }

    stack.push(e1 < e2 ? 1 : 0);
}

// LTEQ[] Less Than or EQual
// 0x53
function LTEQ(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'LTEQ[]', e2, e1); }

    stack.push(e1 <= e2 ? 1 : 0);
}

// GTEQ[] Greater Than
// 0x52
function GT(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'GT[]', e2, e1); }

    stack.push(e1 > e2 ? 1 : 0);
}

// GTEQ[] Greater Than or EQual
// 0x53
function GTEQ(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'GTEQ[]', e2, e1); }

    stack.push(e1 >= e2 ? 1 : 0);
}

// EQ[] EQual
// 0x54
function EQ(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'EQ[]', e2, e1); }

    stack.push(e2 === e1 ? 1 : 0);
}

// NEQ[] Not EQual
// 0x55
function NEQ(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'NEQ[]', e2, e1); }

    stack.push(e2 !== e1 ? 1 : 0);
}

// ODD[] ODD
// 0x56
function ODD(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'ODD[]', n); }

    stack.push(Math.trunc(n) % 2 ? 1 : 0);
}

// EVEN[] EVEN
// 0x57
function EVEN(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'EVEN[]', n); }

    stack.push(Math.trunc(n) % 2 ? 0 : 1);
}

// IF[] IF test
// 0x58
function IF(state) {
    var test = state.stack.pop();
    var ins;

    if (exports.DEBUG) { console.log(state.step, 'IF[]', test); }

    // if test is true it just continues
    // if not the ip is skipped until matching ELSE or EIF
    if (!test) {
        skip(state, true);

        if (exports.DEBUG) { console.log(state.step, ins === 0x1B ? 'ELSE[]' : 'EIF[]'); }
    }
}

// EIF[] End IF
// 0x59
function EIF(state) {
    // this can be reached normally when
    // executing an else branch.
    // -> just ignore it

    if (exports.DEBUG) { console.log(state.step, 'EIF[]'); }
}

// AND[] logical AND
// 0x5A
function AND(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'AND[]', e2, e1); }

    stack.push(e2 && e1 ? 1 : 0);
}

// OR[] logical OR
// 0x5B
function OR(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'OR[]', e2, e1); }

    stack.push(e2 || e1 ? 1 : 0);
}

// NOT[] logical NOT
// 0x5C
function NOT(state) {
    var stack = state.stack;
    var e = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'NOT[]', e); }

    stack.push(e ? 0 : 1);
}

// DELTAP1[] DELTA exception P1
// DELTAP2[] DELTA exception P2
// DELTAP3[] DELTA exception P3
// 0x5D, 0x71, 0x72
function DELTAP123(b, state) {
    var stack = state.stack;
    var n = stack.pop();
    var fv = state.fv;
    var pv = state.pv;
    var ppem = state.ppem;
    var base = state.deltaBase + (b - 1) * 16;
    var ds = state.deltaShift;
    var z0 = state.z0;

    if (exports.DEBUG) { console.log(state.step, 'DELTAP[' + b + ']', n, stack); }

    for (var i = 0; i < n; i++)
    {
        var pi = stack.pop();
        var arg = stack.pop();
        var appem = base + ((arg & 0xF0) >> 4);
        if (appem !== ppem) { continue; }

        var mag = (arg & 0x0F) - 8;
        if (mag >= 0) { mag++; }
        if (exports.DEBUG) { console.log(state.step, 'DELTAPFIX', pi, 'by', mag * ds); }

        var p = z0[pi];
        fv.setRelative(p, p, mag * ds, pv);
    }
}

// SDB[] Set Delta Base in the graphics state
// 0x5E
function SDB(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SDB[]', n); }

    state.deltaBase = n;
}

// SDS[] Set Delta Shift in the graphics state
// 0x5F
function SDS(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SDS[]', n); }

    state.deltaShift = Math.pow(0.5, n);
}

// ADD[] ADD
// 0x60
function ADD(state) {
    var stack = state.stack;
    var n2 = stack.pop();
    var n1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'ADD[]', n2, n1); }

    stack.push(n1 + n2);
}

// SUB[] SUB
// 0x61
function SUB(state) {
    var stack = state.stack;
    var n2 = stack.pop();
    var n1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SUB[]', n2, n1); }

    stack.push(n1 - n2);
}

// DIV[] DIV
// 0x62
function DIV(state) {
    var stack = state.stack;
    var n2 = stack.pop();
    var n1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'DIV[]', n2, n1); }

    stack.push(n1 * 64 / n2);
}

// MUL[] MUL
// 0x63
function MUL(state) {
    var stack = state.stack;
    var n2 = stack.pop();
    var n1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'MUL[]', n2, n1); }

    stack.push(n1 * n2 / 64);
}

// ABS[] ABSolute value
// 0x64
function ABS(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'ABS[]', n); }

    stack.push(Math.abs(n));
}

// NEG[] NEGate
// 0x65
function NEG(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'NEG[]', n); }

    stack.push(-n);
}

// FLOOR[] FLOOR
// 0x66
function FLOOR(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'FLOOR[]', n); }

    stack.push(Math.floor(n / 0x40) * 0x40);
}

// CEILING[] CEILING
// 0x67
function CEILING(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'CEILING[]', n); }

    stack.push(Math.ceil(n / 0x40) * 0x40);
}

// ROUND[ab] ROUND value
// 0x68-0x6B
function ROUND(dt, state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'ROUND[]'); }

    stack.push(state.round(n / 0x40) * 0x40);
}

// WCVTF[] Write Control Value Table in Funits
// 0x70
function WCVTF(state) {
    var stack = state.stack;
    var v = stack.pop();
    var l = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'WCVTF[]', v, l); }

    state.cvt[l] = v * state.ppem / state.font.unitsPerEm;
}

// DELTAC1[] DELTA exception C1
// DELTAC2[] DELTA exception C2
// DELTAC3[] DELTA exception C3
// 0x73, 0x74, 0x75
function DELTAC123(b, state) {
    var stack = state.stack;
    var n = stack.pop();
    var ppem = state.ppem;
    var base = state.deltaBase + (b - 1) * 16;
    var ds = state.deltaShift;

    if (exports.DEBUG) { console.log(state.step, 'DELTAC[' + b + ']', n, stack); }

    for (var i = 0; i < n; i++) {
        var c = stack.pop();
        var arg = stack.pop();
        var appem = base + ((arg & 0xF0) >> 4);
        if (appem !== ppem) { continue; }

        var mag = (arg & 0x0F) - 8;
        if (mag >= 0) { mag++; }

        var delta = mag * ds;

        if (exports.DEBUG) { console.log(state.step, 'DELTACFIX', c, 'by', delta); }

        state.cvt[c] += delta;
    }
}

// SROUND[] Super ROUND
// 0x76
function SROUND(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SROUND[]', n); }

    state.round = roundSuper;

    var period;

    switch (n & 0xC0) {
        case 0x00:
            period = 0.5;
            break;
        case 0x40:
            period = 1;
            break;
        case 0x80:
            period = 2;
            break;
        default:
            throw new Error('invalid SROUND value');
    }

    state.srPeriod = period;

    switch (n & 0x30) {
        case 0x00:
            state.srPhase = 0;
            break;
        case 0x10:
            state.srPhase = 0.25 * period;
            break;
        case 0x20:
            state.srPhase = 0.5  * period;
            break;
        case 0x30:
            state.srPhase = 0.75 * period;
            break;
        default: throw new Error('invalid SROUND value');
    }

    n &= 0x0F;

    if (n === 0) { state.srThreshold = 0; }
    else { state.srThreshold = (n / 8 - 0.5) * period; }
}

// S45ROUND[] Super ROUND 45 degrees
// 0x77
function S45ROUND(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'S45ROUND[]', n); }

    state.round = roundSuper;

    var period;

    switch (n & 0xC0) {
        case 0x00:
            period = Math.sqrt(2) / 2;
            break;
        case 0x40:
            period = Math.sqrt(2);
            break;
        case 0x80:
            period = 2 * Math.sqrt(2);
            break;
        default:
            throw new Error('invalid S45ROUND value');
    }

    state.srPeriod = period;

    switch (n & 0x30) {
        case 0x00:
            state.srPhase = 0;
            break;
        case 0x10:
            state.srPhase = 0.25 * period;
            break;
        case 0x20:
            state.srPhase = 0.5  * period;
            break;
        case 0x30:
            state.srPhase = 0.75 * period;
            break;
        default:
            throw new Error('invalid S45ROUND value');
    }

    n &= 0x0F;

    if (n === 0) { state.srThreshold = 0; }
    else { state.srThreshold = (n / 8 - 0.5) * period; }
}

// ROFF[] Round Off
// 0x7A
function ROFF(state) {
    if (exports.DEBUG) { console.log(state.step, 'ROFF[]'); }

    state.round = roundOff;
}

// RUTG[] Round Up To Grid
// 0x7C
function RUTG(state) {
    if (exports.DEBUG) { console.log(state.step, 'RUTG[]'); }

    state.round = roundUpToGrid;
}

// RDTG[] Round Down To Grid
// 0x7D
function RDTG(state) {
    if (exports.DEBUG) { console.log(state.step, 'RDTG[]'); }

    state.round = roundDownToGrid;
}

// SCANCTRL[] SCAN conversion ConTRoL
// 0x85
function SCANCTRL(state) {
    var n = state.stack.pop();

    // ignored by opentype.js

    if (exports.DEBUG) { console.log(state.step, 'SCANCTRL[]', n); }
}

// SDPVTL[a] Set Dual Projection Vector To Line
// 0x86-0x87
function SDPVTL(a, state) {
    var stack = state.stack;
    var p2i = stack.pop();
    var p1i = stack.pop();
    var p2 = state.z2[p2i];
    var p1 = state.z1[p1i];

    if (exports.DEBUG) { console.log('SDPVTL[' + a + ']', p2i, p1i); }

    var dx;
    var dy;

    if (!a) {
        dx = p1.x - p2.x;
        dy = p1.y - p2.y;
    } else {
        dx = p2.y - p1.y;
        dy = p1.x - p2.x;
    }

    state.dpv = getUnitVector(dx, dy);
}

// GETINFO[] GET INFOrmation
// 0x88
function GETINFO(state) {
    var stack = state.stack;
    var sel = stack.pop();
    var r = 0;

    if (exports.DEBUG) { console.log(state.step, 'GETINFO[]', sel); }

    // v35 as in no subpixel hinting
    if (sel & 0x01) { r = 35; }

    // TODO rotation and stretch currently not supported
    // and thus those GETINFO are always 0.

    // opentype.js is always gray scaling
    if (sel & 0x20) { r |= 0x1000; }

    stack.push(r);
}

// ROLL[] ROLL the top three stack elements
// 0x8A
function ROLL(state) {
    var stack = state.stack;
    var a = stack.pop();
    var b = stack.pop();
    var c = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'ROLL[]'); }

    stack.push(b);
    stack.push(a);
    stack.push(c);
}

// MAX[] MAXimum of top two stack elements
// 0x8B
function MAX(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'MAX[]', e2, e1); }

    stack.push(Math.max(e1, e2));
}

// MIN[] MINimum of top two stack elements
// 0x8C
function MIN(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'MIN[]', e2, e1); }

    stack.push(Math.min(e1, e2));
}

// SCANTYPE[] SCANTYPE
// 0x8D
function SCANTYPE(state) {
    var n = state.stack.pop();
    // ignored by opentype.js
    if (exports.DEBUG) { console.log(state.step, 'SCANTYPE[]', n); }
}

// INSTCTRL[] INSTCTRL
// 0x8D
function INSTCTRL(state) {
    var s = state.stack.pop();
    var v = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'INSTCTRL[]', s, v); }

    switch (s) {
        case 1 : state.inhibitGridFit = !!v; return;
        case 2 : state.ignoreCvt = !!v; return;
        default: throw new Error('invalid INSTCTRL[] selector');
    }
}

// PUSHB[abc] PUSH Bytes
// 0xB0-0xB7
function PUSHB(n, state) {
    var stack = state.stack;
    var prog = state.prog;
    var ip = state.ip;

    if (exports.DEBUG) { console.log(state.step, 'PUSHB[' + n + ']'); }

    for (var i = 0; i < n; i++) { stack.push(prog[++ip]); }

    state.ip = ip;
}

// PUSHW[abc] PUSH Words
// 0xB8-0xBF
function PUSHW(n, state) {
    var ip = state.ip;
    var prog = state.prog;
    var stack = state.stack;

    if (exports.DEBUG) { console.log(state.ip, 'PUSHW[' + n + ']'); }

    for (var i = 0; i < n; i++) {
        var w = (prog[++ip] << 8) | prog[++ip];
        if (w & 0x8000) { w = -((w ^ 0xffff) + 1); }
        stack.push(w);
    }

    state.ip = ip;
}

// MDRP[abcde] Move Direct Relative Point
// 0xD0-0xEF
// (if indirect is 0)
//
// and
//
// MIRP[abcde] Move Indirect Relative Point
// 0xE0-0xFF
// (if indirect is 1)

function MDRP_MIRP(indirect, setRp0, keepD, ro, dt, state) {
    var stack = state.stack;
    var cvte = indirect && stack.pop();
    var pi = stack.pop();
    var rp0i = state.rp0;
    var rp = state.z0[rp0i];
    var p = state.z1[pi];

    var md = state.minDis;
    var fv = state.fv;
    var pv = state.dpv;
    var od; // original distance
    var d; // moving distance
    var sign; // sign of distance
    var cv;

    d = od = pv.distance(p, rp, true, true);
    sign = d >= 0 ? 1 : -1; // Math.sign would be 0 in case of 0

    // TODO consider autoFlip
    d = Math.abs(d);

    if (indirect) {
        cv = state.cvt[cvte];

        if (ro && Math.abs(d - cv) < state.cvCutIn) { d = cv; }
    }

    if (keepD && d < md) { d = md; }

    if (ro) { d = state.round(d); }

    fv.setRelative(p, rp, sign * d, pv);
    fv.touch(p);

    if (exports.DEBUG) {
        console.log(
            state.step,
            (indirect ? 'MIRP[' : 'MDRP[') +
            (setRp0 ? 'M' : 'm') +
            (keepD ? '>' : '_') +
            (ro ? 'R' : '_') +
            (dt === 0 ? 'Gr' : (dt === 1 ? 'Bl' : (dt === 2 ? 'Wh' : ''))) +
            ']',
            indirect ?
                cvte + '(' + state.cvt[cvte] + ',' +  cv + ')' :
                '',
            pi,
            '(d =', od, '->', sign * d, ')'
        );
    }

    state.rp1 = state.rp0;
    state.rp2 = pi;
    if (setRp0) { state.rp0 = pi; }
}

/*
* The instruction table.
*/
instructionTable = [
    /* 0x00 */ SVTCA.bind(undefined, yUnitVector),
    /* 0x01 */ SVTCA.bind(undefined, xUnitVector),
    /* 0x02 */ SPVTCA.bind(undefined, yUnitVector),
    /* 0x03 */ SPVTCA.bind(undefined, xUnitVector),
    /* 0x04 */ SFVTCA.bind(undefined, yUnitVector),
    /* 0x05 */ SFVTCA.bind(undefined, xUnitVector),
    /* 0x06 */ SPVTL.bind(undefined, 0),
    /* 0x07 */ SPVTL.bind(undefined, 1),
    /* 0x08 */ SFVTL.bind(undefined, 0),
    /* 0x09 */ SFVTL.bind(undefined, 1),
    /* 0x0A */ SPVFS,
    /* 0x0B */ SFVFS,
    /* 0x0C */ GPV,
    /* 0x0D */ GFV,
    /* 0x0E */ SFVTPV,
    /* 0x0F */ ISECT,
    /* 0x10 */ SRP0,
    /* 0x11 */ SRP1,
    /* 0x12 */ SRP2,
    /* 0x13 */ SZP0,
    /* 0x14 */ SZP1,
    /* 0x15 */ SZP2,
    /* 0x16 */ SZPS,
    /* 0x17 */ SLOOP,
    /* 0x18 */ RTG,
    /* 0x19 */ RTHG,
    /* 0x1A */ SMD,
    /* 0x1B */ ELSE,
    /* 0x1C */ JMPR,
    /* 0x1D */ SCVTCI,
    /* 0x1E */ undefined,   // TODO SSWCI
    /* 0x1F */ undefined,   // TODO SSW
    /* 0x20 */ DUP,
    /* 0x21 */ POP,
    /* 0x22 */ CLEAR,
    /* 0x23 */ SWAP,
    /* 0x24 */ DEPTH,
    /* 0x25 */ CINDEX,
    /* 0x26 */ MINDEX,
    /* 0x27 */ undefined,   // TODO ALIGNPTS
    /* 0x28 */ undefined,
    /* 0x29 */ undefined,   // TODO UTP
    /* 0x2A */ LOOPCALL,
    /* 0x2B */ CALL,
    /* 0x2C */ FDEF,
    /* 0x2D */ undefined,   // ENDF (eaten by FDEF)
    /* 0x2E */ MDAP.bind(undefined, 0),
    /* 0x2F */ MDAP.bind(undefined, 1),
    /* 0x30 */ IUP.bind(undefined, yUnitVector),
    /* 0x31 */ IUP.bind(undefined, xUnitVector),
    /* 0x32 */ SHP.bind(undefined, 0),
    /* 0x33 */ SHP.bind(undefined, 1),
    /* 0x34 */ SHC.bind(undefined, 0),
    /* 0x35 */ SHC.bind(undefined, 1),
    /* 0x36 */ SHZ.bind(undefined, 0),
    /* 0x37 */ SHZ.bind(undefined, 1),
    /* 0x38 */ SHPIX,
    /* 0x39 */ IP,
    /* 0x3A */ MSIRP.bind(undefined, 0),
    /* 0x3B */ MSIRP.bind(undefined, 1),
    /* 0x3C */ ALIGNRP,
    /* 0x3D */ RTDG,
    /* 0x3E */ MIAP.bind(undefined, 0),
    /* 0x3F */ MIAP.bind(undefined, 1),
    /* 0x40 */ NPUSHB,
    /* 0x41 */ NPUSHW,
    /* 0x42 */ WS,
    /* 0x43 */ RS,
    /* 0x44 */ WCVTP,
    /* 0x45 */ RCVT,
    /* 0x46 */ GC.bind(undefined, 0),
    /* 0x47 */ GC.bind(undefined, 1),
    /* 0x48 */ undefined,   // TODO SCFS
    /* 0x49 */ MD.bind(undefined, 0),
    /* 0x4A */ MD.bind(undefined, 1),
    /* 0x4B */ MPPEM,
    /* 0x4C */ undefined,   // TODO MPS
    /* 0x4D */ FLIPON,
    /* 0x4E */ undefined,   // TODO FLIPOFF
    /* 0x4F */ undefined,   // TODO DEBUG
    /* 0x50 */ LT,
    /* 0x51 */ LTEQ,
    /* 0x52 */ GT,
    /* 0x53 */ GTEQ,
    /* 0x54 */ EQ,
    /* 0x55 */ NEQ,
    /* 0x56 */ ODD,
    /* 0x57 */ EVEN,
    /* 0x58 */ IF,
    /* 0x59 */ EIF,
    /* 0x5A */ AND,
    /* 0x5B */ OR,
    /* 0x5C */ NOT,
    /* 0x5D */ DELTAP123.bind(undefined, 1),
    /* 0x5E */ SDB,
    /* 0x5F */ SDS,
    /* 0x60 */ ADD,
    /* 0x61 */ SUB,
    /* 0x62 */ DIV,
    /* 0x63 */ MUL,
    /* 0x64 */ ABS,
    /* 0x65 */ NEG,
    /* 0x66 */ FLOOR,
    /* 0x67 */ CEILING,
    /* 0x68 */ ROUND.bind(undefined, 0),
    /* 0x69 */ ROUND.bind(undefined, 1),
    /* 0x6A */ ROUND.bind(undefined, 2),
    /* 0x6B */ ROUND.bind(undefined, 3),
    /* 0x6C */ undefined,   // TODO NROUND[ab]
    /* 0x6D */ undefined,   // TODO NROUND[ab]
    /* 0x6E */ undefined,   // TODO NROUND[ab]
    /* 0x6F */ undefined,   // TODO NROUND[ab]
    /* 0x70 */ WCVTF,
    /* 0x71 */ DELTAP123.bind(undefined, 2),
    /* 0x72 */ DELTAP123.bind(undefined, 3),
    /* 0x73 */ DELTAC123.bind(undefined, 1),
    /* 0x74 */ DELTAC123.bind(undefined, 2),
    /* 0x75 */ DELTAC123.bind(undefined, 3),
    /* 0x76 */ SROUND,
    /* 0x77 */ S45ROUND,
    /* 0x78 */ undefined,   // TODO JROT[]
    /* 0x79 */ undefined,   // TODO JROF[]
    /* 0x7A */ ROFF,
    /* 0x7B */ undefined,
    /* 0x7C */ RUTG,
    /* 0x7D */ RDTG,
    /* 0x7E */ POP, // actually SANGW, supposed to do only a pop though
    /* 0x7F */ POP, // actually AA, supposed to do only a pop though
    /* 0x80 */ undefined,   // TODO FLIPPT
    /* 0x81 */ undefined,   // TODO FLIPRGON
    /* 0x82 */ undefined,   // TODO FLIPRGOFF
    /* 0x83 */ undefined,
    /* 0x84 */ undefined,
    /* 0x85 */ SCANCTRL,
    /* 0x86 */ SDPVTL.bind(undefined, 0),
    /* 0x87 */ SDPVTL.bind(undefined, 1),
    /* 0x88 */ GETINFO,
    /* 0x89 */ undefined,   // TODO IDEF
    /* 0x8A */ ROLL,
    /* 0x8B */ MAX,
    /* 0x8C */ MIN,
    /* 0x8D */ SCANTYPE,
    /* 0x8E */ INSTCTRL,
    /* 0x8F */ undefined,
    /* 0x90 */ undefined,
    /* 0x91 */ undefined,
    /* 0x92 */ undefined,
    /* 0x93 */ undefined,
    /* 0x94 */ undefined,
    /* 0x95 */ undefined,
    /* 0x96 */ undefined,
    /* 0x97 */ undefined,
    /* 0x98 */ undefined,
    /* 0x99 */ undefined,
    /* 0x9A */ undefined,
    /* 0x9B */ undefined,
    /* 0x9C */ undefined,
    /* 0x9D */ undefined,
    /* 0x9E */ undefined,
    /* 0x9F */ undefined,
    /* 0xA0 */ undefined,
    /* 0xA1 */ undefined,
    /* 0xA2 */ undefined,
    /* 0xA3 */ undefined,
    /* 0xA4 */ undefined,
    /* 0xA5 */ undefined,
    /* 0xA6 */ undefined,
    /* 0xA7 */ undefined,
    /* 0xA8 */ undefined,
    /* 0xA9 */ undefined,
    /* 0xAA */ undefined,
    /* 0xAB */ undefined,
    /* 0xAC */ undefined,
    /* 0xAD */ undefined,
    /* 0xAE */ undefined,
    /* 0xAF */ undefined,
    /* 0xB0 */ PUSHB.bind(undefined, 1),
    /* 0xB1 */ PUSHB.bind(undefined, 2),
    /* 0xB2 */ PUSHB.bind(undefined, 3),
    /* 0xB3 */ PUSHB.bind(undefined, 4),
    /* 0xB4 */ PUSHB.bind(undefined, 5),
    /* 0xB5 */ PUSHB.bind(undefined, 6),
    /* 0xB6 */ PUSHB.bind(undefined, 7),
    /* 0xB7 */ PUSHB.bind(undefined, 8),
    /* 0xB8 */ PUSHW.bind(undefined, 1),
    /* 0xB9 */ PUSHW.bind(undefined, 2),
    /* 0xBA */ PUSHW.bind(undefined, 3),
    /* 0xBB */ PUSHW.bind(undefined, 4),
    /* 0xBC */ PUSHW.bind(undefined, 5),
    /* 0xBD */ PUSHW.bind(undefined, 6),
    /* 0xBE */ PUSHW.bind(undefined, 7),
    /* 0xBF */ PUSHW.bind(undefined, 8),
    /* 0xC0 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 0, 0),
    /* 0xC1 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 0, 1),
    /* 0xC2 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 0, 2),
    /* 0xC3 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 0, 3),
    /* 0xC4 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 1, 0),
    /* 0xC5 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 1, 1),
    /* 0xC6 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 1, 2),
    /* 0xC7 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 1, 3),
    /* 0xC8 */ MDRP_MIRP.bind(undefined, 0, 0, 1, 0, 0),
    /* 0xC9 */ MDRP_MIRP.bind(undefined, 0, 0, 1, 0, 1),
    /* 0xCA */ MDRP_MIRP.bind(undefined, 0, 0, 1, 0, 2),
    /* 0xCB */ MDRP_MIRP.bind(undefined, 0, 0, 1, 0, 3),
    /* 0xCC */ MDRP_MIRP.bind(undefined, 0, 0, 1, 1, 0),
    /* 0xCD */ MDRP_MIRP.bind(undefined, 0, 0, 1, 1, 1),
    /* 0xCE */ MDRP_MIRP.bind(undefined, 0, 0, 1, 1, 2),
    /* 0xCF */ MDRP_MIRP.bind(undefined, 0, 0, 1, 1, 3),
    /* 0xD0 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 0, 0),
    /* 0xD1 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 0, 1),
    /* 0xD2 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 0, 2),
    /* 0xD3 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 0, 3),
    /* 0xD4 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 1, 0),
    /* 0xD5 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 1, 1),
    /* 0xD6 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 1, 2),
    /* 0xD7 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 1, 3),
    /* 0xD8 */ MDRP_MIRP.bind(undefined, 0, 1, 1, 0, 0),
    /* 0xD9 */ MDRP_MIRP.bind(undefined, 0, 1, 1, 0, 1),
    /* 0xDA */ MDRP_MIRP.bind(undefined, 0, 1, 1, 0, 2),
    /* 0xDB */ MDRP_MIRP.bind(undefined, 0, 1, 1, 0, 3),
    /* 0xDC */ MDRP_MIRP.bind(undefined, 0, 1, 1, 1, 0),
    /* 0xDD */ MDRP_MIRP.bind(undefined, 0, 1, 1, 1, 1),
    /* 0xDE */ MDRP_MIRP.bind(undefined, 0, 1, 1, 1, 2),
    /* 0xDF */ MDRP_MIRP.bind(undefined, 0, 1, 1, 1, 3),
    /* 0xE0 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 0, 0),
    /* 0xE1 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 0, 1),
    /* 0xE2 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 0, 2),
    /* 0xE3 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 0, 3),
    /* 0xE4 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 1, 0),
    /* 0xE5 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 1, 1),
    /* 0xE6 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 1, 2),
    /* 0xE7 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 1, 3),
    /* 0xE8 */ MDRP_MIRP.bind(undefined, 1, 0, 1, 0, 0),
    /* 0xE9 */ MDRP_MIRP.bind(undefined, 1, 0, 1, 0, 1),
    /* 0xEA */ MDRP_MIRP.bind(undefined, 1, 0, 1, 0, 2),
    /* 0xEB */ MDRP_MIRP.bind(undefined, 1, 0, 1, 0, 3),
    /* 0xEC */ MDRP_MIRP.bind(undefined, 1, 0, 1, 1, 0),
    /* 0xED */ MDRP_MIRP.bind(undefined, 1, 0, 1, 1, 1),
    /* 0xEE */ MDRP_MIRP.bind(undefined, 1, 0, 1, 1, 2),
    /* 0xEF */ MDRP_MIRP.bind(undefined, 1, 0, 1, 1, 3),
    /* 0xF0 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 0, 0),
    /* 0xF1 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 0, 1),
    /* 0xF2 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 0, 2),
    /* 0xF3 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 0, 3),
    /* 0xF4 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 1, 0),
    /* 0xF5 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 1, 1),
    /* 0xF6 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 1, 2),
    /* 0xF7 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 1, 3),
    /* 0xF8 */ MDRP_MIRP.bind(undefined, 1, 1, 1, 0, 0),
    /* 0xF9 */ MDRP_MIRP.bind(undefined, 1, 1, 1, 0, 1),
    /* 0xFA */ MDRP_MIRP.bind(undefined, 1, 1, 1, 0, 2),
    /* 0xFB */ MDRP_MIRP.bind(undefined, 1, 1, 1, 0, 3),
    /* 0xFC */ MDRP_MIRP.bind(undefined, 1, 1, 1, 1, 0),
    /* 0xFD */ MDRP_MIRP.bind(undefined, 1, 1, 1, 1, 1),
    /* 0xFE */ MDRP_MIRP.bind(undefined, 1, 1, 1, 1, 2),
    /* 0xFF */ MDRP_MIRP.bind(undefined, 1, 1, 1, 1, 3)
];



/*****************************
  Mathematical Considerations
******************************

fv ... refers to freedom vector
pv ... refers to projection vector
rp ... refers to reference point
p  ... refers to to point being operated on
d  ... refers to distance

SETRELATIVE:
============

case freedom vector == x-axis:
------------------------------

                        (pv)
                     .-'
              rpd .-'
               .-*
          d .-'90°'
         .-'       '
      .-'           '
   *-'               ' b
  rp                  '
                       '
                        '
            p *----------*-------------- (fv)
                          pm

  rpdx = rpx + d * pv.x
  rpdy = rpy + d * pv.y

  equation of line b

   y - rpdy = pvns * (x- rpdx)

   y = p.y

   x = rpdx + ( p.y - rpdy ) / pvns


case freedom vector == y-axis:
------------------------------

    * pm
    |\
    | \
    |  \
    |   \
    |    \
    |     \
    |      \
    |       \
    |        \
    |         \ b
    |          \
    |           \
    |            \    .-' (pv)
    |         90° \.-'
    |           .-'* rpd
    |        .-'
    *     *-'  d
    p     rp

  rpdx = rpx + d * pv.x
  rpdy = rpy + d * pv.y

  equation of line b:
           pvns ... normal slope to pv

   y - rpdy = pvns * (x - rpdx)

   x = p.x

   y = rpdy +  pvns * (p.x - rpdx)



generic case:
-------------


                              .'(fv)
                            .'
                          .* pm
                        .' !
                      .'    .
                    .'      !
                  .'         . b
                .'           !
               *              .
              p               !
                         90°   .    ... (pv)
                           ...-*-'''
                  ...---'''    rpd
         ...---'''   d
   *--'''
  rp

    rpdx = rpx + d * pv.x
    rpdy = rpy + d * pv.y

 equation of line b:
    pvns... normal slope to pv

    y - rpdy = pvns * (x - rpdx)

 equation of freedom vector line:
    fvs ... slope of freedom vector (=fy/fx)

    y - py = fvs * (x - px)


  on pm both equations are true for same x/y

    y - rpdy = pvns * (x - rpdx)

    y - py = fvs * (x - px)

  form to y and set equal:

    pvns * (x - rpdx) + rpdy = fvs * (x - px) + py

  expand:

    pvns * x - pvns * rpdx + rpdy = fvs * x - fvs * px + py

  switch:

    fvs * x - fvs * px + py = pvns * x - pvns * rpdx + rpdy

  solve for x:

    fvs * x - pvns * x = fvs * px - pvns * rpdx - py + rpdy



          fvs * px - pvns * rpdx + rpdy - py
    x =  -----------------------------------
                 fvs - pvns

  and:

    y = fvs * (x - px) + py



INTERPOLATE:
============

Examples of point interpolation.

The weight of the movement of the reference point gets bigger
the further the other reference point is away, thus the safest
option (that is avoiding 0/0 divisions) is to weight the
original distance of the other point by the sum of both distances.

If the sum of both distances is 0, then move the point by the
arithmetic average of the movement of both reference points.




           (+6)
    rp1o *---->*rp1
         .     .                          (+12)
         .     .                  rp2o *---------->* rp2
         .     .                       .           .
         .     .                       .           .
         .    10          20           .           .
         |.........|...................|           .
               .   .                               .
               .   . (+8)                          .
                po *------>*p                      .
               .           .                       .
               .    12     .          24           .
               |...........|.......................|
                                  36


-------



           (+10)
    rp1o *-------->*rp1
         .         .                      (-10)
         .         .              rp2 *<---------* rpo2
         .         .                   .         .
         .         .                   .         .
         .    10   .          30       .         .
         |.........|.............................|
                   .                   .
                   . (+5)              .
                po *--->* p            .
                   .    .              .
                   .    .   20         .
                   |....|..............|
                     5        15


-------


           (+10)
    rp1o *-------->*rp1
         .         .
         .         .
    rp2o *-------->*rp2


                               (+10)
                          po *-------->* p

-------


           (+10)
    rp1o *-------->*rp1
         .         .
         .         .(+30)
    rp2o *---------------------------->*rp2


                                        (+25)
                          po *----------------------->* p



vim: set ts=4 sw=4 expandtab:
*****/

// The Font object

/**
 * @typedef FontOptions
 * @type Object
 * @property {Boolean} empty - whether to create a new empty font
 * @property {string} familyName
 * @property {string} styleName
 * @property {string=} fullName
 * @property {string=} postScriptName
 * @property {string=} designer
 * @property {string=} designerURL
 * @property {string=} manufacturer
 * @property {string=} manufacturerURL
 * @property {string=} license
 * @property {string=} licenseURL
 * @property {string=} version
 * @property {string=} description
 * @property {string=} copyright
 * @property {string=} trademark
 * @property {Number} unitsPerEm
 * @property {Number} ascender
 * @property {Number} descender
 * @property {Number} createdTimestamp
 * @property {string=} weightClass
 * @property {string=} widthClass
 * @property {string=} fsSelection
 */

/**
 * A Font represents a loaded OpenType font file.
 * It contains a set of glyphs and methods to draw text on a drawing context,
 * or to get a path representing the text.
 * @exports opentype.Font
 * @class
 * @param {FontOptions}
 * @constructor
 */
function Font(options) {
    options = options || {};

    if (!options.empty) {
        // Check that we've provided the minimum set of names.
        checkArgument(options.familyName, 'When creating a new Font object, familyName is required.');
        checkArgument(options.styleName, 'When creating a new Font object, styleName is required.');
        checkArgument(options.unitsPerEm, 'When creating a new Font object, unitsPerEm is required.');
        checkArgument(options.ascender, 'When creating a new Font object, ascender is required.');
        checkArgument(options.descender, 'When creating a new Font object, descender is required.');
        checkArgument(options.descender < 0, 'Descender should be negative (e.g. -512).');

        // OS X will complain if the names are empty, so we put a single space everywhere by default.
        this.names = {
            fontFamily: {en: options.familyName || ' '},
            fontSubfamily: {en: options.styleName || ' '},
            fullName: {en: options.fullName || options.familyName + ' ' + options.styleName},
            postScriptName: {en: options.postScriptName || options.familyName + options.styleName},
            designer: {en: options.designer || ' '},
            designerURL: {en: options.designerURL || ' '},
            manufacturer: {en: options.manufacturer || ' '},
            manufacturerURL: {en: options.manufacturerURL || ' '},
            license: {en: options.license || ' '},
            licenseURL: {en: options.licenseURL || ' '},
            version: {en: options.version || 'Version 0.1'},
            description: {en: options.description || ' '},
            copyright: {en: options.copyright || ' '},
            trademark: {en: options.trademark || ' '}
        };
        this.unitsPerEm = options.unitsPerEm || 1000;
        this.ascender = options.ascender;
        this.descender = options.descender;
        this.createdTimestamp = options.createdTimestamp;
        this.tables = { os2: {
            usWeightClass: options.weightClass || this.usWeightClasses.MEDIUM,
            usWidthClass: options.widthClass || this.usWidthClasses.MEDIUM,
            fsSelection: options.fsSelection || this.fsSelectionValues.REGULAR
        } };
    }

    this.supported = true; // Deprecated: parseBuffer will throw an error if font is not supported.
    this.glyphs = new glyphset.GlyphSet(this, options.glyphs || []);
    this.encoding = new DefaultEncoding(this);
    this.substitution = new Substitution(this);
    this.tables = this.tables || {};

    Object.defineProperty(this, 'hinting', {
        get: function() {
            if (this._hinting) { return this._hinting; }
            if (this.outlinesFormat === 'truetype') {
                return (this._hinting = new Hinting(this));
            }
        }
    });
}

/**
 * Check if the font has a glyph for the given character.
 * @param  {string}
 * @return {Boolean}
 */
Font.prototype.hasChar = function(c) {
    return this.encoding.charToGlyphIndex(c) !== null;
};

/**
 * Convert the given character to a single glyph index.
 * Note that this function assumes that there is a one-to-one mapping between
 * the given character and a glyph; for complex scripts this might not be the case.
 * @param  {string}
 * @return {Number}
 */
Font.prototype.charToGlyphIndex = function(s) {
    return this.encoding.charToGlyphIndex(s);
};

/**
 * Convert the given character to a single Glyph object.
 * Note that this function assumes that there is a one-to-one mapping between
 * the given character and a glyph; for complex scripts this might not be the case.
 * @param  {string}
 * @return {opentype.Glyph}
 */
Font.prototype.charToGlyph = function(c) {
    var glyphIndex = this.charToGlyphIndex(c);
    var glyph = this.glyphs.get(glyphIndex);
    if (!glyph) {
        // .notdef
        glyph = this.glyphs.get(0);
    }

    return glyph;
};

/**
 * Convert the given text to a list of Glyph objects.
 * Note that there is no strict one-to-one mapping between characters and
 * glyphs, so the list of returned glyphs can be larger or smaller than the
 * length of the given string.
 * @param  {string}
 * @param  {GlyphRenderOptions} [options]
 * @return {opentype.Glyph[]}
 */
Font.prototype.stringToGlyphs = function(s, options) {
    var this$1 = this;

    options = options || this.defaultRenderOptions;
    // Get glyph indexes
    var indexes = [];
    for (var i = 0; i < s.length; i += 1) {
        var c = s[i];
        indexes.push(this$1.charToGlyphIndex(c));
    }
    var length = indexes.length;

    // Apply substitutions on glyph indexes
    if (options.features) {
        var script = options.script || this.substitution.getDefaultScriptName();
        var manyToOne = [];
        if (options.features.liga) { manyToOne = manyToOne.concat(this.substitution.getFeature('liga', script, options.language)); }
        if (options.features.rlig) { manyToOne = manyToOne.concat(this.substitution.getFeature('rlig', script, options.language)); }
        for (var i$1 = 0; i$1 < length; i$1 += 1) {
            for (var j = 0; j < manyToOne.length; j++) {
                var ligature = manyToOne[j];
                var components = ligature.sub;
                var compCount = components.length;
                var k = 0;
                while (k < compCount && components[k] === indexes[i$1 + k]) { k++; }
                if (k === compCount) {
                    indexes.splice(i$1, compCount, ligature.by);
                    length = length - compCount + 1;
                }
            }
        }
    }

    // convert glyph indexes to glyph objects
    var glyphs = new Array(length);
    var notdef = this.glyphs.get(0);
    for (var i$2 = 0; i$2 < length; i$2 += 1) {
        glyphs[i$2] = this$1.glyphs.get(indexes[i$2]) || notdef;
    }
    return glyphs;
};

/**
 * @param  {string}
 * @return {Number}
 */
Font.prototype.nameToGlyphIndex = function(name) {
    return this.glyphNames.nameToGlyphIndex(name);
};

/**
 * @param  {string}
 * @return {opentype.Glyph}
 */
Font.prototype.nameToGlyph = function(name) {
    var glyphIndex = this.nameToGlyphIndex(name);
    var glyph = this.glyphs.get(glyphIndex);
    if (!glyph) {
        // .notdef
        glyph = this.glyphs.get(0);
    }

    return glyph;
};

/**
 * @param  {Number}
 * @return {String}
 */
Font.prototype.glyphIndexToName = function(gid) {
    if (!this.glyphNames.glyphIndexToName) {
        return '';
    }

    return this.glyphNames.glyphIndexToName(gid);
};

/**
 * Retrieve the value of the kerning pair between the left glyph (or its index)
 * and the right glyph (or its index). If no kerning pair is found, return 0.
 * The kerning value gets added to the advance width when calculating the spacing
 * between glyphs.
 * @param  {opentype.Glyph} leftGlyph
 * @param  {opentype.Glyph} rightGlyph
 * @return {Number}
 */
Font.prototype.getKerningValue = function(leftGlyph, rightGlyph) {
    leftGlyph = leftGlyph.index || leftGlyph;
    rightGlyph = rightGlyph.index || rightGlyph;
    var gposKerning = this.getGposKerningValue;
    return gposKerning ? gposKerning(leftGlyph, rightGlyph) :
        (this.kerningPairs[leftGlyph + ',' + rightGlyph] || 0);
};

/**
 * @typedef GlyphRenderOptions
 * @type Object
 * @property {string} [script] - script used to determine which features to apply. By default, 'DFLT' or 'latn' is used.
 *                               See https://www.microsoft.com/typography/otspec/scripttags.htm
 * @property {string} [language='dflt'] - language system used to determine which features to apply.
 *                                        See https://www.microsoft.com/typography/developers/opentype/languagetags.aspx
 * @property {boolean} [kerning=true] - whether to include kerning values
 * @property {object} [features] - OpenType Layout feature tags. Used to enable or disable the features of the given script/language system.
 *                                 See https://www.microsoft.com/typography/otspec/featuretags.htm
 */
Font.prototype.defaultRenderOptions = {
    kerning: true,
    features: {
        liga: true,
        rlig: true
    }
};

/**
 * Helper function that invokes the given callback for each glyph in the given text.
 * The callback gets `(glyph, x, y, fontSize, options)`.* @param  {string} text
 * @param {string} text - The text to apply.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @param  {Function} callback
 */
Font.prototype.forEachGlyph = function(text, x, y, fontSize, options, callback) {
    var this$1 = this;

    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    options = options || this.defaultRenderOptions;
    var fontScale = 1 / this.unitsPerEm * fontSize;
    var glyphs = this.stringToGlyphs(text, options);
    for (var i = 0; i < glyphs.length; i += 1) {
        var glyph = glyphs[i];
        callback.call(this$1, glyph, x, y, fontSize, options);
        if (glyph.advanceWidth) {
            x += glyph.advanceWidth * fontScale;
        }

        if (options.kerning && i < glyphs.length - 1) {
            var kerningValue = this$1.getKerningValue(glyph, glyphs[i + 1]);
            x += kerningValue * fontScale;
        }

        if (options.letterSpacing) {
            x += options.letterSpacing * fontSize;
        } else if (options.tracking) {
            x += (options.tracking / 1000) * fontSize;
        }
    }
    return x;
};

/**
 * Create a Path object that represents the given text.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @return {opentype.Path}
 */
Font.prototype.getPath = function(text, x, y, fontSize, options) {
    var fullPath = new Path();
    this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
        var glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
        fullPath.extend(glyphPath);
    });
    return fullPath;
};

/**
 * Create an array of Path objects that represent the glyphs of a given text.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @return {opentype.Path[]}
 */
Font.prototype.getPaths = function(text, x, y, fontSize, options) {
    var glyphPaths = [];
    this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
        var glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
        glyphPaths.push(glyphPath);
    });

    return glyphPaths;
};

/**
 * Returns the advance width of a text.
 *
 * This is something different than Path.getBoundingBox() as for example a
 * suffixed whitespace increases the advanceWidth but not the bounding box
 * or an overhanging letter like a calligraphic 'f' might have a quite larger
 * bounding box than its advance width.
 *
 * This corresponds to canvas2dContext.measureText(text).width
 *
 * @param  {string} text - The text to create.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @return advance width
 */
Font.prototype.getAdvanceWidth = function(text, fontSize, options) {
    return this.forEachGlyph(text, 0, 0, fontSize, options, function() {});
};

/**
 * Draw the text on the given drawing context.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 */
Font.prototype.draw = function(ctx, text, x, y, fontSize, options) {
    this.getPath(text, x, y, fontSize, options).draw(ctx);
};

/**
 * Draw the points of all glyphs in the text.
 * On-curve points will be drawn in blue, off-curve points will be drawn in red.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param {string} text - The text to create.
 * @param {number} [x=0] - Horizontal position of the beginning of the text.
 * @param {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param {GlyphRenderOptions=} options
 */
Font.prototype.drawPoints = function(ctx, text, x, y, fontSize, options) {
    this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
        glyph.drawPoints(ctx, gX, gY, gFontSize);
    });
};

/**
 * Draw lines indicating important font measurements for all glyphs in the text.
 * Black lines indicate the origin of the coordinate system (point 0,0).
 * Blue lines indicate the glyph bounding box.
 * Green line indicates the advance width of the glyph.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param {string} text - The text to create.
 * @param {number} [x=0] - Horizontal position of the beginning of the text.
 * @param {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param {GlyphRenderOptions=} options
 */
Font.prototype.drawMetrics = function(ctx, text, x, y, fontSize, options) {
    this.forEachGlyph(text, x, y, fontSize, options, function(glyph, gX, gY, gFontSize) {
        glyph.drawMetrics(ctx, gX, gY, gFontSize);
    });
};

/**
 * @param  {string}
 * @return {string}
 */
Font.prototype.getEnglishName = function(name) {
    var translations = this.names[name];
    if (translations) {
        return translations.en;
    }
};

/**
 * Validate
 */
Font.prototype.validate = function() {
    var warnings = [];
    var _this = this;

    function assert(predicate, message) {
        if (!predicate) {
            warnings.push(message);
        }
    }

    function assertNamePresent(name) {
        var englishName = _this.getEnglishName(name);
        assert(englishName && englishName.trim().length > 0,
               'No English ' + name + ' specified.');
    }

    // Identification information
    assertNamePresent('fontFamily');
    assertNamePresent('weightName');
    assertNamePresent('manufacturer');
    assertNamePresent('copyright');
    assertNamePresent('version');

    // Dimension information
    assert(this.unitsPerEm > 0, 'No unitsPerEm specified.');
};

/**
 * Convert the font object to a SFNT data structure.
 * This structure contains all the necessary tables and metadata to create a binary OTF file.
 * @return {opentype.Table}
 */
Font.prototype.toTables = function() {
    return sfnt.fontToTable(this);
};
/**
 * @deprecated Font.toBuffer is deprecated. Use Font.toArrayBuffer instead.
 */
Font.prototype.toBuffer = function() {
    console.warn('Font.toBuffer is deprecated. Use Font.toArrayBuffer instead.');
    return this.toArrayBuffer();
};
/**
 * Converts a `opentype.Font` into an `ArrayBuffer`
 * @return {ArrayBuffer}
 */
Font.prototype.toArrayBuffer = function() {
    var sfntTable = this.toTables();
    var bytes = sfntTable.encode();
    var buffer = new ArrayBuffer(bytes.length);
    var intArray = new Uint8Array(buffer);
    for (var i = 0; i < bytes.length; i++) {
        intArray[i] = bytes[i];
    }

    return buffer;
};

/**
 * Initiate a download of the OpenType font.
 */
Font.prototype.download = function(fileName) {
    var familyName = this.getEnglishName('fontFamily');
    var styleName = this.getEnglishName('fontSubfamily');
    fileName = fileName || familyName.replace(/\s/g, '') + '-' + styleName + '.otf';
    var arrayBuffer = this.toArrayBuffer();

    if (isBrowser()) {
        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
        window.requestFileSystem(window.TEMPORARY, arrayBuffer.byteLength, function(fs) {
            fs.root.getFile(fileName, {create: true}, function(fileEntry) {
                fileEntry.createWriter(function(writer) {
                    var dataView = new DataView(arrayBuffer);
                    var blob = new Blob([dataView], {type: 'font/opentype'});
                    writer.write(blob);

                    writer.addEventListener('writeend', function() {
                        // Navigating to the file will download it.
                        location.href = fileEntry.toURL();
                    }, false);
                });
            });
        },
        function(err) {
            throw new Error(err.name + ': ' + err.message);
        });
    } else {
        var fs = require('fs');
        var buffer = arrayBufferToNodeBuffer(arrayBuffer);
        fs.writeFileSync(fileName, buffer);
    }
};
/**
 * @private
 */
Font.prototype.fsSelectionValues = {
    ITALIC:              0x001, //1
    UNDERSCORE:          0x002, //2
    NEGATIVE:            0x004, //4
    OUTLINED:            0x008, //8
    STRIKEOUT:           0x010, //16
    BOLD:                0x020, //32
    REGULAR:             0x040, //64
    USER_TYPO_METRICS:   0x080, //128
    WWS:                 0x100, //256
    OBLIQUE:             0x200  //512
};

/**
 * @private
 */
Font.prototype.usWidthClasses = {
    ULTRA_CONDENSED: 1,
    EXTRA_CONDENSED: 2,
    CONDENSED: 3,
    SEMI_CONDENSED: 4,
    MEDIUM: 5,
    SEMI_EXPANDED: 6,
    EXPANDED: 7,
    EXTRA_EXPANDED: 8,
    ULTRA_EXPANDED: 9
};

/**
 * @private
 */
Font.prototype.usWeightClasses = {
    THIN: 100,
    EXTRA_LIGHT: 200,
    LIGHT: 300,
    NORMAL: 400,
    MEDIUM: 500,
    SEMI_BOLD: 600,
    BOLD: 700,
    EXTRA_BOLD: 800,
    BLACK:    900
};

// The `fvar` table stores font variation axes and instances.
// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6fvar.html

function addName(name, names) {
    var nameString = JSON.stringify(name);
    var nameID = 256;
    for (var nameKey in names) {
        var n = parseInt(nameKey);
        if (!n || n < 256) {
            continue;
        }

        if (JSON.stringify(names[nameKey]) === nameString) {
            return n;
        }

        if (nameID <= n) {
            nameID = n + 1;
        }
    }

    names[nameID] = name;
    return nameID;
}

function makeFvarAxis(n, axis, names) {
    var nameID = addName(axis.name, names);
    return [
        {name: 'tag_' + n, type: 'TAG', value: axis.tag},
        {name: 'minValue_' + n, type: 'FIXED', value: axis.minValue << 16},
        {name: 'defaultValue_' + n, type: 'FIXED', value: axis.defaultValue << 16},
        {name: 'maxValue_' + n, type: 'FIXED', value: axis.maxValue << 16},
        {name: 'flags_' + n, type: 'USHORT', value: 0},
        {name: 'nameID_' + n, type: 'USHORT', value: nameID}
    ];
}

function parseFvarAxis(data, start, names) {
    var axis = {};
    var p = new parse.Parser(data, start);
    axis.tag = p.parseTag();
    axis.minValue = p.parseFixed();
    axis.defaultValue = p.parseFixed();
    axis.maxValue = p.parseFixed();
    p.skip('uShort', 1);  // reserved for flags; no values defined
    axis.name = names[p.parseUShort()] || {};
    return axis;
}

function makeFvarInstance(n, inst, axes, names) {
    var nameID = addName(inst.name, names);
    var fields = [
        {name: 'nameID_' + n, type: 'USHORT', value: nameID},
        {name: 'flags_' + n, type: 'USHORT', value: 0}
    ];

    for (var i = 0; i < axes.length; ++i) {
        var axisTag = axes[i].tag;
        fields.push({
            name: 'axis_' + n + ' ' + axisTag,
            type: 'FIXED',
            value: inst.coordinates[axisTag] << 16
        });
    }

    return fields;
}

function parseFvarInstance(data, start, axes, names) {
    var inst = {};
    var p = new parse.Parser(data, start);
    inst.name = names[p.parseUShort()] || {};
    p.skip('uShort', 1);  // reserved for flags; no values defined

    inst.coordinates = {};
    for (var i = 0; i < axes.length; ++i) {
        inst.coordinates[axes[i].tag] = p.parseFixed();
    }

    return inst;
}

function makeFvarTable(fvar, names) {
    var result = new table.Table('fvar', [
        {name: 'version', type: 'ULONG', value: 0x10000},
        {name: 'offsetToData', type: 'USHORT', value: 0},
        {name: 'countSizePairs', type: 'USHORT', value: 2},
        {name: 'axisCount', type: 'USHORT', value: fvar.axes.length},
        {name: 'axisSize', type: 'USHORT', value: 20},
        {name: 'instanceCount', type: 'USHORT', value: fvar.instances.length},
        {name: 'instanceSize', type: 'USHORT', value: 4 + fvar.axes.length * 4}
    ]);
    result.offsetToData = result.sizeOf();

    for (var i = 0; i < fvar.axes.length; i++) {
        result.fields = result.fields.concat(makeFvarAxis(i, fvar.axes[i], names));
    }

    for (var j = 0; j < fvar.instances.length; j++) {
        result.fields = result.fields.concat(makeFvarInstance(j, fvar.instances[j], fvar.axes, names));
    }

    return result;
}

function parseFvarTable(data, start, names) {
    var p = new parse.Parser(data, start);
    var tableVersion = p.parseULong();
    check.argument(tableVersion === 0x00010000, 'Unsupported fvar table version.');
    var offsetToData = p.parseOffset16();
    // Skip countSizePairs.
    p.skip('uShort', 1);
    var axisCount = p.parseUShort();
    var axisSize = p.parseUShort();
    var instanceCount = p.parseUShort();
    var instanceSize = p.parseUShort();

    var axes = [];
    for (var i = 0; i < axisCount; i++) {
        axes.push(parseFvarAxis(data, start + offsetToData + i * axisSize, names));
    }

    var instances = [];
    var instanceStart = start + offsetToData + axisCount * axisSize;
    for (var j = 0; j < instanceCount; j++) {
        instances.push(parseFvarInstance(data, instanceStart + j * instanceSize, axes, names));
    }

    return {axes: axes, instances: instances};
}

var fvar = { make: makeFvarTable, parse: parseFvarTable };

// The `GPOS` table contains kerning pairs, among other things.
// https://www.microsoft.com/typography/OTSPEC/gpos.htm

// Parse ScriptList and FeatureList tables of GPOS, GSUB, GDEF, BASE, JSTF tables.
// These lists are unused by now, this function is just the basis for a real parsing.
function parseTaggedListTable(data, start) {
    var p = new parse.Parser(data, start);
    var n = p.parseUShort();
    var list = [];
    for (var i = 0; i < n; i++) {
        list[p.parseTag()] = { offset: p.parseUShort() };
    }

    return list;
}

// Parse a coverage table in a GSUB, GPOS or GDEF table.
// Format 1 is a simple list of glyph ids,
// Format 2 is a list of ranges. It is expanded in a list of glyphs, maybe not the best idea.
function parseCoverageTable(data, start) {
    var p = new parse.Parser(data, start);
    var format = p.parseUShort();
    var count = p.parseUShort();
    if (format === 1) {
        return p.parseUShortList(count);
    } else if (format === 2) {
        var coverage = [];
        for (; count--;) {
            var begin = p.parseUShort();
            var end = p.parseUShort();
            var index = p.parseUShort();
            for (var i = begin; i <= end; i++) {
                coverage[index++] = i;
            }
        }

        return coverage;
    }
}

// Parse a Class Definition Table in a GSUB, GPOS or GDEF table.
// Returns a function that gets a class value from a glyph ID.
function parseClassDefTable(data, start) {
    var p = new parse.Parser(data, start);
    var format = p.parseUShort();
    if (format === 1) {
        // Format 1 specifies a range of consecutive glyph indices, one class per glyph ID.
        var startGlyph = p.parseUShort();
        var glyphCount = p.parseUShort();
        var classes = p.parseUShortList(glyphCount);
        return function(glyphID) {
            return classes[glyphID - startGlyph] || 0;
        };
    } else if (format === 2) {
        // Format 2 defines multiple groups of glyph indices that belong to the same class.
        var rangeCount = p.parseUShort();
        var startGlyphs = [];
        var endGlyphs = [];
        var classValues = [];
        for (var i = 0; i < rangeCount; i++) {
            startGlyphs[i] = p.parseUShort();
            endGlyphs[i] = p.parseUShort();
            classValues[i] = p.parseUShort();
        }

        return function(glyphID) {
            var l = 0;
            var r = startGlyphs.length - 1;
            while (l < r) {
                var c = (l + r + 1) >> 1;
                if (glyphID < startGlyphs[c]) {
                    r = c - 1;
                } else {
                    l = c;
                }
            }

            if (startGlyphs[l] <= glyphID && glyphID <= endGlyphs[l]) {
                return classValues[l] || 0;
            }

            return 0;
        };
    }
}

// Parse a pair adjustment positioning subtable, format 1 or format 2
// The subtable is returned in the form of a lookup function.
function parsePairPosSubTable(data, start) {
    var p = new parse.Parser(data, start);
    // This part is common to format 1 and format 2 subtables
    var format = p.parseUShort();
    var coverageOffset = p.parseUShort();
    var coverage = parseCoverageTable(data, start + coverageOffset);
    // valueFormat 4: XAdvance only, 1: XPlacement only, 0: no ValueRecord for second glyph
    // Only valueFormat1=4 and valueFormat2=0 is supported.
    var valueFormat1 = p.parseUShort();
    var valueFormat2 = p.parseUShort();
    var value1;
    var value2;
    if (valueFormat1 !== 4 || valueFormat2 !== 0) { return; }
    var sharedPairSets = {};
    if (format === 1) {
        // Pair Positioning Adjustment: Format 1
        var pairSetCount = p.parseUShort();
        var pairSet = [];
        // Array of offsets to PairSet tables-from beginning of PairPos subtable-ordered by Coverage Index
        var pairSetOffsets = p.parseOffset16List(pairSetCount);
        for (var firstGlyph = 0; firstGlyph < pairSetCount; firstGlyph++) {
            var pairSetOffset = pairSetOffsets[firstGlyph];
            var sharedPairSet = sharedPairSets[pairSetOffset];
            if (!sharedPairSet) {
                // Parse a pairset table in a pair adjustment subtable format 1
                sharedPairSet = {};
                p.relativeOffset = pairSetOffset;
                var pairValueCount = p.parseUShort();
                for (; pairValueCount--;) {
                    var secondGlyph = p.parseUShort();
                    if (valueFormat1) { value1 = p.parseShort(); }
                    if (valueFormat2) { value2 = p.parseShort(); }
                    // We only support valueFormat1 = 4 and valueFormat2 = 0,
                    // so value1 is the XAdvance and value2 is empty.
                    sharedPairSet[secondGlyph] = value1;
                }
            }

            pairSet[coverage[firstGlyph]] = sharedPairSet;
        }

        return function(leftGlyph, rightGlyph) {
            var pairs = pairSet[leftGlyph];
            if (pairs) { return pairs[rightGlyph]; }
        };
    } else if (format === 2) {
        // Pair Positioning Adjustment: Format 2
        var classDef1Offset = p.parseUShort();
        var classDef2Offset = p.parseUShort();
        var class1Count = p.parseUShort();
        var class2Count = p.parseUShort();
        var getClass1 = parseClassDefTable(data, start + classDef1Offset);
        var getClass2 = parseClassDefTable(data, start + classDef2Offset);

        // Parse kerning values by class pair.
        var kerningMatrix = [];
        for (var i = 0; i < class1Count; i++) {
            var kerningRow = kerningMatrix[i] = [];
            for (var j = 0; j < class2Count; j++) {
                if (valueFormat1) { value1 = p.parseShort(); }
                if (valueFormat2) { value2 = p.parseShort(); }
                // We only support valueFormat1 = 4 and valueFormat2 = 0,
                // so value1 is the XAdvance and value2 is empty.
                kerningRow[j] = value1;
            }
        }

        // Convert coverage list to a hash
        var covered = {};
        for (var i$1 = 0; i$1 < coverage.length; i$1++) {
            covered[coverage[i$1]] = 1;
        }

        // Get the kerning value for a specific glyph pair.
        return function(leftGlyph, rightGlyph) {
            if (!covered[leftGlyph]) { return; }
            var class1 = getClass1(leftGlyph);
            var class2 = getClass2(rightGlyph);
            var kerningRow = kerningMatrix[class1];

            if (kerningRow) {
                return kerningRow[class2];
            }
        };
    }
}

// Parse a LookupTable (present in of GPOS, GSUB, GDEF, BASE, JSTF tables).
function parseLookupTable(data, start) {
    var p = new parse.Parser(data, start);
    var lookupType = p.parseUShort();
    var lookupFlag = p.parseUShort();
    var useMarkFilteringSet = lookupFlag & 0x10;
    var subTableCount = p.parseUShort();
    var subTableOffsets = p.parseOffset16List(subTableCount);
    var table = {
        lookupType: lookupType,
        lookupFlag: lookupFlag,
        markFilteringSet: useMarkFilteringSet ? p.parseUShort() : -1
    };
    // LookupType 2, Pair adjustment
    if (lookupType === 2) {
        var subtables = [];
        for (var i = 0; i < subTableCount; i++) {
            var pairPosSubTable = parsePairPosSubTable(data, start + subTableOffsets[i]);
            if (pairPosSubTable) { subtables.push(pairPosSubTable); }
        }
        // Return a function which finds the kerning values in the subtables.
        table.getKerningValue = function(leftGlyph, rightGlyph) {
            for (var i = subtables.length; i--;) {
                var value = subtables[i](leftGlyph, rightGlyph);
                if (value !== undefined) { return value; }
            }

            return 0;
        };
    }

    return table;
}

// Parse the `GPOS` table which contains, among other things, kerning pairs.
// https://www.microsoft.com/typography/OTSPEC/gpos.htm
function parseGposTable(data, start, font) {
    var p = new parse.Parser(data, start);
    var tableVersion = p.parseFixed();
    check.argument(tableVersion === 1, 'Unsupported GPOS table version.');

    // ScriptList and FeatureList - ignored for now
    parseTaggedListTable(data, start + p.parseUShort());
    // 'kern' is the feature we are looking for.
    parseTaggedListTable(data, start + p.parseUShort());

    // LookupList
    var lookupListOffset = p.parseUShort();
    p.relativeOffset = lookupListOffset;
    var lookupCount = p.parseUShort();
    var lookupTableOffsets = p.parseOffset16List(lookupCount);
    var lookupListAbsoluteOffset = start + lookupListOffset;
    for (var i = 0; i < lookupCount; i++) {
        var table = parseLookupTable(data, lookupListAbsoluteOffset + lookupTableOffsets[i]);
        if (table.lookupType === 2 && !font.getGposKerningValue) { font.getGposKerningValue = table.getKerningValue; }
    }
}

var gpos = { parse: parseGposTable };

// The `kern` table contains kerning pairs.
// Note that some fonts use the GPOS OpenType layout table to specify kerning.
// https://www.microsoft.com/typography/OTSPEC/kern.htm

function parseWindowsKernTable(p) {
    var pairs = {};
    // Skip nTables.
    p.skip('uShort');
    var subtableVersion = p.parseUShort();
    check.argument(subtableVersion === 0, 'Unsupported kern sub-table version.');
    // Skip subtableLength, subtableCoverage
    p.skip('uShort', 2);
    var nPairs = p.parseUShort();
    // Skip searchRange, entrySelector, rangeShift.
    p.skip('uShort', 3);
    for (var i = 0; i < nPairs; i += 1) {
        var leftIndex = p.parseUShort();
        var rightIndex = p.parseUShort();
        var value = p.parseShort();
        pairs[leftIndex + ',' + rightIndex] = value;
    }
    return pairs;
}

function parseMacKernTable(p) {
    var pairs = {};
    // The Mac kern table stores the version as a fixed (32 bits) but we only loaded the first 16 bits.
    // Skip the rest.
    p.skip('uShort');
    var nTables = p.parseULong();
    //check.argument(nTables === 1, 'Only 1 subtable is supported (got ' + nTables + ').');
    if (nTables > 1) {
        console.warn('Only the first kern subtable is supported.');
    }
    p.skip('uLong');
    var coverage = p.parseUShort();
    var subtableVersion = coverage & 0xFF;
    p.skip('uShort');
    if (subtableVersion === 0) {
        var nPairs = p.parseUShort();
        // Skip searchRange, entrySelector, rangeShift.
        p.skip('uShort', 3);
        for (var i = 0; i < nPairs; i += 1) {
            var leftIndex = p.parseUShort();
            var rightIndex = p.parseUShort();
            var value = p.parseShort();
            pairs[leftIndex + ',' + rightIndex] = value;
        }
    }
    return pairs;
}

// Parse the `kern` table which contains kerning pairs.
function parseKernTable(data, start) {
    var p = new parse.Parser(data, start);
    var tableVersion = p.parseUShort();
    if (tableVersion === 0) {
        return parseWindowsKernTable(p);
    } else if (tableVersion === 1) {
        return parseMacKernTable(p);
    } else {
        throw new Error('Unsupported kern table version (' + tableVersion + ').');
    }
}

var kern = { parse: parseKernTable };

// The `loca` table stores the offsets to the locations of the glyphs in the font.
// https://www.microsoft.com/typography/OTSPEC/loca.htm

// Parse the `loca` table. This table stores the offsets to the locations of the glyphs in the font,
// relative to the beginning of the glyphData table.
// The number of glyphs stored in the `loca` table is specified in the `maxp` table (under numGlyphs)
// The loca table has two versions: a short version where offsets are stored as uShorts, and a long
// version where offsets are stored as uLongs. The `head` table specifies which version to use
// (under indexToLocFormat).
function parseLocaTable(data, start, numGlyphs, shortVersion) {
    var p = new parse.Parser(data, start);
    var parseFn = shortVersion ? p.parseUShort : p.parseULong;
    // There is an extra entry after the last index element to compute the length of the last glyph.
    // That's why we use numGlyphs + 1.
    var glyphOffsets = [];
    for (var i = 0; i < numGlyphs + 1; i += 1) {
        var glyphOffset = parseFn.call(p);
        if (shortVersion) {
            // The short table version stores the actual offset divided by 2.
            glyphOffset *= 2;
        }

        glyphOffsets.push(glyphOffset);
    }

    return glyphOffsets;
}

var loca = { parse: parseLocaTable };

// opentype.js
// https://github.com/nodebox/opentype.js
// (c) 2015 Frederik De Bleser
// opentype.js may be freely distributed under the MIT license.

/* global DataView, Uint8Array, XMLHttpRequest  */

/**
 * The opentype library.
 * @namespace opentype
 */

// File loaders /////////////////////////////////////////////////////////
/**
 * Loads a font from a file. The callback throws an error message as the first parameter if it fails
 * and the font as an ArrayBuffer in the second parameter if it succeeds.
 * @param  {string} path - The path of the file
 * @param  {Function} callback - The function to call when the font load completes
 */
function loadFromFile(path, callback) {
    var fs = require('fs');
    fs.readFile(path, function(err, buffer) {
        if (err) {
            return callback(err.message);
        }

        callback(null, nodeBufferToArrayBuffer(buffer));
    });
}
/**
 * Loads a font from a URL. The callback throws an error message as the first parameter if it fails
 * and the font as an ArrayBuffer in the second parameter if it succeeds.
 * @param  {string} url - The URL of the font file.
 * @param  {Function} callback - The function to call when the font load completes
 */
function loadFromUrl(url, callback) {
    var request = new XMLHttpRequest();
    request.open('get', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        if (request.status !== 200) {
            return callback('Font could not be loaded: ' + request.statusText);
        }

        return callback(null, request.response);
    };

    request.onerror = function () {
        callback('Font could not be loaded');
    };

    request.send();
}

// Table Directory Entries //////////////////////////////////////////////
/**
 * Parses OpenType table entries.
 * @param  {DataView}
 * @param  {Number}
 * @return {Object[]}
 */
function parseOpenTypeTableEntries(data, numTables) {
    var tableEntries = [];
    var p = 12;
    for (var i = 0; i < numTables; i += 1) {
        var tag = parse.getTag(data, p);
        var checksum = parse.getULong(data, p + 4);
        var offset = parse.getULong(data, p + 8);
        var length = parse.getULong(data, p + 12);
        tableEntries.push({tag: tag, checksum: checksum, offset: offset, length: length, compression: false});
        p += 16;
    }

    return tableEntries;
}

/**
 * Parses WOFF table entries.
 * @param  {DataView}
 * @param  {Number}
 * @return {Object[]}
 */
function parseWOFFTableEntries(data, numTables) {
    var tableEntries = [];
    var p = 44; // offset to the first table directory entry.
    for (var i = 0; i < numTables; i += 1) {
        var tag = parse.getTag(data, p);
        var offset = parse.getULong(data, p + 4);
        var compLength = parse.getULong(data, p + 8);
        var origLength = parse.getULong(data, p + 12);
        var compression = (void 0);
        if (compLength < origLength) {
            compression = 'WOFF';
        } else {
            compression = false;
        }

        tableEntries.push({tag: tag, offset: offset, compression: compression,
            compressedLength: compLength, length: origLength});
        p += 20;
    }

    return tableEntries;
}

/**
 * @typedef TableData
 * @type Object
 * @property {DataView} data - The DataView
 * @property {number} offset - The data offset.
 */

/**
 * @param  {DataView}
 * @param  {Object}
 * @return {TableData}
 */
function uncompressTable(data, tableEntry) {
    if (tableEntry.compression === 'WOFF') {
        var inBuffer = new Uint8Array(data.buffer, tableEntry.offset + 2, tableEntry.compressedLength - 2);
        var outBuffer = new Uint8Array(tableEntry.length);
        index(inBuffer, outBuffer);
        if (outBuffer.byteLength !== tableEntry.length) {
            throw new Error('Decompression error: ' + tableEntry.tag + ' decompressed length doesn\'t match recorded length');
        }

        var view = new DataView(outBuffer.buffer, 0);
        return {data: view, offset: 0};
    } else {
        return {data: data, offset: tableEntry.offset};
    }
}

// Public API ///////////////////////////////////////////////////////////

/**
 * Parse the OpenType file data (as an ArrayBuffer) and return a Font object.
 * Throws an error if the font could not be parsed.
 * @param  {ArrayBuffer}
 * @return {opentype.Font}
 */
function parseBuffer(buffer) {
    var indexToLocFormat;
    var ltagTable;

    // Since the constructor can also be called to create new fonts from scratch, we indicate this
    // should be an empty font that we'll fill with our own data.
    var font = new Font({empty: true});

    // OpenType fonts use big endian byte ordering.
    // We can't rely on typed array view types, because they operate with the endianness of the host computer.
    // Instead we use DataViews where we can specify endianness.
    var data = new DataView(buffer, 0);
    var numTables;
    var tableEntries = [];
    var signature = parse.getTag(data, 0);
    if (signature === String.fromCharCode(0, 1, 0, 0) || signature === 'true' || signature === 'typ1') {
        font.outlinesFormat = 'truetype';
        numTables = parse.getUShort(data, 4);
        tableEntries = parseOpenTypeTableEntries(data, numTables);
    } else if (signature === 'OTTO') {
        font.outlinesFormat = 'cff';
        numTables = parse.getUShort(data, 4);
        tableEntries = parseOpenTypeTableEntries(data, numTables);
    } else if (signature === 'wOFF') {
        var flavor = parse.getTag(data, 4);
        if (flavor === String.fromCharCode(0, 1, 0, 0)) {
            font.outlinesFormat = 'truetype';
        } else if (flavor === 'OTTO') {
            font.outlinesFormat = 'cff';
        } else {
            throw new Error('Unsupported OpenType flavor ' + signature);
        }

        numTables = parse.getUShort(data, 12);
        tableEntries = parseWOFFTableEntries(data, numTables);
    } else {
        throw new Error('Unsupported OpenType signature ' + signature);
    }

    var cffTableEntry;
    var fvarTableEntry;
    var glyfTableEntry;
    var gposTableEntry;
    var gsubTableEntry;
    var hmtxTableEntry;
    var kernTableEntry;
    var locaTableEntry;
    var nameTableEntry;
    var metaTableEntry;
    var p;

    for (var i = 0; i < numTables; i += 1) {
        var tableEntry = tableEntries[i];
        var table = (void 0);
        switch (tableEntry.tag) {
            case 'cmap':
                table = uncompressTable(data, tableEntry);
                font.tables.cmap = cmap.parse(table.data, table.offset);
                font.encoding = new CmapEncoding(font.tables.cmap);
                break;
            case 'cvt ' :
                table = uncompressTable(data, tableEntry);
                p = new parse.Parser(table.data, table.offset);
                font.tables.cvt = p.parseShortList(tableEntry.length / 2);
                break;
            case 'fvar':
                fvarTableEntry = tableEntry;
                break;
            case 'fpgm' :
                table = uncompressTable(data, tableEntry);
                p = new parse.Parser(table.data, table.offset);
                font.tables.fpgm = p.parseByteList(tableEntry.length);
                break;
            case 'head':
                table = uncompressTable(data, tableEntry);
                font.tables.head = head.parse(table.data, table.offset);
                font.unitsPerEm = font.tables.head.unitsPerEm;
                indexToLocFormat = font.tables.head.indexToLocFormat;
                break;
            case 'hhea':
                table = uncompressTable(data, tableEntry);
                font.tables.hhea = hhea.parse(table.data, table.offset);
                font.ascender = font.tables.hhea.ascender;
                font.descender = font.tables.hhea.descender;
                font.numberOfHMetrics = font.tables.hhea.numberOfHMetrics;
                break;
            case 'hmtx':
                hmtxTableEntry = tableEntry;
                break;
            case 'ltag':
                table = uncompressTable(data, tableEntry);
                ltagTable = ltag.parse(table.data, table.offset);
                break;
            case 'maxp':
                table = uncompressTable(data, tableEntry);
                font.tables.maxp = maxp.parse(table.data, table.offset);
                font.numGlyphs = font.tables.maxp.numGlyphs;
                break;
            case 'name':
                nameTableEntry = tableEntry;
                break;
            case 'OS/2':
                table = uncompressTable(data, tableEntry);
                font.tables.os2 = os2.parse(table.data, table.offset);
                break;
            case 'post':
                table = uncompressTable(data, tableEntry);
                font.tables.post = post.parse(table.data, table.offset);
                font.glyphNames = new GlyphNames(font.tables.post);
                break;
            case 'prep' :
                table = uncompressTable(data, tableEntry);
                p = new parse.Parser(table.data, table.offset);
                font.tables.prep = p.parseByteList(tableEntry.length);
                break;
            case 'glyf':
                glyfTableEntry = tableEntry;
                break;
            case 'loca':
                locaTableEntry = tableEntry;
                break;
            case 'CFF ':
                cffTableEntry = tableEntry;
                break;
            case 'kern':
                kernTableEntry = tableEntry;
                break;
            case 'GPOS':
                gposTableEntry = tableEntry;
                break;
            case 'GSUB':
                gsubTableEntry = tableEntry;
                break;
            case 'meta':
                metaTableEntry = tableEntry;
                break;
        }
    }

    var nameTable = uncompressTable(data, nameTableEntry);
    font.tables.name = _name.parse(nameTable.data, nameTable.offset, ltagTable);
    font.names = font.tables.name;

    if (glyfTableEntry && locaTableEntry) {
        var shortVersion = indexToLocFormat === 0;
        var locaTable = uncompressTable(data, locaTableEntry);
        var locaOffsets = loca.parse(locaTable.data, locaTable.offset, font.numGlyphs, shortVersion);
        var glyfTable = uncompressTable(data, glyfTableEntry);
        font.glyphs = glyf.parse(glyfTable.data, glyfTable.offset, locaOffsets, font);
    } else if (cffTableEntry) {
        var cffTable = uncompressTable(data, cffTableEntry);
        cff.parse(cffTable.data, cffTable.offset, font);
    } else {
        throw new Error('Font doesn\'t contain TrueType or CFF outlines.');
    }

    var hmtxTable = uncompressTable(data, hmtxTableEntry);
    hmtx.parse(hmtxTable.data, hmtxTable.offset, font.numberOfHMetrics, font.numGlyphs, font.glyphs);
    addGlyphNames(font);

    if (kernTableEntry) {
        var kernTable = uncompressTable(data, kernTableEntry);
        font.kerningPairs = kern.parse(kernTable.data, kernTable.offset);
    } else {
        font.kerningPairs = {};
    }

    if (gposTableEntry) {
        var gposTable = uncompressTable(data, gposTableEntry);
        gpos.parse(gposTable.data, gposTable.offset, font);
    }

    if (gsubTableEntry) {
        var gsubTable = uncompressTable(data, gsubTableEntry);
        font.tables.gsub = gsub.parse(gsubTable.data, gsubTable.offset);
    }

    if (fvarTableEntry) {
        var fvarTable = uncompressTable(data, fvarTableEntry);
        font.tables.fvar = fvar.parse(fvarTable.data, fvarTable.offset, font.names);
    }

    if (metaTableEntry) {
        var metaTable = uncompressTable(data, metaTableEntry);
        font.tables.meta = meta.parse(metaTable.data, metaTable.offset);
        font.metas = font.tables.meta;
    }

    return font;
}

/**
 * Asynchronously load the font from a URL or a filesystem. When done, call the callback
 * with two arguments `(err, font)`. The `err` will be null on success,
 * the `font` is a Font object.
 * We use the node.js callback convention so that
 * opentype.js can integrate with frameworks like async.js.
 * @alias opentype.load
 * @param  {string} url - The URL of the font to load.
 * @param  {Function} callback - The callback.
 */
function load(url, callback) {
    var isNode$$1 = typeof window === 'undefined';
    var loadFn = isNode$$1 ? loadFromFile : loadFromUrl;
    loadFn(url, function(err, arrayBuffer) {
        if (err) {
            return callback(err);
        }
        var font;
        try {
            font = parseBuffer(arrayBuffer);
        } catch (e) {
            return callback(e, null);
        }
        return callback(null, font);
    });
}

/**
 * Synchronously load the font from a URL or file.
 * When done, returns the font object or throws an error.
 * @alias opentype.loadSync
 * @param  {string} url - The URL of the font to load.
 * @return {opentype.Font}
 */
function loadSync(url) {
    var fs = require('fs');
    var buffer = fs.readFileSync(url);
    return parseBuffer(nodeBufferToArrayBuffer(buffer));
}

exports.Font = Font;
exports.Glyph = Glyph;
exports.Path = Path;
exports.BoundingBox = BoundingBox;
exports._parse = parse;
exports.parse = parseBuffer;
exports.load = load;
exports.loadSync = loadSync;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=opentype.js.map
;
fs.define('specimenTools/loadFonts',[
    'opentype'
], function(
    opentype
) {
    "use strict";
    /*globals setTimeout, FileReader, XMLHttpRequest, console*/

    function _publishLoaded(task, data) {
        var state = task.state
          , index = task.index
          , fontFileName = task.name
          , err = data.error
          , font = data.font
          , fontArraybuffer = data.arraybuffer
          ;

        if(err) {
            console.warn('Can\'t load font', fontFileName, ' with error:', err);
            state.countAll--;
        }
        else {
            state.pubsub.publish('loadFont', index, fontFileName, font, fontArraybuffer);
            state.countLoaded += 1;
        }

        if(state.countLoaded === state.countAll)
            state.pubsub.publish('allFontsLoaded', state.countAll);
    }

    function _getLoadedFontData(err, fontArraybuffer) {
        var err_ = err || null
          , font = null
          ;
        if(!err) {
            try {
                font =  opentype.parse(fontArraybuffer);
            }
            catch (parseError) {
                err_ = parseError;
            }
        }

        return {
            error:err_
          , font: font
          , arraybuffer:fontArraybuffer
        };
    }

    function _onLoadQueued(cache, key, err, fontArraybuffer) {
        var data, queue, i, l, task;

        cache.loaded[key] = data = _getLoadedFontData(err, fontArraybuffer);
        queue = cache.queues[key];
        delete cache.queues[key];

        for(i=0,l=queue.length;i<l;i++) {
            task = queue[i];
            _publishLoaded(task, data);
        }
    }

    /**
     * Callback for when a fontfile has been loaded
     *
     * @param i: index of the font loaded
     * @param fontFileName
     * @param err: null, error-object or string with error message
     * @param fontArraybuffer
     */
    function _onLoadFont(task, err, fontArraybuffer) {
        var data = _getLoadedFontData(err, fontArraybuffer);
        _publishLoaded(task, data);
    }

    function loadFromUrl(fontInfo, callback) {
        var request = new XMLHttpRequest()
          , url = fontInfo.url
          ;
        request.open('get', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            if (request.status !== 200) {
                return callback('Font could not be loaded: ' + request.statusText);
            }
            return callback(null, request.response);
        };
        request.send();
    }

    function fileInputFileOnLoad(callback, loadEvent) {
        /*jshint unused: vars, validthis:true*/
        callback(null, this.result);
    }
    function fileInputFileOnError(callback, loadEvent) {
        /*jshint unused: vars, validthis:true*/
        callback(this.error);
    }
    function loadFromFileInput(file, callback) {
        var reader = new FileReader();
        reader.onload = fileInputFileOnLoad.bind(reader, callback);
        reader.onerror = fileInputFileOnError.bind(reader, callback);
        reader.readAsArrayBuffer(file);
    }

    function loadFontsFromFileInput(pubsub, fileInputFiles) {
        _loadFonts(pubsub, fileInputFiles, loadFromFileInput);
    }
    loadFontsFromFileInput.needsPubSub = true;

    function loadFontsFromUrl(pubsub, fontFiles, cache) {
        var i, l
          , fontInfo = []
          ;
        for(i=0,l=fontFiles.length;i<l;i++) {
            if (!fontFiles[i])
                throw new Error('The url at index '+i+' appears to be invalid.');
            fontInfo.push({
                  name: fontFiles[i]
                , url: fontFiles[i]
                // this is for the cache and must be the same as url in this case,
                // to ensure we request a file only once
                , key: fontFiles[i]
            });
        }
        _loadFonts(pubsub, fontInfo, loadFromUrl, cache);
    }

    function _initCache(cache) {
        if(!('loaded' in cache))
            cache.loaded = Object.create(null);
        if(!('queues' in cache))
            cache.queues = Object.create(null);
    }

    function _loadFonts(pubsub, fontFiles, loadFont, cache) {
        var i, l, fontInfo, key, onload, task, data
          , loaderState = {
                countLoaded: 0
              , countAll: fontFiles.length
              , pubsub: pubsub
            }
          ;
        if(cache)
            _initCache(cache);

        filesLoop:
        for(i=0,l=fontFiles.length;i<l;i++) {
            fontInfo = fontFiles[i];
            pubsub.publish('prepareFont', i, fontInfo.name, l);
            task = {
                state: loaderState
              , index: i
              , name: fontInfo.name
            };
            onload = null;
            if(cache) {
                key = fontInfo.key;
                if(key in cache.loaded) {
                    data = cache.loaded[key];
                    // execute async
                    setTimeout(_publishLoaded.bind(null, task, data), 0);
                    continue filesLoop;
                }
                // put into queue
                if(!(key in cache.queues)) {
                    // initiate queue
                    cache.queues[key] = [];
                    onload = _onLoadQueued.bind(null, cache, key);
                }
                cache.queues[key].push(task);
            }
            else // no cache
                onload = _onLoadFont.bind(null, task);

            // if no cache or of queue was just initiated
            if(onload)
                loadFont(fontInfo, onload);
        }
    }

    return {
        fromUrl: loadFontsFromUrl
      , fromFileInput: loadFontsFromFileInput
    };
});

fs.define('specimenTools/initDocumentWidgets',[], function() {
    "use strict";

    /**
     * doc: a DOM document
     * factories: an array of arrays:
     *          [
     *              [
     *                  '.css-class-for-widget-container',
     *                  WidgetConstructor,
     *                  optional further WidgetConstructor_arguments
     *                  , ...
     *              ]
     *          ]
     *      A WidgetConstructor will be called essentially like this:
     *
     *      new WidgetConstructor(domContainer,
     *                            pubsub,
     *                            ..., further WidgetConstructor_arguments);
     */
    function initDocumentWidgets(doc, factories, pubsub) {
        var i, l, className, containersForClass, Constructor
         , j, ll, container
         , containers = []
         , args, instance
         ;
        for(i=0,l=factories.length;i<l;i++) {
            className = factories[i][0];
            containersForClass = doc.getElementsByClassName(className);
            if(!containersForClass.length)
                continue;
            Constructor = factories[i][1];
            for(j=0,ll=containersForClass.length;j<ll;j++) {
                container = containersForClass[j];
                containers.push(container);
                args = [container, pubsub];
                Array.prototype.push.apply(args, factories[i].slice(2));
                // this way we can call the Constructor with a
                // dynamic arguments list, i.e. by circumventing the `new`
                // keyword via Object.create.
                instance = Object.create(Constructor.prototype);
                Constructor.apply(instance, args);
            }
        }
        return containers;
    }

    return initDocumentWidgets;
});

fs.define('specimenTools/services/PubSub',[
], function(
) {
    "use strict";
    /**
     * Simple module for signaling.
     *
     * On a call to `pubSub.publish("channel-name"[, optional, arg1, ... args])`
     * the callback of all subscriptions of "channel-name" will be invoked
     * with the optional arguments given to `publish`:
     *          `callback(optional, arg1, ... args)`
     *
     * The subscriptions are always invoked in the order of subscription.
     *
     * There's no way to cancel subscription yet.
     */
    function PubSub() {
        this._callbacks = Object.create(null);
    }

    var _p = PubSub.prototype;

    _p.subscribe = function(channel, callback) {
        var callbacks = this._callbacks[channel];
        if(!callbacks)
            this._callbacks[channel] = callbacks = [];
        callbacks.push(callback);
    };

    _p.publish = function(channel /* , args, ... */) {
        var i, l
          , args = []
          , callbacks = this._callbacks[channel] || []
          ;
        for(i=1,l=arguments.length;i<l;i++)
            args.push(arguments[i]);
        for(i=0,l=callbacks.length;i<l;i++)
            callbacks[i].apply(null, args);
    };

    return PubSub;
});

fs.define('specimenTools/services/dom-tool',[
], function(
) {
    "use strict";

    function applyClasses (element, classes, remove) {
        if(!classes)
            return;
        if(typeof classes === 'string')
            classes = classes.split(' ').filter(function(item){return !!item;});
        if( element.classList )
            element.classList[remove ? 'remove' : 'add'].apply(element.classList, classes);
        else {
            // IE11 and SVG elements apparently :-/
            var classesToRemove
              , seen
              , filterFunc
              ;
            if(remove) {
                classesToRemove = new Set(classes);
                filterFunc = function(item) {
                    return !classesToRemove.has(item);
                };
            }
            else {
                seen = new Set();
                element.setAttribute('class', element.getAttribute('class')
                        + (' ' + classes.join(' '))
                );

                filterFunc = function(item) {
                    if(seen.has(item))
                        return false;
                    seen.add(item);
                    return true;

                };
            }
            element.setAttribute('class', element.getAttribute('class')
                                                 .split(' ')
                                                 .filter(filterFunc)
                                                 .join(' ')
                                );

        }
    }

    function insertElement(into, element, pos) {
        var children = into.children || into.childNodes
          , append = children.length
          ;
        if(pos === undefined || pos > append)
            pos = append;
        else if(pos < 0) {
            pos = children.length + pos;
            if(pos < 0)
                pos = 0;
        }
        if(pos === append)
            into.appendChild(element);
        else
            into.insertBefore(element, children[pos]);
    }

    return {
        applyClasses: applyClasses
      , insertElement: insertElement
    };
});

fs.define('specimenTools/_BaseWidget',[
    './services/dom-tool'
], function(
    domTool
){
    "use strict";

    function _BaseWidget(options) {
        this._options = this._makeOptions(options);
    }

    _BaseWidget.defaultOptions = {};

    var _p = _BaseWidget.prototype;
    _p.constructor = _BaseWidget;

    _p._makeOptions = function(options) {
            // With Object.keys we won't get keys from the prototype
            // of options but maybe we want this!?
        var keys = options ? Object.keys(options) : []
          , i, l
          , result = Object.create(this.constructor.defaultOptions)
          ;
        for(i=0,l=keys.length;i<l;i++)
            result[keys[i]] = options[keys[i]];
        return result;
    };

    _p._applyClasses = domTool.applyClasses;

    _p._cssName2jsName = function (name) {
        var pieces = name.split('-'), i, l;
        for(i=1,l=pieces.length;i<l;i++)
            pieces[i] = pieces[i][0].toUpperCase() + pieces[i].slice(1);
        return pieces.join('');
    };

    return _BaseWidget;
});

/**
 * @license text 2.0.15 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/text/LICENSE
 */
/*jslint regexp: true */
/*global require, XMLHttpRequest, ActiveXObject,
  define, window, process, Packages,
  java, location, Components, FileUtils */

fs.define('require/text',['module'], function (module) {
    'use strict';

    var text, fs, Cc, Ci, xpcIsWindows,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = {},
        masterConfig = (module.config && module.config()) || {};

    function useDefault(value, defaultValue) {
        return value === undefined || value === '' ? defaultValue : value;
    }

    //Allow for default ports for http and https.
    function isSamePort(protocol1, port1, protocol2, port2) {
        if (port1 === port2) {
            return true;
        } else if (protocol1 === protocol2) {
            if (protocol1 === 'http') {
                return useDefault(port1, '80') === useDefault(port2, '80');
            } else if (protocol1 === 'https') {
                return useDefault(port1, '443') === useDefault(port2, '443');
            }
        }
        return false;
    }

    text = {
        version: '2.0.15',

        strip: function (content) {
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            return content;
        },

        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var modName, ext, temp,
                strip = false,
                index = name.lastIndexOf("."),
                isRelative = name.indexOf('./') === 0 ||
                             name.indexOf('../') === 0;

            if (index !== -1 && (!isRelative || index > 1)) {
                modName = name.substring(0, index);
                ext = name.substring(index + 1);
            } else {
                modName = name;
            }

            temp = ext || modName;
            index = temp.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = temp.substring(index + 1) === "strip";
                temp = temp.substring(0, index);
                if (ext) {
                    ext = temp;
                } else {
                    modName = temp;
                }
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
        },

        xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

        /**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || isSamePort(uProtocol, uPort, protocol, port));
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config && config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            masterConfig.isBuild = config && config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName +
                    (parsed.ext ? '.' + parsed.ext : ''),
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            // Do not load if it is an empty: url
            if (url.indexOf('empty:') === 0) {
                onLoad();
                return;
            }

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                extPart = parsed.ext ? '.' + parsed.ext : '',
                nonStripName = parsed.moduleName + extPart,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + extPart) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }
    };

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node &&
            !process.versions['node-webkit'] &&
            !process.versions['atom-shell'])) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback, errback) {
            try {
                var file = fs.readFileSync(url, 'utf8');
                //Remove BOM (Byte Mark Order) from utf8 files if it is there.
                if (file[0] === '\uFEFF') {
                    file = file.substring(1);
                }
                callback(file);
            } catch (e) {
                if (errback) {
                    errback(e);
                }
            }
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback, headers) {
            var xhr = text.createXhr(), header;
            xhr.open('GET', url, true);

            //Allow plugins direct access to xhr headers
            if (headers) {
                for (header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header.toLowerCase(), headers[header]);
                    }
                }
            }

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status || 0;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        if (errback) {
                            errback(err);
                        }
                    } else {
                        callback(xhr.responseText);
                    }

                    if (masterConfig.onXhrComplete) {
                        masterConfig.onXhrComplete(xhr, url);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                if (line !== null) {
                    stringBuffer.append(line);
                }

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    } else if (masterConfig.env === 'xpconnect' || (!masterConfig.env &&
            typeof Components !== 'undefined' && Components.classes &&
            Components.interfaces)) {
        //Avert your gaze!
        Cc = Components.classes;
        Ci = Components.interfaces;
        Components.utils['import']('resource://gre/modules/FileUtils.jsm');
        xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

        text.get = function (url, callback) {
            var inStream, convertStream, fileObj,
                readData = {};

            if (xpcIsWindows) {
                url = url.replace(/\//g, '\\');
            }

            fileObj = new FileUtils.File(url);

            //XPCOM, you so crazy
            try {
                inStream = Cc['@mozilla.org/network/file-input-stream;1']
                           .createInstance(Ci.nsIFileInputStream);
                inStream.init(fileObj, 1, 0, false);

                convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                                .createInstance(Ci.nsIConverterInputStream);
                convertStream.init(inStream, "utf-8", inStream.available(),
                Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

                convertStream.readString(inStream.available(), readData);
                convertStream.close();
                inStream.close();
                callback(readData.value);
            } catch (e) {
                throw new Error((fileObj && fileObj.path || '') + ': ' + e);
            }
        };
    }
    return text;
});


fs.define('require/text!specimenTools/services/languageCharSets.json',[],function () { return '{"Afrikaans":"aáâbcdeéèêëfghiîïjklmnoôöpqrstuûvwxyzAÁÂBCDEÉÈÊËFGHIÎÏJKLMNOÔÖPQRSTUÛVWXYZ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Amharic":"ሀሁሂሃሄህሆለሉሊላሌልሎሏሐሑሒሓሔሕሖሗመሙሚማሜምሞሟሠሡሢሣሤሥሦሧረሩሪራሬርሮሯሰሱሲሳሴስሶሷሸሹሺሻሼሽሾሿቀቁቂቃቄቅቆቈቊቋቌቍበቡቢባቤብቦቧቨቩቪቫቬቭቮቯተቱቲታቴትቶቷቸቹቺቻቼችቾቿኀኁኂኃኄኅኆኈኊኋኌኍነኑኒናኔንኖኗኘኙኚኛኜኝኞኟአኡኢኣኤእኦኧከኩኪካኬክኮኰኲኳኴኵኸኹኺኻኼኽኾወዉዊዋዌውዎዐዑዒዓዔዕዖዘዙዚዛዜዝዞዟዠዡዢዣዤዥዦዧየዩዪያዬይዮደዱዲዳዴድዶዷጀጁጂጃጄጅጆጇገጉጊጋጌግጎጐጒጓጔጕጠጡጢጣጤጥጦጧጨጩጪጫጬጭጮጯጰጱጲጳጴጵጶጷጸጹጺጻጼጽጾጿፀፁፂፃፄፅፆፈፉፊፋፌፍፎፏፐፑፒፓፔፕፖፗ‐–,፡፣፤፥፦!?.።‹›«»()[]","Arabic":"ًٌٍَُِّْٰءأؤإئاآبةتثجحخدذرزسشصضطظعغفقكلمنهوىي-‐–—،؛:!؟.\'\\\\\\"()[]","Azerbaijani":"abcçdeəfgğhxıiİjkqlmnoöprsştuüvyzABCÇDEƏFGĞHXIJKQLMNOÖPRSŞTUÜVYZ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Belarusian":"абвгджзеёійклмнопрстуўфхцчшыьэюяАБВГДЖЗЕЁІЙКЛМНОПРСТУЎФХЦЧШЫЬЭЮЯ-,;:!?.«»()[]{}","Bulgarian":"абвгдежзийклмнопрстуфхцчшщъьюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ-‐–—,;:!?.…\'‘‚\\\\\\"“„()[]§*/″№","Bangla":"়৺অআইঈউঊঋৠঌৡএঐওঔংঃঁক\\\\u09CDষখগঘঙচছজঝঞটঠডBঢণতৎথদধনপফবভমযরলশসহঽািীুূৃৄৢৣেৈোৌ্ৗU-,;:!?.()[]{}","Bosnian":"abcčćdžđefghijklmnoprsštuvzABCČĆDŽĐEFGHIJKLMNOPRSŠTUVZ-,;:!?.()[]{}","Catalan":"·aàbcçdeéèfghiíïjklmnoóòpqrstuúüvwxyzAÀBCÇDEÉÈFGHIÍÏJKLMNOÓÒPQRSTUÚÜVWXYZ-‐–—,;:!¡?¿.…\'‘’\\\\\\"“”«»()[]§@*/\\\\\\\\&#†‡′″","Czech":"aábcčdďeéěfghiíjklmnňoópqrřsštťuúůvwxyýzžAÁBCČDĎEÉĚFGHIÍJKLMNŇOÓPQRŘSŠTŤUÚŮVWXYÝZŽ-‐–,;:!?.…‘‚“„()[]§@*/&","Welsh":"aáàâäbchdeéèêëfgniíìîïjlmoóòôöprstuúùûüwẃẁŵẅyýỳŷÿAÁÀÂÄBCHDEÉÈÊËFGNIÍÌÎÏJLMOÓÒÔÖPRSTUÚÙÛÜWẂẀŴẄYÝỲŶŸ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Danish":"abcdefghijklmnopqrstuvwxyzæøåABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ-‐–,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†′″","German":"aäbcdefghijklmnoöpqrsßtuüvwxyzAÄBCDEFGHIJKLMNOÖPQRSSSTUÜVWXYZ-‐–—,;:!?.…\'‘‚\\\\\\"“„«»()[]{}§@*/&#","Greek":"αάβγδεέζηήθιίϊΐκλμνξοόπρσςτυύϋΰφχψωώΑΆΒΓΔΕΈΖΗΉΘΙΊΪΪ́ΚΛΜΝΞΟΌΠΡΣΤΥΎΫΫ́ΦΧΨΩΏ-‐–—,;:!.…\\\\\\"«»()[]§@*/\\\\\\\\&","English":"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Spanish":"aábcdeéfghiíïjklmnñoópqrstuúüvwxyýzAÁBCDEÉFGHIÍÏJKLMNÑOÓPQRSTUÚÜVWXYÝZ-‐–—,;:!¡?¿.…\'‘’\\\\\\"“”«»()[]§@*/\\\\\\\\&#†‡′″","Estonian":"abcdefghijklmnopqrsšzžtuvwõäöüxyABCDEFGHIJKLMNOPQRSŠZŽTUVWÕÄÖÜXY-,;:!?.()[]{}","Basque":"abcçdefghijklmnñopqrstuvwxyzABCÇDEFGHIJKLMNÑOPQRSTUVWXYZ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Persian":"ًٌٍّٔآاءأؤئبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهةی-‐،٫٬؛:!؟.…‹›«»()[]*/\\\\\\\\","Finnish":"abcdefghijklmnopqrsštuvwxyzžåäöABCDEFGHIJKLMNOPQRSŠTUVWXYZŽÅÄÖ‐–,;:!?.…’”»()[]§@*/\\\\\\\\&#","Filipino":"abcdefghijklmnñopqrstuvwxyzABCDEFGHIJKLMNÑOPQRSTUVWXYZ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§*/&#′″","Faroese":"aábdðefghiíjklmnoóprstuúvyýæøAÁBDÐEFGHIÍJKLMNOÓPRSTUÚVYÝÆØ-‐–,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†′″","French":"aàâæbcçdeéèêëfghiîïjklmnoôœpqrstuùûüvwxyÿzAÀÂÆBCÇDEÉÈÊËFGHIÎÏJKLMNOÔŒPQRSTUÙÛÜVWXYŸZ-‐–—,;:!?.…’\\\\\\"“”«»()[]§@*/&#†‡","Irish":"aábcdeéfghiílmnoóprstuúAÁBCDEÉFGHIÍLMNOÓPRSTUÚ-,;:!?.()[]{}","Galician":"aábcdeéfghiíjklmnñoópqrstuúüvwxyzAÁBCDEÉFGHIÍJKLMNÑOÓPQRSTUÚÜVWXYZ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Gujarati":"઼ૐંઁઃઅઆઇઈઉઊઋૠઍએઐઑઓઔકખગઘઙચછજઝઞટઠડઢણતથદધનપફબભમયરલવશષસહળઽાિીુૂૃૄૅેૈૉોૌ્-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Hebrew":"אבגדהוזחטיכךלמםנןסעפףצץקרשת-‐–—,;:!?.׳\'\\\\\\"()[]/״־","Hindi":"़ॐंँःअआइईउऊऋऌऍएऐऑओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलळवशषसहऽािीुूृॄॅेैॉोौ्-,;:!?.‘’“”()[]{}॰","Croatian":"abcčćdžđefghijklmnoprsštuvzABCČĆDŽĐEFGHIJKLMNOPRSŠTUVZ‐–—,;:!?.…\'‘’‚\\\\\\"“”„()[]@*/′″","Hungarian":"aábcsdzeéfgyhiíjklmnoóöőprtuúüűvAÁBCSDZEÉFGYHIÍJKLMNOÓÖŐPRTUÚÜŰV-–,;:!?.…\'’\\\\\\"”„«»()[]{}⟨⟩§@*/&#~⁒","Armenian":"աբգդեզէըթժիլխծկհձղճմյնշոչպջռսվտրցւփքևօֆԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔԵՒՕՖ֊,՝:՜՞.«»՚՛՟","Indonesian":"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ‐–—,;:!?.…\'‘’“”()[]/","Icelandic":"aábdðeéfghiíjklmnoóprstuúvxyýþæöAÁBDÐEÉFGHIÍJKLMNOÓPRSTUÚVXYÝÞÆÖ-‐–—,;:!?.…\'‘‚\\\\\\"“„()[]§@*/&#†‡′″","Italian":"aàbcdeéèfghiìjklmnoóòpqrstuùvwxyzAÀBCDEÉÈFGHIÌJKLMNOÓÒPQRSTUÙVWXYZ-—,;:!?.…\'’\\\\\\"“”«»()[]{}@/","Japanese":"々ゝヽゞヾーぁァあアぃィいイぅゥうウヴぇェえエぉォおオヵかカがガきキぎギくクぐグヶけケげゲこコごゴさサざザしシじジすスずズせセぜゼそソぞゾたタだダちチぢヂっッつツづヅてテでデとトどドなナにニぬヌねネのノはハばバぱパひヒびビぴピふフぶブぷプへヘべベぺペほホぼボぽポまマみミむムめメもモゃャやヤゅュゆユょョよヨらラりリるルれレろロゎヮわワゐヰゑヱをヲんン一丁七万丈三上下不与丑且世丘丙両並中丸丹主久乏乗乙九乱乳乾亀了予争事二互五井亜亡交亥亨享京亭人仁今介仏仕他付仙代令以仮仰仲件任企伊伏伐休会伝伯伴伸伺似但位低住佐体何余作佳併使例侍供依価侮侯侵便係促俊俗保信修俳俵俸俺倉個倍倒候借倣値倫倹偉偏停健側偵偶偽傍傑傘備催債傷傾働像僕僚僧儀億儒償優元兄充兆先光克免兎児党入全八公六共兵具典兼内円冊再冒冗写冠冬冷准凍凝凡処凶凸凹出刀刃分切刈刊刑列初判別利到制刷券刺刻則削前剖剛剣剤副剰割創劇力功加劣助努励労効劾勅勇勉動勘務勝募勢勤勧勲勺匁包化北匠匹区医匿十千升午半卑卒卓協南単博占卯印危即却卵卸厄厘厚原厳去参又及友双反収叔取受叙口古句叫召可台史右号司各合吉同名后吏吐向君吟否含吸吹呈呉告周味呼命和咲哀品員哲唆唇唐唯唱商問啓善喚喜喝喪喫営嗣嘆嘉嘱器噴嚇囚四回因団困囲図固国圏園土圧在地坂均坊坑坪垂型垣埋城域執培基埼堀堂堅堕堤堪報場塀塁塊塑塔塗塚塩塾境墓増墜墨墳墾壁壇壊壌士壬壮声壱売変夏夕外多夜夢大天太夫央失奇奈奉奏契奔奥奨奪奮女奴好如妃妄妊妙妥妨妹妻姉始姓委姫姻姿威娘娠娯婆婚婦婿媒嫁嫌嫡嬢子孔字存孝季孤学孫宅宇守安完宗官宙定宜宝実客宣室宮宰害宴宵家容宿寂寄寅密富寒寛寝察寡寧審寮寸寺対寿封専射将尉尊尋導小少尚就尺尼尽尾尿局居屈届屋展属層履屯山岐岡岩岬岳岸峠峡峰島崇崎崩川州巡巣工左巧巨差己巳巻市布帆希帝帥師席帯帰帳常帽幅幕幣干平年幸幹幻幼幽幾庁広床序底店庚府度座庫庭庶康庸廃廉廊延廷建弁弊式弐弓弔引弘弟弦弧弱張強弾当形彩彫彰影役彼往征径待律後徐徒従得御復循微徳徴徹心必忌忍志忘忙応忠快念怒怖思怠急性怪恋恐恒恥恨恩恭息恵悔悟悠患悦悩悪悲悼情惑惜惨惰想愁愉意愚愛感慈態慌慎慕慢慣慨慮慰慶憂憎憤憩憲憶憾懇懐懲懸戊戌成我戒戦戯戸戻房所扇扉手才打払扱扶批承技抄把抑投抗折抜択披抱抵抹押抽担拍拐拒拓拘拙招拝拠拡括拷拾持指挑挙挟振挿捕捜捨据掃授掌排掘掛採探接控推措掲描提揚換握揮援揺損搬搭携搾摂摘摩撃撤撮撲擁操擦擬支改攻放政故敏救敗教敢散敬数整敵敷文斉斎斗料斜斤斥断新方施旅旋族旗既日旧旨早旬昆昇昌明易昔星映春昨昭是昼時晩普景晴晶暁暇暑暖暗暦暫暮暴曇曜曲更書曹替最月有服朕朗望朝期木未末本札朱朴机朽杉材村束条来杯東松板析林枚果枝枠枢枯架柄某染柔柱柳査栄栓校株核根格栽桃案桑桜桟梅械棄棋棒棚棟森棺植検業極楼楽概構様槽標模権横樹橋機欄欠次欧欲欺款歌歓止正武歩歯歳歴死殉殊残殖殴段殺殻殿母毎毒比毛氏民気水氷永汁求汎汗汚江池決汽沈沖没沢河沸油治沼沿況泉泊泌法泡波泣泥注泰泳洋洗洞津洪活派流浄浅浜浦浪浮浴海浸消涙涯液涼淑淡深混添清渇済渉渋渓減渡渦温測港湖湯湾湿満源準溝溶滅滋滑滝滞滴漁漂漆漏演漠漢漫漬漸潔潜潟潤潮澄激濁濃濫濯瀬火灯灰災炉炊炎炭点為烈無焦然焼煙照煩煮熟熱燃燥爆爵父片版牙牛牧物牲特犠犬犯状狂狩独狭猛猟猪猫献猶猿獄獣獲玄率玉王珍珠班現球理琴環璽瓶甘甚生産用田由甲申男町画界畑畔留畜畝略番異畳疎疑疫疲疾病症痘痛痢痴療癒癖癸発登白百的皆皇皮皿盆益盗盛盟監盤目盲直相盾省看県真眠眺眼着睡督瞬矛矢知短矯石砂研砕砲破硝硫硬碁碑確磁磨礁礎示礼社祈祉祖祚祝神祥票祭禁禄禅禍禎福秀私秋科秒秘租秩称移程税稚種稲稼稿穀穂積穏穫穴究空突窃窒窓窮窯立竜章童端競竹笑笛符第筆等筋筒答策箇算管箱節範築篤簡簿籍米粉粋粒粗粘粛粧精糖糧糸系糾紀約紅紋納純紙級紛素紡索紫累細紳紹紺終組経結絞絡給統絵絶絹継続維綱網綿緊総緑緒線締編緩緯練縁縄縛縦縫縮績繁繊織繕繭繰缶罪置罰署罷羅羊美群義羽翁翌習翻翼老考者耐耕耗耳聖聞聴職肉肌肖肝肢肥肩肪肯育肺胃胆背胎胞胴胸能脂脅脈脚脱脳脹腐腕腰腸腹膚膜膨臓臣臨自臭至致興舌舎舗舞舟航般舶船艇艦良色芋芝花芳芸芽苗若苦英茂茎茶草荒荘荷菊菌菓菜華落葉著葬蒸蓄蔵薄薦薪薫薬藤藩藻虎虐虚虜虞虫蚊蚕蛇蛍蛮融血衆行術街衛衝衡衣表衰衷袋被裁裂装裏裕補裸製複褐褒襟襲西要覆覇見規視覚覧親観角解触言訂計討訓託記訟訪設許訳訴診証詐詔評詞詠試詩詰話該詳誇誉誌認誓誕誘語誠誤説読誰課調談請論諭諮諸諾謀謁謄謙講謝謡謹識譜警議譲護谷豆豊豚象豪貝貞負財貢貧貨販貫責貯貴買貸費貿賀賃賄資賊賓賛賜賞賠賢賦質購贈赤赦走赴起超越趣足距跡路跳践踊踏躍身車軌軍軒軟転軸軽較載輝輩輪輸轄辛辞辰辱農辺込迅迎近返迫迭述迷追退送逃逆透逐逓途通逝速造連逮週進逸遂遅遇遊運遍過道達違遠遣適遭遮遵遷選遺避還邦邪邸郊郎郡部郭郵郷都酉酌配酒酔酢酪酬酵酷酸醜醸釈里重野量金針釣鈍鈴鉄鉛鉢鉱銀銃銅銑銘銭鋭鋳鋼錘錠錬錯録鍛鎖鎮鏡鐘鑑長門閉開閏閑間関閣閥閲闘阪防阻附降限陛院陣除陥陪陰陳陵陶陸険陽隅隆隊階随隔際障隠隣隷隻雄雅集雇雉雌雑離難雨雪雰雲零雷電需震霊霜霧露青静非面革靴韓音韻響頂頃項順預頑頒領頭頻頼題額顔顕願類顧風飛食飢飯飲飼飽飾養餓館首香馬駄駅駆駐騎騒験騰驚骨髄高髪鬼魂魅魔魚鮮鯨鳥鳴鶏鹿麗麦麻黄黒黙鼓鼠鼻齢‾_＿-－‐—―〜・･,，、､;；:：!！?？.．‥…。｡＇‘’\\\\\\"＂“”(（)）[［]］{｛}｝〈〉《》「｢」｣『』【】〔〕‖§¶@＠*＊/／\\\\\\\\＼&＆#＃%％‰†‡′″〃※","Georgian":"აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ-‐–—,;:!?.…჻\'‘‚“„«»()[]{}§@*/&#†‡′″№","Kazakh":"аәбвгғдеёжзийкқлмнңоөпрстуұүфхһцчшщъыіьэюяАӘБВГҒДЕЁЖЗИЙКҚЛМНҢОӨПРСТУҰҮФХҺЦЧШЩЪЫІЬЭЮЯ-‐–—,;:!?.…\'‘’\\\\\\"“”«»()[]{}§@*/&#","Khmer":"័ៈ់៉៊៍កខគឃងចឆជឈញដឋឌឍណតថទធនបផពភមយរឫឬលឭឮវសហឡអាឥឦឧឩឪឯឰឱឲឳិីឹឺុូួើឿៀេែៃោៅំះ្-,៖!?.។៕‘’\\\\\\"“”()[]{}៙៚","Kannada":"಼೦೧೨೩೪೫೬೭೮೯ಅಆಇಈಉಊಋೠಌೡಎಏಐಒಓಔಂಃಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಱಲವಶಷಸಹಳಽಾಿೀುೂೃೄೆೇೈೊೋೌ್ೕೖ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]@*/&#′″","Korean":"가각갂갃간갅갆갇갈갉갊갋갌갍갎갏감갑값갓갔강갖갗갘같갚갛개객갞갟갠갡갢갣갤갥갦갧갨갩갪갫갬갭갮갯갰갱갲갳갴갵갶갷갸갹갺갻갼갽갾갿걀걁걂걃걄걅걆걇걈걉걊걋걌걍걎걏걐걑걒걓걔걕걖걗걘걙걚걛걜걝걞걟걠걡걢걣걤걥걦걧걨걩걪걫걬걭걮걯거걱걲걳건걵걶걷걸걹걺걻걼걽걾걿검겁겂것겄겅겆겇겈겉겊겋게겍겎겏겐겑겒겓겔겕겖겗겘겙겚겛겜겝겞겟겠겡겢겣겤겥겦겧겨격겪겫견겭겮겯결겱겲겳겴겵겶겷겸겹겺겻겼경겾겿곀곁곂곃계곅곆곇곈곉곊곋곌곍곎곏곐곑곒곓곔곕곖곗곘곙곚곛곜곝곞곟고곡곢곣곤곥곦곧골곩곪곫곬곭곮곯곰곱곲곳곴공곶곷곸곹곺곻과곽곾곿관괁괂괃괄괅괆괇괈괉괊괋괌괍괎괏괐광괒괓괔괕괖괗괘괙괚괛괜괝괞괟괠괡괢괣괤괥괦괧괨괩괪괫괬괭괮괯괰괱괲괳괴괵괶괷괸괹괺괻괼괽괾괿굀굁굂굃굄굅굆굇굈굉굊굋굌굍굎굏교굑굒굓굔굕굖굗굘굙굚굛굜굝굞굟굠굡굢굣굤굥굦굧굨굩굪굫구국굮굯군굱굲굳굴굵굶굷굸굹굺굻굼굽굾굿궀궁궂궃궄궅궆궇궈궉궊궋권궍궎궏궐궑궒궓궔궕궖궗궘궙궚궛궜궝궞궟궠궡궢궣궤궥궦궧궨궩궪궫궬궭궮궯궰궱궲궳궴궵궶궷궸궹궺궻궼궽궾궿귀귁귂귃귄귅귆귇귈귉귊귋귌귍귎귏귐귑귒귓귔귕귖귗귘귙귚귛규귝귞귟균귡귢귣귤귥귦귧귨귩귪귫귬귭귮귯귰귱귲귳귴귵귶귷그극귺귻근귽귾귿글긁긂긃긄긅긆긇금급긊긋긌긍긎긏긐긑긒긓긔긕긖긗긘긙긚긛긜긝긞긟긠긡긢긣긤긥긦긧긨긩긪긫긬긭긮긯기긱긲긳긴긵긶긷길긹긺긻긼긽긾긿김깁깂깃깄깅깆깇깈깉깊깋까깍깎깏깐깑깒깓깔깕깖깗깘깙깚깛깜깝깞깟깠깡깢깣깤깥깦깧깨깩깪깫깬깭깮깯깰깱깲깳깴깵깶깷깸깹깺깻깼깽깾깿꺀꺁꺂꺃꺄꺅꺆꺇꺈꺉꺊꺋꺌꺍꺎꺏꺐꺑꺒꺓꺔꺕꺖꺗꺘꺙꺚꺛꺜꺝꺞꺟꺠꺡꺢꺣꺤꺥꺦꺧꺨꺩꺪꺫꺬꺭꺮꺯꺰꺱꺲꺳꺴꺵꺶꺷꺸꺹꺺꺻꺼꺽꺾꺿껀껁껂껃껄껅껆껇껈껉껊껋껌껍껎껏껐껑껒껓껔껕껖껗께껙껚껛껜껝껞껟껠껡껢껣껤껥껦껧껨껩껪껫껬껭껮껯껰껱껲껳껴껵껶껷껸껹껺껻껼껽껾껿꼀꼁꼂꼃꼄꼅꼆꼇꼈꼉꼊꼋꼌꼍꼎꼏꼐꼑꼒꼓꼔꼕꼖꼗꼘꼙꼚꼛꼜꼝꼞꼟꼠꼡꼢꼣꼤꼥꼦꼧꼨꼩꼪꼫꼬꼭꼮꼯꼰꼱꼲꼳꼴꼵꼶꼷꼸꼹꼺꼻꼼꼽꼾꼿꽀꽁꽂꽃꽄꽅꽆꽇꽈꽉꽊꽋꽌꽍꽎꽏꽐꽑꽒꽓꽔꽕꽖꽗꽘꽙꽚꽛꽜꽝꽞꽟꽠꽡꽢꽣꽤꽥꽦꽧꽨꽩꽪꽫꽬꽭꽮꽯꽰꽱꽲꽳꽴꽵꽶꽷꽸꽹꽺꽻꽼꽽꽾꽿꾀꾁꾂꾃꾄꾅꾆꾇꾈꾉꾊꾋꾌꾍꾎꾏꾐꾑꾒꾓꾔꾕꾖꾗꾘꾙꾚꾛꾜꾝꾞꾟꾠꾡꾢꾣꾤꾥꾦꾧꾨꾩꾪꾫꾬꾭꾮꾯꾰꾱꾲꾳꾴꾵꾶꾷꾸꾹꾺꾻꾼꾽꾾꾿꿀꿁꿂꿃꿄꿅꿆꿇꿈꿉꿊꿋꿌꿍꿎꿏꿐꿑꿒꿓꿔꿕꿖꿗꿘꿙꿚꿛꿜꿝꿞꿟꿠꿡꿢꿣꿤꿥꿦꿧꿨꿩꿪꿫꿬꿭꿮꿯꿰꿱꿲꿳꿴꿵꿶꿷꿸꿹꿺꿻꿼꿽꿾꿿뀀뀁뀂뀃뀄뀅뀆뀇뀈뀉뀊뀋뀌뀍뀎뀏뀐뀑뀒뀓뀔뀕뀖뀗뀘뀙뀚뀛뀜뀝뀞뀟뀠뀡뀢뀣뀤뀥뀦뀧뀨뀩뀪뀫뀬뀭뀮뀯뀰뀱뀲뀳뀴뀵뀶뀷뀸뀹뀺뀻뀼뀽뀾뀿끀끁끂끃끄끅끆끇끈끉끊끋끌끍끎끏끐끑끒끓끔끕끖끗끘끙끚끛끜끝끞끟끠끡끢끣끤끥끦끧끨끩끪끫끬끭끮끯끰끱끲끳끴끵끶끷끸끹끺끻끼끽끾끿낀낁낂낃낄낅낆낇낈낉낊낋낌낍낎낏낐낑낒낓낔낕낖낗나낙낚낛난낝낞낟날낡낢낣낤낥낦낧남납낪낫났낭낮낯낰낱낲낳내낵낶낷낸낹낺낻낼낽낾낿냀냁냂냃냄냅냆냇냈냉냊냋냌냍냎냏냐냑냒냓냔냕냖냗냘냙냚냛냜냝냞냟냠냡냢냣냤냥냦냧냨냩냪냫냬냭냮냯냰냱냲냳냴냵냶냷냸냹냺냻냼냽냾냿넀넁넂넃넄넅넆넇너넉넊넋넌넍넎넏널넑넒넓넔넕넖넗넘넙넚넛넜넝넞넟넠넡넢넣네넥넦넧넨넩넪넫넬넭넮넯넰넱넲넳넴넵넶넷넸넹넺넻넼넽넾넿녀녁녂녃년녅녆녇녈녉녊녋녌녍녎녏념녑녒녓녔녕녖녗녘녙녚녛녜녝녞녟녠녡녢녣녤녥녦녧녨녩녪녫녬녭녮녯녰녱녲녳녴녵녶녷노녹녺녻논녽녾녿놀놁놂놃놄놅놆놇놈놉놊놋놌농놎놏놐놑높놓놔놕놖놗놘놙놚놛놜놝놞놟놠놡놢놣놤놥놦놧놨놩놪놫놬놭놮놯놰놱놲놳놴놵놶놷놸놹놺놻놼놽놾놿뇀뇁뇂뇃뇄뇅뇆뇇뇈뇉뇊뇋뇌뇍뇎뇏뇐뇑뇒뇓뇔뇕뇖뇗뇘뇙뇚뇛뇜뇝뇞뇟뇠뇡뇢뇣뇤뇥뇦뇧뇨뇩뇪뇫뇬뇭뇮뇯뇰뇱뇲뇳뇴뇵뇶뇷뇸뇹뇺뇻뇼뇽뇾뇿눀눁눂눃누눅눆눇눈눉눊눋눌눍눎눏눐눑눒눓눔눕눖눗눘눙눚눛눜눝눞눟눠눡눢눣눤눥눦눧눨눩눪눫눬눭눮눯눰눱눲눳눴눵눶눷눸눹눺눻눼눽눾눿뉀뉁뉂뉃뉄뉅뉆뉇뉈뉉뉊뉋뉌뉍뉎뉏뉐뉑뉒뉓뉔뉕뉖뉗뉘뉙뉚뉛뉜뉝뉞뉟뉠뉡뉢뉣뉤뉥뉦뉧뉨뉩뉪뉫뉬뉭뉮뉯뉰뉱뉲뉳뉴뉵뉶뉷뉸뉹뉺뉻뉼뉽뉾뉿늀늁늂늃늄늅늆늇늈늉늊늋늌늍늎늏느늑늒늓는늕늖늗늘늙늚늛늜늝늞늟늠늡늢늣늤능늦늧늨늩늪늫늬늭늮늯늰늱늲늳늴늵늶늷늸늹늺늻늼늽늾늿닀닁닂닃닄닅닆닇니닉닊닋닌닍닎닏닐닑닒닓닔닕닖닗님닙닚닛닜닝닞닟닠닡닢닣다닥닦닧단닩닪닫달닭닮닯닰닱닲닳담답닶닷닸당닺닻닼닽닾닿대댁댂댃댄댅댆댇댈댉댊댋댌댍댎댏댐댑댒댓댔댕댖댗댘댙댚댛댜댝댞댟댠댡댢댣댤댥댦댧댨댩댪댫댬댭댮댯댰댱댲댳댴댵댶댷댸댹댺댻댼댽댾댿덀덁덂덃덄덅덆덇덈덉덊덋덌덍덎덏덐덑덒덓더덕덖덗던덙덚덛덜덝덞덟덠덡덢덣덤덥덦덧덨덩덪덫덬덭덮덯데덱덲덳덴덵덶덷델덹덺덻덼덽덾덿뎀뎁뎂뎃뎄뎅뎆뎇뎈뎉뎊뎋뎌뎍뎎뎏뎐뎑뎒뎓뎔뎕뎖뎗뎘뎙뎚뎛뎜뎝뎞뎟뎠뎡뎢뎣뎤뎥뎦뎧뎨뎩뎪뎫뎬뎭뎮뎯뎰뎱뎲뎳뎴뎵뎶뎷뎸뎹뎺뎻뎼뎽뎾뎿돀돁돂돃도독돆돇돈돉돊돋돌돍돎돏돐돑돒돓돔돕돖돗돘동돚돛돜돝돞돟돠돡돢돣돤돥돦돧돨돩돪돫돬돭돮돯돰돱돲돳돴돵돶돷돸돹돺돻돼돽돾돿됀됁됂됃됄됅됆됇됈됉됊됋됌됍됎됏됐됑됒됓됔됕됖됗되됙됚됛된됝됞됟될됡됢됣됤됥됦됧됨됩됪됫됬됭됮됯됰됱됲됳됴됵됶됷됸됹됺됻됼됽됾됿둀둁둂둃둄둅둆둇둈둉둊둋둌둍둎둏두둑둒둓둔둕둖둗둘둙둚둛둜둝둞둟둠둡둢둣둤둥둦둧둨둩둪둫둬둭둮둯둰둱둲둳둴둵둶둷둸둹둺둻둼둽둾둿뒀뒁뒂뒃뒄뒅뒆뒇뒈뒉뒊뒋뒌뒍뒎뒏뒐뒑뒒뒓뒔뒕뒖뒗뒘뒙뒚뒛뒜뒝뒞뒟뒠뒡뒢뒣뒤뒥뒦뒧뒨뒩뒪뒫뒬뒭뒮뒯뒰뒱뒲뒳뒴뒵뒶뒷뒸뒹뒺뒻뒼뒽뒾뒿듀듁듂듃듄듅듆듇듈듉듊듋듌듍듎듏듐듑듒듓듔듕듖듗듘듙듚듛드득듞듟든듡듢듣들듥듦듧듨듩듪듫듬듭듮듯듰등듲듳듴듵듶듷듸듹듺듻듼듽듾듿딀딁딂딃딄딅딆딇딈딉딊딋딌딍딎딏딐딑딒딓디딕딖딗딘딙딚딛딜딝딞딟딠딡딢딣딤딥딦딧딨딩딪딫딬딭딮딯따딱딲딳딴딵딶딷딸딹딺딻딼딽딾딿땀땁땂땃땄땅땆땇땈땉땊땋때땍땎땏땐땑땒땓땔땕땖땗땘땙땚땛땜땝땞땟땠땡땢땣땤땥땦땧땨땩땪땫땬땭땮땯땰땱땲땳땴땵땶땷땸땹땺땻땼땽땾땿떀떁떂떃떄떅떆떇떈떉떊떋떌떍떎떏떐떑떒떓떔떕떖떗떘떙떚떛떜떝떞떟떠떡떢떣떤떥떦떧떨떩떪떫떬떭떮떯떰떱떲떳떴떵떶떷떸떹떺떻떼떽떾떿뗀뗁뗂뗃뗄뗅뗆뗇뗈뗉뗊뗋뗌뗍뗎뗏뗐뗑뗒뗓뗔뗕뗖뗗뗘뗙뗚뗛뗜뗝뗞뗟뗠뗡뗢뗣뗤뗥뗦뗧뗨뗩뗪뗫뗬뗭뗮뗯뗰뗱뗲뗳뗴뗵뗶뗷뗸뗹뗺뗻뗼뗽뗾뗿똀똁똂똃똄똅똆똇똈똉똊똋똌똍똎똏또똑똒똓똔똕똖똗똘똙똚똛똜똝똞똟똠똡똢똣똤똥똦똧똨똩똪똫똬똭똮똯똰똱똲똳똴똵똶똷똸똹똺똻똼똽똾똿뙀뙁뙂뙃뙄뙅뙆뙇뙈뙉뙊뙋뙌뙍뙎뙏뙐뙑뙒뙓뙔뙕뙖뙗뙘뙙뙚뙛뙜뙝뙞뙟뙠뙡뙢뙣뙤뙥뙦뙧뙨뙩뙪뙫뙬뙭뙮뙯뙰뙱뙲뙳뙴뙵뙶뙷뙸뙹뙺뙻뙼뙽뙾뙿뚀뚁뚂뚃뚄뚅뚆뚇뚈뚉뚊뚋뚌뚍뚎뚏뚐뚑뚒뚓뚔뚕뚖뚗뚘뚙뚚뚛뚜뚝뚞뚟뚠뚡뚢뚣뚤뚥뚦뚧뚨뚩뚪뚫뚬뚭뚮뚯뚰뚱뚲뚳뚴뚵뚶뚷뚸뚹뚺뚻뚼뚽뚾뚿뛀뛁뛂뛃뛄뛅뛆뛇뛈뛉뛊뛋뛌뛍뛎뛏뛐뛑뛒뛓뛔뛕뛖뛗뛘뛙뛚뛛뛜뛝뛞뛟뛠뛡뛢뛣뛤뛥뛦뛧뛨뛩뛪뛫뛬뛭뛮뛯뛰뛱뛲뛳뛴뛵뛶뛷뛸뛹뛺뛻뛼뛽뛾뛿뜀뜁뜂뜃뜄뜅뜆뜇뜈뜉뜊뜋뜌뜍뜎뜏뜐뜑뜒뜓뜔뜕뜖뜗뜘뜙뜚뜛뜜뜝뜞뜟뜠뜡뜢뜣뜤뜥뜦뜧뜨뜩뜪뜫뜬뜭뜮뜯뜰뜱뜲뜳뜴뜵뜶뜷뜸뜹뜺뜻뜼뜽뜾뜿띀띁띂띃띄띅띆띇띈띉띊띋띌띍띎띏띐띑띒띓띔띕띖띗띘띙띚띛띜띝띞띟띠띡띢띣띤띥띦띧띨띩띪띫띬띭띮띯띰띱띲띳띴띵띶띷띸띹띺띻라락띾띿란랁랂랃랄랅랆랇랈랉랊랋람랍랎랏랐랑랒랓랔랕랖랗래랙랚랛랜랝랞랟랠랡랢랣랤랥랦랧램랩랪랫랬랭랮랯랰랱랲랳랴략랶랷랸랹랺랻랼랽랾랿럀럁럂럃럄럅럆럇럈량럊럋럌럍럎럏럐럑럒럓럔럕럖럗럘럙럚럛럜럝럞럟럠럡럢럣럤럥럦럧럨럩럪럫러럭럮럯런럱럲럳럴럵럶럷럸럹럺럻럼럽럾럿렀렁렂렃렄렅렆렇레렉렊렋렌렍렎렏렐렑렒렓렔렕렖렗렘렙렚렛렜렝렞렟렠렡렢렣려력렦렧련렩렪렫렬렭렮렯렰렱렲렳렴렵렶렷렸령렺렻렼렽렾렿례롁롂롃롄롅롆롇롈롉롊롋롌롍롎롏롐롑롒롓롔롕롖롗롘롙롚롛로록롞롟론롡롢롣롤롥롦롧롨롩롪롫롬롭롮롯롰롱롲롳롴롵롶롷롸롹롺롻롼롽롾롿뢀뢁뢂뢃뢄뢅뢆뢇뢈뢉뢊뢋뢌뢍뢎뢏뢐뢑뢒뢓뢔뢕뢖뢗뢘뢙뢚뢛뢜뢝뢞뢟뢠뢡뢢뢣뢤뢥뢦뢧뢨뢩뢪뢫뢬뢭뢮뢯뢰뢱뢲뢳뢴뢵뢶뢷뢸뢹뢺뢻뢼뢽뢾뢿룀룁룂룃룄룅룆룇룈룉룊룋료룍룎룏룐룑룒룓룔룕룖룗룘룙룚룛룜룝룞룟룠룡룢룣룤룥룦룧루룩룪룫룬룭룮룯룰룱룲룳룴룵룶룷룸룹룺룻룼룽룾룿뤀뤁뤂뤃뤄뤅뤆뤇뤈뤉뤊뤋뤌뤍뤎뤏뤐뤑뤒뤓뤔뤕뤖뤗뤘뤙뤚뤛뤜뤝뤞뤟뤠뤡뤢뤣뤤뤥뤦뤧뤨뤩뤪뤫뤬뤭뤮뤯뤰뤱뤲뤳뤴뤵뤶뤷뤸뤹뤺뤻뤼뤽뤾뤿륀륁륂륃륄륅륆륇륈륉륊륋륌륍륎륏륐륑륒륓륔륕륖륗류륙륚륛륜륝륞륟률륡륢륣륤륥륦륧륨륩륪륫륬륭륮륯륰륱륲륳르륵륶륷른륹륺륻를륽륾륿릀릁릂릃름릅릆릇릈릉릊릋릌릍릎릏릐릑릒릓릔릕릖릗릘릙릚릛릜릝릞릟릠릡릢릣릤릥릦릧릨릩릪릫리릭릮릯린릱릲릳릴릵릶릷릸릹릺릻림립릾릿맀링맂맃맄맅맆맇마막맊맋만맍많맏말맑맒맓맔맕맖맗맘맙맚맛맜망맞맟맠맡맢맣매맥맦맧맨맩맪맫맬맭맮맯맰맱맲맳맴맵맶맷맸맹맺맻맼맽맾맿먀먁먂먃먄먅먆먇먈먉먊먋먌먍먎먏먐먑먒먓먔먕먖먗먘먙먚먛먜먝먞먟먠먡먢먣먤먥먦먧먨먩먪먫먬먭먮먯먰먱먲먳먴먵먶먷머먹먺먻먼먽먾먿멀멁멂멃멄멅멆멇멈멉멊멋멌멍멎멏멐멑멒멓메멕멖멗멘멙멚멛멜멝멞멟멠멡멢멣멤멥멦멧멨멩멪멫멬멭멮멯며멱멲멳면멵멶멷멸멹멺멻멼멽멾멿몀몁몂몃몄명몆몇몈몉몊몋몌몍몎몏몐몑몒몓몔몕몖몗몘몙몚몛몜몝몞몟몠몡몢몣몤몥몦몧모목몪몫몬몭몮몯몰몱몲몳몴몵몶몷몸몹몺못몼몽몾몿뫀뫁뫂뫃뫄뫅뫆뫇뫈뫉뫊뫋뫌뫍뫎뫏뫐뫑뫒뫓뫔뫕뫖뫗뫘뫙뫚뫛뫜뫝뫞뫟뫠뫡뫢뫣뫤뫥뫦뫧뫨뫩뫪뫫뫬뫭뫮뫯뫰뫱뫲뫳뫴뫵뫶뫷뫸뫹뫺뫻뫼뫽뫾뫿묀묁묂묃묄묅묆묇묈묉묊묋묌묍묎묏묐묑묒묓묔묕묖묗묘묙묚묛묜묝묞묟묠묡묢묣묤묥묦묧묨묩묪묫묬묭묮묯묰묱묲묳무묵묶묷문묹묺묻물묽묾묿뭀뭁뭂뭃뭄뭅뭆뭇뭈뭉뭊뭋뭌뭍뭎뭏뭐뭑뭒뭓뭔뭕뭖뭗뭘뭙뭚뭛뭜뭝뭞뭟뭠뭡뭢뭣뭤뭥뭦뭧뭨뭩뭪뭫뭬뭭뭮뭯뭰뭱뭲뭳뭴뭵뭶뭷뭸뭹뭺뭻뭼뭽뭾뭿뮀뮁뮂뮃뮄뮅뮆뮇뮈뮉뮊뮋뮌뮍뮎뮏뮐뮑뮒뮓뮔뮕뮖뮗뮘뮙뮚뮛뮜뮝뮞뮟뮠뮡뮢뮣뮤뮥뮦뮧뮨뮩뮪뮫뮬뮭뮮뮯뮰뮱뮲뮳뮴뮵뮶뮷뮸뮹뮺뮻뮼뮽뮾뮿므믁믂믃믄믅믆믇믈믉믊믋믌믍믎믏믐믑믒믓믔믕믖믗믘믙믚믛믜믝믞믟믠믡믢믣믤믥믦믧믨믩믪믫믬믭믮믯믰믱믲믳믴믵믶믷미믹믺믻민믽믾믿밀밁밂밃밄밅밆밇밈밉밊밋밌밍밎및밐밑밒밓바박밖밗반밙밚받발밝밞밟밠밡밢밣밤밥밦밧밨방밪밫밬밭밮밯배백밲밳밴밵밶밷밸밹밺밻밼밽밾밿뱀뱁뱂뱃뱄뱅뱆뱇뱈뱉뱊뱋뱌뱍뱎뱏뱐뱑뱒뱓뱔뱕뱖뱗뱘뱙뱚뱛뱜뱝뱞뱟뱠뱡뱢뱣뱤뱥뱦뱧뱨뱩뱪뱫뱬뱭뱮뱯뱰뱱뱲뱳뱴뱵뱶뱷뱸뱹뱺뱻뱼뱽뱾뱿벀벁벂벃버벅벆벇번벉벊벋벌벍벎벏벐벑벒벓범법벖벗벘벙벚벛벜벝벞벟베벡벢벣벤벥벦벧벨벩벪벫벬벭벮벯벰벱벲벳벴벵벶벷벸벹벺벻벼벽벾벿변볁볂볃별볅볆볇볈볉볊볋볌볍볎볏볐병볒볓볔볕볖볗볘볙볚볛볜볝볞볟볠볡볢볣볤볥볦볧볨볩볪볫볬볭볮볯볰볱볲볳보복볶볷본볹볺볻볼볽볾볿봀봁봂봃봄봅봆봇봈봉봊봋봌봍봎봏봐봑봒봓봔봕봖봗봘봙봚봛봜봝봞봟봠봡봢봣봤봥봦봧봨봩봪봫봬봭봮봯봰봱봲봳봴봵봶봷봸봹봺봻봼봽봾봿뵀뵁뵂뵃뵄뵅뵆뵇뵈뵉뵊뵋뵌뵍뵎뵏뵐뵑뵒뵓뵔뵕뵖뵗뵘뵙뵚뵛뵜뵝뵞뵟뵠뵡뵢뵣뵤뵥뵦뵧뵨뵩뵪뵫뵬뵭뵮뵯뵰뵱뵲뵳뵴뵵뵶뵷뵸뵹뵺뵻뵼뵽뵾뵿부북붂붃분붅붆붇불붉붊붋붌붍붎붏붐붑붒붓붔붕붖붗붘붙붚붛붜붝붞붟붠붡붢붣붤붥붦붧붨붩붪붫붬붭붮붯붰붱붲붳붴붵붶붷붸붹붺붻붼붽붾붿뷀뷁뷂뷃뷄뷅뷆뷇뷈뷉뷊뷋뷌뷍뷎뷏뷐뷑뷒뷓뷔뷕뷖뷗뷘뷙뷚뷛뷜뷝뷞뷟뷠뷡뷢뷣뷤뷥뷦뷧뷨뷩뷪뷫뷬뷭뷮뷯뷰뷱뷲뷳뷴뷵뷶뷷뷸뷹뷺뷻뷼뷽뷾뷿븀븁븂븃븄븅븆븇븈븉븊븋브븍븎븏븐븑븒븓블븕븖븗븘븙븚븛븜븝븞븟븠븡븢븣븤븥븦븧븨븩븪븫븬븭븮븯븰븱븲븳븴븵븶븷븸븹븺븻븼븽븾븿빀빁빂빃비빅빆빇빈빉빊빋빌빍빎빏빐빑빒빓빔빕빖빗빘빙빚빛빜빝빞빟빠빡빢빣빤빥빦빧빨빩빪빫빬빭빮빯빰빱빲빳빴빵빶빷빸빹빺빻빼빽빾빿뺀뺁뺂뺃뺄뺅뺆뺇뺈뺉뺊뺋뺌뺍뺎뺏뺐뺑뺒뺓뺔뺕뺖뺗뺘뺙뺚뺛뺜뺝뺞뺟뺠뺡뺢뺣뺤뺥뺦뺧뺨뺩뺪뺫뺬뺭뺮뺯뺰뺱뺲뺳뺴뺵뺶뺷뺸뺹뺺뺻뺼뺽뺾뺿뻀뻁뻂뻃뻄뻅뻆뻇뻈뻉뻊뻋뻌뻍뻎뻏뻐뻑뻒뻓뻔뻕뻖뻗뻘뻙뻚뻛뻜뻝뻞뻟뻠뻡뻢뻣뻤뻥뻦뻧뻨뻩뻪뻫뻬뻭뻮뻯뻰뻱뻲뻳뻴뻵뻶뻷뻸뻹뻺뻻뻼뻽뻾뻿뼀뼁뼂뼃뼄뼅뼆뼇뼈뼉뼊뼋뼌뼍뼎뼏뼐뼑뼒뼓뼔뼕뼖뼗뼘뼙뼚뼛뼜뼝뼞뼟뼠뼡뼢뼣뼤뼥뼦뼧뼨뼩뼪뼫뼬뼭뼮뼯뼰뼱뼲뼳뼴뼵뼶뼷뼸뼹뼺뼻뼼뼽뼾뼿뽀뽁뽂뽃뽄뽅뽆뽇뽈뽉뽊뽋뽌뽍뽎뽏뽐뽑뽒뽓뽔뽕뽖뽗뽘뽙뽚뽛뽜뽝뽞뽟뽠뽡뽢뽣뽤뽥뽦뽧뽨뽩뽪뽫뽬뽭뽮뽯뽰뽱뽲뽳뽴뽵뽶뽷뽸뽹뽺뽻뽼뽽뽾뽿뾀뾁뾂뾃뾄뾅뾆뾇뾈뾉뾊뾋뾌뾍뾎뾏뾐뾑뾒뾓뾔뾕뾖뾗뾘뾙뾚뾛뾜뾝뾞뾟뾠뾡뾢뾣뾤뾥뾦뾧뾨뾩뾪뾫뾬뾭뾮뾯뾰뾱뾲뾳뾴뾵뾶뾷뾸뾹뾺뾻뾼뾽뾾뾿뿀뿁뿂뿃뿄뿅뿆뿇뿈뿉뿊뿋뿌뿍뿎뿏뿐뿑뿒뿓뿔뿕뿖뿗뿘뿙뿚뿛뿜뿝뿞뿟뿠뿡뿢뿣뿤뿥뿦뿧뿨뿩뿪뿫뿬뿭뿮뿯뿰뿱뿲뿳뿴뿵뿶뿷뿸뿹뿺뿻뿼뿽뿾뿿쀀쀁쀂쀃쀄쀅쀆쀇쀈쀉쀊쀋쀌쀍쀎쀏쀐쀑쀒쀓쀔쀕쀖쀗쀘쀙쀚쀛쀜쀝쀞쀟쀠쀡쀢쀣쀤쀥쀦쀧쀨쀩쀪쀫쀬쀭쀮쀯쀰쀱쀲쀳쀴쀵쀶쀷쀸쀹쀺쀻쀼쀽쀾쀿쁀쁁쁂쁃쁄쁅쁆쁇쁈쁉쁊쁋쁌쁍쁎쁏쁐쁑쁒쁓쁔쁕쁖쁗쁘쁙쁚쁛쁜쁝쁞쁟쁠쁡쁢쁣쁤쁥쁦쁧쁨쁩쁪쁫쁬쁭쁮쁯쁰쁱쁲쁳쁴쁵쁶쁷쁸쁹쁺쁻쁼쁽쁾쁿삀삁삂삃삄삅삆삇삈삉삊삋삌삍삎삏삐삑삒삓삔삕삖삗삘삙삚삛삜삝삞삟삠삡삢삣삤삥삦삧삨삩삪삫사삭삮삯산삱삲삳살삵삶삷삸삹삺삻삼삽삾삿샀상샂샃샄샅샆샇새색샊샋샌샍샎샏샐샑샒샓샔샕샖샗샘샙샚샛샜생샞샟샠샡샢샣샤샥샦샧샨샩샪샫샬샭샮샯샰샱샲샳샴샵샶샷샸샹샺샻샼샽샾샿섀섁섂섃섄섅섆섇섈섉섊섋섌섍섎섏섐섑섒섓섔섕섖섗섘섙섚섛서석섞섟선섡섢섣설섥섦섧섨섩섪섫섬섭섮섯섰성섲섳섴섵섶섷세섹섺섻센섽섾섿셀셁셂셃셄셅셆셇셈셉셊셋셌셍셎셏셐셑셒셓셔셕셖셗션셙셚셛셜셝셞셟셠셡셢셣셤셥셦셧셨셩셪셫셬셭셮셯셰셱셲셳셴셵셶셷셸셹셺셻셼셽셾셿솀솁솂솃솄솅솆솇솈솉솊솋소속솎솏손솑솒솓솔솕솖솗솘솙솚솛솜솝솞솟솠송솢솣솤솥솦솧솨솩솪솫솬솭솮솯솰솱솲솳솴솵솶솷솸솹솺솻솼솽솾솿쇀쇁쇂쇃쇄쇅쇆쇇쇈쇉쇊쇋쇌쇍쇎쇏쇐쇑쇒쇓쇔쇕쇖쇗쇘쇙쇚쇛쇜쇝쇞쇟쇠쇡쇢쇣쇤쇥쇦쇧쇨쇩쇪쇫쇬쇭쇮쇯쇰쇱쇲쇳쇴쇵쇶쇷쇸쇹쇺쇻쇼쇽쇾쇿숀숁숂숃숄숅숆숇숈숉숊숋숌숍숎숏숐숑숒숓숔숕숖숗수숙숚숛순숝숞숟술숡숢숣숤숥숦숧숨숩숪숫숬숭숮숯숰숱숲숳숴숵숶숷숸숹숺숻숼숽숾숿쉀쉁쉂쉃쉄쉅쉆쉇쉈쉉쉊쉋쉌쉍쉎쉏쉐쉑쉒쉓쉔쉕쉖쉗쉘쉙쉚쉛쉜쉝쉞쉟쉠쉡쉢쉣쉤쉥쉦쉧쉨쉩쉪쉫쉬쉭쉮쉯쉰쉱쉲쉳쉴쉵쉶쉷쉸쉹쉺쉻쉼쉽쉾쉿슀슁슂슃슄슅슆슇슈슉슊슋슌슍슎슏슐슑슒슓슔슕슖슗슘슙슚슛슜슝슞슟슠슡슢슣스슥슦슧슨슩슪슫슬슭슮슯슰슱슲슳슴습슶슷슸승슺슻슼슽슾슿싀싁싂싃싄싅싆싇싈싉싊싋싌싍싎싏싐싑싒싓싔싕싖싗싘싙싚싛시식싞싟신싡싢싣실싥싦싧싨싩싪싫심십싮싯싰싱싲싳싴싵싶싷싸싹싺싻싼싽싾싿쌀쌁쌂쌃쌄쌅쌆쌇쌈쌉쌊쌋쌌쌍쌎쌏쌐쌑쌒쌓쌔쌕쌖쌗쌘쌙쌚쌛쌜쌝쌞쌟쌠쌡쌢쌣쌤쌥쌦쌧쌨쌩쌪쌫쌬쌭쌮쌯쌰쌱쌲쌳쌴쌵쌶쌷쌸쌹쌺쌻쌼쌽쌾쌿썀썁썂썃썄썅썆썇썈썉썊썋썌썍썎썏썐썑썒썓썔썕썖썗썘썙썚썛썜썝썞썟썠썡썢썣썤썥썦썧써썩썪썫썬썭썮썯썰썱썲썳썴썵썶썷썸썹썺썻썼썽썾썿쎀쎁쎂쎃쎄쎅쎆쎇쎈쎉쎊쎋쎌쎍쎎쎏쎐쎑쎒쎓쎔쎕쎖쎗쎘쎙쎚쎛쎜쎝쎞쎟쎠쎡쎢쎣쎤쎥쎦쎧쎨쎩쎪쎫쎬쎭쎮쎯쎰쎱쎲쎳쎴쎵쎶쎷쎸쎹쎺쎻쎼쎽쎾쎿쏀쏁쏂쏃쏄쏅쏆쏇쏈쏉쏊쏋쏌쏍쏎쏏쏐쏑쏒쏓쏔쏕쏖쏗쏘쏙쏚쏛쏜쏝쏞쏟쏠쏡쏢쏣쏤쏥쏦쏧쏨쏩쏪쏫쏬쏭쏮쏯쏰쏱쏲쏳쏴쏵쏶쏷쏸쏹쏺쏻쏼쏽쏾쏿쐀쐁쐂쐃쐄쐅쐆쐇쐈쐉쐊쐋쐌쐍쐎쐏쐐쐑쐒쐓쐔쐕쐖쐗쐘쐙쐚쐛쐜쐝쐞쐟쐠쐡쐢쐣쐤쐥쐦쐧쐨쐩쐪쐫쐬쐭쐮쐯쐰쐱쐲쐳쐴쐵쐶쐷쐸쐹쐺쐻쐼쐽쐾쐿쑀쑁쑂쑃쑄쑅쑆쑇쑈쑉쑊쑋쑌쑍쑎쑏쑐쑑쑒쑓쑔쑕쑖쑗쑘쑙쑚쑛쑜쑝쑞쑟쑠쑡쑢쑣쑤쑥쑦쑧쑨쑩쑪쑫쑬쑭쑮쑯쑰쑱쑲쑳쑴쑵쑶쑷쑸쑹쑺쑻쑼쑽쑾쑿쒀쒁쒂쒃쒄쒅쒆쒇쒈쒉쒊쒋쒌쒍쒎쒏쒐쒑쒒쒓쒔쒕쒖쒗쒘쒙쒚쒛쒜쒝쒞쒟쒠쒡쒢쒣쒤쒥쒦쒧쒨쒩쒪쒫쒬쒭쒮쒯쒰쒱쒲쒳쒴쒵쒶쒷쒸쒹쒺쒻쒼쒽쒾쒿쓀쓁쓂쓃쓄쓅쓆쓇쓈쓉쓊쓋쓌쓍쓎쓏쓐쓑쓒쓓쓔쓕쓖쓗쓘쓙쓚쓛쓜쓝쓞쓟쓠쓡쓢쓣쓤쓥쓦쓧쓨쓩쓪쓫쓬쓭쓮쓯쓰쓱쓲쓳쓴쓵쓶쓷쓸쓹쓺쓻쓼쓽쓾쓿씀씁씂씃씄씅씆씇씈씉씊씋씌씍씎씏씐씑씒씓씔씕씖씗씘씙씚씛씜씝씞씟씠씡씢씣씤씥씦씧씨씩씪씫씬씭씮씯씰씱씲씳씴씵씶씷씸씹씺씻씼씽씾씿앀앁앂앃아악앆앇안앉않앋알앍앎앏앐앑앒앓암압앖앗았앙앚앛앜앝앞앟애액앢앣앤앥앦앧앨앩앪앫앬앭앮앯앰앱앲앳앴앵앶앷앸앹앺앻야약앾앿얀얁얂얃얄얅얆얇얈얉얊얋얌얍얎얏얐양얒얓얔얕얖얗얘얙얚얛얜얝얞얟얠얡얢얣얤얥얦얧얨얩얪얫얬얭얮얯얰얱얲얳어억얶얷언얹얺얻얼얽얾얿엀엁엂엃엄업없엇었엉엊엋엌엍엎엏에엑엒엓엔엕엖엗엘엙엚엛엜엝엞엟엠엡엢엣엤엥엦엧엨엩엪엫여역엮엯연엱엲엳열엵엶엷엸엹엺엻염엽엾엿였영옂옃옄옅옆옇예옉옊옋옌옍옎옏옐옑옒옓옔옕옖옗옘옙옚옛옜옝옞옟옠옡옢옣오옥옦옧온옩옪옫올옭옮옯옰옱옲옳옴옵옶옷옸옹옺옻옼옽옾옿와왁왂왃완왅왆왇왈왉왊왋왌왍왎왏왐왑왒왓왔왕왖왗왘왙왚왛왜왝왞왟왠왡왢왣왤왥왦왧왨왩왪왫왬왭왮왯왰왱왲왳왴왵왶왷외왹왺왻왼왽왾왿욀욁욂욃욄욅욆욇욈욉욊욋욌욍욎욏욐욑욒욓요욕욖욗욘욙욚욛욜욝욞욟욠욡욢욣욤욥욦욧욨용욪욫욬욭욮욯우욱욲욳운욵욶욷울욹욺욻욼욽욾욿움웁웂웃웄웅웆웇웈웉웊웋워웍웎웏원웑웒웓월웕웖웗웘웙웚웛웜웝웞웟웠웡웢웣웤웥웦웧웨웩웪웫웬웭웮웯웰웱웲웳웴웵웶웷웸웹웺웻웼웽웾웿윀윁윂윃위윅윆윇윈윉윊윋윌윍윎윏윐윑윒윓윔윕윖윗윘윙윚윛윜윝윞윟유육윢윣윤윥윦윧율윩윪윫윬윭윮윯윰윱윲윳윴융윶윷윸윹윺윻으윽윾윿은읁읂읃을읅읆읇읈읉읊읋음읍읎읏읐응읒읓읔읕읖읗의읙읚읛읜읝읞읟읠읡읢읣읤읥읦읧읨읩읪읫읬읭읮읯읰읱읲읳이익읶읷인읹읺읻일읽읾읿잀잁잂잃임입잆잇있잉잊잋잌잍잎잏자작잒잓잔잕잖잗잘잙잚잛잜잝잞잟잠잡잢잣잤장잦잧잨잩잪잫재잭잮잯잰잱잲잳잴잵잶잷잸잹잺잻잼잽잾잿쟀쟁쟂쟃쟄쟅쟆쟇쟈쟉쟊쟋쟌쟍쟎쟏쟐쟑쟒쟓쟔쟕쟖쟗쟘쟙쟚쟛쟜쟝쟞쟟쟠쟡쟢쟣쟤쟥쟦쟧쟨쟩쟪쟫쟬쟭쟮쟯쟰쟱쟲쟳쟴쟵쟶쟷쟸쟹쟺쟻쟼쟽쟾쟿저적젂젃전젅젆젇절젉젊젋젌젍젎젏점접젒젓젔정젖젗젘젙젚젛제젝젞젟젠젡젢젣젤젥젦젧젨젩젪젫젬젭젮젯젰젱젲젳젴젵젶젷져젹젺젻젼젽젾젿졀졁졂졃졄졅졆졇졈졉졊졋졌졍졎졏졐졑졒졓졔졕졖졗졘졙졚졛졜졝졞졟졠졡졢졣졤졥졦졧졨졩졪졫졬졭졮졯조족졲졳존졵졶졷졸졹졺졻졼졽졾졿좀좁좂좃좄종좆좇좈좉좊좋좌좍좎좏좐좑좒좓좔좕좖좗좘좙좚좛좜좝좞좟좠좡좢좣좤좥좦좧좨좩좪좫좬좭좮좯좰좱좲좳좴좵좶좷좸좹좺좻좼좽좾좿죀죁죂죃죄죅죆죇죈죉죊죋죌죍죎죏죐죑죒죓죔죕죖죗죘죙죚죛죜죝죞죟죠죡죢죣죤죥죦죧죨죩죪죫죬죭죮죯죰죱죲죳죴죵죶죷죸죹죺죻주죽죾죿준줁줂줃줄줅줆줇줈줉줊줋줌줍줎줏줐중줒줓줔줕줖줗줘줙줚줛줜줝줞줟줠줡줢줣줤줥줦줧줨줩줪줫줬줭줮줯줰줱줲줳줴줵줶줷줸줹줺줻줼줽줾줿쥀쥁쥂쥃쥄쥅쥆쥇쥈쥉쥊쥋쥌쥍쥎쥏쥐쥑쥒쥓쥔쥕쥖쥗쥘쥙쥚쥛쥜쥝쥞쥟쥠쥡쥢쥣쥤쥥쥦쥧쥨쥩쥪쥫쥬쥭쥮쥯쥰쥱쥲쥳쥴쥵쥶쥷쥸쥹쥺쥻쥼쥽쥾쥿즀즁즂즃즄즅즆즇즈즉즊즋즌즍즎즏즐즑즒즓즔즕즖즗즘즙즚즛즜증즞즟즠즡즢즣즤즥즦즧즨즩즪즫즬즭즮즯즰즱즲즳즴즵즶즷즸즹즺즻즼즽즾즿지직짂짃진짅짆짇질짉짊짋짌짍짎짏짐집짒짓짔징짖짗짘짙짚짛짜짝짞짟짠짡짢짣짤짥짦짧짨짩짪짫짬짭짮짯짰짱짲짳짴짵짶짷째짹짺짻짼짽짾짿쨀쨁쨂쨃쨄쨅쨆쨇쨈쨉쨊쨋쨌쨍쨎쨏쨐쨑쨒쨓쨔쨕쨖쨗쨘쨙쨚쨛쨜쨝쨞쨟쨠쨡쨢쨣쨤쨥쨦쨧쨨쨩쨪쨫쨬쨭쨮쨯쨰쨱쨲쨳쨴쨵쨶쨷쨸쨹쨺쨻쨼쨽쨾쨿쩀쩁쩂쩃쩄쩅쩆쩇쩈쩉쩊쩋쩌쩍쩎쩏쩐쩑쩒쩓쩔쩕쩖쩗쩘쩙쩚쩛쩜쩝쩞쩟쩠쩡쩢쩣쩤쩥쩦쩧쩨쩩쩪쩫쩬쩭쩮쩯쩰쩱쩲쩳쩴쩵쩶쩷쩸쩹쩺쩻쩼쩽쩾쩿쪀쪁쪂쪃쪄쪅쪆쪇쪈쪉쪊쪋쪌쪍쪎쪏쪐쪑쪒쪓쪔쪕쪖쪗쪘쪙쪚쪛쪜쪝쪞쪟쪠쪡쪢쪣쪤쪥쪦쪧쪨쪩쪪쪫쪬쪭쪮쪯쪰쪱쪲쪳쪴쪵쪶쪷쪸쪹쪺쪻쪼쪽쪾쪿쫀쫁쫂쫃쫄쫅쫆쫇쫈쫉쫊쫋쫌쫍쫎쫏쫐쫑쫒쫓쫔쫕쫖쫗쫘쫙쫚쫛쫜쫝쫞쫟쫠쫡쫢쫣쫤쫥쫦쫧쫨쫩쫪쫫쫬쫭쫮쫯쫰쫱쫲쫳쫴쫵쫶쫷쫸쫹쫺쫻쫼쫽쫾쫿쬀쬁쬂쬃쬄쬅쬆쬇쬈쬉쬊쬋쬌쬍쬎쬏쬐쬑쬒쬓쬔쬕쬖쬗쬘쬙쬚쬛쬜쬝쬞쬟쬠쬡쬢쬣쬤쬥쬦쬧쬨쬩쬪쬫쬬쬭쬮쬯쬰쬱쬲쬳쬴쬵쬶쬷쬸쬹쬺쬻쬼쬽쬾쬿쭀쭁쭂쭃쭄쭅쭆쭇쭈쭉쭊쭋쭌쭍쭎쭏쭐쭑쭒쭓쭔쭕쭖쭗쭘쭙쭚쭛쭜쭝쭞쭟쭠쭡쭢쭣쭤쭥쭦쭧쭨쭩쭪쭫쭬쭭쭮쭯쭰쭱쭲쭳쭴쭵쭶쭷쭸쭹쭺쭻쭼쭽쭾쭿쮀쮁쮂쮃쮄쮅쮆쮇쮈쮉쮊쮋쮌쮍쮎쮏쮐쮑쮒쮓쮔쮕쮖쮗쮘쮙쮚쮛쮜쮝쮞쮟쮠쮡쮢쮣쮤쮥쮦쮧쮨쮩쮪쮫쮬쮭쮮쮯쮰쮱쮲쮳쮴쮵쮶쮷쮸쮹쮺쮻쮼쮽쮾쮿쯀쯁쯂쯃쯄쯅쯆쯇쯈쯉쯊쯋쯌쯍쯎쯏쯐쯑쯒쯓쯔쯕쯖쯗쯘쯙쯚쯛쯜쯝쯞쯟쯠쯡쯢쯣쯤쯥쯦쯧쯨쯩쯪쯫쯬쯭쯮쯯쯰쯱쯲쯳쯴쯵쯶쯷쯸쯹쯺쯻쯼쯽쯾쯿찀찁찂찃찄찅찆찇찈찉찊찋찌찍찎찏찐찑찒찓찔찕찖찗찘찙찚찛찜찝찞찟찠찡찢찣찤찥찦찧차착찪찫찬찭찮찯찰찱찲찳찴찵찶찷참찹찺찻찼창찾찿챀챁챂챃채책챆챇챈챉챊챋챌챍챎챏챐챑챒챓챔챕챖챗챘챙챚챛챜챝챞챟챠챡챢챣챤챥챦챧챨챩챪챫챬챭챮챯챰챱챲챳챴챵챶챷챸챹챺챻챼챽챾챿첀첁첂첃첄첅첆첇첈첉첊첋첌첍첎첏첐첑첒첓첔첕첖첗처척첚첛천첝첞첟철첡첢첣첤첥첦첧첨첩첪첫첬청첮첯첰첱첲첳체첵첶첷첸첹첺첻첼첽첾첿쳀쳁쳂쳃쳄쳅쳆쳇쳈쳉쳊쳋쳌쳍쳎쳏쳐쳑쳒쳓쳔쳕쳖쳗쳘쳙쳚쳛쳜쳝쳞쳟쳠쳡쳢쳣쳤쳥쳦쳧쳨쳩쳪쳫쳬쳭쳮쳯쳰쳱쳲쳳쳴쳵쳶쳷쳸쳹쳺쳻쳼쳽쳾쳿촀촁촂촃촄촅촆촇초촉촊촋촌촍촎촏촐촑촒촓촔촕촖촗촘촙촚촛촜총촞촟촠촡촢촣촤촥촦촧촨촩촪촫촬촭촮촯촰촱촲촳촴촵촶촷촸촹촺촻촼촽촾촿쵀쵁쵂쵃쵄쵅쵆쵇쵈쵉쵊쵋쵌쵍쵎쵏쵐쵑쵒쵓쵔쵕쵖쵗쵘쵙쵚쵛최쵝쵞쵟쵠쵡쵢쵣쵤쵥쵦쵧쵨쵩쵪쵫쵬쵭쵮쵯쵰쵱쵲쵳쵴쵵쵶쵷쵸쵹쵺쵻쵼쵽쵾쵿춀춁춂춃춄춅춆춇춈춉춊춋춌춍춎춏춐춑춒춓추축춖춗춘춙춚춛출춝춞춟춠춡춢춣춤춥춦춧춨충춪춫춬춭춮춯춰춱춲춳춴춵춶춷춸춹춺춻춼춽춾춿췀췁췂췃췄췅췆췇췈췉췊췋췌췍췎췏췐췑췒췓췔췕췖췗췘췙췚췛췜췝췞췟췠췡췢췣췤췥췦췧취췩췪췫췬췭췮췯췰췱췲췳췴췵췶췷췸췹췺췻췼췽췾췿츀츁츂츃츄츅츆츇츈츉츊츋츌츍츎츏츐츑츒츓츔츕츖츗츘츙츚츛츜츝츞츟츠측츢츣츤츥츦츧츨츩츪츫츬츭츮츯츰츱츲츳츴층츶츷츸츹츺츻츼츽츾츿칀칁칂칃칄칅칆칇칈칉칊칋칌칍칎칏칐칑칒칓칔칕칖칗치칙칚칛친칝칞칟칠칡칢칣칤칥칦칧침칩칪칫칬칭칮칯칰칱칲칳카칵칶칷칸칹칺칻칼칽칾칿캀캁캂캃캄캅캆캇캈캉캊캋캌캍캎캏캐캑캒캓캔캕캖캗캘캙캚캛캜캝캞캟캠캡캢캣캤캥캦캧캨캩캪캫캬캭캮캯캰캱캲캳캴캵캶캷캸캹캺캻캼캽캾캿컀컁컂컃컄컅컆컇컈컉컊컋컌컍컎컏컐컑컒컓컔컕컖컗컘컙컚컛컜컝컞컟컠컡컢컣커컥컦컧컨컩컪컫컬컭컮컯컰컱컲컳컴컵컶컷컸컹컺컻컼컽컾컿케켁켂켃켄켅켆켇켈켉켊켋켌켍켎켏켐켑켒켓켔켕켖켗켘켙켚켛켜켝켞켟켠켡켢켣켤켥켦켧켨켩켪켫켬켭켮켯켰켱켲켳켴켵켶켷켸켹켺켻켼켽켾켿콀콁콂콃콄콅콆콇콈콉콊콋콌콍콎콏콐콑콒콓코콕콖콗콘콙콚콛콜콝콞콟콠콡콢콣콤콥콦콧콨콩콪콫콬콭콮콯콰콱콲콳콴콵콶콷콸콹콺콻콼콽콾콿쾀쾁쾂쾃쾄쾅쾆쾇쾈쾉쾊쾋쾌쾍쾎쾏쾐쾑쾒쾓쾔쾕쾖쾗쾘쾙쾚쾛쾜쾝쾞쾟쾠쾡쾢쾣쾤쾥쾦쾧쾨쾩쾪쾫쾬쾭쾮쾯쾰쾱쾲쾳쾴쾵쾶쾷쾸쾹쾺쾻쾼쾽쾾쾿쿀쿁쿂쿃쿄쿅쿆쿇쿈쿉쿊쿋쿌쿍쿎쿏쿐쿑쿒쿓쿔쿕쿖쿗쿘쿙쿚쿛쿜쿝쿞쿟쿠쿡쿢쿣쿤쿥쿦쿧쿨쿩쿪쿫쿬쿭쿮쿯쿰쿱쿲쿳쿴쿵쿶쿷쿸쿹쿺쿻쿼쿽쿾쿿퀀퀁퀂퀃퀄퀅퀆퀇퀈퀉퀊퀋퀌퀍퀎퀏퀐퀑퀒퀓퀔퀕퀖퀗퀘퀙퀚퀛퀜퀝퀞퀟퀠퀡퀢퀣퀤퀥퀦퀧퀨퀩퀪퀫퀬퀭퀮퀯퀰퀱퀲퀳퀴퀵퀶퀷퀸퀹퀺퀻퀼퀽퀾퀿큀큁큂큃큄큅큆큇큈큉큊큋큌큍큎큏큐큑큒큓큔큕큖큗큘큙큚큛큜큝큞큟큠큡큢큣큤큥큦큧큨큩큪큫크큭큮큯큰큱큲큳클큵큶큷큸큹큺큻큼큽큾큿킀킁킂킃킄킅킆킇킈킉킊킋킌킍킎킏킐킑킒킓킔킕킖킗킘킙킚킛킜킝킞킟킠킡킢킣키킥킦킧킨킩킪킫킬킭킮킯킰킱킲킳킴킵킶킷킸킹킺킻킼킽킾킿타탁탂탃탄탅탆탇탈탉탊탋탌탍탎탏탐탑탒탓탔탕탖탗탘탙탚탛태택탞탟탠탡탢탣탤탥탦탧탨탩탪탫탬탭탮탯탰탱탲탳탴탵탶탷탸탹탺탻탼탽탾탿턀턁턂턃턄턅턆턇턈턉턊턋턌턍턎턏턐턑턒턓턔턕턖턗턘턙턚턛턜턝턞턟턠턡턢턣턤턥턦턧턨턩턪턫턬턭턮턯터턱턲턳턴턵턶턷털턹턺턻턼턽턾턿텀텁텂텃텄텅텆텇텈텉텊텋테텍텎텏텐텑텒텓텔텕텖텗텘텙텚텛템텝텞텟텠텡텢텣텤텥텦텧텨텩텪텫텬텭텮텯텰텱텲텳텴텵텶텷텸텹텺텻텼텽텾텿톀톁톂톃톄톅톆톇톈톉톊톋톌톍톎톏톐톑톒톓톔톕톖톗톘톙톚톛톜톝톞톟토톡톢톣톤톥톦톧톨톩톪톫톬톭톮톯톰톱톲톳톴통톶톷톸톹톺톻톼톽톾톿퇀퇁퇂퇃퇄퇅퇆퇇퇈퇉퇊퇋퇌퇍퇎퇏퇐퇑퇒퇓퇔퇕퇖퇗퇘퇙퇚퇛퇜퇝퇞퇟퇠퇡퇢퇣퇤퇥퇦퇧퇨퇩퇪퇫퇬퇭퇮퇯퇰퇱퇲퇳퇴퇵퇶퇷퇸퇹퇺퇻퇼퇽퇾퇿툀툁툂툃툄툅툆툇툈툉툊툋툌툍툎툏툐툑툒툓툔툕툖툗툘툙툚툛툜툝툞툟툠툡툢툣툤툥툦툧툨툩툪툫투툭툮툯툰툱툲툳툴툵툶툷툸툹툺툻툼툽툾툿퉀퉁퉂퉃퉄퉅퉆퉇퉈퉉퉊퉋퉌퉍퉎퉏퉐퉑퉒퉓퉔퉕퉖퉗퉘퉙퉚퉛퉜퉝퉞퉟퉠퉡퉢퉣퉤퉥퉦퉧퉨퉩퉪퉫퉬퉭퉮퉯퉰퉱퉲퉳퉴퉵퉶퉷퉸퉹퉺퉻퉼퉽퉾퉿튀튁튂튃튄튅튆튇튈튉튊튋튌튍튎튏튐튑튒튓튔튕튖튗튘튙튚튛튜튝튞튟튠튡튢튣튤튥튦튧튨튩튪튫튬튭튮튯튰튱튲튳튴튵튶튷트특튺튻튼튽튾튿틀틁틂틃틄틅틆틇틈틉틊틋틌틍틎틏틐틑틒틓틔틕틖틗틘틙틚틛틜틝틞틟틠틡틢틣틤틥틦틧틨틩틪틫틬틭틮틯티틱틲틳틴틵틶틷틸틹틺틻틼틽틾틿팀팁팂팃팄팅팆팇팈팉팊팋파팍팎팏판팑팒팓팔팕팖팗팘팙팚팛팜팝팞팟팠팡팢팣팤팥팦팧패팩팪팫팬팭팮팯팰팱팲팳팴팵팶팷팸팹팺팻팼팽팾팿퍀퍁퍂퍃퍄퍅퍆퍇퍈퍉퍊퍋퍌퍍퍎퍏퍐퍑퍒퍓퍔퍕퍖퍗퍘퍙퍚퍛퍜퍝퍞퍟퍠퍡퍢퍣퍤퍥퍦퍧퍨퍩퍪퍫퍬퍭퍮퍯퍰퍱퍲퍳퍴퍵퍶퍷퍸퍹퍺퍻퍼퍽퍾퍿펀펁펂펃펄펅펆펇펈펉펊펋펌펍펎펏펐펑펒펓펔펕펖펗페펙펚펛펜펝펞펟펠펡펢펣펤펥펦펧펨펩펪펫펬펭펮펯펰펱펲펳펴펵펶펷편펹펺펻펼펽펾펿폀폁폂폃폄폅폆폇폈평폊폋폌폍폎폏폐폑폒폓폔폕폖폗폘폙폚폛폜폝폞폟폠폡폢폣폤폥폦폧폨폩폪폫포폭폮폯폰폱폲폳폴폵폶폷폸폹폺폻폼폽폾폿퐀퐁퐂퐃퐄퐅퐆퐇퐈퐉퐊퐋퐌퐍퐎퐏퐐퐑퐒퐓퐔퐕퐖퐗퐘퐙퐚퐛퐜퐝퐞퐟퐠퐡퐢퐣퐤퐥퐦퐧퐨퐩퐪퐫퐬퐭퐮퐯퐰퐱퐲퐳퐴퐵퐶퐷퐸퐹퐺퐻퐼퐽퐾퐿푀푁푂푃푄푅푆푇푈푉푊푋푌푍푎푏푐푑푒푓푔푕푖푗푘푙푚푛표푝푞푟푠푡푢푣푤푥푦푧푨푩푪푫푬푭푮푯푰푱푲푳푴푵푶푷푸푹푺푻푼푽푾푿풀풁풂풃풄풅풆풇품풉풊풋풌풍풎풏풐풑풒풓풔풕풖풗풘풙풚풛풜풝풞풟풠풡풢풣풤풥풦풧풨풩풪풫풬풭풮풯풰풱풲풳풴풵풶풷풸풹풺풻풼풽풾풿퓀퓁퓂퓃퓄퓅퓆퓇퓈퓉퓊퓋퓌퓍퓎퓏퓐퓑퓒퓓퓔퓕퓖퓗퓘퓙퓚퓛퓜퓝퓞퓟퓠퓡퓢퓣퓤퓥퓦퓧퓨퓩퓪퓫퓬퓭퓮퓯퓰퓱퓲퓳퓴퓵퓶퓷퓸퓹퓺퓻퓼퓽퓾퓿픀픁픂픃프픅픆픇픈픉픊픋플픍픎픏픐픑픒픓픔픕픖픗픘픙픚픛픜픝픞픟픠픡픢픣픤픥픦픧픨픩픪픫픬픭픮픯픰픱픲픳픴픵픶픷픸픹픺픻피픽픾픿핀핁핂핃필핅핆핇핈핉핊핋핌핍핎핏핐핑핒핓핔핕핖핗하학핚핛한핝핞핟할핡핢핣핤핥핦핧함합핪핫핬항핮핯핰핱핲핳해핵핶핷핸핹핺핻핼핽핾핿햀햁햂햃햄햅햆햇했행햊햋햌햍햎햏햐햑햒햓햔햕햖햗햘햙햚햛햜햝햞햟햠햡햢햣햤향햦햧햨햩햪햫햬햭햮햯햰햱햲햳햴햵햶햷햸햹햺햻햼햽햾햿헀헁헂헃헄헅헆헇허헉헊헋헌헍헎헏헐헑헒헓헔헕헖헗험헙헚헛헜헝헞헟헠헡헢헣헤헥헦헧헨헩헪헫헬헭헮헯헰헱헲헳헴헵헶헷헸헹헺헻헼헽헾헿혀혁혂혃현혅혆혇혈혉혊혋혌혍혎혏혐협혒혓혔형혖혗혘혙혚혛혜혝혞혟혠혡혢혣혤혥혦혧혨혩혪혫혬혭혮혯혰혱혲혳혴혵혶혷호혹혺혻혼혽혾혿홀홁홂홃홄홅홆홇홈홉홊홋홌홍홎홏홐홑홒홓화확홖홗환홙홚홛활홝홞홟홠홡홢홣홤홥홦홧홨황홪홫홬홭홮홯홰홱홲홳홴홵홶홷홸홹홺홻홼홽홾홿횀횁횂횃횄횅횆횇횈횉횊횋회획횎횏횐횑횒횓횔횕횖횗횘횙횚횛횜횝횞횟횠횡횢횣횤횥횦횧효횩횪횫횬횭횮횯횰횱횲횳횴횵횶횷횸횹횺횻횼횽횾횿훀훁훂훃후훅훆훇훈훉훊훋훌훍훎훏훐훑훒훓훔훕훖훗훘훙훚훛훜훝훞훟훠훡훢훣훤훥훦훧훨훩훪훫훬훭훮훯훰훱훲훳훴훵훶훷훸훹훺훻훼훽훾훿휀휁휂휃휄휅휆휇휈휉휊휋휌휍휎휏휐휑휒휓휔휕휖휗휘휙휚휛휜휝휞휟휠휡휢휣휤휥휦휧휨휩휪휫휬휭휮휯휰휱휲휳휴휵휶휷휸휹휺휻휼휽휾휿흀흁흂흃흄흅흆흇흈흉흊흋흌흍흎흏흐흑흒흓흔흕흖흗흘흙흚흛흜흝흞흟흠흡흢흣흤흥흦흧흨흩흪흫희흭흮흯흰흱흲흳흴흵흶흷흸흹흺흻흼흽흾흿힀힁힂힃힄힅힆힇히힉힊힋힌힍힎힏힐힑힒힓힔힕힖힗힘힙힚힛힜힝힞힟힠힡힢힣‾_＿-－‐—―〜・,，、;；:：!！¡?？¿.．‥…。·＇‘’\\\\\\"＂“”(（)）[［]］{｛}｝〈〉《》「」『』【】〔〕§¶@＠*＊/／\\\\\\\\＼&＆#＃%％‰†‡′″〃※","Kyrgyz":"абгдеёжзийклмнӊоөпрстуүхчшъыэюяАБГДЕЁЖЗИЙКЛМНӉОӨПРСТУҮХЧШЪЫЭЮЯ-‐–—,;:!?.…\'‘‚\\\\\\"“„«»()[]{}§@*/&#","Lao":"່້໊໋໌ໍໆກຂຄງຈສຊຍດຕຖທນບປຜຝພຟມຢຣລວຫໜໝອຮຯະັາຳິີຶືຸູົຼຽເແໂໃໄ-,;:!?.()[]{}","Lithuanian":"aąbcčdeęėfghiįyjklmnoprsštuųūvzžAĄBCČDEĘĖFGHIĮYJKLMNOPRSŠTUŲŪVZŽ-‐–—,;:!?.…“„()[]{}","Latvian":"aābcčdeēfgģhiījkķlļmnņoprsštuūvzžAĀBCČDEĒFGĢHIĪJKĶLĻMNŅOPRSŠTUŪVZŽ-‐–—,;:!?.…\'‘’‚\\\\\\"“”„()[]§@*/&#†‡′″","Macedonian":"абвгдѓежзѕијклљмнњопрстќуфхцчџшАБВГДЃЕЖЗЅИЈКЛЉМНЊОПРСТЌУФХЦЧЏШ-‐–—,;:!?.…‘‚“„()[]{}","Malayalam":"‌ഃഅആഇഈഉഊഋൠഌൡഎഏഐഒഓഔകൿഖഗഘങചഛജഝഞടഠഡഢണൺതഥദധനൻപഫബഭമംയരർലൽവശഷസഹളൾഴറാിീുൂൃെേൈൊോൌൗ്-,;:!?.\'‘’\\\\\\"“”()[]{}","Mongolian":"абвгдеёжзийклмноөпрстуүфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОӨПРСТУҮФХЦЧШЩЪЫЬЭЮЯ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Marathi":"़ॐंँःअआइईउऊऋऌऍएऐऑओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहळऽािीुूृॄॅेैॉोौ्-‐–—,;:!?.…\'‘’\\\\\\"“”()[]@*/&#′″","Malay":"aiubcdzefghjklmnyopqrstvwxAIUBCDZEFGHJKLMNYOPQRSTVWX-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Burmese":"ကခဂဃငစဆဇဈဉညဋဌဍဎဏတထဒဓနပဖဗဘမယရလဝသဟဠအဣဤဥဦဧဩဪာါိီုူေဲံဿျြွှ့္်း၊။‘’“”","Norwegian Bokmål":"aàbcdeéfghijklmnoóòôpqrstuvwxyzæøåAÀBCDEÉFGHIJKLMNOÓÒÔPQRSTUVWXYZÆØÅ-–,;:!?.\'\\\\\\"«»()[]{}§@*/\\\\\\\\","Nepali":"़ँंःॐअआइईउऊऋऌऍएऐऑओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलळवशषसहऽािीुूृॄॅेैॉोौ्-,;:!?.()[]{}","Dutch":"aáäbcdeéëfghiíïj\\\\u031klmnoóöpqrstúüvwxyzAÁÄBCDEÉËFGHIÍÏJUKLMNOÓÖPQRSTÚÜVWXYZ-‐–—,;:!?.…\'‘’\\"“”()[]§@*/&#†‡′″","Punjabi":"ੱੰ਼੦੧੨੩੪੫੬੭੮੯ੴੳਉਊਓਅਆਐਔੲਇਈਏਸ\\\\u0A3Cਹਕਖਗਘਙਚਛਜਝਞਟਠਡਢਣਤਥਦਧਨਪਫਬਭਮਯਰਲਵੜ੍ਾਿੀੁੂੇੈੋੌU-‐–—,;:!?.\'‘’\\"“”()[]/&′″","Polish":"aąbcćdeęfghijklłmnńoóprsśtuwyzźżAĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ-‐–—,;:!?.…\'\\\\\\"”„«»()[]{}§@*/&#%†‡′″°~","Portuguese":"aáàâãbcçdeéêfghiíjklmnoóòôõpqrstuúvwxyzAÁÀÂÃBCÇDEÉÊFGHIÍJKLMNOÓÒÔÕPQRSTUÚVWXYZ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Romanian":"aăâbcdefghiîjklmnoprsștțuvxzAĂÂBCDEFGHIÎJKLMNOPRSȘTȚUVXZ-‐–—,;:!?.…\'‘\\\\\\"“”„«»()[]@*/","Russian":"абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ-‐–—,;:!?.…\'‘‚\\\\\\"“„«»()[]{}§@*/&#","Sinhala":"අආඇඈඉඊඋඌඍඑඒඓඔඕඖංඃකඛගඝඞඟචඡජඣඥඤටඨඩඪණඬතථදධනඳපඵබභමඹයරලවශෂසහළෆාැෑිීුූෘෲෟෙේෛොෝෞ්-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Slovak":"aáäbcčdďeéfghiíjklĺľmnňoóôpqrŕsštťuúvwxyýzžAÁÄBCČDĎEÉFGHIÍJKLĹĽMNŇOÓÔPQRŔSŠTŤUÚVWXYÝZŽ-‐–,;:!?.…‘‚“„()[]§@*/&","Slovenian":"abcčdefghijklmnoprsštuvzžABCČDEFGHIJKLMNOPRSŠTUVZŽ-,;:!?.()[]{}","Albanian":"abcçdheëfgjiklmnopqrstuvxyzABCÇDHEËFGJIKLMNOPQRSTUVXYZ-‐–—,;:!?.…\'‘’\\\\\\"“”«»()[]§@*/&#′″~","Serbian":"абвгдђежзијклљмнњопрстћуфхцчџшАБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ-‐–,;:!?.…‘‚“„()[]{}*#","Swedish":"aàbcdeéfghijklmnopqrstuvwxyzåäöAÀBCDEÉFGHIJKLMNOPQRSTUVWXYZÅÄÖ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Swahili":"abchdefgijklmnoprstuvwyzABCHDEFGIJKLMNOPRSTUVWYZ-,;:!?.()[]{}","Tamil":"அஆஇஈஉஊஎஏஐஒஓஔஃகஙசஞடணதநபமயரலவழளறனஜஷஸஹாிீுூெேைொோௌ்-,;:!?.()[]{}","Telugu":"అఆఇఈఉఊఋౠఌౡఎఏఐఒఓఔఁంఃకఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరఱలవశషసహళాిీుూృౄెేైొోౌ్ౕౖ-,;:!?.\'‘’\\\\\\"“”()[]{}","Thai":"ฯๆ๎์็่้๊๋กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลฦวศษสหฬอฮํะัาๅำิีึืุูเแโใไฺ!\\\\\\"#\'()*,-./:@[]‐–—‘’“”…′″","Tongan":"aáāeéēfhiíīklmngoóōpstuúūvʻAÁĀEÉĒFHIÍĪKLMNGOÓŌPSTUÚŪV-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Turkish":"abcçdefgğhıiİjklmnoöprsştuüvyzABCÇDEFGĞHIJKLMNOÖPRSŞTUÜVYZ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Ukrainian":"абвгґдеєжзиіїйклмнопрстуфхцчшщьюяʼАБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ-–,;:!?.\'\\\\\\"“„«»()[]{}§@*/\\\\\\\\№","Urdu":"اأآبپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنںوؤہۂھءیئےةه،؍٫٬؛:؟.۔()[]","Uzbek":"abdefghijklmnopqrstuvxyzʻcʼABDEFGHIJKLMNOPQRSTUVXYZC-‐–—,;:!?.…\'‘’\\\\\\"“”„«»()[]{}§@*/&#′″","Vietnamese":"aàảãáạăằẳẵắặâầẩẫấậbcdđeèẻẽéẹêềểễếệfghiìỉĩíịjklmnoòỏõóọôồổỗốộơờởỡớợpqrstuùủũúụưừửữứựvwxyỳỷỹýỵzAÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬBCDĐEÈẺẼÉẸÊỀỂỄẾỆFGHIÌỈĨÍỊJKLMNOÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢPQRSTUÙỦŨÚỤƯỪỬỮỨỰVWXYỲỶỸÝỴZ-‐–—,;:!?.…\'‘’\\\\\\"“”()[]§@*/&#†‡′″","Cantonese":"一丁七丈三上下丌不丑且世丘丙丟並中串丸丹主乃久么之乎乏乖乘乙九也乾亂了予事二于云互五井些亞亡交亥亦亨享京亮人什仁仇今介仍仔他付仙代令以仰仲件任份企伊伍伐休伙伯估伴伸似伽但佈佉位低住佔何余佛作你佩佳使來例供依侯侵便係促俄俊俗保俠信修俱俾個倍們倒候倚借倫值假偉偏做停健側偵偶偷傑備傢傣傲傳傷傻傾僅像僑僧價儀億儒儘優允元兄充兇先光克免兒兔入內全兩八公六兮共兵其具典兼冊再冒冠冬冰冷准凌凝凡凰凱出函刀分切刊列初判別利刪到制刷刺刻則剌前剛剩剪副割創劃劇劉劍力功加助努劫勁勇勉勒動務勝勞勢勤勵勸勿包匈化北匹區十千升午半卒卓協南博卜卡卯印危即卷卻厄厘厚原厭厲去參又及友反叔取受口古句另只叫召叭可台史右司吃各合吉吊同名后吐向吒君吝吞吟吠否吧含吳吵吸吹吾呀呂呆告呢周味呵呼命和咖咦咧咪咬咱哀品哇哈哉哎員哥哦哩哪哭哲唉唐唔唬售唯唱唷唸商啊問啟啡啥啦啪喀喂善喇喊喔喜喝喬單喵嗎嗚嗨嗯嘆嘉嘗嘛嘴嘻嘿器噴嚇嚴囉四回因困固圈國圍園圓圖團圜土在圭地圾址均坎坐坡坤坦坪垂垃型埃城埔域執培基堂堅堆堡堪報場塊塔塗塞填塵境增墨墮壁壇壓壘壞壢士壬壯壽夏夕外多夜夠夢夥大天太夫央失夷夸夾奇奈奉奎奏契奔套奧奪奮女奴奶她好如妙妝妥妨妮妳妹妻姆姊始姐姑姓委姿威娃娘娛婁婆婚婦媒媽嫌嫩子孔字存孝孟季孤孩孫學它宅宇守安宋完宏宗官宙定宛宜客宣室宮害家容宿寂寄寅密富寒寞察寢實寧寨審寫寬寮寵寶封射將專尊尋對導小少尖尚尤就尺尼尾局屁居屆屋屏展屠層屬山岡岩岸峰島峽崇崙崴嵐嶺川州巡工左巧巨巫差己已巳巴巷市布希帕帖帛帝帥師席帳帶常帽幅幕幣幫干平年幸幹幻幼幽幾庇床序底店庚府度座庫庭康庸廉廖廠廢廣廳延廷建弄式引弗弘弟弦弱張強彈彊彌彎彝彞形彥彩彬彭彰影役彼往征待很律後徐徑徒得從復微徵德徹心必忌忍志忘忙忠快念忽怎怒怕怖思怡急性怨怪恆恐恢恥恨恩恭息恰悅悉悔悟悠您悲悶情惑惜惠惡惱想惹愁愈愉意愚愛感慈態慕慘慢慣慧慮慰慶慾憂憐憑憲憶憾懂應懶懷懼戀戈戊戌成我戒或截戰戲戴戶房所扁扇手才扎打托扣扥扭扯批找承技抄把抓投抗折披抬抱抵抹抽拆拉拋拍拏拒拔拖招拜括拳拼拾拿持指按挑挖挪振挺捐捕捨捲捷掃授掉掌排掛採探接控推措描提插揚換握揮援損搖搜搞搬搭搶摘摩摸撐撒撞撣撥播撾撿擁擇擊擋操擎擔據擠擦擬擴擺擾攝支收改攻放政故效敍敏救敗敘教敝敢散敦敬整敵數文斐斗料斯新斷方於施旁旅旋族旗既日旦早旭旺昂昆昇昌明昏易星映春昨昭是時晉晒晚晨普景晴晶智暑暖暗暫暴曆曉曰曲更書曼曾替最會月有朋服朗望朝期木未末本札朱朵杉李材村杜束杯杰東松板析林果枝架柏某染柔查柬柯柳柴校核根格桃案桌桑梁梅條梨梯械梵棄棉棋棒棚森椅植椰楊楓楚業極概榜榮構槍樂樓標樞模樣樹橋機橫檀檔檢欄權次欣欲欺欽款歉歌歐歡止正此步武歲歷歸死殊殘段殺殼毀毅母每毒比毛毫氏民氣水永求汗汝江池污汪汶決汽沃沈沉沒沖沙河油治沿況泉泊法泡波泥注泰泳洋洗洛洞洩洪洲活洽派流浦浩浪浮海涇消涉涯液涵涼淑淚淡淨深混淺清減渡測港游湖湯源準溝溪溫滄滅滋滑滴滾滿漂漏演漠漢漫漲漸潔潘潛潮澤澳激濃濟濤濫濱瀏灌灣火灰災炎炮炸為烈烏烤無焦然煙煞照煩熊熟熱燃燈燒營爆爐爛爪爬爭爵父爸爺爽爾牆片版牌牙牛牠牧物牲特牽犧犯狀狂狐狗狠狼猛猜猴猶獄獅獎獨獲獸獻玄率玉王玩玫玲玻珊珍珠珥班現球理琉琪琴瑙瑜瑞瑟瑤瑪瑰環瓜瓦瓶甘甚甜生產用田由甲申男甸界留畢略番畫異當疆疏疑疼病痕痛痴瘋療癡癸登發白百的皆皇皮盃益盛盜盟盡監盤盧目盲直相盼盾省眉看真眠眼眾睛睡督瞧瞭矛矣知短石砂砍研砲破硬碎碗碟碧碩碰確碼磁磨磯礎礙示社祕祖祚祛祝神祥票祿禁禍禎福禪禮秀私秋科秒秘租秤秦移稅程稍種稱稿穆穌積穩究穹空穿突窗窩窮窶立站竟章童端競竹笑笛符笨第筆等筋答策简算管箭箱節範篇築簡簫簽簿籃籌籍籤米粉粗粵精糊糕糟系糾紀約紅納紐純紙級紛素索紫累細紹終組結絕絡給統絲經綜綠維綱網緊緒線緣編緩緬緯練縛縣縮縱總績繁繆織繞繪繳繼續缸缺罕罪置罰署罵罷羅羊美羞群義羽翁習翔翰翹翻翼耀老考者而耍耐耗耳耶聊聖聚聞聯聰聲職聽肉肚股肥肩肯育背胎胖胞胡胸能脆脫腓腔腦腰腳腿膽臉臘臣臥臨自臭至致臺與興舉舊舌舍舒舞舟航般船艦良色艾芝芬花芳若苦英茅茫茲茶草荒荷荼莉莊莎莫菜菩華菲萄萊萬落葉著葛葡蒂蒙蒲蒼蓋蓮蔕蔡蔣蕭薄薦薩薪藉藍藏藝藤藥蘆蘇蘭虎處虛號虧蛇蛋蛙蜂蜜蝶融螢蟲蟹蠍蠻血行術街衛衝衡衣表袋被裁裂裕補裝裡製複褲西要覆見規視親覺覽觀角解觸言訂計訊討訓託記訥訪設許訴註証評詞詢試詩話該詳誇誌認誓誕語誠誤說誰課誼調談請諒論諸諺諾謀謂講謝證識譜警譯議護譽讀變讓讚谷豆豈豐象豪豬貌貓貝貞負財貢貨貪貫責貴買費貼賀資賈賓賜賞賢賣賤賦質賭賴賺購賽贈贊贏赤赫走起超越趕趙趣趨足跌跎跑距跟跡路跳踏踢蹟蹤躍身躲車軌軍軒軟較載輔輕輛輝輩輪輯輸轉轟辛辦辨辭辯辰辱農迅迎近返迦迪迫述迴迷追退送逃逆透逐途這通逛逝速造逢連週進逸逼遇遊運遍過道達違遙遜遠適遭遮遲遷選遺避邀邁還邊邏那邦邪邱郎部郭郵都鄂鄉鄭鄰酉配酒酷酸醉醒醜醫采釋里重野量金針釣鈴鉢銀銅銖銘銳銷鋒鋼錄錢錦錫錯鍋鍵鍾鎊鎖鎮鏡鐘鐵鑑長門閃閉開閏閒間閣閱闆闊闍闐關闡防阻阿陀附降限院陣除陪陰陳陵陶陷陸陽隆隊階隔際障隨險隱隻雄雅集雉雖雙雜雞離難雨雪雲零雷電需震霍霧露霸霹靂靈青靖靜非靠面革靼鞋韃韋韓音韻響頁頂項順須預頑頓頗領頞頭頻顆題額顏願類顧顯風飄飛食飯飲飽飾餅養餐餘館首香馬駐駕駛騎騙騷驅驗驚骨體高髮鬆鬥鬧鬱鬼魁魂魅魔魚魯鮮鳥鳳鳴鴻鵝鷹鹿麗麥麵麻麼黃黎黑默點黨鼓鼠鼻齊齋齒齡龍龜‾﹉﹊﹋﹌_＿﹍﹎﹏︳︴-－﹣‐–︲—﹘︱,，﹐、﹑;；﹔:：﹕!！﹗?？﹖.．﹒‥︰…。·＇‘’\\\\\\"＂“”〝〞(（﹙︵)）﹚︶[［]］{｛﹛︷}｝﹜︸〈︿〉﹀《︽》︾「﹁」﹂『﹃』﹄【︻】︼〔﹝︹〕﹞︺§@＠﹫*＊﹡/／\\\\\\\\＼﹨&＆﹠#＃﹟%％﹪‰†‡‧′″‵〃※","Chinese":"一丁七万丈三上下丌不与丑专且世丘丙业东丝丢两严丧个中丰串临丸丹为主丽举乃久么义之乌乍乎乏乐乔乖乘乙九也习乡书买乱乾了予争事二于亏云互五井亚些亡交亥亦产亨享京亮亲人亿什仁仅仇今介仍从仔他付仙代令以仪们仰仲件价任份仿企伊伍伏伐休众优伙会伟传伤伦伯估伴伸似伽但位低住佐佑体何余佛作你佤佩佳使例供依侠侦侧侨侬侯侵便促俄俊俗保信俩修俱俾倍倒候倚借倦值倾假偌偏做停健偶偷储催傲傻像僧儒儿允元兄充兆先光克免兑兔党入全八公六兮兰共关兴兵其具典兹养兼兽内冈册再冒写军农冠冬冰冲决况冷准凌减凝几凡凤凭凯凰出击函刀分切刊刑划列刘则刚创初判利别到制刷券刺刻剂前剑剧剩剪副割力劝办功加务劣动助努劫励劲劳势勇勉勋勒勤勾勿包匆匈化北匙匹区医十千升午半华协卒卓单卖南博占卡卢卫卯印危即却卷厂厄厅历厉压厌厍厚原去县参又叉及友双反发叔取受变叙口古句另只叫召叭可台史右叶号司叹吃各合吉吊同名后吐向吓吗君吝吟否吧含听启吵吸吹吻吾呀呆呈告呐员呜呢呦周味呵呼命和咖咦咧咨咪咬咯咱哀品哇哈哉响哎哟哥哦哩哪哭哲唉唐唤唬售唯唱唷商啊啡啥啦啪喀喂善喇喊喏喔喜喝喵喷喻嗒嗨嗯嘉嘛嘴嘻嘿器四回因团园困围固国图圆圈土圣在圭地圳场圾址均坎坐坑块坚坛坜坡坤坦坪垂垃型垒埃埋城埔域培基堂堆堕堡堪塑塔塞填境增墨壁壤士壬壮声处备复夏夕外多夜够夥大天太夫央失头夷夸夹夺奇奈奉奋奏契奔奖套奥女奴奶她好如妇妈妖妙妥妨妮妹妻姆姊始姐姑姓委姿威娃娄娘娜娟娱婆婚媒嫁嫌嫩子孔孕字存孙孜孝孟季孤学孩宁它宇守安宋完宏宗官宙定宛宜宝实审客宣室宪害宴家容宽宾宿寂寄寅密寇富寒寝寞察寡寨寸对寻导寿封射将尊小少尔尖尘尚尝尤就尺尼尽尾局屁层居屋屏展属屠山岁岂岗岘岚岛岳岸峡峰崇崩崴川州巡工左巧巨巫差己已巳巴巷币市布帅师希帐帕帖帝带席帮常帽幅幕干平年并幸幻幼幽广庆床序库应底店庙庚府庞废度座庭康庸廉廖延廷建开异弃弄弊式引弗弘弟张弥弦弯弱弹强归当录彝形彩彬彭彰影彷役彻彼往征径待很律後徐徒得循微徵德心必忆忌忍志忘忙忠忧快念忽怀态怎怒怕怖思怡急性怨怪总恋恐恢恨恩恭息恰恶恼悄悉悔悟悠患您悲情惑惜惠惧惨惯想惹愁愈愉意愚感愧慈慎慕慢慧慰憾懂懒戈戊戌戏成我戒或战截戴户房所扁扇手才扎扑打托扣执扩扫扬扭扮扯批找承技抄把抑抓投抗折抢护报披抬抱抵抹抽担拆拉拍拒拔拖拘招拜拟拥拦拨择括拳拷拼拾拿持指按挑挖挝挡挤挥挪振挺捉捐捕损捡换据捷授掉掌排探接控推掩措掸描提插握援搜搞搬搭摄摆摊摔摘摩摸撒撞播操擎擦支收改攻放政故效敌敏救教敝敢散敦敬数敲整文斋斐斗料斜斥断斯新方於施旁旅旋族旗无既日旦旧旨早旭时旺昂昆昌明昏易星映春昨昭是显晃晋晒晓晚晨普景晴晶智暂暑暖暗暮暴曰曲更曹曼曾替最月有朋服朗望朝期木未末本札术朱朵机杀杂权杉李材村杜束条来杨杯杰松板极构析林果枝枢枪枫架柏某染柔查柬柯柳柴标栋栏树校样核根格桃框案桌桑档桥梁梅梦梯械梵检棉棋棒棚森椅植椰楚楼概榜模樱檀欠次欢欣欧欲欺款歉歌止正此步武歪死殊残段毅母每毒比毕毛毫氏民气氛水永求汇汉汗汝江池污汤汪汶汽沃沈沉沙沟没沧河油治沿泉泊法泛泡波泣泥注泰泳泽洋洗洛洞津洪洲活洽派流浅测济浏浑浓浙浦浩浪浮浴海涅消涉涛涨涯液涵淋淑淘淡深混添清渐渡渣温港渴游湖湾源溜溪滋滑满滥滨滴漂漏演漠漫潘潜潮澎澳激灌火灭灯灰灵灿炉炎炮炸点烂烈烤烦烧热焦然煌煞照煮熊熟燃燕爆爪爬爱爵父爷爸爽片版牌牙牛牡牢牧物牲牵特牺犯状犹狂狐狗狠独狮狱狼猛猜猪献猴玄率玉王玛玩玫环现玲玻珀珊珍珠班球理琊琪琳琴琼瑙瑜瑞瑟瑰瑶璃瓜瓦瓶甘甚甜生用田由甲申电男甸画畅界留略番疆疏疑疗疯疲疼疾病痕痛痴癸登白百的皆皇皮盈益监盒盖盘盛盟目直相盼盾省眉看真眠眼着睛睡督瞧矛矣知短石矶码砂砍研破础硕硬确碍碎碗碟碧碰磁磅磨示礼社祖祚祝神祥票祯祸禁禅福离秀私秋种科秒秘租秤秦秩积称移稀程稍税稣稳稿穆究穷穹空穿突窗窝立站竞竟章童端竹笑笔笛符笨第等筋筑答策筹签简算管箭箱篇篮簿籍米类粉粒粗粤粹精糊糕糖糟系素索紧紫累繁红约级纪纯纲纳纵纷纸纽线练组细织终绍经结绕绘给络绝统继绩绪续维绵综绿缅缓编缘缠缩缴缶缸缺罐网罕罗罚罢罪置署羊美羞群羯羽翁翅翔翘翠翰翻翼耀老考者而耍耐耗耳耶聊职联聘聚聪肉肖肚股肤肥肩肯育胁胆背胎胖胜胞胡胶胸能脆脑脱脸腊腐腓腰腹腾腿臂臣自臭至致舌舍舒舞舟航般舰船良色艺艾节芒芝芦芬芭花芳苍苏苗若苦英茂范茨茫茶草荐荒荣药荷莉莎莪莫莱莲获菜菩菲萄萍萤营萧萨落著葛葡蒂蒋蒙蓉蓝蓬蔑蔡薄薪藉藏藤虎虑虫虹虽虾蚁蛇蛋蛙蛮蜂蜜蝶融蟹蠢血行街衡衣补表袋被袭裁裂装裕裤西要覆见观规视览觉角解言誉誓警计订认讨让训议讯记讲讷许论设访证评识诉词译试诗诚话诞询该详语误说请诸诺读课谁调谅谈谊谋谓谜谢谨谱谷豆象豪貌贝贞负贡财责贤败货质贩贪购贯贱贴贵贸费贺贼贾资赋赌赏赐赔赖赚赛赞赠赢赤赫走赵起趁超越趋趣足跃跌跑距跟路跳踏踢踩身躲车轨轩转轮软轰轻载较辅辆辈辉辑输辛辞辨辩辰辱边达迁迅过迈迎运近返还这进远违连迟迦迪迫述迷追退送适逃逆选逊透逐递途通逛逝速造逢逸逻逼遇遍道遗遭遮遵避邀邓那邦邪邮邱邻郎郑部郭都鄂酉酋配酒酷酸醉醒采释里重野量金针钓钟钢钦钱钻铁铃铜铢铭银铺链销锁锅锋错锡锦键锺镇镜镭长门闪闭问闰闲间闷闹闻阁阅阐阔队阮防阳阴阵阶阻阿陀附际陆陈降限院除险陪陵陶陷隆随隐隔障难雄雅集雉雨雪雯雳零雷雾需震霍霖露霸霹青靖静非靠面革靼鞋鞑韦韩音页顶项顺须顽顾顿预领颇频颗题额风飘飙飞食餐饭饮饰饱饼馆首香馨马驱驶驻驾验骑骗骚骤骨高鬼魂魅魔鱼鲁鲜鸟鸡鸣鸭鸿鹅鹤鹰鹿麦麻黄黎黑默鼓鼠鼻齐齿龄龙龟﹉﹊﹋﹌_＿﹍﹎﹏︳︴-－﹣‐–—︱―,，﹐、﹑;；﹔:：﹕!！﹗?？﹖.．﹒‥︰…。·＇‘’\\\\\\"＂“”〝〞(（﹙︵)）﹚︶[［]］{｛﹛︷}｝﹜︸〈︿〉﹀《︽》︾「﹁」﹂『﹃』﹄【︻】︼〔﹝︹〕﹞︺〖〗‖§@＠﹫*＊﹡/／\\\\\\\\＼﹨&＆﹠#＃﹟%％﹪‰′″‵〃※","Zulu":"abhcdlyefgqxijkpmntsoruvwzABHCDLYEFGQXIJKPMNTSORUVWZ-,;:!?.()[]{}"}\n';});

fs.define('specimenTools/services/FontsData',[
    'specimenTools/_BaseWidget'
  , '!require/text!specimenTools/services/languageCharSets.json'
], function(
    Parent
  , languageCharSetsJson
) {
    "use strict";
    /*jshint esnext:true*/

    var weight2weightName = {
          // "modern" weight values starting from 100
            100: 'Thin'
          , 200: 'Light'

          // conventional "windows-safe" weight values
          , 250: 'Thin'
          , 275: 'ExtraLight'

          , 300: 'Light'
          , 400: 'Regular'
          , 500: 'Medium'
          , 600: 'SemiBold'
          , 700: 'Bold'
          , 800: 'ExtraBold'
          , 900: 'Black'

          // misc bad values (found first in WorkSans)
          , 260: 'Thin'
          , 280: 'ExtraLight'
        }
      , weight2cssWeight = {
          // "modern" weight values starting from 100
            100: '100'
          , 200: '200'

          // conventional "windows-safe" weight values
          , 250: '100'
          , 275: '200'

          , 300: '300'
          , 400: '400'
          , 500: '500'
          , 600: '600'
          , 700: '700'
          , 800: '800'
          , 900: '900'

          // misc bad values (found first in WorkSans)
          , 260: '100'
          , 280: '200'
        }
      , width2cssWidth = {
            'ultra-condensed':  'ultra-condensed'
          , 'extra-condensed':  'extra-condensed'
          , 'condensed':        'condensed'
          , 'semi-condensed':   'semi-condensed'
          , 'normal':           'normal'
          , 'semi-expanded':    'semi-expanded'
          , 'expanded':         'expanded'
          , 'extra-expanded':   'extra-expanded'
          , 'ultra-expanded':   'ultra-expanded'
          // additional used PS values and their (arbitrary) css mapping
          , 'narrow':           'condensed'
          , 'wide':             'expanded'
      }
      ;

    function FontsData(pubsub, options) {
        Parent.call(this, options);
        this._pubSub = pubsub;
        this._pubSub.subscribe('loadFont', this._onLoadFont.bind(this));
        this._data = [];
        Object.defineProperty(this._data, 'globalCache', {
            value: Object.create(null)
        });
    }

    var _p = FontsData.prototype = Object.create(Parent.prototype);
    _p.constructor = FontsData;

    FontsData.defaultOptions = {
        // This should be set explicitly to true (or a string containing
        // glyphs that are allowed to miss despite of being required in
        // languageCharSetsJson.
        // The builtin FontsData.DEFAULT_LAX_CHAR_LIST is there for
        // convenience but may cause trouble!
        useLaxDetection: false
    };

    FontsData._cacheDecorator = function (k) {
        return function(fontIndex) {
            /*jshint validthis:true*/
            var args = [], i, l, data, cached;

            for(i=0,l=arguments.length;i<l;i++)
                args[i] = arguments[i];

            data = this._aquireFontData(fontIndex);
            if(!(k in data.cache))
                cached = data.cache[k] = this[k].apply(this, args);
            else
                cached = data.cache[k];
            return cached;
        };
    };

    FontsData._installPublicCachedInterface = function(_p) {
        var k, newk;
        for(k in _p) {
            newk = k.slice(1);
            if(k.indexOf('_get') !== 0
                        || typeof _p[k] !== 'function'
                        // don't override if it is defined
                        || newk in _p)
                continue;
            _p[newk] = FontsData._cacheDecorator(k);
        }
    };

    FontsData._getFeatures = function _getFeatures(features, langSys, featureIndexes) {
        /*jshint validthis:true*/
        var i,l, idx, tag;
        for(i=0,l=featureIndexes.length;i<l;i++) {
            idx = featureIndexes[i];
            tag = features[idx].tag;
            if(!this[tag])
                this[tag] = [];
            this[tag].push(langSys);
        }
    };

    FontsData.getFeatures = function getFeatures(font) {
        // get all gsub features:
        var features = {/*tag: ["{script:lang}", {script:lang}]*/}
          ,  table, scripts, i, l, j, m, script, scriptTag, lang
          ;
        if(!('gsub' in font.tables) || !font.tables.gsub.scripts)
            return features;
        table = font.tables.gsub;
        scripts = font.tables.gsub.scripts;
        for(i=0,l=scripts.length;i<l;i++) {
            script = scripts[i].script;
            scriptTag = scripts[i].tag;
            if(script.defaultLangSys) {
                lang = 'Default';
                FontsData._getFeatures.call(features
                  , table.features
                  , [scriptTag, lang].join(':')
                  , script.defaultLangSys.featureIndexes
                );
            }
            if(script.langSysRecords) {
                for(j = 0, m = script.langSysRecords.length; j < m; j++) {
                    lang = script.langSysRecords[j].tag;
                    FontsData._getFeatures.call(features
                      , table.features
                      , [scriptTag, lang].join(':')
                      , script.langSysRecords[j].langSys.featureIndexes
                    );
                }
            }
            return features;
        }
        // when supported by opentype.js, get all gpos features:
    };

    FontsData.languageCharSets = JSON.parse(languageCharSetsJson);

    FontsData.sortCoverage = function sortCoverage(a, b) {
        if(a[1] === b[1])
            // compare the names of the languages, to sort alphabetical;
            return a[0].localeCompare(b[0]);
        return b[1] - a[1] ;
    };

    // These are characters that appear in the CLDR data as needed for
    // some languages, but we decided that they are not exactly needed
    // for language support.
    // These are all punctuation characters currently.
    // Don't just trust this list, and if something is terribly wrong
    // for your language, please complain!
    FontsData.DEFAULT_LAX_CHAR_LIST = new Set([
        0x2010 // HYPHEN -> we usually use/include HYPHEN-MINUS: 0x002D
      , 0x2032 // PRIME
      , 0x2033 // DOUBLE PRIME
      , 0x27e8 // MATHEMATICAL LEFT ANGLE BRACKET
      , 0x27e9 // MATHEMATICAL RIGHT ANGLE BRACKET
      , 0x2052 // COMMERCIAL MINUS SIGN
    ]);

    FontsData.getLanguageCoverage = function getLanguageCoverage(font, useLaxDetection) {
        var result = []
          , included, missing, laxSkipped
          , language, chars, charCode, found, i, l, total
          , laxCharList
          ;

        if(typeof useLaxDetection === 'string') {
            laxCharList = new Set();
            for(i=0,l=useLaxDetection.length;i<l;i++)
                laxCharList.add(useLaxDetection.codePointAt(i));
        }
        else
            laxCharList = FontsData.DEFAULT_LAX_CHAR_LIST;

        for(language in FontsData.languageCharSets) {
            // chars is a string
            chars = FontsData.languageCharSets[language];
            found = 0;
            total = l = chars.length;
            included = [];
            missing = [];
            laxSkipped = [];
            for(i=0;i<l;i++) {
                charCode = chars.codePointAt(i);
                if(charCode in font.encoding.cmap.glyphIndexMap) {
                    found += 1;
                    included.push(charCode);
                }
                else if(useLaxDetection && laxCharList.has(charCode)) {
                    total = total-1;
                    laxSkipped.push(charCode);
                }
                else
                    missing.push(charCode);
            }
            result.push([language, found/total, found, total, missing, included, laxSkipped]);
        }

        result.sort(FontsData.sortCoverage);
        return result;
    };

    _p._aquireFontData = function(fontIndex) {
        var data = this._data[fontIndex];
        if(!data)
            throw new Error('FontIndex "'+fontIndex+'" is not available.');
        return data;
    };

    _p._onLoadFont = function(fontIndex, fontFileName, font, originalArraybuffer) {
        this._data[fontIndex] = {
            font: font
          , fileName: fontFileName
          , originalArraybuffer: originalArraybuffer
          , cache: Object.create(null)
        };
    };

    _p._getLanguageCoverage = function(fontIndex) {
        return FontsData.getLanguageCoverage(this._data[fontIndex].font, this._options.useLaxDetection);
    };

    _p._getLanguageCoverageStrict = function(fontIndex) {
        return FontsData.getLanguageCoverage(this._data[fontIndex].font, false);
    };

    _p._getLanguageCoverageLax = function(fontIndex) {
        return FontsData.getLanguageCoverage(this._data[fontIndex].font, true);
    };

    _p._getSupportedLanguages = function(fontIndex) {
        var coverage = this.getLanguageCoverage(fontIndex)
          , i, l
          , result = [], language, support
          ;
        for(i=0,l=coverage.length;i<l;i++) {
            language = coverage[i][0];
            support = coverage[i][1];
            if(support === 1)
                result.push(language);
        }
        result.sort();
        return result;
    };

    _p._getNumberGlyphs = function(fontIndex) {
        return this._data[fontIndex].font.glyphNames.names.length;
    };

    _p._getFeatures = function(fontIndex) {
        return FontsData.getFeatures(this._data[fontIndex].font);
    };

    _p._getFamilyName  = function(fontIndex) {
        var font = this._data[fontIndex].font
          , fontFamily
          ;

        fontFamily = font.names.postScriptName.en
                        || Object.values(font.names.postScriptName)[0]
                        || font.names.fontFamily
                        ;
        fontFamily = fontFamily.split('-')[0];

        return fontFamily
    };

    _p._getFullName = function (fontIndex) {
        var font = this._data[fontIndex].font
          , fullName = ""
          , fileName = this.getFileName(fontIndex)
          ;

        fullName = [this.getFamilyName(fontIndex), this.getStyleName(fontIndex)].join(" ");

        if (fileName.indexOf("/") !== -1) {
            fileName = fileName.substring(fileName.lastIndexOf("/") + 1);
        }
        
        if (typeof this._options.overwrites === "object" && typeof this._options.overwrites[fileName] === "string") {
            fullName = this._options.overwrites[fileName];
        }

        return fullName;
    }

    _p._getOS2FontWeight = function(fontIndex) {
        var font = this._data[fontIndex].font;
        return font.tables.os2.usWeightClass;
    };

    // Keeping this, maybe we'll have to transform this name further for CSS?
    _p._getCSSFamilyName = _p._getFamilyName;

    _p._getIsItalic = function(fontIndex) {
        var font = this._data[fontIndex].font
          , italicFromOS2 = !!(font.tables.os2.fsSelection & font.fsSelectionValues.ITALIC)
          , subFamily = this.getSubfamilyName(fontIndex).toLowerCase()
          , italicFromName = subFamily.indexOf("italic") !== -1 || subFamily.indexOf("oblique") !== -1
          ;
        return italicFromOS2 || italicFromName;
    };

    _p.getFamiliesData = function() {
        var cacheKey = 'getFamiliesData';
        if(cacheKey in this._data.globalCache)
            return this._data.globalCache[cacheKey];

        var families = Object.create(null)
          , weightDict, styleDict
          , fontFamily, fontWeight, fontStyle
          , fontIndex, l
          , result
          ;
        for(fontIndex=0,l=this._data.length;fontIndex<l;fontIndex++) {
            fontFamily  = this.getFamilyName(fontIndex);
            fontWeight = this.getCSSWeight(fontIndex);
            fontStyle = this.getCSSStyle(fontIndex);

            weightDict = families[fontFamily];
            if(!weightDict)
                families[fontFamily] = weightDict = Object.create(null);

            styleDict = weightDict[fontWeight];
            if(!styleDict)
                weightDict[fontWeight] = styleDict = Object.create(null);

            if(fontStyle in styleDict) {
                console.warn('A font with weight ' + fontWeight
                                + ' and style "'+fontStyle+'"'
                                + ' has already appeared for '
                                +'"' +fontFamily+'".\nFirst was the file: '
                                + styleDict[fontStyle] + ' '
                                + this.getFileName(styleDict[fontStyle])
                                + '.\nNow the file: ' + fontIndex + ' '
                                +  this.getFileName(fontIndex)
                                + ' is in conflict.\nThis may hint to a bad '
                                + 'OS/2 table entry.\nSkipping.'
                                );
                continue;
            }
            // assert(fontStyle not in weightDict)
            styleDict[fontStyle] = fontIndex;
        }

        result =  Object.keys(families).sort()
              .map(function(key){ return [key, this[key]];}, families);
        this._data.globalCache[cacheKey] = result;
        return result;
    };

    // no need to cache these: No underscore will prevent
    //_installPublicCachedInterface from doing anything.
    _p.getNumberSupportedLanguages = function(fontIndex) {
        return this.getSupportedLanguages(fontIndex).length;
    };

    _p.getFont = function(fontIndex) {
        return this._aquireFontData(fontIndex).font;
    };

    _p.getFileName = function(fontIndex) {
        return this._aquireFontData(fontIndex).fileName;
    };

    _p.getOriginalArraybuffer = function(fontIndex) {
        return this._aquireFontData(fontIndex).originalArraybuffer;
    };

    _p.getCSSWeight = function(fontIndex) {
        return weight2cssWeight[this.getOS2FontWeight(fontIndex)];
    };

    _p.getWeightName = function(fontIndex) {
        return weight2weightName[this.getOS2FontWeight(fontIndex)];
    };

    _p.getCSSStyle = function(fontIndex) {
        return this.getIsItalic(fontIndex) ? 'italic' : 'normal';
    };

    _p.getStyleName = function(fontIndex) {
        return this.getWeightName(fontIndex) + (this.getIsItalic(fontIndex) ? ' Italic' : '');
    };

    _p.getCSSStretch = function(fontIndex) {
        return this.getStretchName(fontIndex);
    };

    _p.getStretchName = function(fontIndex) {
        var font = this._data[fontIndex].font
          , fontFamily, subFamily
          , width, widths = Object.keys(width2cssWidth)
          , i, l
          ;

        fontFamily = font.names.postScriptName.en
                        || Object.values(font.names.postScriptName)[0]
                        || font.names.fontFamily
                        ;

        // delete all before and incuded the first "-", don't use PS subfamily string
        // but extract from full PS name;
        // also use the entrie name if no "-" was found
        if (fontFamily.indexOf("-") > -1) {
            subFamily = fontFamily.substring(fontFamily.indexOf("-") + 1);
        } else {
            subFamily = fontFamily;
        }
        subFamily = subFamily.toLowerCase();

        // since the "normal" width could be extracted but refer to style or weight
        // try extract only other explicit width names and default to "normal" if
        // none other were found
        for (i=0,l=widths.length;i<l;i++) {
            width = widths[i];
            if (width !== 'normal') {
                if (subFamily.indexOf(width) > -1) {
                    return width2cssWidth[width];
                }
            }

        }
        return 'normal';
    }

    _p.getPostScriptName = function(fontIndex) {
        return this._aquireFontData(fontIndex).font.names.postScriptName;
    };

    _p.getSubfamilyName = function(fontIndex) {
        var font = this._data[fontIndex].font
          , fontFamily, subFamily
          ;

        fontFamily = font.names.postScriptName.en
                        || Object.values(font.names.postScriptName)[0]
                        || font.names.fontFamily
                        ;

        // delete all before and incuded the first "-", don't use PS subfamily string
        // but extract from full PS name;
        // also use the entrie name if no "-" was found
        if (fontFamily.indexOf("-") > -1) {
            subFamily = fontFamily.substring(fontFamily.indexOf("-") + 1);
        } else {
            subFamily = fontFamily;
        }
        return subFamily;
    }

    _p.getGlyphByName = function(fontIndex, name) {
        var font = this._aquireFontData(fontIndex).font
          , glyphIndex = font.glyphNames.nameToGlyphIndex(name)
          , glyph = font.glyphs.get(glyphIndex)
          ;
        return glyph;
    };

    _p.getFontValue = function(fontIndex, name /* like: "xHeight" */) {
        var font = this._aquireFontData(fontIndex).font;
        switch(name){
            case('xHeight'):
                return font.tables.os2.sxHeight;
            case('capHeight'):
                 return font.tables.os2.sCapHeight;
            case('ascender'):
            /*falls through*/
            case('descender'):
                return font[name];
            default:
                console.warn('getFontValue: don\'t know how to get "'+ name +'".');
        }
    };

    function familiesDataReducer(all, item) {
        var i, l, weightDict, weights, styles, result = [];
        weightDict = item[1];
        weights = Object.keys(weightDict).sort();
        for(i=0,l=weights.length;i<l;i++) {
            styles = weightDict[weights[i]];
            if('normal' in styles)
                result.push(styles.normal);
            if('italic' in styles)
                result.push(styles.italic);
        }
        return all.concat(result);
    }

    _p.getFontIndexesInFamilyOrder = function(){
        var familiesData = this.getFamiliesData();
        return familiesData.reduce(familiesDataReducer, []);
    };

    _p.getFontIndexes = function() {
        var fontIndex, l, result = [];
        for(fontIndex=0,l=this._data.length;fontIndex<l;fontIndex++)
            result.push(fontIndex);
        return result;
    };


    /* Polyfill codePointAt */
    /*! http://mths.be/codepointat v0.1.0 by @mathias */
    if (!String.prototype.codePointAt) {
      (function() {
        'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
        var codePointAt = function(position) {
            if (this == null) {
                throw TypeError();
            }
            var string = String(this)
              , size = string.length
            // `ToInteger`
              , index = position ? Number(position) : 0
              , first, second;

            if (index != index) { // better `isNaN`
                index = 0;
            }
            // Account for out-of-bounds indices:
            if (index < 0 || index >= size) {
                return undefined;
            }
            // Get the first code unit
            first = string.charCodeAt(index);
            second;
            if ( // check if it’s the start of a surrogate pair
                first >= 0xD800 && first <= 0xDBFF && // high surrogate
                size > index + 1 // there is a next code unit
            ) {
                second = string.charCodeAt(index + 1);
                if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
                    // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                    return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
                }
            }
          return first;
        };
        if (Object.defineProperty) {
            Object.defineProperty(String.prototype, 'codePointAt', {
                'value': codePointAt,
                'configurable': true,
                'writable': true
            });
        } else {
            String.prototype.codePointAt = codePointAt;
        }
      }());
    }

    FontsData._installPublicCachedInterface(_p);
    return FontsData;
});

fs.define('specimenTools/services/WebfontProvider',[
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";

    /**
     * WebFontProvider takes the original arraybuffer of the loaded fonts
     * and adds it as a Web-Font—i.e. as loaded with @font-face—to the
     * document.
     *
     * The values for CSS 'font-style', 'font-weight' and 'font-family'
     * are taken from the font directly, via the FontData service and
     * there via opentype.js.
     *
     * The public method `setStyleOfElement(fontIndex, element)`
     * sets the element.style so that the web font with fontIndex is
     * displayed.
     *
     * The public method `getStyleProperties(fontIndex)` returns a string
     * of CSS properties that would make the font with fontIndex being
     * displayed.
     */
    function WebFontProvider(window, pubsub, fontData, options) {
        Parent.call(this, options);
        this._window = window;
        this._pubSub = pubsub;
        this._fontData = fontData;
        this._pubSub.subscribe('loadFont', this._onLoadFont.bind(this));
        this._data = [];
        this._blobs = [];

        this.__stylesheet = null;
    }

    var _p = WebFontProvider.prototype = Object.create(Parent.prototype);
    _p.constructor = WebFontProvider;

    WebFontProvider.defaultOptions = {
    };

    Object.defineProperty(_p, '_styleSheet', {
        get: function() {
            if(!this.__stylesheet) {
                var elem = this._window.document.createElement('style');
                // seems like Webkit needs this,it won't do any harm anyways.
                elem.appendChild(this._window.document.createTextNode(''));
                this._window.document.head.appendChild(elem);
                this.__stylesheet = elem.sheet;
            }
            return this.__stylesheet;
        }
    });

    _p._makeWebfont = function(fontIndex) {
        var arrBuff = this._fontData.getOriginalArraybuffer(fontIndex)
          , familyName = this._fontData.getCSSFamilyName(fontIndex)
          , weight = this._fontData.getCSSWeight(fontIndex)
          , style = this._fontData.getCSSStyle(fontIndex)
          , stretch = this._fontData.getCSSStretch(fontIndex)
          , fontface, url, blob, styleData
          ;

        this._data[fontIndex] = styleData = Object.create(null);
        styleData['font-style'] = style;
        styleData['font-weight'] = weight;
        styleData['font-family'] = familyName;
        styleData['font-stretch'] = stretch;
        Object.defineProperty(styleData, '_props', {
            value: null
          , enumerable: false
          , writable: true
        });

        if('FontFace' in this._window) {
            // more modern and direct
            fontface = new this._window.FontFace(familyName, arrBuff,{
                        stretch: stretch
                      , weight: weight
                      , style: style
                    });
            this._window.document.fonts.add( fontface );
        }
        else {
            // oldschool, a bit bloated
            blob = new this._window.Blob([arrBuff], { type: 'font/opentype' });
            this._blobs[fontIndex] = blob;
            url = this._window.URL.createObjectURL(blob);
            this._styleSheet.insertRule([
                    '@font-face {'
                , this.getStyleProperties(fontIndex)
                , 'src: url(' + url + ');'
                , '}'
                ].join(''), this._styleSheet.cssRules.length);
        }
    };

    _p._onLoadFont = function(fontIndex) {
        this._makeWebfont(fontIndex);
    };

    /**
     * use this in the style attribute or in css rules
     */
    _p.getStyleProperties = function(fontIndex) {
        var data = this._data[fontIndex]
          , props, propName
          ;
        if(!data)
            throw new Error('FontIndex "' + fontIndex + '" is not loaded.');
        props = data._props;
        if(!props) {
            props = [];
            for(propName in data)
                props.push(propName, ': ', data[propName], ';');
            props = props.join('');
        }
        return props;
    };

    _p.setStyleOfElement = function(fontIndex, element) {
        var data = this._data[fontIndex]
          , propName
          ;
        if(!data)
            throw new Error('FontIndex "' + fontIndex + '" is not loaded.');
        for(propName in data)
            element.style[this._cssName2jsName(propName)] = data[propName];
    };

    return WebFontProvider;
});

fs.define('specimenTools/widgets/GenericFontData',[
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";
    /*jshint esnext:true*/

    /**
     * GenericFontData looks at the "data-getter" attribute of the host
     * element and queries FontData for that getter description and the
     * current font. Then it sets hostElement.textContent to the result
     * of the query.
     *
     * The "data-getter" attribute value should be the name of a getter function
     * in FontData without the preceding `get` e.g. for `data-getter="NumberSupportedLanguages"`
     * `fontData.getNumberSupportedLanguages(currentFontIndex)` will be called.
     *
     * The result of the call to FontData.get{...} is not specially formatted.
     * arrays are joined with ", " but everything else will just be used
     * as it.
     *
     * The option `getValue` can be used to adhoc enhance the getter and
     * string formatting. If more is needed GenericFontData should be subclassed.
     *
     */
    function GenericFontData(container, pubSub, fontData, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontData = fontData;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
    }

    var _p = GenericFontData.prototype = Object.create(Parent.prototype);
    _p.constructor = GenericFontData;

    GenericFontData.defaultOptions = {
        // this can be a method called instead of the native getValue
        // function. The single argument is (int) fontIndex.
        // The this-value is the instance of GenericFontData.
        getValue: null
    };

    _p._defaultGetValue  = function(fontIndex) {
        var _getter, getter;
        getter = _getter = this._container.getAttribute('data-getter');
        if(getter.indexOf('get') !== 0)
            getter = ['get', getter[0].toUpperCase(), getter.slice(1)].join('');

        if(!(getter in this._fontData) || typeof this._fontData[getter] !== 'function')
            throw new Error('Unknown getter "' + _getter + '"'
                        + (getter !== _getter
                                    ? '(as "' + getter + '")'
                                    : '')
                        +'.');
        return this._fontData[getter](fontIndex);
    };

    _p._getValue = function(fontIndex) {
        var value;
        if(this._options.getValue !== null)
            // This is a rude way to enhance this
            return this._options.getValue.call(this, fontIndex);
        value = this._defaultGetValue(fontIndex);
        if(typeof value.length === 'number' && typeof value !== 'string')
            value = Array.prototype.join.call(value, ', ');
        return value;
    };

    _p._onActivateFont = function(fontIndex) {
        this._container.textContent = this._getValue(fontIndex);
    };

    return GenericFontData;
});

fs.define('specimenTools/widgets/CurrentWebFont',[
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";
    /*jshint esnext:true*/

    /**
     * Wigets that sets the `element.style` for the currently selected
     * font.
     *
     * Note that in conjunction with the DOM attribute `contenteditable="true"`
     * or a `<textarea>` element a simple tool for typing the current font
     * is created.
     */

    function CurrentWebFont(container, pubSub, webFontProvider, options) {
        Parent.call(this, options);
        this._container = container;
        this._webFontProvider = webFontProvider;
        this._pubSub = pubSub;
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
    }

    var _p = CurrentWebFont.prototype = Object.create(Parent.prototype);
    _p.constructor = CurrentWebFont;

    CurrentWebFont.defaultOptions = {
    };

    _p._onActivateFont = function(fontIndex) {
        this._webFontProvider.setStyleOfElement(fontIndex, this._container);
    };

    return CurrentWebFont;
});

fs.define('specimenTools/services/OTFeatureInfo',[
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";
    /*jshint esnext:true*/

    // feature data collected from
    // https://www.microsoft.com/typography/otspec/featuretags.htm ff.
    // Why is there no machine readable version? -- Probably because
    // everything is very vague over there.
    //
    // How to interprete this data:
    //
    // The purpose of this data is to provide a user interface for a font
    // for turning features available in the font on and off.
    // `friendlyName` used to name the feature  probably like this: "{tag} {friendlyName}"
    // `onByDefault`: Taken from "UI suggestion", can have three values:
    //                                `false`, `true`, `null`
    //              `false`: This feature is optional and must be turned on
    //                       by the user. We'll primarily focus on making these
    //                       features available
    //              `true`: This feature is on by default. Usually because
    //                      it is needed to display the font/script/language
    //                      correctly.
    //                      We could allow the user to turn these off, however
    //                      for the specimen use case this is probably overkill.
    //                      For a QA/font testing/inspection tool, this
    //                      could be more interesting!
    //                      Most prominent are examples like `kern` or `liga`
    //                      For the specimen, maybe as a hidden/expandable menu
    //                      option.
    //              `null`: These features are in one or the other way special
    //                      It's not easy to determine from the spec if they are
    //                      on or off. They are sometimes "sub-features" that
    //                      enable other user-selectable features to function
    //                      or similar. We are going to ignore these in the first
    //                      round, until good use cases emerge.
    // `slSensitivity`: array, Taken from "Script/language sensitivity" This is
    //                  basically none-data at the moment. It's here to give an
    //                  idea of the lingusitic context where th e feature is used.
    //                  An empty array usually means all scripts and languages.
    //                  This may become useful in the future, if there is an idea
    //                  how to use and represent the data properly
    //
    // For more information, look at the spec link above and consider adding
    // it here, if it can be useful, including a little description above.
    //
    // Some fetures, like `salt` are non boolean. In css we can give these
    // integer settings. For the moment, only boolean features should
    // be supported. Thus, the others should be set to onByDefault = null
    var featureData = Object.create(null);

    featureData.aalt = {
        friendlyName: 'Access All Alternates'
      , onByDefault: null
      , slSensitivity: []
    // special, not really useful for running text
    };
    featureData.abvf = {
        friendlyName: 'Above-base Forms'
      , onByDefault: true
      , slSensitivity: ['Khmer script']
    };
    featureData.abvm = {
        friendlyName: 'Above-base Mark Positioning'
      , onByDefault: true
      , slSensitivity: ['Indic scripts']
    };
    featureData.abvs = {
        friendlyName: 'Above-base Substitutions'
      , onByDefault: true
      , slSensitivity: ['Indic scripts']
    };
    featureData.afrc = {
        friendlyName: 'Alternative Fractions'
      , onByDefault: false
      , slSensitivity: []
    };
    featureData.akhn = {
        friendlyName: 'Akhands'
        // Control of the feature should not generally be exposed to the user
      , onByDefault: null
      , slSensitivity: ['Indic scripts']
    };
    featureData.blwf = {
        friendlyName: 'Below-base Forms'
        //  Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['Indic scripts']
    };
    featureData.blwm = {
        friendlyName: 'Below-base Mark Positioning'
      , onByDefault: true
      , slSensitivity: ['Indic scripts']
    };
    featureData.blws = {
        friendlyName: 'Below-base Substitutions'
      , onByDefault: true
      , slSensitivity: ['Indic scripts']
    };
    featureData.calt = {
        friendlyName: 'Contextual Alternates'
      , onByDefault: true
      , slSensitivity: []
    };
    featureData['case'] = {
        friendlyName: 'Case-Sensitive Forms'
        // "
        // It would be good to apply this feature (or turn it off) by
        // default when the user changes case on a sequence of more than
        // one character. Applications could also detect words consisting
        // only of capitals, and apply this feature based on user preference
        // settings.
        // "
      , onByDefault: false
      , slSensitivity: ['European scripts', 'Spanish Language']
      , exampleText: '¡!(H-{E[L]L}O)'
    };
    featureData.ccmp = {
        friendlyName: 'Glyph Composition / Decomposition'
       , onByDefault: true
       , slSensitivity: []
    };
    featureData.cfar = {
        friendlyName: 'Conjunct Form After Ro'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['Khmer scripts']
    };
    featureData.cjct = {
        friendlyName: 'Conjunct Forms'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: [' Indic scripts that show similarity to Devanagari']
    };
    featureData.clig = {
        friendlyName: 'Contextual Ligatures'
      , onByDefault: true
      , slSensitivity: []
    };
    featureData.cpct = {
        friendlyName: 'Centered CJK Punctuation'
      , onByDefault: false
      , slSensitivity: ['Chinese']
    };
    featureData.cpsp = {
        friendlyName: '	Capital Spacing'
        // This feature should be on by default.
        // Applications may want to allow the user to respecify the percentage to fit individual tastes and functions.
      , onByDefault: true
      , slSensitivity: ['Should not be used in connecting scripts (e.g. most Arabic)']
    };
    featureData.cswh = {
        friendlyName: 'Contextual Swash'
      , onByDefault: false
      , slSensitivity: []
    };
    featureData.curs = {
        friendlyName: 'Cursive Positioning'
        // This feature could be made active or inactive by default, at the user's preference.
        // (I don't know how this is handled, for Arabic I'd expect it to be
        // necessary to render the font properly if it is present. Actually
        // every font that contains this feature implies that it is needed
        // to make the font work fine ...)
      , onByDefault: null
      , slSensitivity: []
    };

    // cv01-cv99 	 Character Variants
    (function(featureData){
        var i, num, tag;
        for(i=1;i<100;i++) {
            num = ('0' + i).slice(-2);
            tag = 'cv' + num;
            featureData[tag] = {
                friendlyName: 'Character Variants ' + i
              // hmm: The Microsoft spec says these features have
              // a user-interface string: "featUiLabelNameId".
              // It would be nice to extract these  from the font if present.
              , onByDefault: false
              , slSensitivity: []
            };
        }
    })(featureData);

    featureData.c2pc = {
        friendlyName: 'Petite Capitals From Capitals'
      , onByDefault: false
      , slSensitivity: ['scripts with both upper- and lowercase forms', 'Latin', 'Cyrillic', 'Greek']
    };
    featureData.c2sc = {
        friendlyName: 'Small Capitals From Capitals'
      , onByDefault: false
      , slSensitivity: ['bicameral scripts', 'Latin', 'Greek', 'Cyrillic', 'Armenian']
      , exampleText: 'HELLO WORLD'
    };
    featureData.dist = {
        friendlyName: 'Distances'
        //  This feature could be made active or inactive by default, at the user's preference.
      , onByDefault: null
      , slSensitivity: ['Indic scripts']
    };
    featureData.dlig = {
        friendlyName: 'Discretionary Ligatures'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: 'act stand (1) (7)'
    };
    featureData.dnom = {
        friendlyName: 'Denominators'
        // This feature should normally be called by an application when the user applies the frac feature
      , onByDefault: null
      , slSensitivity: []
    };
    featureData.dtls = {
        friendlyName: 'Dotless Forms'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['math formula layout']
    };
    featureData.expt = {
        friendlyName: 'Expert Forms'
        // UI suggestion: Applications may choose to have this feature
        // active or inactive by default, depending on their target markets.
        // (I'd expect browsers to have it off by default. But actually:
        // "depending on their target markets" is not very helpful.
        // Maybe it is on when the script is Japanese?)
      , onByDefault: null
      , slSensitivity: ['Japanese']
    };
    featureData.falt = {
        friendlyName: 'Final Glyph on Line Alternates'
        // This feature could be made active or inactive by default, at the user's preference.
      , onByDefault: null
      , slSensitivity: ['any cursive script', 'Arabic']
    };
    featureData.fin2 = {
        friendlyName: 'Terminal Forms #2'
      , onByDefault: true
      , slSensitivity: ['Syriac']
    };
    featureData.fin3 = {
        friendlyName: 'Terminal Forms #3'
      , onByDefault: true
      , slSensitivity: ['Syriac']
    };
    featureData.fina = {
        friendlyName: 'Terminal Forms'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['script with joining behavior', 'Arabic']
    };
    featureData.flac = {
        friendlyName: 'Flattened accent forms'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['math formula layout']
    };
    featureData.frac = {
        friendlyName: 'Fractions'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: '1/2 1/4'
    };
    featureData.fwid = {
        friendlyName: 'Full Widths'
      , onByDefault: false
      , slSensitivity: ['scripts which can use monospaced forms']
    };
    featureData.half = {
        friendlyName: 'Half Forms'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: [' Indic scripts that show similarity to Devanagari']
    };
    featureData.haln = {
        friendlyName: 'Halant Forms'
      , onByDefault: true
      , slSensitivity: ['Indic scripts']
    };
    featureData.halt = {
        friendlyName: 'Alternate Half Widths'
        // In general, this feature should be off by default.
      , onByDefault: false
      , slSensitivity: ['CJKV']
    };
    featureData.hist = {
        friendlyName: 'Historical Forms'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: 'basic'
    };
    featureData.hkna = {
        friendlyName: 'Horizontal Kana Alternates'
      , onByDefault: false
      , slSensitivity: ['hiragana', 'katakana']
    };
    featureData.hlig = {
        friendlyName: 'Historical Ligatures'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: 'ba\u017fic \u017fs \u017fl'
    };
    featureData.hngl = {
        // DEPRECATED in 2016
        friendlyName: 'Hangul'
      , onByDefault: false
      , slSensitivity: ['Korean']
    };
    featureData.hojo = {
        friendlyName: 'Hojo Kanji Forms (JIS X 0212-1990 Kanji Forms)'
      , onByDefault: false
      , slSensitivity: ['Kanji']
    };
    featureData.hwid = {
        friendlyName: 'Half Widths'
      , onByDefault: false
      , slSensitivity: ['CJKV']
    };
    featureData.init = {
        friendlyName: 'Initial Forms'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['script with joining behavior', 'Arabic']
    };
    featureData.isol = {
        friendlyName: 'Isolated Forms'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['script with joining behavior', 'Arabic']
    };
    featureData.ital = {
        friendlyName: 'Italics'
        // When a user selects text and applies an Italic style,
        // an application should check for this feature and use it if present.
      , onByDefault: null
      , slSensitivity: ['mostly Latin']
    };
    featureData.jalt = {
        friendlyName: 'Justification Alternates'
        //  This feature could be made active or inactive by default, at the user's preference.
      , onByDefault: null
      , slSensitivity: ['any cursive script']
    };
    featureData.jp78 = {
        friendlyName: 'JIS78 Forms'
      , onByDefault: false
      , slSensitivity: ['Japanese']
    };
    featureData.jp83 = {
        friendlyName: 'JIS83 Forms'
      , onByDefault: false
      , slSensitivity: ['Japanese']
    };
    featureData.jp90 = {
        friendlyName: 'JIS90 Forms'
      , onByDefault: false
      , slSensitivity: ['Japanese']
    };
    featureData.jp04 = {
        friendlyName: 'JIS2004 Forms'
      , onByDefault: false
      , slSensitivity: ['Kanji']
    };
    featureData.kern = {
        friendlyName: 'Kerning'
      , onByDefault: true
      , slSensitivity: []
    };
    featureData.lfbd = {
        friendlyName: 'Left Bounds'
        // This feature is called by an application when the user invokes the opbd feature.
      , onByDefault: null
      , slSensitivity: []
    };
    featureData.liga = {
        friendlyName: 'Standard Ligatures'
      , onByDefault: true
      , slSensitivity: []
    };
    featureData.ljmo = {
        friendlyName: 'Leading Jamo Forms'
      , onByDefault: true
      , slSensitivity: ['Hangul + Ancient Hangul']
    };
    featureData.lnum = {
        friendlyName: 'Lining Figures'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: '31337 H4X0R'
    };
    featureData.locl = {
        friendlyName: 'Localized Forms'
      , onByDefault: true
      , slSensitivity: []
    };
    featureData.ltra = {
        friendlyName: 'Left-to-right alternates'
      , onByDefault: null
      , slSensitivity: ['Left-to-right runs of text']
    };
    featureData.ltrm = {
        friendlyName: 'Left-to-right mirrored forms'
      , onByDefault: null
      , slSensitivity: ['Left-to-right runs of text']
    };
    featureData.mark = {
        friendlyName: 'Mark Positioning'
      , onByDefault: null
       , slSensitivity: []
    };
    featureData.med2 = {
        friendlyName: 'Medial Forms #2'
      , onByDefault: true
      , slSensitivity: ['Syriac']
    };
    featureData.medi = {
        friendlyName: 'Medial Forms'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['script with joining behavior', 'Arabic']
    };
    featureData.mgrk = {
        friendlyName: 'Mathematical Greek'
      , onByDefault: false
      , slSensitivity: ['Greek script']
    };
    featureData.mkmk = {
        friendlyName: 'Mark to Mark Positioning'
      , onByDefault: true
      , slSensitivity: []
    };
    featureData.mset = {
        friendlyName: 'Mark Positioning via Substitution'
        // Positions Arabic combining marks in fonts for Windows 95 using glyph substitution
      , onByDefault: null
      , slSensitivity: ['Arabic']
    };
    featureData.nalt = {
        friendlyName: 'Alternate Annotation Forms'
      , onByDefault: false
      , slSensitivity: ['CJKV', 'European scripts']
      , exampleText: '359264'
    };
    featureData.nlck = {
        // The National Language Council (NLC) of Japan has defined new
        // glyph shapes for a number of JIS characters in 2000.
        friendlyName: 'NLC Kanji Forms'
      , onByDefault: false
      , slSensitivity: ['Kanji']
    };
    featureData.nukt = {
        friendlyName: 'Nukta Forms'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: [' Indic scripts']
    };
    featureData.numr = {
        friendlyName: 'Numerators'
        // This feature should normally be called by an application when
        // the user applies the frac feature.
      , onByDefault: null
      , slSensitivity: []
    };
    featureData.onum = {
        friendlyName: 'Oldstyle Figures'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: '123678'
    };
    featureData.opbd = {
        friendlyName: 'Optical Bounds'
      , onByDefault: true
      , slSensitivity: []
    };
    featureData.ordn = {
        friendlyName: 'Ordinals'
      , onByDefault: false
      , slSensitivity: ['Latin']
      , exampleText: '1a 9a 2o 7o'
    };
    featureData.ornm = {
        friendlyName: 'Ornaments'
      , onByDefault: null
      , slSensitivity: []
    };
    featureData.palt = {
        friendlyName: 'Proportional Alternate Widths'
      , onByDefault: false
      , slSensitivity: ['CJKV']
    };
    featureData.pcap = {
        friendlyName: 'Petite Capitals'
      , onByDefault: false
      , slSensitivity: ['scripts with both upper- and lowercase forms', 'Latin', 'Cyrillic', 'Greek']
    };
    featureData.pkna = {
        friendlyName: 'Proportional Kana'
      , onByDefault: false
      , slSensitivity: ['Japanese']
    };
    featureData.pnum = {
        friendlyName: 'Proportional Figures'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: '123678'
    };
    featureData.pref = {
        friendlyName: 'Pre-Base Forms'
        //  Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['Khmer and Myanmar (Burmese) scripts']
    };
    featureData.pres = {
        friendlyName: 'Pre-base Substitutions'
      , onByDefault: true
      , slSensitivity: ['Indic scripts']
    };
    featureData.pstf = {
        friendlyName: 'Post-base Forms'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['scripts of south and southeast Asia that have post-base forms for consonants', 'Gurmukhi', 'Malayalam', 'Khmer']
    };
    featureData.psts = {
        friendlyName: 'Post-base Substitutions'
      , onByDefault: true
      , slSensitivity: ['any alphabetic script', 'Indic scripts']
    };
    featureData.pwid = {
        friendlyName: 'Proportional Widths'
        // Applications may want to have this feature active or inactive by default depending on their markets.
      , onByDefault: null
      , slSensitivity: ['CJKV', 'European scripts']
    };
    featureData.qwid = {
        friendlyName: 'Quarter Widths'
      , onByDefault: false
      , slSensitivity: ['CJKV']
    };
    featureData.rand = {
        friendlyName: 'Randomize'
        // This feature should be enabled/disabled via a preference setting; “enabled” is the recommended default.
      , onByDefault: true
      , slSensitivity: []
    };
    featureData.rclt = {
        friendlyName: 'Required Contextual Alternates'
      , onByDefault: true
      , slSensitivity: ['any script', 'important for many styles of Arabic']
    };
    featureData.rkrf = {
        friendlyName: 'Rakar Forms'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['Devanagari', 'Gujarati']
    };
    featureData.rlig = {
        friendlyName: 'Required Ligatures'
      , onByDefault: true
      , slSensitivity: ['Arabic', 'Syriac', 'May apply to some other scripts']
    };
    featureData.rphf = {
        friendlyName: 'Reph Forms'
        //  Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['Indic scripts', 'Devanagari', 'Kannada']
    };
    featureData.rtbd = {
        friendlyName: 'Right Bounds'
        // This feature is called by an application when the user invokes the opbd feature.
      , onByDefault: null
      , slSensitivity: []
    };
    featureData.rtla = {
        friendlyName: 'Right-to-left alternates'
      , onByDefault: null
      , slSensitivity: ['Right-to-left runs of text']
    };
    featureData.rtlm = {
        friendlyName: 'Right-to-left mirrored forms'
      , onByDefault: null
      , slSensitivity: ['Right-to-left runs of text']
    };
    featureData.ruby = {
        friendlyName: 'Ruby Notation Forms'
      , onByDefault: false
      , slSensitivity: ['Japanese']
    };
    featureData.rvrn = {
        friendlyName: 'Required Variation Alternates'
        // The 'rvrn' feature is mandatory: it should be active by default and not directly exposed to user control.
      , onByDefault: null
      , slSensitivity: []
    };
    featureData.salt = {
        friendlyName: 'Stylistic Alternates'
      , onByDefault: null
      , slSensitivity: []
    };
    featureData.sinf = {
        friendlyName: 'Scientific Inferiors'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: '1902835746'
    };
    featureData.size = {
        friendlyName: 'Optical size'
        // This feature should be active by default. Applications may want
        // to present the tracking curve to the user for adjustments via a GUI
      , onByDefault: true
      , slSensitivity: []
    };
    featureData.smcp = {
        friendlyName: 'Small Capitals'
      , onByDefault: false
      , slSensitivity: [' bicameral scripts', 'Latin', 'Greek', 'Cyrillic', 'Armenian']
      , exampleText: "Hello World"
    };
    featureData.smpl = {
        friendlyName: 'Simplified Forms'
      , onByDefault: false
      , slSensitivity: ['Chinese', 'Japanese']
    };
    // ss01-ss20 Stylistic Sets
    (function(featureData) {
        var i, num, tag;
        for(i=1;i<21;i++) {
            num = ('0' + i).slice(-2);
            tag = 'ss' + num;
            featureData[tag] = {
                // It seems these features can reference a custom name
                // in the name table
                friendlyName: 'Stylistic Set ' + i
              , onByDefault: false
              , slSensitivity: []
            };
        }
    })(featureData);
    featureData.ssty = {
        friendlyName: 'Math script style alternates'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['math formula layout']
    };
    featureData.stch = {
        friendlyName: 'Stretching Glyph Decomposition'
      , onByDefault: true
      , slSensitivity: []
    };
    featureData.subs = {
        friendlyName: 'Subscript'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: 'a1 b4 c9'
    };
    featureData.sups = {
        friendlyName: 'Superscript'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: 'x2 y5 z7'
    };
    featureData.swsh = {
        friendlyName: 'Swash'
      , onByDefault: false
      , slSensitivity: ['Does not apply to ideographic scripts']
    };
    featureData.titl = {
        friendlyName: 'Titling'
      , onByDefault: false
      , slSensitivity: []
    };
    featureData.tjmo = {
        friendlyName: 'Trailing Jamo Forms'
      , onByDefault: true
      , slSensitivity: ['Hangul + Ancient Hangul']
    };
    featureData.tnam = {
        friendlyName: 'Traditional Name Forms'
      , onByDefault: false
      , slSensitivity: ['Japanese']
    };
    featureData.tnum = {
        friendlyName: 'Tabular Figures'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: '123678'
    };
    featureData.trad = {
        friendlyName: 'Traditional Forms'
      , onByDefault: false
      , slSensitivity: ['Chinese', 'Japanese']
    };
    featureData.twid = {
        friendlyName: 'Third Widths'
      , onByDefault: false
      , slSensitivity: ['CJKV']
    };
    featureData.unic = {
        friendlyName: 'Unicase'
      , onByDefault: false
      , slSensitivity: ['scripts with both upper- and lowercase forms', 'Latin', 'Cyrillic', 'Greek']
    };
    featureData.valt = {
        friendlyName: 'Alternate Vertical Metrics'
        // This feature should be active by default in vertical-setting contexts.
      , onByDefault: null
      , slSensitivity: ['scripts with vertical writing modes']
    };
    featureData.vatu = {
        friendlyName: 'Vattu Variants'
        // Control of the feature should not generally be exposed to the user.
      , onByDefault: null
      , slSensitivity: ['Indic scripts', 'Devanagari']
    };
    featureData.vert = {
        friendlyName: 'Vertical Writing'
        // This feature should be active by default in vertical writing mode.
      , onByDefault: null
      , slSensitivity: ['scripts with vertical writing capability.']
    };
    featureData.vhal = {
        friendlyName: 'Alternate Vertical Half Metrics'
      , onByDefault: false
      , slSensitivity: ['CJKV']
    };
    featureData.vjmo = {
        friendlyName: 'Vowel Jamo Forms'
      , onByDefault: true
      , slSensitivity: ['Hangul + Ancient Hangul']
    };
    featureData.vkna = {
        friendlyName: 'Vertical Kana Alternates'
      , onByDefault: false
      , slSensitivity: ['hiragana', 'katakana']
    };
    featureData.vkrn = {
        friendlyName: 'Vertical Kerning'
      , onByDefault: true
      , slSensitivity: []
    };
    featureData.vpal = {
        friendlyName: 'Proportional Alternate Vertical Metrics'
      , onByDefault: false
      , slSensitivity: ['CJKV']
    };
    featureData.vrt2 = {
        friendlyName: 'Vertical Alternates and Rotation'
        // This feature should be active by default when vertical writing mode is on,
        // although the user must be able to override it.
        // (don't know if I can determine if "vertical writing mode").
      , onByDefault: true
      , slSensitivity: ['scripts with vertical writing capability']
    };
    featureData.vrtr = {
        friendlyName: 'Vertical Alternates for Rotation'
        // This feature should always be active by default for sideways runs in vertical writing mode
      , onByDefault: true
      , slSensitivity: []
    };
    featureData.zero = {
        friendlyName: 'Slashed Zero'
      , onByDefault: false
      , slSensitivity: []
      , exampleText: '0123'
    };

    function deepFreeze(obj) {
        var k;
        if(typeof obj !== 'object') return;
        for(k in obj)
            deepFreeze(obj[k]);
        try {
          Object.freeze(obj);
        } catch (e) {
          return;
        }
    }

    // Don't want returned sub objects to be changeable by a client:
    deepFreeze(featureData);

    function OTFeatureInfo(pubsub, options) {
        Parent.call(this, options);
        this._pubsub = pubsub;
        this._caches = {
            optional: null
          , default: null
          , unknown: null
          , all: null
        };
    }

    var _p = OTFeatureInfo.prototype = Object.create(Parent.prototype);
    _p.constructor = OTFeatureInfo;

    OTFeatureInfo.defaultOptions = {};

    function _makeGetter(target, key, filter) {
        function getter() {
            /* jshint validthis: true*/
            var data = this._caches[key]
              , tag
              ;
            if(data === null) {
                this._caches[key] = data = Object.create(null);
                for(tag in featureData) {
                    if(filter && !filter(featureData[tag]))
                        continue;
                    data[tag] = featureData[tag];
                }
                Object.freeze(data);
            }
            return data;
        }
        Object.defineProperty(target, key, {
            get: getter
          , enumerable: true
        });
    }

    _makeGetter(_p, 'optional', function(item) {
                        return item.onByDefault === false;});

    _makeGetter(_p, 'default', function(item) {
                        return item.onByDefault === true;});

    _makeGetter(_p, 'unknown', function(item) {
                        return item.onByDefault === null;});

    _makeGetter(_p, 'all', false);

    _p.getSubset = function(key, tags) {
        var data = this[key]
          , result = Object.create(null)
          , i, l, tag
          ;
        for(i=0,l=tags.length;i<l;i++) {
            tag = tags[i];
            if(tag in data)
                result[tag] = data[tag];
        }
        return result;
    };

    _p.getFeature = function(tag) {
        return featureData[tag];
    }

    // singleton style (good idea??)
    return new OTFeatureInfo();
});

fs.define('specimenTools/widgets/TypeTester',[
    'specimenTools/_BaseWidget'
  , 'specimenTools/services/OTFeatureInfo'
], function(
    Parent
  , OTFeatureInfo
) {
    "use strict";

    /**
     * TypeTester provides interfaces that help to test the current webfont.
     * See the CurrentWebFont widget.
     *
     * The interfaces provided are:
     *
     * - Dynamic slider inputs for controlling linear css attributes of the
     *      TypeTester
     *      Use the CSS-class configured at `sliderControlsClass` on a host
     *      element for the range input element.
     *      Provide a data-target-property on the input to specify the css
     *      attribute it should affect; Further, the following data attributes
     *      can be set on the container for customizing the slider, each including
     *      the css attribute the slider controls, e.g. to customize a slider
     *      for font-size:
     *              `data-min-font-size`
     *              `data-max-font-size`
     *              `data-value-font-size`
     *              `data-unit-font-size`
     *              `data-step-font-size`
     * - Dynamic element displaying the current font size:
     *      Use the CSS-class configured at `tester__label` as well as a
     *      data-target-property with the value of the css value this label
     *      corresponds to. The `element.textContent` of elements matching this
     *      class will be set to the current value of the TypeTester widget.
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
     * - An element that receives the settings made by the elements described above.
     *      Use the CSS-class configured at `contentContainerClass` to have
     *      the element.style set to the fontSize and fontFeatureSettings
     *      made by the control elements of this widget.
     *
     *      To use the current font on this element, see the CurrentWebFont
     *      widget.
     *      To enable the users typing text themselves use either the DOM
     *      attribute `contenteditable=True` or use a `<textarea>` element.
     *
     */
    function TypeTester(container, pubSub, fontsData, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontsData;

        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
        this._pubSub.subscribe('onChangeFontFeatures', this._onChangeFontFeatures.bind(this));

        this._contentContainers = this._getByClass(this._options.contentContainerClass);

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
        this.__sliderInputHandler = this._sliderInputHandler.bind(this);
        this._initControls();
        this._applyValues();
    }

    var _p = TypeTester.prototype = Object.create(Parent.prototype);
    _p.constructor = TypeTester;

    TypeTester.defaultOptions = {
        slider_default_min: 10
      , slider_default_max: 128
      , slider_default_value: 32
      , slider_default_step: 1
      , slider_default_unit: 'px'
      , slider_default_class: 'specimen-slider'
      , optionalFeaturesControlsClass: 'type-tester__features--optional'
      , defaultFeaturesControlsClass: 'type-tester__features--default'
      , sliderControlsClass: 'type-tester__slider'
      , contentContainerClass: 'type-tester__content'
      , labelControlsClass: 'type-tester__label'
      , setCssValueToInput: function(input, value) {
            input.value = value;
        }
      , optionalFeatureButtonClasses: ''
      , defaultFeatureButtonClasses: ''
      , activateFeatureControls: null
      , featureButtonActiveClass: 'active'
    };

    /**
     * Generic listener that reacts to a slider being moved
     * The css property being manipulates is extracted from the wrapping DOM node's
     * data-target-property value
     */
    _p._sliderInputHandler = function(evt) {
        var parentElement = evt.target.parentElement
          , cssProperty = null
          , value = evt.target.value
          ;
        while(parentElement !== this._container) {
            if(parentElement.dataset.targetProperty === undefined) {
                parentElement = parentElement.parentElement;
                continue;
            }
            cssProperty = parentElement.dataset.targetProperty;
            break;
        }
        if(cssProperty === null)
            return;
        this._setCssValue(cssProperty, value);
        this._applyValues();
    };

    /**
     * Retrieve the data-xxx attributes for a slider, where the data
     * attributes are in the form of "data-min-font-size"
     * @param sliderName: camelCase version of the css attribute this
     *    slider controls, i.e. "fontSize"
     */
    _p._setSliderOptions = function (sliderName) {
        var dataOption
          , sliderDataOptions = ['min', 'max', 'unit', 'step', 'value', 'class']
          , i
          ;

        this._options[sliderName] = {};

        for(i=0;i<sliderDataOptions.length;i++) {
            // for each slider like "font-size" iterate over all of
            // "minFontSize", "maxFontSize", etc
            dataOption = [sliderDataOptions[i]
                    , sliderName.substr(0,1).toUpperCase()
                    , sliderName.substr(1)
                ].join('');

            // fill options from data values and fallback to defaults
            if(dataOption in this._container.dataset)
                this._options[sliderName][sliderDataOptions[i]] =
                  this._container.dataset[dataOption];
            else
                this._options[sliderName][sliderDataOptions[i]] =
                  this._options['slider_default_' + sliderDataOptions[i]];
        }
    };

    _p._initSlider = function(element) {
        var input = this._container.ownerDocument.createElement('input')
          , sliderPropertyName = element.dataset.targetProperty
          , sliderName = this._cssName2jsName(sliderPropertyName)
          , controlsIndex = [sliderName, '_slider'].join('')
          , attributes = {
              min:  this._options[sliderName].min
            , max:  this._options[sliderName].max
            , step: this._options[sliderName].step
            }
          , k
          ;

        if(!(controlsIndex in this._controls))
            this._controls[controlsIndex] = [];
        this._controls[controlsIndex].push({input: input, container: element});
        this._applyClasses(input, this._options[sliderName].class);

        input.setAttribute('type', 'range');
        for(k in attributes)
            input.setAttribute(k, attributes[k]);
        element.appendChild(input);
        input.addEventListener('input', this.__sliderInputHandler);
    };

    _p._initLabel = function(element) {
        var cssName = this._cssName2jsName(element.dataset.targetProperty)
          ,  labelPropertyName = [cssName, '_label'].join('')
          ;

        if(!(labelPropertyName in this._controls))
            this._controls[labelPropertyName] = [];
        this._controls[labelPropertyName].push(element);
    };

    _p._initFeaturesControl = function(element, type) {
        if(!(type in this._controls.features.containers))
            this._controls.features.containers[type] = [];
        this._controls.features.containers[type].push(element);
        element.addEventListener('click',
            this._switchFeatureTagHandler.bind(this, element));
    };

    /**
     * Setup function that in turn initates different types of nested control elements
     */
    _p._initControls = function() {
        var sliders = this._getByClass(this._options['sliderControlsClass'])
          , labels = this._getByClass(this._options['labelControlsClass'])
          , setup = {
              optionalFeatures: [
                  this._getByClass(this._options['optionalFeaturesControlsClass'])
                , ['_initFeaturesControl', 'optional']]
              , defaultFeatures: [
                  this._getByClass(this._options['defaultFeaturesControlsClass'])
                , ['_initFeaturesControl', 'default']]
            }
          , afterInit = []
          , initFunc, initFuncArgs, containers, key
          , cssProperty, cssName, sliderPropertyName, labelPropertyName
          , i, l
          ;


        // iterate all property sliders and add them to the setup object
        for(i=0;i<sliders.length;i++) {
            cssProperty = sliders[i].dataset.targetProperty;
            cssName = this._cssName2jsName(cssProperty);
            sliderPropertyName = [cssName, '_slider'].join('');
            if (!(sliderPropertyName in setup)) {
                this._setSliderOptions(cssName);
                setup[sliderPropertyName] = [[], ['_initSlider']];
            }
            setup[sliderPropertyName][0].push(sliders[i]);
        }

        // iterate through all slider labels
        for(i=0;i<labels.length;i++) {
            cssProperty = labels[i].dataset.targetProperty;
            cssName = this._cssName2jsName(cssProperty);
            labelPropertyName = [cssName, '_label'].join('');
            if (!(labelPropertyName in setup)) {
                setup[labelPropertyName] = [[], ['_initLabel']
                  , this._setCssValue.bind(this, cssProperty, this._options[cssName].value)];
            }
            setup[labelPropertyName][0].push(labels[i]);
        }

        // iterate over all of the setup object and initiate based on
        // passed in initFunc's
        for(key in setup) {
            initFunc = setup[key][1][0];
            initFuncArgs = setup[key][1].slice(1);
            if(setup[key][2])
                afterInit.push(setup[key][2]);
            containers = setup[key][0];
            for(i=0,l=containers.length;i<l;i++) {
                this[initFunc].apply(this, [containers[i]].concat(initFuncArgs));
            }
        }

        // running these after all initializations, so `fontSizeIndicator`
        // gets initialized by the call to `_setFontSize` of `fontsize`
        for(i=0,l=afterInit.length;i<l;i++)
            afterInit[i]();
    };

    _p._switchFeatureTagHandler = function(container, evt) {
        var tag = null
          , active = this._controls.features.active
          , type, cssFeatureValue, button
          ;
        // first find the feature tag
        button = evt.target;
        while(button && button !== container) {
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
        // this call would overwrite any possibly set feature updates that
        // were received before this call, if so, set to those features
        if (this._features_from_event) {
          this._values['font-feature-settings'] = this._features_from_event;
          this._features_from_event = "";
          return
        }
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
          , tag, i, l, feature, label, button
          , uiElementsToActivate = []
          ;

        if(!order) order = Object.keys(features).sort();

        // delete old ...
        for(i=container.children.length-1;i>=0;i--) {
            if(type === container.children[i].getAttribute('data-feature-type'))
                container.removeChild(container.children[i]);
        }
        for(i=0,l=order.length;i<l;i++) {
            tag = order[i];
            feature = features[tag];
            label = [tag, feature.friendlyName].join(': ');
            button = doc.createElement('button');
            button.textContent = label;
            button.setAttribute('data-feature-tag', tag);
            button.setAttribute('data-feature-type', type);
            this._applyClasses(button, this._options[type + 'FeatureButtonClasses']);
            container.appendChild(button);
            uiElementsToActivate.push(button);
            if(!(tag in this._controls.features.buttons))
                this._controls.features.buttons[tag] = [];
            this._controls.features.buttons[tag].push(button);
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
          ;

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

    /**
     * Function that updates any slider controlled css value centrally, so that
     * any effect is mirrored on slider and label for that property
     */
    _p._setCssValue = function(property, value) {
        var i, l
          , propertyJsName = this._cssName2jsName(property)
          , valueUnit = [
                value
              , this._options[propertyJsName].unit
            ]
          , sliders = this._controls[propertyJsName + '_slider']
          , labels = this._controls[propertyJsName + '_label']
          ;

        // loop over all sliders and update their input's values
        for(i=0,l=sliders.length;i<l;i++) {
            this._options
              .setCssValueToInput.call( this, sliders[i].input, value);
        }

        // loop over all labels and update their text content
        for(i=0,l=labels.length;i<l;i++) {
          labels[i].textContent = valueUnit.join(' ');
        }

        this._values[property] = valueUnit.join('');
    };

    _p._getByClass = function(className) {
        return this._container.getElementsByClassName(className);
    };

    _p._applyValues = function() {
        var i, l, container, k;
        for(i=0,l=this._contentContainers.length;i<l;i++) {
            container = this._contentContainers[i];
            for(k in this._values)
                container.style[this._cssName2jsName(k)] = this._values[k];
        }
    };

    _p._onChangeFontFeatures = function (features) {
        this._features_from_event = features
        this._values['font-feature-settings'] = features;
        this._applyValues();
    };

    _p._onActivateFont = function(fontIndex) {
        this._updateFeatureControls(fontIndex);
        this._setFeatures();
        this._applyValues();
    };

    return TypeTester;
});

fs.define('specimenTools/widgets/FontLister',[
    'specimenTools/_BaseWidget'
], function(
    Parent
) {
    "use strict";

    /**
     * Very basic <select> interface to switch between all loaded fonts.
     * See FamilyChooser for a more advanced interface.
     */

    function FontLister(container, pubSub, fontData, options) {
        Parent.call(this, options);
        this._container = container;
        this._pubSub = pubSub;
        this._fontsData = fontData;

        this._elements = [];
        this._selectContainer = this._container.ownerDocument.createElement('select');
        this._selectContainer.addEventListener('change', this._selectFont.bind(this));
        this._selectContainer.enabled = false;
        this._container.appendChild(this._selectContainer);

        this._pubSub.subscribe('allFontsLoaded', this._onAllFontsLoaded.bind(this));
        this._pubSub.subscribe('activateFont', this._onActivateFont.bind(this));
    }
    var _p = FontLister.prototype = Object.create(Parent.prototype);
    _p.constructor = FontLister;

    FontLister.defaultOptions = {
        order: 'load' // OR: 'family'
    };

    _p._onActivateFont = function (fontIndex) {
        var i,l
          , options = this._selectContainer.children
          , option
          ;
        for(i=0,l=options.length;i<l;i++) {
            option = options[i];
            option.selected = option.value == fontIndex;
        }
    };

    _p._onAllFontsLoaded = function() {
        var fonts
          , i, l, option, fontIndex
          ;

        switch(this._options.order){
            case 'family':
                fonts = this._fontsData.getFontIndexesInFamilyOrder();
            case 'load':
                /* falls through */
            default:
                fonts = this._fontsData.getFontIndexes();
        }

        for(i=0,l=fonts.length;i<l;i++) {
            fontIndex = fonts[i];
            option = this._selectContainer.ownerDocument.createElement('option');
            // option.textContent = [
            //             this._fontsData.getFamilyName(fontIndex)
            //           , this._fontsData.getStyleName(fontIndex)
            //           ].join(' ');
            option.textContent = this._fontsData.getFullName(fontIndex)

            option.value = fontIndex;
            this._elements.push(option);
            this._selectContainer.appendChild(option);
        }
        this._selectContainer.enabled = true;
    };

    _p._selectFont = function(event) {
        this._pubSub.publish('activateFont', event.target.value);
    };

    return FontLister;
});

fs.define('specimenTools/widgets/FeatureLister',[
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

    if(tag in active) {
      delete active[tag];
    }
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
      container.children[i].firstChild.removeEventListener('change', this._switchFeatureTagHandler)
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

      // if (feature.onByDefault) {
      //   checkbox.setAttribute('checked', 'checked')
      // } else {
      //   checkbox.removeAttribute('checked')
      // }

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
      , i, l, j, ll, k
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
    
    this._setFeatureButtonsState();
  };

  _p._setFeatureButtonActiveState = function(element, isActive) {
    this._applyClasses(element, this._options.featureButtonActiveClass, !isActive);
    if (isActive) {
      element.setAttribute("checked", "checked")
    } else {
      element.removeAttribute("checked", "checked")
    }
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

fs.define('js/specimentools-init',[
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

/**
 * Helper module to deal with caret position
 */
fs.define('js/selection',[], function () {

    // from https://stackoverflow.com/a/4812022/999162
    var setSelectionByCharacterOffsets = null;

    if (window.getSelection && document.createRange) {
        setSelectionByCharacterOffsets = function (containerEl, start, end) {
            var charIndex = 0,
                range = document.createRange();
            range.setStart(containerEl, 0);
            range.collapse(true);
            var nodeStack = [containerEl],
                node, foundStart = false,
                stop = false;

            while (!stop && (node = nodeStack.pop())) {
                if (node.nodeType == 3) {
                    var nextCharIndex = charIndex + node.length;
                    if (!foundStart && start >= charIndex && start <= nextCharIndex) {
                        range.setStart(node, start - charIndex);
                        foundStart = true;
                    }
                    if (foundStart && end >= charIndex && end <= nextCharIndex) {
                        range.setEnd(node, end - charIndex);
                        stop = true;
                    }
                    charIndex = nextCharIndex;
                } else {
                    var i = node.childNodes.length;
                    while (i--) {
                        nodeStack.push(node.childNodes[i]);
                    }
                }
            }

            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        };
    } else if (document.selection) {
        setSelectionByCharacterOffsets = function (containerEl, start, end) {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(containerEl);
            textRange.collapse(true);
            textRange.moveEnd("character", end);
            textRange.moveStart("character", start);
            textRange.select();
        };
    }


    // From https://stackoverflow.com/a/4812022/999162
    function getCaretCharacterOffsetWithin(element) {
        var caretOffset = 0;
        var doc = element.ownerDocument || element.document;
        var win = doc.defaultView || doc.parentWindow;
        var sel;
        if (typeof win.getSelection != "undefined") {
            sel = win.getSelection();
            if (sel.rangeCount > 0) {
                var range = win.getSelection().getRangeAt(0);
                var preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(element);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                caretOffset = preCaretRange.toString().length;
            }
        } else if ((sel = doc.selection) && sel.type != "Control") {
            var textRange = sel.createRange();
            var preCaretTextRange = doc.body.createTextRange();
            preCaretTextRange.moveToElementText(element);
            preCaretTextRange.setEndPoint("EndToEnd", textRange);
            caretOffset = preCaretTextRange.text.length;
        }
        return caretOffset;
    }

    return {
        setCaret: setSelectionByCharacterOffsets,
        getCaret: getCaretCharacterOffsetWithin
    };

});
/*! rangeslider.js - v2.3.2 | (c) 2018 @andreruffert | MIT license | https://github.com/andreruffert/rangeslider.js */
(function(factory) {
    'use strict';

    if (typeof fs.define === 'function' && fs.define.amd) {
        // AMD. Register as an anonymous module.
        fs.define('rangeslider',['jquery'], factory);
    } else if (typeof exports === 'object') {
        // CommonJS
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function($) {
    'use strict';

    // Polyfill Number.isNaN(value)
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN
    Number.isNaN = Number.isNaN || function(value) {
        return typeof value === 'number' && value !== value;
    };

    /**
     * Range feature detection
     * @return {Boolean}
     */
    function supportsRange() {
        var input = document.createElement('input');
        input.setAttribute('type', 'range');
        return input.type !== 'text';
    }

    var pluginName = 'rangeslider',
        pluginIdentifier = 0,
        hasInputRangeSupport = supportsRange(),
        defaults = {
            polyfill: true,
            orientation: 'horizontal',
            rangeClass: 'rangeslider',
            disabledClass: 'rangeslider--disabled',
            activeClass: 'rangeslider--active',
            horizontalClass: 'rangeslider--horizontal',
            verticalClass: 'rangeslider--vertical',
            dirRTLClass: 'rangeslider__rtl',
            dirTTBClass: 'rangeslider__ttb',
            fillClass: 'rangeslider__fill',
            handleClass: 'rangeslider__handle',
            startEvent: ['mousedown', 'touchstart', 'pointerdown'],
            moveEvent: ['mousemove', 'touchmove', 'pointermove'],
            endEvent: ['mouseup', 'touchend', 'pointerup']
        },
        constants = {
            orientation: {
                horizontal: {
                    dimension: 'width',
                    direction: { ltr: 'left', rtl: 'right'},
                    directionStyle: { ltr: 'left', rtl: 'right' },
                    coordinate: 'x'
                },
                vertical: {
                    dimension: 'height',
                    direction: { btt:'top', ttb:'bottom' },
                    directionStyle: { btt:'bottom', ttb:'top' },
                    coordinate: 'y'
                }
            }
        };

    /**
     * Delays a function for the given number of milliseconds, and then calls
     * it with the arguments supplied.
     *
     * @param  {Function} fn   [description]
     * @param  {Number}   wait [description]
     * @return {Function}
     */
    function delay(fn, wait) {
        var args = Array.prototype.slice.call(arguments, 2);
        return setTimeout(function(){ return fn.apply(null, args); }, wait);
    }

    /**
     * Returns a debounced function that will make sure the given
     * function is not triggered too much.
     *
     * @param  {Function} fn Function to debounce.
     * @param  {Number}   debounceDuration OPTIONAL. The amount of time in milliseconds for which we will debounce the function. (defaults to 100ms)
     * @return {Function}
     */
    function debounce(fn, debounceDuration) {
        debounceDuration = debounceDuration || 100;
        return function() {
            if (!fn.debouncing) {
                var args = Array.prototype.slice.apply(arguments);
                fn.lastReturnVal = fn.apply(window, args);
                fn.debouncing = true;
            }
            clearTimeout(fn.debounceTimeout);
            fn.debounceTimeout = setTimeout(function(){
                fn.debouncing = false;
            }, debounceDuration);
            return fn.lastReturnVal;
        };
    }

    /**
     * Check if a `element` is visible in the DOM
     *
     * @param  {Element}  element
     * @return {Boolean}
     */
    function isHidden(element) {
        return (
            element && (
                element.offsetWidth === 0 ||
                element.offsetHeight === 0 ||
                // Also Consider native `<details>` elements.
                element.open === false
            )
        );
    }

    /**
     * Get hidden parentNodes of an `element`
     *
     * @param  {Element} element
     * @return {[type]}
     */
    function getHiddenParentNodes(element) {
        var parents = [],
            node    = element.parentNode;

        while (isHidden(node)) {
            parents.push(node);
            node = node.parentNode;
        }
        return parents;
    }

    /**
     * Returns dimensions for an element even if it is not visible in the DOM.
     *
     * @param  {Element} element
     * @param  {String}  key     (e.g. offsetWidth …)
     * @return {Number}
     */
    function getDimension(element, key) {
        var hiddenParentNodes       = getHiddenParentNodes(element),
            hiddenParentNodesLength = hiddenParentNodes.length,
            inlineStyle             = [],
            dimension               = element[key];

        // Used for native `<details>` elements
        function toggleOpenProperty(element) {
            if (typeof element.open !== 'undefined') {
                element.open = (element.open) ? false : true;
            }
        }

        if (hiddenParentNodesLength) {
            for (var i = 0; i < hiddenParentNodesLength; i++) {

                // Cache style attribute to restore it later.
                inlineStyle[i] = hiddenParentNodes[i].style.cssText;

                // visually hide
                if (hiddenParentNodes[i].style.setProperty) {
                    hiddenParentNodes[i].style.setProperty('display', 'block', 'important');
                } else {
                    hiddenParentNodes[i].style.cssText += ';display: block !important';
                }
                hiddenParentNodes[i].style.height = '0';
                hiddenParentNodes[i].style.overflow = 'hidden';
                hiddenParentNodes[i].style.visibility = 'hidden';
                toggleOpenProperty(hiddenParentNodes[i]);
            }

            // Update dimension
            dimension = element[key];

            for (var j = 0; j < hiddenParentNodesLength; j++) {

                // Restore the style attribute
                hiddenParentNodes[j].style.cssText = inlineStyle[j];
                toggleOpenProperty(hiddenParentNodes[j]);
            }
        }
        return dimension;
    }

    /**
     * Returns the parsed float or the default if it failed.
     *
     * @param  {String}  str
     * @param  {Number}  defaultValue
     * @return {Number}
     */
    function tryParseFloat(str, defaultValue) {
        var value = parseFloat(str);
        return Number.isNaN(value) ? defaultValue : value;
    }

    /**
     * Capitalize the first letter of string
     *
     * @param  {String} str
     * @return {String}
     */
    function ucfirst(str) {
        return str.charAt(0).toUpperCase() + str.substr(1);
    }

    /**
     * return direction rtl,ltr,btt,ttb
     * @param {String} element
     * @param {String} orientation
     */
    function getDirection(element,orientation){
        var direction = element[0].getAttribute('data-direction') || (orientation === 'vertical' ? 'btt' : 'ltr');
        
        if (constants.orientation[orientation].direction[direction]) {
            return direction;
        } else {
            return orientation === 'vertical' ? 'btt' : 'ltr';
        }
    }

    /**
     * Plugin
     * @param {String} element
     * @param {Object} options
     */
    function Plugin(element, options) {
        this.$window            = $(window);
        this.$document          = $(document);
        this.$element           = $(element);
        this.options            = $.extend( {}, defaults, options );
        this.polyfill           = this.options.polyfill;
        this.orientation        = this.$element[0].getAttribute('data-orientation') || this.options.orientation;
        this.dir                = getDirection(this.$element,this.orientation);
        this.onInit             = this.options.onInit;
        this.onSlide            = this.options.onSlide;
        this.onSlideEnd         = this.options.onSlideEnd;
        this.DIMENSION          = constants.orientation[this.orientation].dimension;
        this.DIRECTION          = constants.orientation[this.orientation].direction[this.dir];
        this.DIRECTION_STYLE    = constants.orientation[this.orientation].directionStyle[this.dir];
        this.COORDINATE         = constants.orientation[this.orientation].coordinate;

        // Plugin should only be used as a polyfill
        if (this.polyfill) {
            // Input range support?
            if (hasInputRangeSupport) { return false; }
        }

        this.identifier = 'js-' + pluginName + '-' +(pluginIdentifier++);
        this.startEvent = this.options.startEvent.join('.' + this.identifier + ' ') + '.' + this.identifier;
        this.moveEvent  = this.options.moveEvent.join('.' + this.identifier + ' ') + '.' + this.identifier;
        this.endEvent   = this.options.endEvent.join('.' + this.identifier + ' ') + '.' + this.identifier;
        this.toFixed    = (this.step + '').replace('.', '').length - 1;
        this.$fill      = $('<div class="' + this.options.fillClass + ' ' +(this.dir === 'ttb' && this.orientation === 'vertical' ? this.options.dirTTBClass : '') +'" />');
        this.$handle    = $('<div class="' + this.options.handleClass + '" />');
        this.$range     = $('<div class="' + this.options.rangeClass +' ' +(this.dir === 'rtl' && this.orientation === 'horizontal' ? this.options.dirRTLClass : '') + ' ' + this.options[this.orientation + 'Class'] + '" id="' + this.identifier + '" />').insertAfter(this.$element).prepend(this.$fill, this.$handle);

        // visually hide the input
        this.$element.css({
            'position': 'absolute',
            'width': '1px',
            'height': '1px',
            'overflow': 'hidden',
            'opacity': '0'
        });

        // Store context
        this.handleDown = $.proxy(this.handleDown, this);
        this.handleMove = $.proxy(this.handleMove, this);
        this.handleEnd  = $.proxy(this.handleEnd, this);

        this.init();

        // Attach Events
        var _this = this;
        this.$window.on('resize.' + this.identifier, debounce(function() {
            // Simulate resizeEnd event.
            delay(function() { _this.update(false, false); }, 300);
        }, 20));

        this.$document.on(this.startEvent, '#' + this.identifier + ':not(.' + this.options.disabledClass + ')', this.handleDown);

        // Listen to programmatic value changes
        this.$element.on('change.' + this.identifier, function(e, data) {
            if (data && data.origin === _this.identifier) {
                return;
            }

            var value = e.target.value,
                pos = _this.getPositionFromValue(value);
            _this.setPosition(pos);
        });
    }

    Plugin.prototype.init = function() {
        this.update(true, false);

        if (this.onInit && typeof this.onInit === 'function') {
            this.onInit();
        }
    };

    Plugin.prototype.update = function(updateAttributes, triggerSlide) {
        updateAttributes = updateAttributes || false;

        if (updateAttributes) {
            this.min    = tryParseFloat(this.$element[0].getAttribute('min'), 0);
            this.max    = tryParseFloat(this.$element[0].getAttribute('max'), 100);
            this.value  = tryParseFloat(this.$element[0].value, Math.round(this.min + (this.max-this.min)/2));
            this.step   = tryParseFloat(this.$element[0].getAttribute('step'), 1);
        }

        this.handleDimension    = getDimension(this.$handle[0], 'offset' + ucfirst(this.DIMENSION));
        this.rangeDimension     = getDimension(this.$range[0], 'offset' + ucfirst(this.DIMENSION));
        this.maxHandlePos       = this.rangeDimension - this.handleDimension;
        this.grabPos            = this.handleDimension / 2;
        this.position           = this.getPositionFromValue(this.value);

        // Consider disabled state
        if (this.$element[0].disabled) {
            this.$range.addClass(this.options.disabledClass);
        } else {
            this.$range.removeClass(this.options.disabledClass);
        }

        this.setPosition(this.position, triggerSlide);
    };

    Plugin.prototype.handleDown = function(e) {
        e.preventDefault();

        // Only respond to mouse main button clicks (usually the left button)
        if (e.button && e.button !== 0) {
            return;
        }
        
        this.$document.on(this.moveEvent, this.handleMove);
        this.$document.on(this.endEvent, this.handleEnd);

        // add active class because Firefox is ignoring
        // the handle:active pseudo selector because of `e.preventDefault();`
        this.$range.addClass(this.options.activeClass);

        // If we click on the handle don't set the new position
        if ((' ' + e.target.className + ' ').replace(/[\n\t]/g, ' ').indexOf(this.options.handleClass) > -1) {
            return;
        }

        var pos         = this.getRelativePosition(e),
            rangePos    = this.$range[0].getBoundingClientRect()[this.DIRECTION],
            handlePos   = this.getPositionFromNode(this.$handle[0]) - rangePos,
            setPos      = (this.orientation === 'vertical') ? (this.maxHandlePos - (pos - this.grabPos)) : (pos - this.grabPos);

        this.setPosition(setPos);

        if (pos >= handlePos && pos < handlePos + this.handleDimension) {
            this.grabPos = pos - handlePos;
        }
    };

    Plugin.prototype.handleMove = function(e) {
        e.preventDefault();
        var pos = this.getRelativePosition(e);
        var setPos = (this.orientation === 'vertical') ? (this.maxHandlePos - (pos - this.grabPos)) : (pos - this.grabPos);
        this.setPosition(setPos);
    };

    Plugin.prototype.handleEnd = function(e) {
        e.preventDefault();
        this.$document.off(this.moveEvent, this.handleMove);
        this.$document.off(this.endEvent, this.handleEnd);

        this.$range.removeClass(this.options.activeClass);

        // Ok we're done fire the change event
        this.$element.trigger('change', { origin: this.identifier });

        if (this.onSlideEnd && typeof this.onSlideEnd === 'function') {
            this.onSlideEnd(this.position, this.value);
        }
    };

    Plugin.prototype.cap = function(pos, min, max) {
        if (pos < min) { return min; }
        if (pos > max) { return max; }
        return pos;
    };

    Plugin.prototype.setPosition = function(pos, triggerSlide) {
        var value, newPos;

        if (triggerSlide === undefined) {
            triggerSlide = true;
        }

        // Snapping steps
        value = this.getValueFromPosition(this.cap(pos, 0, this.maxHandlePos));
        newPos = this.getPositionFromValue(value);

        // Update ui
        this.$fill[0].style[this.DIMENSION] = (newPos + this.grabPos) + 'px';
        this.$handle[0].style[this.DIRECTION_STYLE] = newPos + 'px';
        this.setValue(value);

        // Update globals
        this.position = newPos;
        this.value = value;

        if (triggerSlide && this.onSlide && typeof this.onSlide === 'function') {
            this.onSlide(newPos, value);
        }
    };

    // Returns element position relative to the parent
    Plugin.prototype.getPositionFromNode = function(node) {
        var i = 0;
        while (node !== null) {
            i += node.offsetLeft;
            node = node.offsetParent;
        }
        return i;
    };

    Plugin.prototype.getRelativePosition = function(e) {
        // Get the offset DIRECTION relative to the viewport
        var ucCoordinate = ucfirst(this.COORDINATE),
            rangePos = this.$range[0].getBoundingClientRect()[this.DIRECTION],
            pageCoordinate = 0;

        if (typeof e.originalEvent['client' + ucCoordinate] !== 'undefined') {
            pageCoordinate = e.originalEvent['client' + ucCoordinate];
        }
        else if (
          e.originalEvent.touches &&
          e.originalEvent.touches[0] &&
          typeof e.originalEvent.touches[0]['client' + ucCoordinate] !== 'undefined'
        ) {
            pageCoordinate = e.originalEvent.touches[0]['client' + ucCoordinate];
        }
        else if(e.currentPoint && typeof e.currentPoint[this.COORDINATE] !== 'undefined') {
            pageCoordinate = e.currentPoint[this.COORDINATE];
        }

        return (this.dir === 'rtl' || this.dir === 'ttb') ? rangePos - pageCoordinate : pageCoordinate - rangePos;
    };

    Plugin.prototype.getPositionFromValue = function(value) {
        var percentage, pos;
        percentage = (value - this.min)/(this.max - this.min);
        pos = (!Number.isNaN(percentage)) ? percentage * this.maxHandlePos : 0;
        return pos;
    };

    Plugin.prototype.getValueFromPosition = function(pos) {
        var percentage, value;
        percentage = ((pos) / (this.maxHandlePos || 1));
        value = this.step * Math.round(percentage * (this.max - this.min) / this.step) + this.min;
        return Number((value).toFixed(this.toFixed));
    };

    Plugin.prototype.setValue = function(value) {
        if (value === this.value && this.$element[0].value !== '') {
            return;
        }

        // Set the new value and fire the `input` event
        this.$element
            .val(value)
            .trigger('input', { origin: this.identifier });
    };

    Plugin.prototype.destroy = function() {
        this.$document.off('.' + this.identifier);
        this.$window.off('.' + this.identifier);

        this.$element
            .off('.' + this.identifier)
            .removeAttr('style')
            .removeData('plugin_' + pluginName);

        // Remove the generated markup
        if (this.$range && this.$range.length) {
            this.$range[0].parentNode.removeChild(this.$range[0]);
        }
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function(options) {
        var args = Array.prototype.slice.call(arguments, 1);

        return this.each(function() {
            var $this = $(this),
                data  = $this.data('plugin_' + pluginName);

            // Create a new instance.
            if (!data) {
                $this.data('plugin_' + pluginName, (data = new Plugin(this, options)));
            }

            // Make it possible to access methods from public.
            // e.g `$element.rangeslider('method');`
            if (typeof options === 'string') {
                data[options].apply(data, args);
            }
        });
    };

    return 'rangeslider.js is available in jQuery context e.g $(selector).rangeslider(options);';

}));

/*!
 *         ,/
 *       ,'/
 *     ,' /
 *   ,'  /_____,
 * .'____    ,'
 *      /  ,'
 *     / ,'
 *    /,'
 *   /'
 *
 * Selectric ϟ v1.13.0 (Aug 21 2017) - http://lcdsantos.github.io/jQuery-Selectric/
 *
 * Copyright (c) 2017 Leonardo Santos; MIT License
 *
 */

(function(factory) {
  /* global define */
  /* istanbul ignore next */
  if ( typeof fs.define === 'function' && fs.define.amd ) {
    fs.define('selectric',['jquery'], factory);
  } else if ( typeof module === 'object' && module.exports ) {
    // Node/CommonJS
    module.exports = function( root, jQuery ) {
      if ( jQuery === undefined ) {
        if ( typeof window !== 'undefined' ) {
          jQuery = require('jquery');
        } else {
          jQuery = require('jquery')(root);
        }
      }
      factory(jQuery);
      return jQuery;
    };
  } else {
    // Browser globals
    factory(jQuery);
  }
}(function($) {
  'use strict';

  var $doc = $(document);
  var $win = $(window);

  var pluginName = 'selectric';
  var classList = 'Input Items Open Disabled TempShow HideSelect Wrapper Focus Hover Responsive Above Below Scroll Group GroupLabel';
  var eventNamespaceSuffix = '.sl';

  var chars = ['a', 'e', 'i', 'o', 'u', 'n', 'c', 'y'];
  var diacritics = [
    /[\xE0-\xE5]/g, // a
    /[\xE8-\xEB]/g, // e
    /[\xEC-\xEF]/g, // i
    /[\xF2-\xF6]/g, // o
    /[\xF9-\xFC]/g, // u
    /[\xF1]/g,      // n
    /[\xE7]/g,      // c
    /[\xFD-\xFF]/g  // y
  ];

  /**
   * Create an instance of Selectric
   *
   * @constructor
   * @param {Node} element - The &lt;select&gt; element
   * @param {object}  opts - Options
   */
  var Selectric = function(element, opts) {
    var _this = this;

    _this.element = element;
    _this.$element = $(element);

    _this.state = {
      multiple       : !!_this.$element.attr('multiple'),
      enabled        : false,
      opened         : false,
      currValue      : -1,
      selectedIdx    : -1,
      highlightedIdx : -1
    };

    _this.eventTriggers = {
      open    : _this.open,
      close   : _this.close,
      destroy : _this.destroy,
      refresh : _this.refresh,
      init    : _this.init
    };

    _this.init(opts);
  };

  Selectric.prototype = {
    utils: {
      /**
       * Detect mobile browser
       *
       * @return {boolean}
       */
      isMobile: function() {
        return /android|ip(hone|od|ad)/i.test(navigator.userAgent);
      },

      /**
       * Escape especial characters in string (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
       *
       * @param  {string} str - The string to be escaped
       * @return {string}       The string with the special characters escaped
       */
      escapeRegExp: function(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
      },

      /**
       * Replace diacritics
       *
       * @param  {string} str - The string to replace the diacritics
       * @return {string}       The string with diacritics replaced with ascii characters
       */
      replaceDiacritics: function(str) {
        var k = diacritics.length;

        while (k--) {
          str = str.toLowerCase().replace(diacritics[k], chars[k]);
        }

        return str;
      },

      /**
       * Format string
       * https://gist.github.com/atesgoral/984375
       *
       * @param  {string} f - String to be formated
       * @return {string}     String formated
       */
      format: function(f) {
        var a = arguments; // store outer arguments
        return ('' + f) // force format specifier to String
          .replace( // replace tokens in format specifier
            /\{(?:(\d+)|(\w+))\}/g, // match {token} references
            function(
              s, // the matched string (ignored)
              i, // an argument index
              p // a property name
            ) {
              return p && a[1] // if property name and first argument exist
                ? a[1][p] // return property from first argument
                : a[i]; // assume argument index and return i-th argument
            });
      },

      /**
       * Get the next enabled item in the options list.
       *
       * @param  {object} selectItems - The options object.
       * @param  {number}    selected - Index of the currently selected option.
       * @return {object}               The next enabled item.
       */
      nextEnabledItem: function(selectItems, selected) {
        while ( selectItems[ selected = (selected + 1) % selectItems.length ].disabled ) {
          // empty
        }
        return selected;
      },

      /**
       * Get the previous enabled item in the options list.
       *
       * @param  {object} selectItems - The options object.
       * @param  {number}    selected - Index of the currently selected option.
       * @return {object}               The previous enabled item.
       */
      previousEnabledItem: function(selectItems, selected) {
        while ( selectItems[ selected = (selected > 0 ? selected : selectItems.length) - 1 ].disabled ) {
          // empty
        }
        return selected;
      },

      /**
       * Transform camelCase string to dash-case.
       *
       * @param  {string} str - The camelCased string.
       * @return {string}       The string transformed to dash-case.
       */
      toDash: function(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
      },

      /**
       * Calls the events registered with function name.
       *
       * @param {string}    fn - The name of the function.
       * @param {number} scope - Scope that should be set on the function.
       */
      triggerCallback: function(fn, scope) {
        var elm = scope.element;
        var func = scope.options['on' + fn];
        var args = [elm].concat([].slice.call(arguments).slice(1));

        if ( $.isFunction(func) ) {
          func.apply(elm, args);
        }

        $(elm).trigger(pluginName + '-' + this.toDash(fn), args);
      },

      /**
       * Transform array list to concatenated string and remove empty values
       * @param  {array} arr - Class list
       * @return {string}      Concatenated string
       */
      arrayToClassname: function(arr) {
        var newArr = $.grep(arr, function(item) {
          return !!item;
        });

        return $.trim(newArr.join(' '));
      }
    },

    /** Initializes */
    init: function(opts) {
      var _this = this;

      // Set options
      _this.options = $.extend(true, {}, $.fn[pluginName].defaults, _this.options, opts);

      _this.utils.triggerCallback('BeforeInit', _this);

      // Preserve data
      _this.destroy(true);

      // Disable on mobile browsers
      if ( _this.options.disableOnMobile && _this.utils.isMobile() ) {
        _this.disableOnMobile = true;
        return;
      }

      // Get classes
      _this.classes = _this.getClassNames();

      // Create elements
      var input              = $('<input/>', { 'class': _this.classes.input, 'readonly': _this.utils.isMobile() });
      var items              = $('<div/>',   { 'class': _this.classes.items, 'tabindex': -1 });
      var itemsScroll        = $('<div/>',   { 'class': _this.classes.scroll });
      var wrapper            = $('<div/>',   { 'class': _this.classes.prefix, 'html': _this.options.arrowButtonMarkup });
      var label              = $('<span/>',  { 'class': 'label' });
      var outerWrapper       = _this.$element.wrap('<div/>').parent().append(wrapper.prepend(label), items, input);
      var hideSelectWrapper  = $('<div/>',   { 'class': _this.classes.hideselect });

      _this.elements = {
        input        : input,
        items        : items,
        itemsScroll  : itemsScroll,
        wrapper      : wrapper,
        label        : label,
        outerWrapper : outerWrapper
      };

      if ( _this.options.nativeOnMobile && _this.utils.isMobile() ) {
        _this.elements.input = undefined;
        hideSelectWrapper.addClass(_this.classes.prefix + '-is-native');

        _this.$element.on('change', function() {
          _this.refresh();
        });
      }

      _this.$element
        .on(_this.eventTriggers)
        .wrap(hideSelectWrapper);

      _this.originalTabindex = _this.$element.prop('tabindex');
      _this.$element.prop('tabindex', -1);

      _this.populate();
      _this.activate();

      _this.utils.triggerCallback('Init', _this);
    },

    /** Activates the plugin */
    activate: function() {
      var _this = this;
      var hiddenChildren = _this.elements.items.closest(':visible').children(':hidden').addClass(_this.classes.tempshow);
      var originalWidth = _this.$element.width();

      hiddenChildren.removeClass(_this.classes.tempshow);

      _this.utils.triggerCallback('BeforeActivate', _this);

      _this.elements.outerWrapper.prop('class',
        _this.utils.arrayToClassname([
          _this.classes.wrapper,
          _this.$element.prop('class').replace(/\S+/g, _this.classes.prefix + '-$&'),
          _this.options.responsive ? _this.classes.responsive : ''
        ])
      );

      if ( _this.options.inheritOriginalWidth && originalWidth > 0 ) {
        _this.elements.outerWrapper.width(originalWidth);
      }

      _this.unbindEvents();

      if ( !_this.$element.prop('disabled') ) {
        _this.state.enabled = true;

        // Not disabled, so... Removing disabled class
        _this.elements.outerWrapper.removeClass(_this.classes.disabled);

        // Remove styles from items box
        // Fix incorrect height when refreshed is triggered with fewer options
        _this.$li = _this.elements.items.removeAttr('style').find('li');

        _this.bindEvents();
      } else {
        _this.elements.outerWrapper.addClass(_this.classes.disabled);

        if ( _this.elements.input ) {
          _this.elements.input.prop('disabled', true);
        }
      }

      _this.utils.triggerCallback('Activate', _this);
    },

    /**
     * Generate classNames for elements
     *
     * @return {object} Classes object
     */
    getClassNames: function() {
      var _this = this;
      var customClass = _this.options.customClass;
      var classesObj = {};

      $.each(classList.split(' '), function(i, currClass) {
        var c = customClass.prefix + currClass;
        classesObj[currClass.toLowerCase()] = customClass.camelCase ? c : _this.utils.toDash(c);
      });

      classesObj.prefix = customClass.prefix;

      return classesObj;
    },

    /** Set the label text */
    setLabel: function() {
      var _this = this;
      var labelBuilder = _this.options.labelBuilder;

      if ( _this.state.multiple ) {
        // Make sure currentValues is an array
        var currentValues = $.isArray(_this.state.currValue) ? _this.state.currValue : [_this.state.currValue];
        // I'm not happy with this, but currentValues can be an empty
        // array and we need to fallback to the default option.
        currentValues = currentValues.length === 0 ? [0] : currentValues;

        var labelMarkup = $.map(currentValues, function(value) {
          return $.grep(_this.lookupItems, function(item) {
            return item.index === value;
          })[0]; // we don't want nested arrays here
        });

        labelMarkup = $.grep(labelMarkup, function(item) {
          // Hide default (please choose) if more then one element were selected.
          // If no option value were given value is set to option text by default
          if ( labelMarkup.length > 1 || labelMarkup.length === 0 ) {
            return $.trim(item.value) !== '';
          }
          return item;
        });

        labelMarkup = $.map(labelMarkup, function(item) {
          return $.isFunction(labelBuilder)
            ? labelBuilder(item)
            : _this.utils.format(labelBuilder, item);
        });

        // Limit the amount of selected values shown in label
        if ( _this.options.multiple.maxLabelEntries ) {
          if ( labelMarkup.length >= _this.options.multiple.maxLabelEntries + 1 ) {
            labelMarkup = labelMarkup.slice(0, _this.options.multiple.maxLabelEntries);
            labelMarkup.push(
              $.isFunction(labelBuilder)
                ? labelBuilder({ text: '...' })
                : _this.utils.format(labelBuilder, { text: '...' }));
          } else {
            labelMarkup.slice(labelMarkup.length - 1);
          }
        }
        _this.elements.label.html(labelMarkup.join(_this.options.multiple.separator));

      } else {
        var currItem = _this.lookupItems[_this.state.currValue];

        _this.elements.label.html(
          $.isFunction(labelBuilder)
            ? labelBuilder(currItem)
            : _this.utils.format(labelBuilder, currItem)
        );
      }
    },

    /** Get and save the available options */
    populate: function() {
      var _this = this;
      var $options = _this.$element.children();
      var $justOptions = _this.$element.find('option');
      var $selected = $justOptions.filter(':selected');
      var selectedIndex = $justOptions.index($selected);
      var currIndex = 0;
      var emptyValue = (_this.state.multiple ? [] : 0);

      if ( $selected.length > 1 && _this.state.multiple ) {
        selectedIndex = [];
        $selected.each(function() {
          selectedIndex.push($(this).index());
        });
      }

      _this.state.currValue = (~selectedIndex ? selectedIndex : emptyValue);
      _this.state.selectedIdx = _this.state.currValue;
      _this.state.highlightedIdx = _this.state.currValue;
      _this.items = [];
      _this.lookupItems = [];

      if ( $options.length ) {
        // Build options markup
        $options.each(function(i) {
          var $elm = $(this);

          if ( $elm.is('optgroup') ) {

            var optionsGroup = {
              element       : $elm,
              label         : $elm.prop('label'),
              groupDisabled : $elm.prop('disabled'),
              items         : []
            };

            $elm.children().each(function(i) {
              var $elm = $(this);

              optionsGroup.items[i] = _this.getItemData(currIndex, $elm, optionsGroup.groupDisabled || $elm.prop('disabled'));

              _this.lookupItems[currIndex] = optionsGroup.items[i];

              currIndex++;
            });

            _this.items[i] = optionsGroup;

          } else {

            _this.items[i] = _this.getItemData(currIndex, $elm, $elm.prop('disabled'));

            _this.lookupItems[currIndex] = _this.items[i];

            currIndex++;

          }
        });

        _this.setLabel();
        _this.elements.items.append( _this.elements.itemsScroll.html( _this.getItemsMarkup(_this.items) ) );
      }
    },

    /**
     * Generate items object data
     * @param  {integer} index      - Current item index
     * @param  {node}    $elm       - Current element node
     * @param  {boolean} isDisabled - Current element disabled state
     * @return {object}               Item object
     */
    getItemData: function(index, $elm, isDisabled) {
      var _this = this;

      return {
        index     : index,
        element   : $elm,
        value     : $elm.val(),
        className : $elm.prop('class'),
        text      : $elm.html(),
        slug      : $.trim(_this.utils.replaceDiacritics($elm.html())),
        selected  : $elm.prop('selected'),
        disabled  : isDisabled
      };
    },

    /**
     * Generate options markup
     *
     * @param  {object} items - Object containing all available options
     * @return {string}         HTML for the options box
     */
    getItemsMarkup: function(items) {
      var _this = this;
      var markup = '<ul>';

      if ( $.isFunction(_this.options.listBuilder) && _this.options.listBuilder ) {
        items = _this.options.listBuilder(items);
      }

      $.each(items, function(i, elm) {
        if ( elm.label !== undefined ) {

          markup += _this.utils.format('<ul class="{1}"><li class="{2}">{3}</li>',
            _this.utils.arrayToClassname([
              _this.classes.group,
              elm.groupDisabled ? 'disabled' : '',
              elm.element.prop('class')
            ]),
            _this.classes.grouplabel,
            elm.element.prop('label')
          );

          $.each(elm.items, function(i, elm) {
            markup += _this.getItemMarkup(elm.index, elm);
          });

          markup += '</ul>';

        } else {

          markup += _this.getItemMarkup(elm.index, elm);

        }
      });

      return markup + '</ul>';
    },

    /**
     * Generate every option markup
     *
     * @param  {number} index    - Index of current item
     * @param  {object} itemData - Current item
     * @return {string}            HTML for the option
     */
    getItemMarkup: function(index, itemData) {
      var _this = this;
      var itemBuilder = _this.options.optionsItemBuilder;
      // limit access to item data to provide a simple interface
      // to most relevant options.
      var filteredItemData = {
        value: itemData.value,
        text : itemData.text,
        slug : itemData.slug,
        index: itemData.index
      };

      return _this.utils.format('<li data-index="{1}" class="{2}">{3}</li>',
        index,
        _this.utils.arrayToClassname([
          itemData.className,
          index === _this.items.length - 1  ? 'last'     : '',
          itemData.disabled                 ? 'disabled' : '',
          itemData.selected                 ? 'selected' : ''
        ]),
        $.isFunction(itemBuilder)
          ? _this.utils.format(itemBuilder(itemData, this.$element, index), itemData)
          : _this.utils.format(itemBuilder, filteredItemData)
      );
    },

    /** Remove events on the elements */
    unbindEvents: function() {
      var _this = this;

      _this.elements.wrapper
        .add(_this.$element)
        .add(_this.elements.outerWrapper)
        .add(_this.elements.input)
        .off(eventNamespaceSuffix);
    },

    /** Bind events on the elements */
    bindEvents: function() {
      var _this = this;

      _this.elements.outerWrapper.on('mouseenter' + eventNamespaceSuffix + ' mouseleave' + eventNamespaceSuffix, function(e) {
        $(this).toggleClass(_this.classes.hover, e.type === 'mouseenter');

        // Delay close effect when openOnHover is true
        if ( _this.options.openOnHover ) {
          clearTimeout(_this.closeTimer);

          if ( e.type === 'mouseleave' ) {
            _this.closeTimer = setTimeout($.proxy(_this.close, _this), _this.options.hoverIntentTimeout);
          } else {
            _this.open();
          }
        }
      });

      // Toggle open/close
      _this.elements.wrapper.on('click' + eventNamespaceSuffix, function(e) {
        _this.state.opened ? _this.close() : _this.open(e);
      });

      // Translate original element focus event to dummy input.
      // Disabled on mobile devices because the default option list isn't
      // shown due the fact that hidden input gets focused
      if ( !(_this.options.nativeOnMobile && _this.utils.isMobile()) ) {
        _this.$element.on('focus' + eventNamespaceSuffix, function() {
          _this.elements.input.focus();
        });

        _this.elements.input
          .prop({ tabindex: _this.originalTabindex, disabled: false })
          .on('keydown' + eventNamespaceSuffix, $.proxy(_this.handleKeys, _this))
          .on('focusin' + eventNamespaceSuffix, function(e) {
            _this.elements.outerWrapper.addClass(_this.classes.focus);

            // Prevent the flicker when focusing out and back again in the browser window
            _this.elements.input.one('blur', function() {
              _this.elements.input.blur();
            });

            if ( _this.options.openOnFocus && !_this.state.opened ) {
              _this.open(e);
            }
          })
          .on('focusout' + eventNamespaceSuffix, function() {
            _this.elements.outerWrapper.removeClass(_this.classes.focus);
          })
          .on('input propertychange', function() {
            var val = _this.elements.input.val();
            var searchRegExp = new RegExp('^' + _this.utils.escapeRegExp(val), 'i');

            // Clear search
            clearTimeout(_this.resetStr);
            _this.resetStr = setTimeout(function() {
              _this.elements.input.val('');
            }, _this.options.keySearchTimeout);

            if ( val.length ) {
              // Search in select options
              $.each(_this.items, function(i, elm) {
                if ( !elm.disabled && searchRegExp.test(elm.text) || searchRegExp.test(elm.slug) ) {
                  _this.highlight(i);
                  return;
                }
              });
            }
          });
      }

      _this.$li.on({
        // Prevent <input> blur on Chrome
        mousedown: function(e) {
          e.preventDefault();
          e.stopPropagation();
        },
        click: function() {
          _this.select($(this).data('index'));

          // Chrome doesn't close options box if select is wrapped with a label
          // We need to 'return false' to avoid that
          return false;
        }
      });
    },

    /**
     * Behavior when keyboard keys is pressed
     *
     * @param {object} e - Event object
     */
    handleKeys: function(e) {
      var _this = this;
      var key = e.which;
      var keys = _this.options.keys;

      var isPrevKey = $.inArray(key, keys.previous) > -1;
      var isNextKey = $.inArray(key, keys.next) > -1;
      var isSelectKey = $.inArray(key, keys.select) > -1;
      var isOpenKey = $.inArray(key, keys.open) > -1;
      var idx = _this.state.highlightedIdx;
      var isFirstOrLastItem = (isPrevKey && idx === 0) || (isNextKey && (idx + 1) === _this.items.length);
      var goToItem = 0;

      // Enter / Space
      if ( key === 13 || key === 32 ) {
        e.preventDefault();
      }

      // If it's a directional key
      if ( isPrevKey || isNextKey ) {
        if ( !_this.options.allowWrap && isFirstOrLastItem ) {
          return;
        }

        if ( isPrevKey ) {
          goToItem = _this.utils.previousEnabledItem(_this.lookupItems, idx);
        }

        if ( isNextKey ) {
          goToItem = _this.utils.nextEnabledItem(_this.lookupItems, idx);
        }

        _this.highlight(goToItem);
      }

      // Tab / Enter / ESC
      if ( isSelectKey && _this.state.opened ) {
        _this.select(idx);

        if ( !_this.state.multiple || !_this.options.multiple.keepMenuOpen ) {
          _this.close();
        }

        return;
      }

      // Space / Enter / Left / Up / Right / Down
      if ( isOpenKey && !_this.state.opened ) {
        _this.open();
      }
    },

    /** Update the items object */
    refresh: function() {
      var _this = this;

      _this.populate();
      _this.activate();
      _this.utils.triggerCallback('Refresh', _this);
    },

    /** Set options box width/height */
    setOptionsDimensions: function() {
      var _this = this;

      // Calculate options box height
      // Set a temporary class on the hidden parent of the element
      var hiddenChildren = _this.elements.items.closest(':visible').children(':hidden').addClass(_this.classes.tempshow);
      var maxHeight = _this.options.maxHeight;
      var itemsWidth = _this.elements.items.outerWidth();
      var wrapperWidth = _this.elements.wrapper.outerWidth() - (itemsWidth - _this.elements.items.width());

      // Set the dimensions, minimum is wrapper width, expand for long items if option is true
      if ( !_this.options.expandToItemText || wrapperWidth > itemsWidth ) {
        _this.finalWidth = wrapperWidth;
      } else {
        // Make sure the scrollbar width is included
        _this.elements.items.css('overflow', 'scroll');

        // Set a really long width for _this.elements.outerWrapper
        _this.elements.outerWrapper.width(9e4);
        _this.finalWidth = _this.elements.items.width();
        // Set scroll bar to auto
        _this.elements.items.css('overflow', '');
        _this.elements.outerWrapper.width('');
      }

      _this.elements.items.width(_this.finalWidth).height() > maxHeight && _this.elements.items.height(maxHeight);

      // Remove the temporary class
      hiddenChildren.removeClass(_this.classes.tempshow);
    },

    /** Detect if the options box is inside the window */
    isInViewport: function() {
      var _this = this;

      if (_this.options.forceRenderAbove === true) {
        _this.elements.outerWrapper.addClass(_this.classes.above);
      } else if (_this.options.forceRenderBelow === true) {
        _this.elements.outerWrapper.addClass(_this.classes.below);
      } else {
        var scrollTop = $win.scrollTop();
        var winHeight = $win.height();
        var uiPosX = _this.elements.outerWrapper.offset().top;
        var uiHeight = _this.elements.outerWrapper.outerHeight();

        var fitsDown = (uiPosX + uiHeight + _this.itemsHeight) <= (scrollTop + winHeight);
        var fitsAbove = (uiPosX - _this.itemsHeight) > scrollTop;

        // If it does not fit below, only render it
        // above it fit's there.
        // It's acceptable that the user needs to
        // scroll the viewport to see the cut off UI
        var renderAbove = !fitsDown && fitsAbove;
        var renderBelow = !renderAbove;

        _this.elements.outerWrapper.toggleClass(_this.classes.above, renderAbove);
        _this.elements.outerWrapper.toggleClass(_this.classes.below, renderBelow);
      }
    },

    /**
     * Detect if currently selected option is visible and scroll the options box to show it
     *
     * @param {Number|Array} index - Index of the selected items
     */
    detectItemVisibility: function(index) {
      var _this = this;
      var $filteredLi = _this.$li.filter('[data-index]');

      if ( _this.state.multiple ) {
        // If index is an array, we can assume a multiple select and we
        // want to scroll to the uppermost selected item!
        // Math.min.apply(Math, index) returns the lowest entry in an Array.
        index = ($.isArray(index) && index.length === 0) ? 0 : index;
        index = $.isArray(index) ? Math.min.apply(Math, index) : index;
      }

      var liHeight = $filteredLi.eq(index).outerHeight();
      var liTop = $filteredLi[index].offsetTop;
      var itemsScrollTop = _this.elements.itemsScroll.scrollTop();
      var scrollT = liTop + liHeight * 2;

      _this.elements.itemsScroll.scrollTop(
        scrollT > itemsScrollTop + _this.itemsHeight ? scrollT - _this.itemsHeight :
          liTop - liHeight < itemsScrollTop ? liTop - liHeight :
            itemsScrollTop
      );
    },

    /**
     * Open the select options box
     *
     * @param {Event} e - Event
     */
    open: function(e) {
      var _this = this;

      if ( _this.options.nativeOnMobile && _this.utils.isMobile()) {
        return false;
      }

      _this.utils.triggerCallback('BeforeOpen', _this);

      if ( e ) {
        e.preventDefault();
        if (_this.options.stopPropagation) {
          e.stopPropagation();
        }
      }

      if ( _this.state.enabled ) {
        _this.setOptionsDimensions();

        // Find any other opened instances of select and close it
        $('.' + _this.classes.hideselect, '.' + _this.classes.open).children()[pluginName]('close');

        _this.state.opened = true;
        _this.itemsHeight = _this.elements.items.outerHeight();
        _this.itemsInnerHeight = _this.elements.items.height();

        // Toggle options box visibility
        _this.elements.outerWrapper.addClass(_this.classes.open);

        // Give dummy input focus
        _this.elements.input.val('');
        if ( e && e.type !== 'focusin' ) {
          _this.elements.input.focus();
        }

        // Delayed binds events on Document to make label clicks work
        setTimeout(function() {
          $doc
            .on('click' + eventNamespaceSuffix, $.proxy(_this.close, _this))
            .on('scroll' + eventNamespaceSuffix, $.proxy(_this.isInViewport, _this));
        }, 1);

        _this.isInViewport();

        // Prevent window scroll when using mouse wheel inside items box
        if ( _this.options.preventWindowScroll ) {
          /* istanbul ignore next */
          $doc.on('mousewheel' + eventNamespaceSuffix + ' DOMMouseScroll' + eventNamespaceSuffix, '.' + _this.classes.scroll, function(e) {
            var orgEvent = e.originalEvent;
            var scrollTop = $(this).scrollTop();
            var deltaY = 0;

            if ( 'detail'      in orgEvent ) { deltaY = orgEvent.detail * -1; }
            if ( 'wheelDelta'  in orgEvent ) { deltaY = orgEvent.wheelDelta;  }
            if ( 'wheelDeltaY' in orgEvent ) { deltaY = orgEvent.wheelDeltaY; }
            if ( 'deltaY'      in orgEvent ) { deltaY = orgEvent.deltaY * -1; }

            if ( scrollTop === (this.scrollHeight - _this.itemsInnerHeight) && deltaY < 0 || scrollTop === 0 && deltaY > 0 ) {
              e.preventDefault();
            }
          });
        }

        _this.detectItemVisibility(_this.state.selectedIdx);

        _this.highlight(_this.state.multiple ? -1 : _this.state.selectedIdx);

        _this.utils.triggerCallback('Open', _this);
      }
    },

    /** Close the select options box */
    close: function() {
      var _this = this;

      _this.utils.triggerCallback('BeforeClose', _this);

      // Remove custom events on document
      $doc.off(eventNamespaceSuffix);

      // Remove visible class to hide options box
      _this.elements.outerWrapper.removeClass(_this.classes.open);

      _this.state.opened = false;

      _this.utils.triggerCallback('Close', _this);
    },

    /** Select current option and change the label */
    change: function() {
      var _this = this;

      _this.utils.triggerCallback('BeforeChange', _this);

      if ( _this.state.multiple ) {
        // Reset old selected
        $.each(_this.lookupItems, function(idx) {
          _this.lookupItems[idx].selected = false;
          _this.$element.find('option').prop('selected', false);
        });

        // Set new selected
        $.each(_this.state.selectedIdx, function(idx, value) {
          _this.lookupItems[value].selected = true;
          _this.$element.find('option').eq(value).prop('selected', true);
        });

        _this.state.currValue = _this.state.selectedIdx;

        _this.setLabel();

        _this.utils.triggerCallback('Change', _this);
      } else if ( _this.state.currValue !== _this.state.selectedIdx ) {
        // Apply changed value to original select
        _this.$element
          .prop('selectedIndex', _this.state.currValue = _this.state.selectedIdx)
          .data('value', _this.lookupItems[_this.state.selectedIdx].text);

        // Change label text
        _this.setLabel();

        _this.utils.triggerCallback('Change', _this);
      }
    },

    /**
     * Highlight option
     * @param {number} index - Index of the options that will be highlighted
     */
    highlight: function(index) {
      var _this = this;
      var $filteredLi = _this.$li.filter('[data-index]').removeClass('highlighted');

      _this.utils.triggerCallback('BeforeHighlight', _this);

      // Parameter index is required and should not be a disabled item
      if ( index === undefined || index === -1 || _this.lookupItems[index].disabled ) {
        return;
      }

      $filteredLi
        .eq(_this.state.highlightedIdx = index)
        .addClass('highlighted');

      _this.detectItemVisibility(index);

      _this.utils.triggerCallback('Highlight', _this);
    },

    /**
     * Select option
     *
     * @param {number} index - Index of the option that will be selected
     */
    select: function(index) {
      var _this = this;
      var $filteredLi = _this.$li.filter('[data-index]');

      _this.utils.triggerCallback('BeforeSelect', _this, index);

      // Parameter index is required and should not be a disabled item
      if ( index === undefined || index === -1 || _this.lookupItems[index].disabled ) {
        return;
      }

      if ( _this.state.multiple ) {
        // Make sure selectedIdx is an array
        _this.state.selectedIdx = $.isArray(_this.state.selectedIdx) ? _this.state.selectedIdx : [_this.state.selectedIdx];

        var hasSelectedIndex = $.inArray(index, _this.state.selectedIdx);
        if ( hasSelectedIndex !== -1 ) {
          _this.state.selectedIdx.splice(hasSelectedIndex, 1);
        } else {
          _this.state.selectedIdx.push(index);
        }

        $filteredLi
          .removeClass('selected')
          .filter(function(index) {
            return $.inArray(index, _this.state.selectedIdx) !== -1;
          })
          .addClass('selected');
      } else {
        $filteredLi
          .removeClass('selected')
          .eq(_this.state.selectedIdx = index)
          .addClass('selected');
      }

      if ( !_this.state.multiple || !_this.options.multiple.keepMenuOpen ) {
        _this.close();
      }

      _this.change();

      _this.utils.triggerCallback('Select', _this, index);
    },

    /**
     * Unbind and remove
     *
     * @param {boolean} preserveData - Check if the data on the element should be removed too
     */
    destroy: function(preserveData) {
      var _this = this;

      if ( _this.state && _this.state.enabled ) {
        _this.elements.items.add(_this.elements.wrapper).add(_this.elements.input).remove();

        if ( !preserveData ) {
          _this.$element.removeData(pluginName).removeData('value');
        }

        _this.$element.prop('tabindex', _this.originalTabindex).off(eventNamespaceSuffix).off(_this.eventTriggers).unwrap().unwrap();

        _this.state.enabled = false;
      }
    }
  };

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function(args) {
    return this.each(function() {
      var data = $.data(this, pluginName);

      if ( data && !data.disableOnMobile ) {
        (typeof args === 'string' && data[args]) ? data[args]() : data.init(args);
      } else {
        $.data(this, pluginName, new Selectric(this, args));
      }
    });
  };

  /**
   * Default plugin options
   *
   * @type {object}
   */
  $.fn[pluginName].defaults = {
    onChange             : function(elm) { $(elm).change(); },
    maxHeight            : 300,
    keySearchTimeout     : 500,
    arrowButtonMarkup    : '<b class="button">&#x25be;</b>',
    disableOnMobile      : false,
    nativeOnMobile       : true,
    openOnFocus          : true,
    openOnHover          : false,
    hoverIntentTimeout   : 500,
    expandToItemText     : false,
    responsive           : false,
    preventWindowScroll  : true,
    inheritOriginalWidth : false,
    allowWrap            : true,
    forceRenderAbove     : false,
    forceRenderBelow     : false,
    stopPropagation      : true,
    optionsItemBuilder   : '{text}', // function(itemData, element, index)
    labelBuilder         : '{text}', // function(currItem)
    listBuilder          : false,    // function(items)
    keys                 : {
      previous : [37, 38],                 // Left / Up
      next     : [39, 40],                 // Right / Down
      select   : [9, 13, 27],              // Tab / Enter / Escape
      open     : [13, 32, 37, 38, 39, 40], // Enter / Space / Left / Up / Right / Down
      close    : [9, 27]                   // Tab / Escape
    },
    customClass          : {
      prefix: pluginName,
      camelCase: false
    },
    multiple              : {
      separator: ', ',
      keepMenuOpen: true,
      maxLabelEntries: false
    }
  };
}));

fs.define('js/ui-setup',['jquery', 'js/selection', 'rangeslider', 'selectric'], function ($, selection) {

    function debounce(fn, debounceDuration) {
        debounceDuration = debounceDuration || 100;
        return function () {
            if (!fn.debouncing) {
                var args = Array.prototype.slice.apply(arguments);
                fn.lastReturnVal = fn.apply(window, args);
                fn.debouncing = true;
            }
            clearTimeout(fn.debounceTimeout);
            fn.debounceTimeout = setTimeout(function () {
                fn.debouncing = false;
            }, debounceDuration);
            return fn.lastReturnVal;
        };
    }

    /**
     * Workaround to dispatch a native event instead of relying
     * on the plugin's jquery type of event
     *
     * @param element: DOM node to trigger the event on
     * @param type: String with event type
     */
    function dispatchVanillaEvent(element, type) {
        var evt = document.createEvent('HTMLEvents');
        evt.initEvent(type, true, true);
        element.dispatchEvent(evt);
    }


    /**
     * setup function for all those UI components and interactions
     * that require jquery
     */
    function main(wrapper, pubsub, fontsData) {

        var $wrapper = $(wrapper),
            FSevents = pubsub,
            typeTesterSelector = ".type-tester",
            typeTesterContentSelector = ".type-tester__content",

            events = {
                'activatefont':        'fontsampler.event.activatefont',
                'afterinit':           'fontsampler.event.afterinit',
                'activateopentype':    'fontsampler.event.activateopentype',
                'openedopentype':      'fontsampler.event.openedopentype',
                'activatealignment':   'fontsampler.event.activatealignment',
                'activateinvert':      'fontsampler.event.activateinvert',
                'activatefontpicker':  'fontsampler.event.activatefontpicker',
                'activatesampletexts': 'fontsampler.event.activatesampletexts', 
                'changefontsize':      'fontsampler.event.changefontsize',
                'changelineheight':    'fontsampler.event.changelineheight',
                'changeletterspacing': 'fontsampler.event.changeletterspacing',
                'notdef': 'fontsampler.event.notdef'
            },

            notdef = parseInt($wrapper.find(typeTesterContentSelector).data("notdef"));

        console.log(typeof fontsData);
        if (typeof fontsData !== "undefined") {
            var currentFontIndex = 0,
            currentFontGlyphUnicodes = getFontGlyphs(currentFontIndex);
        }


        function getFontGlyphs(fontIndex) {
            var glyphs = fontsData._data[currentFontIndex].font.glyphs.glyphs,
                glyphsArray = [];

            // glyphs is an array-like object with {0: contents, 1: contents ...} 
            // for each glyph
            for (var index in glyphs) {
                var glyph = glyphs[index];
                // if (typeof glyph.name !== "undefined" && glyph.name === ".notdef") {
                //     notdefGlyph = glyph;
                // }
                if (typeof glyph.unicode !== "undefined") {
                    glyphsArray.push( glyph.unicode );
                }
            }

            return glyphsArray;
        }


        /**
         * Listen to keypress events and crosscheck current font for existiance
         * of pressed glyph's unicode
         */
        $wrapper.find(".type-tester__content").on("input propertychange", highlightNotdef);

        // call once on load
        highlightNotdef();

        function highlightNotdef() {
            if (!currentFontGlyphUnicodes) {
                return;
            }
            var $input = $wrapper.find(".type-tester__content"),
                text = $input.text(),
                newText = [],
                cursor = selection.getCaret($input[0]),
                cursorEnd = cursor;

            // 0 = do nothing
            // 1 = highlight (fallback)
            // 2 = notdef (font or fallback)
            // 3 = block
            if (notdef) {
                for (var i=0; i<text.length; i++) {
                    if (currentFontGlyphUnicodes.indexOf( text.charCodeAt(i) ) === -1) {
                        switch (notdef) {
                            case 1:
                                newText.push("<span class='fontsampler-glyph-highlight'>" + text[i] + "</span>");
                                break;

                            case 2:
                                newText.push("<span class='fontsampler-glyph-notdef'>\uFFFF</span>");
                                break;

                            case 3:
                                cursorEnd = cursor -1;
                                break;
                        }
                        triggerEvent(events.notdef);
                    } else {
                        newText.push(text[i]);
                    }
                }
                $input.html(newText.join(""));
                selection.setCaret($input[0], cursor, cursorEnd);
            }
        }


        function triggerEvent(e) {
            $wrapper.trigger(e);
        }


        // Trigger various events on the wrapper element when they happen internally
        // so that library externals can hook into them
        FSevents.subscribe('activateFont', function (fontIndex) {
            currentFontIndex = fontIndex;
            currentFontGlyphUnicodes = getFontGlyphs( currentFontIndex );
            highlightNotdef();
            triggerEvent(events.activatefont);
        });


        // language switcher to activate locl features
        $wrapper.find(".fontsampler-interface select[name='locl-select']").on("change", function () {
            var $tester = $(this).closest(".fontsampler-interface").find(".type-tester__content"),
                val = $(this).val();

            if (val) {
                $tester.attr("lang", $(this).val());
            } else {
                $tester.removeAttr("lang");
            }
        });


        $wrapper.find(".fontsampler-interface select[name='sample-text']").on('change', function () {
            var $fs = $(this).closest('.fontsampler-interface').find(typeTesterContentSelector),
                val = $(this).val();

            $fs.html(val);
        });

        $wrapper.find('.fontsampler-interface input[type="range"]').each(function () {
            // since specimentools only creates the input element, hand down the RTL 
            // if set on the parent
            $(this).attr("data-direction", $(this).parent().data("direction"));

            $(this).rangeslider({
                // Feature detection the default is `true`.
                // Set this to `false` if you want to use
                // the polyfill also in Browsers which support
                // the native <input type="range"> element.
                polyfill: false,
                onSlide: function (position, element) {
                    debounce(dispatchVanillaEvent(this.$element[0], 'input'), 250);
                    closeOpenOTModal();
                },
                onSlideEnd: function (position, element) {
                    debounce(dispatchVanillaEvent(this.$element[0], 'input'), 250);
                    try {
                        var block = this.$element.closest(".fontsampler-ui-block").data("block");
                        triggerEvent(events[ "change" + block ], [this.value]);
                    } catch (error) {
                        console.warn(error);
                    }
                }
            });
        });

        // transform select dropdowns
        $wrapper.find(".fontsampler-interface select").not("[size]").each(function () {
            $(this).selectric({
                onChange: function (element) {
                    debounce(dispatchVanillaEvent(element, 'change'));
                },
                onBeforeOpen: function (element, selectric) {
                    closeOpenOTModal();
                    try {
                        var block = selectric.$element.closest(".fontsampler-ui-block").data("block");
                        triggerEvent(events["activate" + block], [selectric]);
                    } catch (error) {
                        console.warn(error);
                    }
                },
                nativeOnMobile: false,
                disableOnMobile: false
            }).closest('.selectric-wrapper').addClass('selectric-wide');
        });


        $wrapper.find(".fontsampler-interface .fontsampler-multiselect").on("click", "button", function (e) {
            var $this = $(this),
                $fs = $this.closest('.fontsampler-interface').find(typeTesterContentSelector),
                val = $this.data("value");

            switch ($this.closest('.fontsampler-multiselect').data("name")) {
                case "alignment":
                    triggerEvent(events.activatealignment, [val]);
                    $fs.css("text-align", val);
                    break;

                case "invert":
                    triggerEvent(events.activateinvert, [val]);
                    if (val == "positive") {
                        $fs.removeClass("invert");
                        $("body").removeClass("fontsampler-inverted");
                    } else {
                        $fs.addClass("invert");
                        $("body").addClass("fontsampler-inverted");
                    }
                    break;

                case "opentype":
                    // kind of an edge case, but close already open OT modals
                    // of OTHER fontsamplers on the page when opening a new modal
                    $(".fontsampler-opentype-features.shown")
                        .not($this.siblings(".fontsampler-opentype-features"))
                        .removeClass("shown");
                    
                    triggerEvent(events.activateopentype, [$this.siblings(".fontsampler-opentype-features")]);
                    $this.siblings(".fontsampler-opentype-features").toggleClass("shown");
                    triggerEvent(events.openedopentype, [$this.siblings(".fontsampler-opentype-features")]);

                    break;
            }

            $this.siblings("button").removeClass("fontsampler-multiselect-selected");
            if ($this.siblings("button").length === 0) {
                $this.toggleClass("fontsampler-multiselect-selected");
            } else {
                $this.addClass("fontsampler-multiselect-selected");
            }
        });

        // add opentype close functionality on any interaction outside the OT modual
        // once it has been opened
        $(document).on("click", closeOpenOTModal);
        function closeOpenOTModal (e) {
            if (typeof e === "undefined") {
                $(".fontsampler-opentype-features.shown").each(function () {
                    $(this).removeClass("shown");
                    $(this).siblings(".fontsampler-opentype-toggle")
                        .removeClass("fontsampler-multiselect-selected");
                });
            } else {
                // if this top most clicked element was inside an OT wrapper
                if ($(e.target).parents(".fontsampler-opentype").length === 0) {
                    //click outside OT modal
                    $wrapper.find(".fontsampler-opentype-features").each(function () {
                        $(this).removeClass("shown");
                        $(this).siblings(".fontsampler-opentype-toggle")
                            .removeClass("fontsampler-multiselect-selected");
                    });
                }
            }
        }

        // prevent line breaks on single line instances
        $wrapper.find(typeTesterContentSelector + '.fontsampler-is-singleline')
            .on("keypress keyup change paste", function (event) {

                if (event.type === "keypress") {
                    // for keypress events immediately block pressing enter for line break
                    if (event.keyCode === 13) {
                        return false;
                    }
                } else {
                    // allow other events, filter any html with $.text() and replace linebreaks
                    // TODO fix paste event from setting the caret to the front of the non-input non-textarea
                    var $this = $(this),
                        text = $this.text(),
                        hasLinebreaks = text.indexOf("\n"),
                        numChildren = $this.children().length;

                    if (-1 !== hasLinebreaks) {
                        $(this).html(text.replace('/\n/gi', ''));
                        selection.setCaret($(this)[0], $(this).text().length, 0);
                    }
                }
            });


        // prevent pasting styled content
        $wrapper.find('.type-tester__content[contenteditable]').on('paste', function(e) {
            e.preventDefault();
            var text = '';
            if (e.clipboardData || e.originalEvent.clipboardData) {
                text = (e.originalEvent || e).clipboardData.getData('text/plain');
            } else if (window.clipboardData) {
                text = window.clipboardData.getData('Text');
            }
            if (document.queryCommandSupported('insertText')) {
                document.execCommand('insertText', false, text);
            } else {
                document.execCommand('paste', false, text);
            }
        });


        // for fontsamplers that only have one font but display the fontpicker label,
        // insert the font family name that opentype.js loaded into the label
        $wrapper.find(".fontsampler-font-label").each(function () {
            var name = $wrapper.data('initial-font-name-overwrite') ? 
                       $wrapper.data('initial-font-name-overwrite') : 
                       $wrapper.data('initial-font-name');
            $(this).children('label').html(name);
        });


        
        $wrapper.removeClass("on-loading");
        triggerEvent(events.afterinit);
    }

    return main;

});
/*!
 * jQuery Validation Plugin v1.17.0
 *
 * https://jqueryvalidation.org/
 *
 * Copyright (c) 2017 Jörn Zaefferer
 * Released under the MIT license
 */
(function( factory ) {
	if ( typeof fs.define === 'function' && fs.define.amd ) {
		fs.define( 'validate',["jquery"], factory );
	} else if (typeof module === "object" && module.exports) {
		module.exports = factory( require( "jquery" ) );
	} else {
		factory( jQuery );
	}
}(function( $ ) {

$.extend( $.fn, {

	// https://jqueryvalidation.org/validate/
	validate: function( options ) {

		// If nothing is selected, return nothing; can't chain anyway
		if ( !this.length ) {
			if ( options && options.debug && window.console ) {
				console.warn( "Nothing selected, can't validate, returning nothing." );
			}
			return;
		}

		// Check if a validator for this form was already created
		var validator = $.data( this[ 0 ], "validator" );
		if ( validator ) {
			return validator;
		}

		// Add novalidate tag if HTML5.
		this.attr( "novalidate", "novalidate" );

		validator = new $.validator( options, this[ 0 ] );
		$.data( this[ 0 ], "validator", validator );

		if ( validator.settings.onsubmit ) {

			this.on( "click.validate", ":submit", function( event ) {

				// Track the used submit button to properly handle scripted
				// submits later.
				validator.submitButton = event.currentTarget;

				// Allow suppressing validation by adding a cancel class to the submit button
				if ( $( this ).hasClass( "cancel" ) ) {
					validator.cancelSubmit = true;
				}

				// Allow suppressing validation by adding the html5 formnovalidate attribute to the submit button
				if ( $( this ).attr( "formnovalidate" ) !== undefined ) {
					validator.cancelSubmit = true;
				}
			} );

			// Validate the form on submit
			this.on( "submit.validate", function( event ) {
				if ( validator.settings.debug ) {

					// Prevent form submit to be able to see console output
					event.preventDefault();
				}
				function handle() {
					var hidden, result;

					// Insert a hidden input as a replacement for the missing submit button
					// The hidden input is inserted in two cases:
					//   - A user defined a `submitHandler`
					//   - There was a pending request due to `remote` method and `stopRequest()`
					//     was called to submit the form in case it's valid
					if ( validator.submitButton && ( validator.settings.submitHandler || validator.formSubmitted ) ) {
						hidden = $( "<input type='hidden'/>" )
							.attr( "name", validator.submitButton.name )
							.val( $( validator.submitButton ).val() )
							.appendTo( validator.currentForm );
					}

					if ( validator.settings.submitHandler ) {
						result = validator.settings.submitHandler.call( validator, validator.currentForm, event );
						if ( hidden ) {

							// And clean up afterwards; thanks to no-block-scope, hidden can be referenced
							hidden.remove();
						}
						if ( result !== undefined ) {
							return result;
						}
						return false;
					}
					return true;
				}

				// Prevent submit for invalid forms or custom submit handlers
				if ( validator.cancelSubmit ) {
					validator.cancelSubmit = false;
					return handle();
				}
				if ( validator.form() ) {
					if ( validator.pendingRequest ) {
						validator.formSubmitted = true;
						return false;
					}
					return handle();
				} else {
					validator.focusInvalid();
					return false;
				}
			} );
		}

		return validator;
	},

	// https://jqueryvalidation.org/valid/
	valid: function() {
		var valid, validator, errorList;

		if ( $( this[ 0 ] ).is( "form" ) ) {
			valid = this.validate().form();
		} else {
			errorList = [];
			valid = true;
			validator = $( this[ 0 ].form ).validate();
			this.each( function() {
				valid = validator.element( this ) && valid;
				if ( !valid ) {
					errorList = errorList.concat( validator.errorList );
				}
			} );
			validator.errorList = errorList;
		}
		return valid;
	},

	// https://jqueryvalidation.org/rules/
	rules: function( command, argument ) {
		var element = this[ 0 ],
			settings, staticRules, existingRules, data, param, filtered;

		// If nothing is selected, return empty object; can't chain anyway
		if ( element == null ) {
			return;
		}

		if ( !element.form && element.hasAttribute( "contenteditable" ) ) {
			element.form = this.closest( "form" )[ 0 ];
			element.name = this.attr( "name" );
		}

		if ( element.form == null ) {
			return;
		}

		if ( command ) {
			settings = $.data( element.form, "validator" ).settings;
			staticRules = settings.rules;
			existingRules = $.validator.staticRules( element );
			switch ( command ) {
			case "add":
				$.extend( existingRules, $.validator.normalizeRule( argument ) );

				// Remove messages from rules, but allow them to be set separately
				delete existingRules.messages;
				staticRules[ element.name ] = existingRules;
				if ( argument.messages ) {
					settings.messages[ element.name ] = $.extend( settings.messages[ element.name ], argument.messages );
				}
				break;
			case "remove":
				if ( !argument ) {
					delete staticRules[ element.name ];
					return existingRules;
				}
				filtered = {};
				$.each( argument.split( /\s/ ), function( index, method ) {
					filtered[ method ] = existingRules[ method ];
					delete existingRules[ method ];
				} );
				return filtered;
			}
		}

		data = $.validator.normalizeRules(
		$.extend(
			{},
			$.validator.classRules( element ),
			$.validator.attributeRules( element ),
			$.validator.dataRules( element ),
			$.validator.staticRules( element )
		), element );

		// Make sure required is at front
		if ( data.required ) {
			param = data.required;
			delete data.required;
			data = $.extend( { required: param }, data );
		}

		// Make sure remote is at back
		if ( data.remote ) {
			param = data.remote;
			delete data.remote;
			data = $.extend( data, { remote: param } );
		}

		return data;
	}
} );

// Custom selectors
$.extend( $.expr.pseudos || $.expr[ ":" ], {		// '|| $.expr[ ":" ]' here enables backwards compatibility to jQuery 1.7. Can be removed when dropping jQ 1.7.x support

	// https://jqueryvalidation.org/blank-selector/
	blank: function( a ) {
		return !$.trim( "" + $( a ).val() );
	},

	// https://jqueryvalidation.org/filled-selector/
	filled: function( a ) {
		var val = $( a ).val();
		return val !== null && !!$.trim( "" + val );
	},

	// https://jqueryvalidation.org/unchecked-selector/
	unchecked: function( a ) {
		return !$( a ).prop( "checked" );
	}
} );

// Constructor for validator
$.validator = function( options, form ) {
	this.settings = $.extend( true, {}, $.validator.defaults, options );
	this.currentForm = form;
	this.init();
};

// https://jqueryvalidation.org/jQuery.validator.format/
$.validator.format = function( source, params ) {
	if ( arguments.length === 1 ) {
		return function() {
			var args = $.makeArray( arguments );
			args.unshift( source );
			return $.validator.format.apply( this, args );
		};
	}
	if ( params === undefined ) {
		return source;
	}
	if ( arguments.length > 2 && params.constructor !== Array  ) {
		params = $.makeArray( arguments ).slice( 1 );
	}
	if ( params.constructor !== Array ) {
		params = [ params ];
	}
	$.each( params, function( i, n ) {
		source = source.replace( new RegExp( "\\{" + i + "\\}", "g" ), function() {
			return n;
		} );
	} );
	return source;
};

$.extend( $.validator, {

	defaults: {
		messages: {},
		groups: {},
		rules: {},
		errorClass: "error",
		pendingClass: "pending",
		validClass: "valid",
		errorElement: "label",
		focusCleanup: false,
		focusInvalid: true,
		errorContainer: $( [] ),
		errorLabelContainer: $( [] ),
		onsubmit: true,
		ignore: ":hidden",
		ignoreTitle: false,
		onfocusin: function( element ) {
			this.lastActive = element;

			// Hide error label and remove error class on focus if enabled
			if ( this.settings.focusCleanup ) {
				if ( this.settings.unhighlight ) {
					this.settings.unhighlight.call( this, element, this.settings.errorClass, this.settings.validClass );
				}
				this.hideThese( this.errorsFor( element ) );
			}
		},
		onfocusout: function( element ) {
			if ( !this.checkable( element ) && ( element.name in this.submitted || !this.optional( element ) ) ) {
				this.element( element );
			}
		},
		onkeyup: function( element, event ) {

			// Avoid revalidate the field when pressing one of the following keys
			// Shift       => 16
			// Ctrl        => 17
			// Alt         => 18
			// Caps lock   => 20
			// End         => 35
			// Home        => 36
			// Left arrow  => 37
			// Up arrow    => 38
			// Right arrow => 39
			// Down arrow  => 40
			// Insert      => 45
			// Num lock    => 144
			// AltGr key   => 225
			var excludedKeys = [
				16, 17, 18, 20, 35, 36, 37,
				38, 39, 40, 45, 144, 225
			];

			if ( event.which === 9 && this.elementValue( element ) === "" || $.inArray( event.keyCode, excludedKeys ) !== -1 ) {
				return;
			} else if ( element.name in this.submitted || element.name in this.invalid ) {
				this.element( element );
			}
		},
		onclick: function( element ) {

			// Click on selects, radiobuttons and checkboxes
			if ( element.name in this.submitted ) {
				this.element( element );

			// Or option elements, check parent select in that case
			} else if ( element.parentNode.name in this.submitted ) {
				this.element( element.parentNode );
			}
		},
		highlight: function( element, errorClass, validClass ) {
			if ( element.type === "radio" ) {
				this.findByName( element.name ).addClass( errorClass ).removeClass( validClass );
			} else {
				$( element ).addClass( errorClass ).removeClass( validClass );
			}
		},
		unhighlight: function( element, errorClass, validClass ) {
			if ( element.type === "radio" ) {
				this.findByName( element.name ).removeClass( errorClass ).addClass( validClass );
			} else {
				$( element ).removeClass( errorClass ).addClass( validClass );
			}
		}
	},

	// https://jqueryvalidation.org/jQuery.validator.setDefaults/
	setDefaults: function( settings ) {
		$.extend( $.validator.defaults, settings );
	},

	messages: {
		required: "This field is required.",
		remote: "Please fix this field.",
		email: "Please enter a valid email address.",
		url: "Please enter a valid URL.",
		date: "Please enter a valid date.",
		dateISO: "Please enter a valid date (ISO).",
		number: "Please enter a valid number.",
		digits: "Please enter only digits.",
		equalTo: "Please enter the same value again.",
		maxlength: $.validator.format( "Please enter no more than {0} characters." ),
		minlength: $.validator.format( "Please enter at least {0} characters." ),
		rangelength: $.validator.format( "Please enter a value between {0} and {1} characters long." ),
		range: $.validator.format( "Please enter a value between {0} and {1}." ),
		max: $.validator.format( "Please enter a value less than or equal to {0}." ),
		min: $.validator.format( "Please enter a value greater than or equal to {0}." ),
		step: $.validator.format( "Please enter a multiple of {0}." )
	},

	autoCreateRanges: false,

	prototype: {

		init: function() {
			this.labelContainer = $( this.settings.errorLabelContainer );
			this.errorContext = this.labelContainer.length && this.labelContainer || $( this.currentForm );
			this.containers = $( this.settings.errorContainer ).add( this.settings.errorLabelContainer );
			this.submitted = {};
			this.valueCache = {};
			this.pendingRequest = 0;
			this.pending = {};
			this.invalid = {};
			this.reset();

			var groups = ( this.groups = {} ),
				rules;
			$.each( this.settings.groups, function( key, value ) {
				if ( typeof value === "string" ) {
					value = value.split( /\s/ );
				}
				$.each( value, function( index, name ) {
					groups[ name ] = key;
				} );
			} );
			rules = this.settings.rules;
			$.each( rules, function( key, value ) {
				rules[ key ] = $.validator.normalizeRule( value );
			} );

			function delegate( event ) {

				// Set form expando on contenteditable
				if ( !this.form && this.hasAttribute( "contenteditable" ) ) {
					this.form = $( this ).closest( "form" )[ 0 ];
					this.name = $( this ).attr( "name" );
				}

				var validator = $.data( this.form, "validator" ),
					eventType = "on" + event.type.replace( /^validate/, "" ),
					settings = validator.settings;
				if ( settings[ eventType ] && !$( this ).is( settings.ignore ) ) {
					settings[ eventType ].call( validator, this, event );
				}
			}

			$( this.currentForm )
				.on( "focusin.validate focusout.validate keyup.validate",
					":text, [type='password'], [type='file'], select, textarea, [type='number'], [type='search'], " +
					"[type='tel'], [type='url'], [type='email'], [type='datetime'], [type='date'], [type='month'], " +
					"[type='week'], [type='time'], [type='datetime-local'], [type='range'], [type='color'], " +
					"[type='radio'], [type='checkbox'], [contenteditable], [type='button']", delegate )

				// Support: Chrome, oldIE
				// "select" is provided as event.target when clicking a option
				.on( "click.validate", "select, option, [type='radio'], [type='checkbox']", delegate );

			if ( this.settings.invalidHandler ) {
				$( this.currentForm ).on( "invalid-form.validate", this.settings.invalidHandler );
			}
		},

		// https://jqueryvalidation.org/Validator.form/
		form: function() {
			this.checkForm();
			$.extend( this.submitted, this.errorMap );
			this.invalid = $.extend( {}, this.errorMap );
			if ( !this.valid() ) {
				$( this.currentForm ).triggerHandler( "invalid-form", [ this ] );
			}
			this.showErrors();
			return this.valid();
		},

		checkForm: function() {
			this.prepareForm();
			for ( var i = 0, elements = ( this.currentElements = this.elements() ); elements[ i ]; i++ ) {
				this.check( elements[ i ] );
			}
			return this.valid();
		},

		// https://jqueryvalidation.org/Validator.element/
		element: function( element ) {
			var cleanElement = this.clean( element ),
				checkElement = this.validationTargetFor( cleanElement ),
				v = this,
				result = true,
				rs, group;

			if ( checkElement === undefined ) {
				delete this.invalid[ cleanElement.name ];
			} else {
				this.prepareElement( checkElement );
				this.currentElements = $( checkElement );

				// If this element is grouped, then validate all group elements already
				// containing a value
				group = this.groups[ checkElement.name ];
				if ( group ) {
					$.each( this.groups, function( name, testgroup ) {
						if ( testgroup === group && name !== checkElement.name ) {
							cleanElement = v.validationTargetFor( v.clean( v.findByName( name ) ) );
							if ( cleanElement && cleanElement.name in v.invalid ) {
								v.currentElements.push( cleanElement );
								result = v.check( cleanElement ) && result;
							}
						}
					} );
				}

				rs = this.check( checkElement ) !== false;
				result = result && rs;
				if ( rs ) {
					this.invalid[ checkElement.name ] = false;
				} else {
					this.invalid[ checkElement.name ] = true;
				}

				if ( !this.numberOfInvalids() ) {

					// Hide error containers on last error
					this.toHide = this.toHide.add( this.containers );
				}
				this.showErrors();

				// Add aria-invalid status for screen readers
				$( element ).attr( "aria-invalid", !rs );
			}

			return result;
		},

		// https://jqueryvalidation.org/Validator.showErrors/
		showErrors: function( errors ) {
			if ( errors ) {
				var validator = this;

				// Add items to error list and map
				$.extend( this.errorMap, errors );
				this.errorList = $.map( this.errorMap, function( message, name ) {
					return {
						message: message,
						element: validator.findByName( name )[ 0 ]
					};
				} );

				// Remove items from success list
				this.successList = $.grep( this.successList, function( element ) {
					return !( element.name in errors );
				} );
			}
			if ( this.settings.showErrors ) {
				this.settings.showErrors.call( this, this.errorMap, this.errorList );
			} else {
				this.defaultShowErrors();
			}
		},

		// https://jqueryvalidation.org/Validator.resetForm/
		resetForm: function() {
			if ( $.fn.resetForm ) {
				$( this.currentForm ).resetForm();
			}
			this.invalid = {};
			this.submitted = {};
			this.prepareForm();
			this.hideErrors();
			var elements = this.elements()
				.removeData( "previousValue" )
				.removeAttr( "aria-invalid" );

			this.resetElements( elements );
		},

		resetElements: function( elements ) {
			var i;

			if ( this.settings.unhighlight ) {
				for ( i = 0; elements[ i ]; i++ ) {
					this.settings.unhighlight.call( this, elements[ i ],
						this.settings.errorClass, "" );
					this.findByName( elements[ i ].name ).removeClass( this.settings.validClass );
				}
			} else {
				elements
					.removeClass( this.settings.errorClass )
					.removeClass( this.settings.validClass );
			}
		},

		numberOfInvalids: function() {
			return this.objectLength( this.invalid );
		},

		objectLength: function( obj ) {
			/* jshint unused: false */
			var count = 0,
				i;
			for ( i in obj ) {

				// This check allows counting elements with empty error
				// message as invalid elements
				if ( obj[ i ] !== undefined && obj[ i ] !== null && obj[ i ] !== false ) {
					count++;
				}
			}
			return count;
		},

		hideErrors: function() {
			this.hideThese( this.toHide );
		},

		hideThese: function( errors ) {
			errors.not( this.containers ).text( "" );
			this.addWrapper( errors ).hide();
		},

		valid: function() {
			return this.size() === 0;
		},

		size: function() {
			return this.errorList.length;
		},

		focusInvalid: function() {
			if ( this.settings.focusInvalid ) {
				try {
					$( this.findLastActive() || this.errorList.length && this.errorList[ 0 ].element || [] )
					.filter( ":visible" )
					.focus()

					// Manually trigger focusin event; without it, focusin handler isn't called, findLastActive won't have anything to find
					.trigger( "focusin" );
				} catch ( e ) {

					// Ignore IE throwing errors when focusing hidden elements
				}
			}
		},

		findLastActive: function() {
			var lastActive = this.lastActive;
			return lastActive && $.grep( this.errorList, function( n ) {
				return n.element.name === lastActive.name;
			} ).length === 1 && lastActive;
		},

		elements: function() {
			var validator = this,
				rulesCache = {};

			// Select all valid inputs inside the form (no submit or reset buttons)
			return $( this.currentForm )
			.find( "input, select, textarea, [contenteditable]" )
			.not( ":submit, :reset, :image, :disabled" )
			.not( this.settings.ignore )
			.filter( function() {
				var name = this.name || $( this ).attr( "name" ); // For contenteditable
				if ( !name && validator.settings.debug && window.console ) {
					console.error( "%o has no name assigned", this );
				}

				// Set form expando on contenteditable
				if ( this.hasAttribute( "contenteditable" ) ) {
					this.form = $( this ).closest( "form" )[ 0 ];
					this.name = name;
				}

				// Select only the first element for each name, and only those with rules specified
				if ( name in rulesCache || !validator.objectLength( $( this ).rules() ) ) {
					return false;
				}

				rulesCache[ name ] = true;
				return true;
			} );
		},

		clean: function( selector ) {
			return $( selector )[ 0 ];
		},

		errors: function() {
			var errorClass = this.settings.errorClass.split( " " ).join( "." );
			return $( this.settings.errorElement + "." + errorClass, this.errorContext );
		},

		resetInternals: function() {
			this.successList = [];
			this.errorList = [];
			this.errorMap = {};
			this.toShow = $( [] );
			this.toHide = $( [] );
		},

		reset: function() {
			this.resetInternals();
			this.currentElements = $( [] );
		},

		prepareForm: function() {
			this.reset();
			this.toHide = this.errors().add( this.containers );
		},

		prepareElement: function( element ) {
			this.reset();
			this.toHide = this.errorsFor( element );
		},

		elementValue: function( element ) {
			var $element = $( element ),
				type = element.type,
				val, idx;

			if ( type === "radio" || type === "checkbox" ) {
				return this.findByName( element.name ).filter( ":checked" ).val();
			} else if ( type === "number" && typeof element.validity !== "undefined" ) {
				return element.validity.badInput ? "NaN" : $element.val();
			}

			if ( element.hasAttribute( "contenteditable" ) ) {
				val = $element.text();
			} else {
				val = $element.val();
			}

			if ( type === "file" ) {

				// Modern browser (chrome & safari)
				if ( val.substr( 0, 12 ) === "C:\\fakepath\\" ) {
					return val.substr( 12 );
				}

				// Legacy browsers
				// Unix-based path
				idx = val.lastIndexOf( "/" );
				if ( idx >= 0 ) {
					return val.substr( idx + 1 );
				}

				// Windows-based path
				idx = val.lastIndexOf( "\\" );
				if ( idx >= 0 ) {
					return val.substr( idx + 1 );
				}

				// Just the file name
				return val;
			}

			if ( typeof val === "string" ) {
				return val.replace( /\r/g, "" );
			}
			return val;
		},

		check: function( element ) {
			element = this.validationTargetFor( this.clean( element ) );

			var rules = $( element ).rules(),
				rulesCount = $.map( rules, function( n, i ) {
					return i;
				} ).length,
				dependencyMismatch = false,
				val = this.elementValue( element ),
				result, method, rule, normalizer;

			// Prioritize the local normalizer defined for this element over the global one
			// if the former exists, otherwise user the global one in case it exists.
			if ( typeof rules.normalizer === "function" ) {
				normalizer = rules.normalizer;
			} else if (	typeof this.settings.normalizer === "function" ) {
				normalizer = this.settings.normalizer;
			}

			// If normalizer is defined, then call it to retreive the changed value instead
			// of using the real one.
			// Note that `this` in the normalizer is `element`.
			if ( normalizer ) {
				val = normalizer.call( element, val );

				if ( typeof val !== "string" ) {
					throw new TypeError( "The normalizer should return a string value." );
				}

				// Delete the normalizer from rules to avoid treating it as a pre-defined method.
				delete rules.normalizer;
			}

			for ( method in rules ) {
				rule = { method: method, parameters: rules[ method ] };
				try {
					result = $.validator.methods[ method ].call( this, val, element, rule.parameters );

					// If a method indicates that the field is optional and therefore valid,
					// don't mark it as valid when there are no other rules
					if ( result === "dependency-mismatch" && rulesCount === 1 ) {
						dependencyMismatch = true;
						continue;
					}
					dependencyMismatch = false;

					if ( result === "pending" ) {
						this.toHide = this.toHide.not( this.errorsFor( element ) );
						return;
					}

					if ( !result ) {
						this.formatAndAdd( element, rule );
						return false;
					}
				} catch ( e ) {
					if ( this.settings.debug && window.console ) {
						console.log( "Exception occurred when checking element " + element.id + ", check the '" + rule.method + "' method.", e );
					}
					if ( e instanceof TypeError ) {
						e.message += ".  Exception occurred when checking element " + element.id + ", check the '" + rule.method + "' method.";
					}

					throw e;
				}
			}
			if ( dependencyMismatch ) {
				return;
			}
			if ( this.objectLength( rules ) ) {
				this.successList.push( element );
			}
			return true;
		},

		// Return the custom message for the given element and validation method
		// specified in the element's HTML5 data attribute
		// return the generic message if present and no method specific message is present
		customDataMessage: function( element, method ) {
			return $( element ).data( "msg" + method.charAt( 0 ).toUpperCase() +
				method.substring( 1 ).toLowerCase() ) || $( element ).data( "msg" );
		},

		// Return the custom message for the given element name and validation method
		customMessage: function( name, method ) {
			var m = this.settings.messages[ name ];
			return m && ( m.constructor === String ? m : m[ method ] );
		},

		// Return the first defined argument, allowing empty strings
		findDefined: function() {
			for ( var i = 0; i < arguments.length; i++ ) {
				if ( arguments[ i ] !== undefined ) {
					return arguments[ i ];
				}
			}
			return undefined;
		},

		// The second parameter 'rule' used to be a string, and extended to an object literal
		// of the following form:
		// rule = {
		//     method: "method name",
		//     parameters: "the given method parameters"
		// }
		//
		// The old behavior still supported, kept to maintain backward compatibility with
		// old code, and will be removed in the next major release.
		defaultMessage: function( element, rule ) {
			if ( typeof rule === "string" ) {
				rule = { method: rule };
			}

			var message = this.findDefined(
					this.customMessage( element.name, rule.method ),
					this.customDataMessage( element, rule.method ),

					// 'title' is never undefined, so handle empty string as undefined
					!this.settings.ignoreTitle && element.title || undefined,
					$.validator.messages[ rule.method ],
					"<strong>Warning: No message defined for " + element.name + "</strong>"
				),
				theregex = /\$?\{(\d+)\}/g;
			if ( typeof message === "function" ) {
				message = message.call( this, rule.parameters, element );
			} else if ( theregex.test( message ) ) {
				message = $.validator.format( message.replace( theregex, "{$1}" ), rule.parameters );
			}

			return message;
		},

		formatAndAdd: function( element, rule ) {
			var message = this.defaultMessage( element, rule );

			this.errorList.push( {
				message: message,
				element: element,
				method: rule.method
			} );

			this.errorMap[ element.name ] = message;
			this.submitted[ element.name ] = message;
		},

		addWrapper: function( toToggle ) {
			if ( this.settings.wrapper ) {
				toToggle = toToggle.add( toToggle.parent( this.settings.wrapper ) );
			}
			return toToggle;
		},

		defaultShowErrors: function() {
			var i, elements, error;
			for ( i = 0; this.errorList[ i ]; i++ ) {
				error = this.errorList[ i ];
				if ( this.settings.highlight ) {
					this.settings.highlight.call( this, error.element, this.settings.errorClass, this.settings.validClass );
				}
				this.showLabel( error.element, error.message );
			}
			if ( this.errorList.length ) {
				this.toShow = this.toShow.add( this.containers );
			}
			if ( this.settings.success ) {
				for ( i = 0; this.successList[ i ]; i++ ) {
					this.showLabel( this.successList[ i ] );
				}
			}
			if ( this.settings.unhighlight ) {
				for ( i = 0, elements = this.validElements(); elements[ i ]; i++ ) {
					this.settings.unhighlight.call( this, elements[ i ], this.settings.errorClass, this.settings.validClass );
				}
			}
			this.toHide = this.toHide.not( this.toShow );
			this.hideErrors();
			this.addWrapper( this.toShow ).show();
		},

		validElements: function() {
			return this.currentElements.not( this.invalidElements() );
		},

		invalidElements: function() {
			return $( this.errorList ).map( function() {
				return this.element;
			} );
		},

		showLabel: function( element, message ) {
			var place, group, errorID, v,
				error = this.errorsFor( element ),
				elementID = this.idOrName( element ),
				describedBy = $( element ).attr( "aria-describedby" );

			if ( error.length ) {

				// Refresh error/success class
				error.removeClass( this.settings.validClass ).addClass( this.settings.errorClass );

				// Replace message on existing label
				error.html( message );
			} else {

				// Create error element
				error = $( "<" + this.settings.errorElement + ">" )
					.attr( "id", elementID + "-error" )
					.addClass( this.settings.errorClass )
					.html( message || "" );

				// Maintain reference to the element to be placed into the DOM
				place = error;
				if ( this.settings.wrapper ) {

					// Make sure the element is visible, even in IE
					// actually showing the wrapped element is handled elsewhere
					place = error.hide().show().wrap( "<" + this.settings.wrapper + "/>" ).parent();
				}
				if ( this.labelContainer.length ) {
					this.labelContainer.append( place );
				} else if ( this.settings.errorPlacement ) {
					this.settings.errorPlacement.call( this, place, $( element ) );
				} else {
					place.insertAfter( element );
				}

				// Link error back to the element
				if ( error.is( "label" ) ) {

					// If the error is a label, then associate using 'for'
					error.attr( "for", elementID );

					// If the element is not a child of an associated label, then it's necessary
					// to explicitly apply aria-describedby
				} else if ( error.parents( "label[for='" + this.escapeCssMeta( elementID ) + "']" ).length === 0 ) {
					errorID = error.attr( "id" );

					// Respect existing non-error aria-describedby
					if ( !describedBy ) {
						describedBy = errorID;
					} else if ( !describedBy.match( new RegExp( "\\b" + this.escapeCssMeta( errorID ) + "\\b" ) ) ) {

						// Add to end of list if not already present
						describedBy += " " + errorID;
					}
					$( element ).attr( "aria-describedby", describedBy );

					// If this element is grouped, then assign to all elements in the same group
					group = this.groups[ element.name ];
					if ( group ) {
						v = this;
						$.each( v.groups, function( name, testgroup ) {
							if ( testgroup === group ) {
								$( "[name='" + v.escapeCssMeta( name ) + "']", v.currentForm )
									.attr( "aria-describedby", error.attr( "id" ) );
							}
						} );
					}
				}
			}
			if ( !message && this.settings.success ) {
				error.text( "" );
				if ( typeof this.settings.success === "string" ) {
					error.addClass( this.settings.success );
				} else {
					this.settings.success( error, element );
				}
			}
			this.toShow = this.toShow.add( error );
		},

		errorsFor: function( element ) {
			var name = this.escapeCssMeta( this.idOrName( element ) ),
				describer = $( element ).attr( "aria-describedby" ),
				selector = "label[for='" + name + "'], label[for='" + name + "'] *";

			// 'aria-describedby' should directly reference the error element
			if ( describer ) {
				selector = selector + ", #" + this.escapeCssMeta( describer )
					.replace( /\s+/g, ", #" );
			}

			return this
				.errors()
				.filter( selector );
		},

		// See https://api.jquery.com/category/selectors/, for CSS
		// meta-characters that should be escaped in order to be used with JQuery
		// as a literal part of a name/id or any selector.
		escapeCssMeta: function( string ) {
			return string.replace( /([\\!"#$%&'()*+,./:;<=>?@\[\]^`{|}~])/g, "\\$1" );
		},

		idOrName: function( element ) {
			return this.groups[ element.name ] || ( this.checkable( element ) ? element.name : element.id || element.name );
		},

		validationTargetFor: function( element ) {

			// If radio/checkbox, validate first element in group instead
			if ( this.checkable( element ) ) {
				element = this.findByName( element.name );
			}

			// Always apply ignore filter
			return $( element ).not( this.settings.ignore )[ 0 ];
		},

		checkable: function( element ) {
			return ( /radio|checkbox/i ).test( element.type );
		},

		findByName: function( name ) {
			return $( this.currentForm ).find( "[name='" + this.escapeCssMeta( name ) + "']" );
		},

		getLength: function( value, element ) {
			switch ( element.nodeName.toLowerCase() ) {
			case "select":
				return $( "option:selected", element ).length;
			case "input":
				if ( this.checkable( element ) ) {
					return this.findByName( element.name ).filter( ":checked" ).length;
				}
			}
			return value.length;
		},

		depend: function( param, element ) {
			return this.dependTypes[ typeof param ] ? this.dependTypes[ typeof param ]( param, element ) : true;
		},

		dependTypes: {
			"boolean": function( param ) {
				return param;
			},
			"string": function( param, element ) {
				return !!$( param, element.form ).length;
			},
			"function": function( param, element ) {
				return param( element );
			}
		},

		optional: function( element ) {
			var val = this.elementValue( element );
			return !$.validator.methods.required.call( this, val, element ) && "dependency-mismatch";
		},

		startRequest: function( element ) {
			if ( !this.pending[ element.name ] ) {
				this.pendingRequest++;
				$( element ).addClass( this.settings.pendingClass );
				this.pending[ element.name ] = true;
			}
		},

		stopRequest: function( element, valid ) {
			this.pendingRequest--;

			// Sometimes synchronization fails, make sure pendingRequest is never < 0
			if ( this.pendingRequest < 0 ) {
				this.pendingRequest = 0;
			}
			delete this.pending[ element.name ];
			$( element ).removeClass( this.settings.pendingClass );
			if ( valid && this.pendingRequest === 0 && this.formSubmitted && this.form() ) {
				$( this.currentForm ).submit();

				// Remove the hidden input that was used as a replacement for the
				// missing submit button. The hidden input is added by `handle()`
				// to ensure that the value of the used submit button is passed on
				// for scripted submits triggered by this method
				if ( this.submitButton ) {
					$( "input:hidden[name='" + this.submitButton.name + "']", this.currentForm ).remove();
				}

				this.formSubmitted = false;
			} else if ( !valid && this.pendingRequest === 0 && this.formSubmitted ) {
				$( this.currentForm ).triggerHandler( "invalid-form", [ this ] );
				this.formSubmitted = false;
			}
		},

		previousValue: function( element, method ) {
			method = typeof method === "string" && method || "remote";

			return $.data( element, "previousValue" ) || $.data( element, "previousValue", {
				old: null,
				valid: true,
				message: this.defaultMessage( element, { method: method } )
			} );
		},

		// Cleans up all forms and elements, removes validator-specific events
		destroy: function() {
			this.resetForm();

			$( this.currentForm )
				.off( ".validate" )
				.removeData( "validator" )
				.find( ".validate-equalTo-blur" )
					.off( ".validate-equalTo" )
					.removeClass( "validate-equalTo-blur" );
		}

	},

	classRuleSettings: {
		required: { required: true },
		email: { email: true },
		url: { url: true },
		date: { date: true },
		dateISO: { dateISO: true },
		number: { number: true },
		digits: { digits: true },
		creditcard: { creditcard: true }
	},

	addClassRules: function( className, rules ) {
		if ( className.constructor === String ) {
			this.classRuleSettings[ className ] = rules;
		} else {
			$.extend( this.classRuleSettings, className );
		}
	},

	classRules: function( element ) {
		var rules = {},
			classes = $( element ).attr( "class" );

		if ( classes ) {
			$.each( classes.split( " " ), function() {
				if ( this in $.validator.classRuleSettings ) {
					$.extend( rules, $.validator.classRuleSettings[ this ] );
				}
			} );
		}
		return rules;
	},

	normalizeAttributeRule: function( rules, type, method, value ) {

		// Convert the value to a number for number inputs, and for text for backwards compability
		// allows type="date" and others to be compared as strings
		if ( /min|max|step/.test( method ) && ( type === null || /number|range|text/.test( type ) ) ) {
			value = Number( value );

			// Support Opera Mini, which returns NaN for undefined minlength
			if ( isNaN( value ) ) {
				value = undefined;
			}
		}

		if ( value || value === 0 ) {
			rules[ method ] = value;
		} else if ( type === method && type !== "range" ) {

			// Exception: the jquery validate 'range' method
			// does not test for the html5 'range' type
			rules[ method ] = true;
		}
	},

	attributeRules: function( element ) {
		var rules = {},
			$element = $( element ),
			type = element.getAttribute( "type" ),
			method, value;

		for ( method in $.validator.methods ) {

			// Support for <input required> in both html5 and older browsers
			if ( method === "required" ) {
				value = element.getAttribute( method );

				// Some browsers return an empty string for the required attribute
				// and non-HTML5 browsers might have required="" markup
				if ( value === "" ) {
					value = true;
				}

				// Force non-HTML5 browsers to return bool
				value = !!value;
			} else {
				value = $element.attr( method );
			}

			this.normalizeAttributeRule( rules, type, method, value );
		}

		// 'maxlength' may be returned as -1, 2147483647 ( IE ) and 524288 ( safari ) for text inputs
		if ( rules.maxlength && /-1|2147483647|524288/.test( rules.maxlength ) ) {
			delete rules.maxlength;
		}

		return rules;
	},

	dataRules: function( element ) {
		var rules = {},
			$element = $( element ),
			type = element.getAttribute( "type" ),
			method, value;

		for ( method in $.validator.methods ) {
			value = $element.data( "rule" + method.charAt( 0 ).toUpperCase() + method.substring( 1 ).toLowerCase() );
			this.normalizeAttributeRule( rules, type, method, value );
		}
		return rules;
	},

	staticRules: function( element ) {
		var rules = {},
			validator = $.data( element.form, "validator" );

		if ( validator.settings.rules ) {
			rules = $.validator.normalizeRule( validator.settings.rules[ element.name ] ) || {};
		}
		return rules;
	},

	normalizeRules: function( rules, element ) {

		// Handle dependency check
		$.each( rules, function( prop, val ) {

			// Ignore rule when param is explicitly false, eg. required:false
			if ( val === false ) {
				delete rules[ prop ];
				return;
			}
			if ( val.param || val.depends ) {
				var keepRule = true;
				switch ( typeof val.depends ) {
				case "string":
					keepRule = !!$( val.depends, element.form ).length;
					break;
				case "function":
					keepRule = val.depends.call( element, element );
					break;
				}
				if ( keepRule ) {
					rules[ prop ] = val.param !== undefined ? val.param : true;
				} else {
					$.data( element.form, "validator" ).resetElements( $( element ) );
					delete rules[ prop ];
				}
			}
		} );

		// Evaluate parameters
		$.each( rules, function( rule, parameter ) {
			rules[ rule ] = $.isFunction( parameter ) && rule !== "normalizer" ? parameter( element ) : parameter;
		} );

		// Clean number parameters
		$.each( [ "minlength", "maxlength" ], function() {
			if ( rules[ this ] ) {
				rules[ this ] = Number( rules[ this ] );
			}
		} );
		$.each( [ "rangelength", "range" ], function() {
			var parts;
			if ( rules[ this ] ) {
				if ( $.isArray( rules[ this ] ) ) {
					rules[ this ] = [ Number( rules[ this ][ 0 ] ), Number( rules[ this ][ 1 ] ) ];
				} else if ( typeof rules[ this ] === "string" ) {
					parts = rules[ this ].replace( /[\[\]]/g, "" ).split( /[\s,]+/ );
					rules[ this ] = [ Number( parts[ 0 ] ), Number( parts[ 1 ] ) ];
				}
			}
		} );

		if ( $.validator.autoCreateRanges ) {

			// Auto-create ranges
			if ( rules.min != null && rules.max != null ) {
				rules.range = [ rules.min, rules.max ];
				delete rules.min;
				delete rules.max;
			}
			if ( rules.minlength != null && rules.maxlength != null ) {
				rules.rangelength = [ rules.minlength, rules.maxlength ];
				delete rules.minlength;
				delete rules.maxlength;
			}
		}

		return rules;
	},

	// Converts a simple string to a {string: true} rule, e.g., "required" to {required:true}
	normalizeRule: function( data ) {
		if ( typeof data === "string" ) {
			var transformed = {};
			$.each( data.split( /\s/ ), function() {
				transformed[ this ] = true;
			} );
			data = transformed;
		}
		return data;
	},

	// https://jqueryvalidation.org/jQuery.validator.addMethod/
	addMethod: function( name, method, message ) {
		$.validator.methods[ name ] = method;
		$.validator.messages[ name ] = message !== undefined ? message : $.validator.messages[ name ];
		if ( method.length < 3 ) {
			$.validator.addClassRules( name, $.validator.normalizeRule( name ) );
		}
	},

	// https://jqueryvalidation.org/jQuery.validator.methods/
	methods: {

		// https://jqueryvalidation.org/required-method/
		required: function( value, element, param ) {

			// Check if dependency is met
			if ( !this.depend( param, element ) ) {
				return "dependency-mismatch";
			}
			if ( element.nodeName.toLowerCase() === "select" ) {

				// Could be an array for select-multiple or a string, both are fine this way
				var val = $( element ).val();
				return val && val.length > 0;
			}
			if ( this.checkable( element ) ) {
				return this.getLength( value, element ) > 0;
			}
			return value.length > 0;
		},

		// https://jqueryvalidation.org/email-method/
		email: function( value, element ) {

			// From https://html.spec.whatwg.org/multipage/forms.html#valid-e-mail-address
			// Retrieved 2014-01-14
			// If you have a problem with this implementation, report a bug against the above spec
			// Or use custom methods to implement your own email validation
			return this.optional( element ) || /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test( value );
		},

		// https://jqueryvalidation.org/url-method/
		url: function( value, element ) {

			// Copyright (c) 2010-2013 Diego Perini, MIT licensed
			// https://gist.github.com/dperini/729294
			// see also https://mathiasbynens.be/demo/url-regex
			// modified to allow protocol-relative URLs
			return this.optional( element ) || /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test( value );
		},

		// https://jqueryvalidation.org/date-method/
		date: function( value, element ) {
			return this.optional( element ) || !/Invalid|NaN/.test( new Date( value ).toString() );
		},

		// https://jqueryvalidation.org/dateISO-method/
		dateISO: function( value, element ) {
			return this.optional( element ) || /^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/.test( value );
		},

		// https://jqueryvalidation.org/number-method/
		number: function( value, element ) {
			return this.optional( element ) || /^(?:-?\d+|-?\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/.test( value );
		},

		// https://jqueryvalidation.org/digits-method/
		digits: function( value, element ) {
			return this.optional( element ) || /^\d+$/.test( value );
		},

		// https://jqueryvalidation.org/minlength-method/
		minlength: function( value, element, param ) {
			var length = $.isArray( value ) ? value.length : this.getLength( value, element );
			return this.optional( element ) || length >= param;
		},

		// https://jqueryvalidation.org/maxlength-method/
		maxlength: function( value, element, param ) {
			var length = $.isArray( value ) ? value.length : this.getLength( value, element );
			return this.optional( element ) || length <= param;
		},

		// https://jqueryvalidation.org/rangelength-method/
		rangelength: function( value, element, param ) {
			var length = $.isArray( value ) ? value.length : this.getLength( value, element );
			return this.optional( element ) || ( length >= param[ 0 ] && length <= param[ 1 ] );
		},

		// https://jqueryvalidation.org/min-method/
		min: function( value, element, param ) {
			return this.optional( element ) || value >= param;
		},

		// https://jqueryvalidation.org/max-method/
		max: function( value, element, param ) {
			return this.optional( element ) || value <= param;
		},

		// https://jqueryvalidation.org/range-method/
		range: function( value, element, param ) {
			return this.optional( element ) || ( value >= param[ 0 ] && value <= param[ 1 ] );
		},

		// https://jqueryvalidation.org/step-method/
		step: function( value, element, param ) {
			var type = $( element ).attr( "type" ),
				errorMessage = "Step attribute on input type " + type + " is not supported.",
				supportedTypes = [ "text", "number", "range" ],
				re = new RegExp( "\\b" + type + "\\b" ),
				notSupported = type && !re.test( supportedTypes.join() ),
				decimalPlaces = function( num ) {
					var match = ( "" + num ).match( /(?:\.(\d+))?$/ );
					if ( !match ) {
						return 0;
					}

					// Number of digits right of decimal point.
					return match[ 1 ] ? match[ 1 ].length : 0;
				},
				toInt = function( num ) {
					return Math.round( num * Math.pow( 10, decimals ) );
				},
				valid = true,
				decimals;

			// Works only for text, number and range input types
			// TODO find a way to support input types date, datetime, datetime-local, month, time and week
			if ( notSupported ) {
				throw new Error( errorMessage );
			}

			decimals = decimalPlaces( param );

			// Value can't have too many decimals
			if ( decimalPlaces( value ) > decimals || toInt( value ) % toInt( param ) !== 0 ) {
				valid = false;
			}

			return this.optional( element ) || valid;
		},

		// https://jqueryvalidation.org/equalTo-method/
		equalTo: function( value, element, param ) {

			// Bind to the blur event of the target in order to revalidate whenever the target field is updated
			var target = $( param );
			if ( this.settings.onfocusout && target.not( ".validate-equalTo-blur" ).length ) {
				target.addClass( "validate-equalTo-blur" ).on( "blur.validate-equalTo", function() {
					$( element ).valid();
				} );
			}
			return value === target.val();
		},

		// https://jqueryvalidation.org/remote-method/
		remote: function( value, element, param, method ) {
			if ( this.optional( element ) ) {
				return "dependency-mismatch";
			}

			method = typeof method === "string" && method || "remote";

			var previous = this.previousValue( element, method ),
				validator, data, optionDataString;

			if ( !this.settings.messages[ element.name ] ) {
				this.settings.messages[ element.name ] = {};
			}
			previous.originalMessage = previous.originalMessage || this.settings.messages[ element.name ][ method ];
			this.settings.messages[ element.name ][ method ] = previous.message;

			param = typeof param === "string" && { url: param } || param;
			optionDataString = $.param( $.extend( { data: value }, param.data ) );
			if ( previous.old === optionDataString ) {
				return previous.valid;
			}

			previous.old = optionDataString;
			validator = this;
			this.startRequest( element );
			data = {};
			data[ element.name ] = value;
			$.ajax( $.extend( true, {
				mode: "abort",
				port: "validate" + element.name,
				dataType: "json",
				data: data,
				context: validator.currentForm,
				success: function( response ) {
					var valid = response === true || response === "true",
						errors, message, submitted;

					validator.settings.messages[ element.name ][ method ] = previous.originalMessage;
					if ( valid ) {
						submitted = validator.formSubmitted;
						validator.resetInternals();
						validator.toHide = validator.errorsFor( element );
						validator.formSubmitted = submitted;
						validator.successList.push( element );
						validator.invalid[ element.name ] = false;
						validator.showErrors();
					} else {
						errors = {};
						message = response || validator.defaultMessage( element, { method: method, parameters: value } );
						errors[ element.name ] = previous.message = message;
						validator.invalid[ element.name ] = true;
						validator.showErrors( errors );
					}
					previous.valid = valid;
					validator.stopRequest( element, valid );
				}
			}, param ) );
			return "pending";
		}
	}

} );

// Ajax mode: abort
// usage: $.ajax({ mode: "abort"[, port: "uniqueport"]});
// if mode:"abort" is used, the previous request on that port (port can be undefined) is aborted via XMLHttpRequest.abort()

var pendingRequests = {},
	ajax;

// Use a prefilter if available (1.5+)
if ( $.ajaxPrefilter ) {
	$.ajaxPrefilter( function( settings, _, xhr ) {
		var port = settings.port;
		if ( settings.mode === "abort" ) {
			if ( pendingRequests[ port ] ) {
				pendingRequests[ port ].abort();
			}
			pendingRequests[ port ] = xhr;
		}
	} );
} else {

	// Proxy ajax
	ajax = $.ajax;
	$.ajax = function( settings ) {
		var mode = ( "mode" in settings ? settings : $.ajaxSettings ).mode,
			port = ( "port" in settings ? settings : $.ajaxSettings ).port;
		if ( mode === "abort" ) {
			if ( pendingRequests[ port ] ) {
				pendingRequests[ port ].abort();
			}
			pendingRequests[ port ] = ajax.apply( this, arguments );
			return pendingRequests[ port ];
		}
		return ajax.apply( this, arguments );
	};
}
return $;
}));
/*
 *  jquery-fontsampler - v0.0.9
 *  A jQuery plugin for displaying, manipulating and testing webfont type samples
 *  https://github.com/kontur/jquery-fontsampler
 *
 *  Made by Johannes Neumeier
 *  Under Apache 2.0 License
 */
/**
 * Copyright 2016-2017 Johannes Neumeier
 *
 * Licensed under the Apache License, Version 2.0 (the "License" );
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;( function( $, window, document, undefined ) {

    "use strict";

    // undefined is used here as the undefined global variable in ECMAScript 3 is
    // mutable ( ie. it can be changed by someone else ). undefined isn't really being
    // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
    // can no longer be modified.

    // window and document are passed through as local variables rather than global
    // as this ( slightly ) quickens the resolution process and can be more efficiently
    // minified ( especially when both are regularly referenced in your plugin ).

    // Create the defaults once
    var pluginName = "fontSampler",
        defaults = {
            fontFiles: null,
            multiLine: true,
            fontSize: "auto",
            letterSpacing: "auto",
            leading: "auto",
            editable: true,
            familyName: null
        },
        fontFamily = "";

    // The actual plugin constructor
    // These are the PUBLIC methods of the plugin
    function Plugin ( element, options ) {
        this.element = element;

        // jQuery has an extend method which merges the contents of two or
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        this.settings = $.extend( {}, defaults, options );
        this.otfeatures = [];
        this._defaults = defaults;
        this._name = pluginName;
        this.init();

        // public methods
        this.changeSize = function( args ) {
            this.setSize( args[ 1 ] );
        };

        this.changeFont = function( args ) {
            this.settings.fontFiles = args[ 1 ];
            if ( typeof args[ 2 ] !== "undefined" ) {
                this.settings.familyName = args[ 2 ];
            }
            fontFamily = declareFontFace( this.settings.fontFiles, this.settings.familyName );
            this.setFont( fontFamily );
        };

        this.changeLetterSpacing = function( args ) {
            this.setLetterSpacing( args[ 1 ] );
        };

        this.changeLeading = function( args ) {
            this.setLeading( args[ 1 ] );
        };

        this.enableOTFeature = function( args ) {
            if ( this.otfeatures.indexOf( args[ 1 ] === -1 ) ) {
                this.otfeatures.push( args[ 1 ] );
                this.updateOTFeatures();
            }
        };

        this.disableOTFeature = function( args ) {
            var index = this.otfeatures.indexOf( args[ 1 ] );
            if ( index > -1 ) {
                this.otfeatures.splice( index, 1 );
                this.updateOTFeatures();
            }
        };

        this.changeLang = function( args ) {
            this.setLang( args[ 1 ] );
        };

        this.changeEditable = function( args ) {
            this.setEditable( args[ 1 ] );
        };
    }

    // Avoid Plugin.prototype conflicts
    $.extend( Plugin.prototype, {
        init: function() {
            var dataFontFiles = $( this.element ).data( "font-files" );
            if ( typeof dataFontFiles === "object" ) {

                // merge in data-font-files options; these overwrite javascript passed in options
                this.settings.fontFiles = $.extend( {}, this.settings.fontFiles, dataFontFiles );
            }
            fontFamily = declareFontFace( this.settings.fontFiles, this.settings.familyName );
            this.setupUI();
            this.setFont( fontFamily );
            this.setSize( this.settings.fontSize );
            this.setLetterSpacing( this.settings.letterSpacing );
            this.setLeading( this.settings.leading );
            this.setEditable( this.settings.editable );
            this.updateOTFeatures();
        },
        setupUI: function() {
            var that = this;
            $( this.element ).attr( "contenteditable", "true" );

            $( this.element ).on( "keypress keyup change paste", function( event ) {
                var r = that.onUpdate( event, that );
                if ( !r ) {
                    event.preventDefault();
                }
                return r;
            } );
        },

        // internal event listeners
        onUpdate: function( event, that ) {
            if ( that.settings.multiLine === false ) {
                if ( event.type === "keypress" ) {

                    // for keypress events immediately block pressing enter for line break
                    if ( event.keyCode === 13 ) {
                        return false;
                    }
                } else {

                    // allow other events, filter any html with $.text() and replace linebreaks
                    // TODO fix paste event from setting the caret to the front of the non-input
                    // non-textarea
                    var text = $( that.element ).text().replace( "/\n/gi", "" );
                    $( that.element ).html( text );
                }
            }
            return true;
        },

        // manipulation methods mirrored from public mthods
        setFont: function() {
            $( this.element ).css( "fontFamily", fontFamily );
            $( this.element ).trigger( {
                type: "changedFamily",
                family: fontFamily
            } );
        },
        setSize: function( size ) {
            $( this.element ).css( "font-size", size );
        },
        setLetterSpacing: function( spacing ) {
            var leading = $( this.element ).css( "line-height" );
            $( this.element ).css( {
                "letter-spacing": spacing,
                "line-height": leading
            } );
        },
        setLeading: function( leading ) {
            $( this.element ).css( "line-height", leading );
        },
        setEditable: function( value ) {
            value = !!value; // force boolean
            if ( value ) {
                $( this.element ).attr( "contenteditable", true );
            } else {
                $( this.element ).removeAttr( "contenteditable" );
            }
        },
        updateOTFeatures: function() {
            var features, ligatures = [], ligatureVariant, ligaValues;

            // css variant-ligature keyword - value tuples
            ligaValues = {
                liga: [ "no-common-ligatures", "common-ligatures" ],
                dlig: [ "no-discretionary-ligatures", "discrectionary-ligatures" ],
                hlig: [ "no-historical-ligatures", "historical-ligatures" ],
                calt: [ "no-contextual", "contextual" ]
            };

            // font-feature-settings
            if ( this.otfeatures.length === 0 ) {
                features = "inherit";
            } else {
                features = "'";
                features = features.concat( this.otfeatures.join( "','" ) );
                features = features.concat( "'" );
            }

            // partial TODO leverage more high level syntax options ala font-variant-xxx for
            // features that have it available
            $( this.element ).css( {
                "-webkit-font-feature-settings": features,
                "-moz-font-feature-settings": features,
                "-ms-font-feature-settings": features,
                "font-feature-settings": features
            } );

            // font-variant-ligatures
            // note: iteration order crucial for css shorthand to work
            var ligaKeyWords = [ "liga", "dlig", "hlig", "calt" ];
            for ( var l = 0; l < ligaKeyWords.length; l++ ) {
                var keyword = ligaKeyWords[ l ];
                if ( this.otfeatures.indexOf( keyword ) > -1 ) {
                    ligatures.push( ligaValues[ keyword ][ 1 ] );
                } else {
                    ligatures.push( ligaValues[ keyword ][ 0 ] );
                }
            }
            ligatureVariant = ligatures.join( " " );
            $( this.element ).css( {
                "-webkit-font-variant-ligatures": ligatureVariant,
                "-moz-font-variant-ligatures": ligatureVariant,
                "-ms-font-variant-ligatures": ligatureVariant,
                "font-variant-ligatures": ligatureVariant
            } );
        },
        setLang: function( lang ) {

            // TODO could check against available list of valid language attribute values
            if ( lang.length !== 2 ) {
                throw "fontSampler.changeLang(): Language string must be 2 characters HTML lang " +
                    " attribute value";
            }
            $( this.element ).attr( "lang", lang );
        }
    } );

    // append a new style @font-face declaration
    // TODO format check
    // TODO track and check existing declarations
    function declareFontFace ( files, familyName ) {

        // when no familyName is supplied generate random string
        if ( null === familyName ) {

            // generate a random string font-family name that is specific to this file
            familyName = Math.random().toString( 36 ).replace( /[^a-z]+/g, "" ).substr( 0, 20 );
        }

        // if this family name was already declared don't redeclare
        if ( $( "[data-generated-by][data-family-name='" + familyName + "']" ).length !== 0 ) {
            return familyName;
        }

        var newStyle = document.createElement( "style" );
        newStyle.setAttribute( "data-generated-by", "fontsampler" );
        newStyle.setAttribute( "data-family-name", familyName );
        newStyle.appendChild( document.createTextNode( generateFontFace( familyName, files ) ) );
        document.head.appendChild( newStyle );
        return familyName;
    }

    /*
     * Helper that generates a CSS font face declaration based on font name and passed in files
     */
    function generateFontFace ( name, files, weight, style ) {
        if ( typeof name === "undefined" || typeof files === "undefined" || !files ) {
            return "";
        }

        var declaration = "";

        if ( typeof weight === "undefined" ) {
            weight = "normal";
        }
        if ( typeof style === "undefined" ) {
            style = "normal";
        }

        declaration = declaration.concat( "\n" );
        declaration = declaration.concat( "@font-face {\n" );
        declaration = declaration.concat( "font-family: '" + name + "';\n" );

        var formats = [ "eot", "woff2", "woff", "ttf", "svg" ];
        var outputIndex = 0;
        var suppliedFormats = Object.keys( files ).length;

        for ( var f = 0; f < formats.length; f++ ) {
            var format = formats[ f ];
            if ( format in files ) {
                if ( format === "eot" ) {
                    declaration = declaration.concat( "src: url( '" + files.eot + "' );\n" );
                    declaration = declaration.concat( "src: url( '" + files.eot +
                        "?#iefix' ) format( 'embedded-opentype' )" );
                    outputIndex++;
                } else {
                    if ( outputIndex === 0 ) {
                        declaration = declaration.concat( "src: " );
                    }
                    if ( format === "ttf" ) {
                        declaration = declaration.concat( "url( '" + files.ttf +
                            "' ) format( 'truetype' )" );
                    } else if ( format === "svg" ) {
                        declaration = declaration.concat( "url( '" + files.svg + "#" + name +
                            "' ) format( 'svg' )" );
                    } else {
                        declaration = declaration.concat( "url( '" + files[ format ] +
                            "' ) format( '" + format + "' )" );
                    }
                    outputIndex++;
                }
                if ( outputIndex < suppliedFormats ) {
                    declaration = declaration.concat( ",\n" );
                } else {
                    declaration = declaration.concat( ";\n" );
                }
            }
        }

        declaration = declaration.concat( "font-weight: " + weight + ";\n" );
        declaration = declaration.concat( "font-style: " + style + ";\n" );
        declaration = declaration.concat( "}\n" );

        return declaration;
    }

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[ pluginName ] = function( options ) {
        var args = arguments;
        return this.each( function() {
            if ( !$.data( this, "plugin_" + pluginName ) ) {
                $.data( this, "plugin_" + pluginName, new Plugin( this, options ) );
            } else if ( $.data( this, "plugin_" + pluginName ) &&
                $( this ).data( "plugin_" + pluginName )[ options ] !== undefined ) {
                return $( this ).data( "plugin_" + pluginName )[ options ]( args );
            } else {
                console.log( "fontSampler non existing method called" );
            }
        } );
    };

} )( jQuery, window, document );

fs.define("fontsampler", function(){});

/**
 * All the jquery components dealing with manipulating the
 * various admin side interactions
 */
fs.define('admin/js/admin-ui',['jquery', 'rangeslider', 'selectric', 'validate', 'fontsampler'], 
    function ($, r, s, v, c, fs) {

    $.validate = v;
    $.fontSampler = fs;

    function main(fontupload, specimentools) {

        // enable frontend side form validation
        $.validate({
            form: ".fontsampler-validate",
            modules: 'file',
        });


        $("body").on("change keyup blur", "input.fontsampler-input-warning", function () {
            var $this = $(this);

            if ($this.val() !== "") {
                $this.removeClass("fontsampler-input-warning");
            }
        });

        // todo limit amount of select options to the number of font sets / don't allow duplicates on frontend side
        // duplicate inputs are going to be filtered out on db entry
        $("#fontsampler-admin").on("click", ".fontsampler-fontset-remove", function (e) {
            e.preventDefault();
            if ($("#fontsampler-fontset-list li").length > 1) {
                $(this).parent("li").remove();

                // the the row with the current default font gets delete, move the default to the first font
                if ($("#fontsampler-fontset-list input[name=initial_font]:checked").length === 0) {
                    $("#fontsampler-fontset-list li:first input[name=initial_font]").attr("checked", "checked");
                }
            } else {
                console.log("Nope. Can't delete last picker");
            }
            $("#fontsampler-fontset-list").sortable("refresh");
            updateFontsOrder();
            updateInlineFontIndexes();
        });


        /**
         * Adding a new fontsampler select box with prefilled existing fonts
         */
        $("#fontsampler-edit-sample").on("click", ".fontsampler-fontset-add", function (e) {
            e.preventDefault();
            var $clone = $("#fontsampler-admin-fontpicker-placeholder").clone();
            $clone.find("input[name=initial_font]").removeAttr("checked").val("0");
            $clone.find("span.fontsampler-initial-font").removeClass('selected');
            $clone.appendTo("#fontsampler-fontset-list");

            $("#fontsampler-fontset-list li:last option[selected='selected']").removeAttr('selected');
            $("#fontsampler-fontset-list").sortable("refresh");

            updateFontsOrder();
        });


        /**
         * On updating the select font dropdown in the fontsampler font section, update the input that send this font's ID
         * if it is selected as the default font
         */
        $("#fontsampler-fontset-list").on("change", "select[name='font_id[]']", function () {
            $(this).siblings(".fontsampler-initial-font-selection").find("input[name=initial_font]").val($(this).val());
        });


        $("#fontsampler-fontset-list").on("change", "input[name=initial_font]", function () {
            $("#fontsampler-fontset-list span.fontsampler-initial-font").removeClass("selected");
            $("#fontsampler-fontset-list input[name=initial_font]:checked").siblings("span.fontsampler-initial-font").addClass("selected");
        });


        $("#fontsampler-admin").on("change", "#fontsampler-fontset-list select", function () {
            $(this).siblings("input[name=initial_font]").val($(this).val());
            updateFontsOrder();
        });


        // allow sorting multiple fonts in a fontsampler
        $("#fontsampler-fontset-list").sortable({
            handle: ".fontsampler-fontset-sort-handle",
            stop: updateFontsOrder
        });


        /**
         * Creating a new inline font upload form inside the form for creating a fontsampler
         */
        $(".fontsampler-fontset-create-inline").on("click", function () {
            var $clone = $("#fontsampler-fontset-inline-placeholder").clone().removeAttr("id"),
                $fontsList = $("#fontsampler-fontset-list");

            // clear any font name from previous row
            $clone.find("input[name='fontname[]']").val("")

            $fontsList.append($clone);
            updateInlineFontIndexes();
            updateFontsOrder();

            fontupload(specimentools);

            return false;
        });

        // trigger once, for pages where the fontupload is not ajax but DOM elements are ready on load
        fontupload(specimentools);


        /**
         * Update the input field fonts_order with a comma separated list of fonts, in the order they are sorted
         * Note: newly created inline fontsets are marked in this list as "inline_ID"
         */
        function updateFontsOrder() {
            var order = $("#fontsampler-fontset-list").find("select[name='font_id[]'], input.inline_font_id").map(function () {
                return $(this).val();
            }).get().join();
            $("input[name=fonts_order]").val(order);
        }


        /**
         * Update the indexes of all file upload inputs of any inline from upload forms, so that they start with 0 index
         * and have no gaps in the name attribute
         */
        function updateInlineFontIndexes() {
            var $fontsList = $("#fontsampler-fontset-list"),
                $placeholder = $("#fontsampler-fontset-inline-placeholder");

            // for the actual font list, go through all now created fontsets and number all their containing
            // file inputs them 0 index based
            $fontsList.find(".fontsampler-fontset-inline").each(function (index, elem) {
                var $this = $(this);

                // set the entire set of file inputs with woff2, woff, etc to the right index of this inserted placeholder
                $this.find("input[type=file]").each(function () {
                    var currentName = $(this).attr("name");
                    $(this).attr("name", $(this).attr("name").substring(0, currentName.lastIndexOf("_") + 1) + index);
                });

                // to each of those fontsets add 'inline_x' to their hidden inline_font_id
                // this is used in updateFontsOrder to save a placeholder position of that particular font for processing
                $this.find("input.inline_font_id").each(function () {
                    $(this).val('inline_' + index);
                });

                // update the radio for setting this font as default for this fontsampler to include a placeholder value
                // so it can be replaced after upload
                $this.find("input[name=initial_font]").val('inline_' + index);
            });

            // in the actual placeholder form, remove the index from the file input, so it doesn't get sent along (at least
            // not as woff_0 etc, which would overwrite the first uploaded fontset's files as empty
            $placeholder.find("input[type=file]").each(function () {
                var currentName = $(this).attr("name");
                $(this).attr("name", $(this).attr("name").substring(0, currentName.lastIndexOf("_") + 1));
            });
        }


        // setting sliders
        $('#fontsampler-admin input[type="range"]').rangeslider({
            // Feature detection the default is `true`.
            // Set this to `false` if you want to use
            // the polyfill also in Browsers which support
            // the native <input type="range"> element.
            polyfill: false,
            onSlide: function () {
                var $input = this.$element.closest("label").find(".current-value"),
                    before = $input.val();

                $input.val(this.$element.val());
                if (!checkSliderRange(this.$element)) {
                    $input.val(before);
                    this.$element.val(before).change();
                }
            }
        });

        $("#fontsampler-admin input.current-value").on("keyup", function () {
            var $sliderInput = $(this).closest("label").find("input[name='" + $(this).data("name") + "']"),
                min = $sliderInput.attr("min"),
                max = $sliderInput.attr("max"),
                intval = parseInt($(this).val()),
                constrainedValue = Math.min(Math.max(intval, min), max),
                before = $(this).val();

            // prevent blocking the type input while also updating it should the value have been beyond the limits
            if (intval !== constrainedValue && !isNaN(constrainedValue)) {
                $(this).val(constrainedValue);
            }

            // update only when the keyup resulted in a different number than what is currently displayed
            // this prevents resetting the cursor to the end when only an arrow is pressed to change caret position
            if (constrainedValue !== parseInt($sliderInput.val())) {
                if (checkSliderRange($sliderInput)) {
                    $sliderInput.val(constrainedValue).change();
                    $(this).val(before);
                }
            }
        });

        /**
         * Function to help restrain the 3-part sliders to not exceed their bounds
         * @param $elem
         * @returns {boolean}
         */
        function checkSliderRange($elem) {
            var group = $elem.data("group");

            // only apply to the three 3-part sliders:
            if (["fontsize", "lineheight", "letterspacing"].indexOf(group) === -1) {
                return true;
            }

            var min_use_default = parseInt($("input[name='" + group + "_min_use_default']:checked").val()) === 1,
                min_default = parseInt($("input[name='" + group + "_min_use_default'][value='1']").siblings(".settings-description").find(".fontsampler-default-value").html()),
                min_slider = parseInt($("input[name='"+ group+ "_min']").val()),
                min = min_use_default ? min_default : min_slider,

                ini_use_default = parseInt($("input[name='" + group + "_initial_use_default']:checked").val()) === 1,
                ini_default = parseInt($("input[name='" + group + "_initial_use_default'][value='1']").siblings(".settings-description").find(".fontsampler-default-value").html()),
                ini_slider = parseInt($("input[name='"+ group+ "_initial']").val()),
                ini = ini_use_default ? ini_default : ini_slider,

                max_use_default = parseInt($("input[name='" + group + "_max_use_default']:checked").val()) === 1,
                max_default = parseInt($("input[name='" + group + "_max_use_default'][value='1']").siblings(".settings-description").find(".fontsampler-default-value").html()),
                max_slider = parseInt($("input[name='"+ group+ "_max']").val()),
                max = max_use_default ? max_default : max_slider;

            if (max <= min || min > ini || max < ini) {
                return false;
            }

            return true;
        }




        // interface
        $("#fontsampler-admin .form-settings input[type=range]").on('change, input', function () {
            var $display = $(this).closest('label').find('code.current-value');
            val = $(this).val(),
                unit = $(this).data('unit');

            $display.html(val);
        });


        $(".fontsampler-preview").fontSampler();


        //Colour picker
        $('.color-picker').wpColorPicker({
            color: false,
            mode: 'hsl',
            controls: {
                horiz: 's', // horizontal defaults to saturation
                vert: 'l', // vertical defaults to lightness
                strip: 'h' // right strip defaults to hue
            },
            hide: true, // hide the color picker by default
            border: false, // draw a border around the collection of UI elements
            target: false, // a DOM element / jQuery selector that the element will be appended within. Only used when called on an input.
            width: 200, // the width of the collection of UI elements
            palettes: true // show a palette of basic colors beneath the square.
        });


        // update the script writing direction on selecting an option
        $("#fontsampler-edit-sample input[name=is_ltr]").on("change", function () {
            var $textarea = $(this).closest('form').find('textarea[name="initial"]');
            if (parseInt($(this).val()) === 1) {
                $textarea.attr("dir", "ltr");
            } else {
                $textarea.attr("dir", "rtl");
            }
        });


        // toggling a class on given element from a radio set
        $("[data-toggle-id]").on("change", function () {
            if (parseInt($(this).val()) === 1) {
                $("#" + $(this).data('toggle-id')).addClass($(this).data('toggle-class'));
            } else {
                $("#" + $(this).data('toggle-id')).removeClass($(this).data('toggle-class'));
            }
        });


        // fontsets list pagination
        $("#fontsampler-admin nav.fontsampler-pagination a").on("click", function (event) {
            event.preventDefault();

            var $this = $(this),
                $target = $("#" + $this.data("target")),
                href = $this.attr("href");

            $.get(href, function (result, error) {
                $target.html($(result).find("#fontsampler-admin-tbody-ajax").html());
                $(".fontsampler-preview").fontSampler();
                $("html, body").scrollTop(0);
            });

            $("#fontsampler-admin .fontsampler-pagination-current-page")
                .removeClass("fontsampler-pagination-current-page");

            $("#fontsampler-admin nav.fontsampler-pagination li:nth-of-type(" + ($this.parent().index() + 1) + ")")
                .children("a").addClass("fontsampler-pagination-current-page").blur();

            return false;
        });


        $(".fontsampler-toggle-show-hide").on("click", function (e) {
            e.preventDefault();
            var $this = $(this),
                $next = $(this).next(),
                $show = $this.children('span:first-child'),
                $hide = $this.children('span:last-child');

            $next.toggleClass("fontsampler-visible");

            if (!$next.hasClass("fontsampler-visible")) {
                $show.show();
                $hide.hide();
            } else {
                $show.hide();
                $hide.show();
            }
        });


        $(".fontsampler-options").accordion({
            active: false,
            collapsible: true,
            header: 'h3',
            heightStyle: 'content'
        });

        $("input[name='fontsize'],input[name='lineheight'],input[name='letterspacing']").on("change", function () {
            var $wrapper = $(this).closest("div").find(".fontsampler-options-features-details"),
                uncheckedClass = "fontsampler-options-unchecked";

            if ($(this).is(":checked")) {
                $wrapper.removeClass(uncheckedClass);
            } else {
                $wrapper.addClass(uncheckedClass);
            }
        });


        var $use_default_options = $("input[name=use_default_options]");
        var $options = $(".fontsampler-options");
        $("input[name=use_default_options]").change(function () {
            if ($(this).val() == 1) {
                $options.accordion("disable");
                $options.accordion("option", "active", false);
            } else {
                $options.accordion("enable");
            }
        });

        if ($use_default_options.filter(":checked").val() == 1) {
            $options.accordion("disable");
            $options.accordion("option", "active", false);
        }


        $(".fontsampler-image-radio").on("click", function () {
            var $this = $(this),
                name = $this.find('input').attr('name'),
                $all = $('.fontsampler-image-radio').has('input[name="' + name + '"]');

            $all.removeClass("active").find("input:checked").removeAttr("checked");
            $this.addClass("active").find('input').attr('checked', 'checked').trigger('change');
        });


        // fontsampler & settings direction options
        $initial = $("textarea[name='initial']");
        $("[name='is_ltr']").on("change", function () {
            $initial.attr('dir', $(this).val() == 1 ? 'ltr' : 'rtl');
        });
        $("[name='alignment_initial']").on("change", function () {
            $initial.css('text-align', $(this).data('value'));
        });


        // when clicking into a fontsampler options style's input field automatically
        // select the corresponding radio
        $(".fontsampler-options-row div:nth-of-type(1) input[type='text'], " +
            ".fontsampler-options-row div:nth-of-type(1) textarea").on("focus", function () {
            $(this).parentsUntil('.fontsampler-options-row')
                .find("input[name*='use_default']").attr('checked', 'checked');
        });

        $("#fontsampler-admin").on("click", "input.fontsampler-admin-feature-label-reset", function (e) {
            e.preventDefault();
            $(this).closest(".fontsampler-options-row")
                .find(".fontsampler-admin-slider-label").val($(this).data("default"));
        });

    } // end main


    // Due to clipboard's funny transpiling in combinition with requirejs' optimizer's
    // namespace rename this module can't be properly included. Alas, it's a global.

    // add "copy to clipboard" functionality to fontsampler listing table
    var clip = new Clipboard(".fontsampler-copy-clipboard");
    clip.on('success', function(e) {
        e.clearSelection();
        $(e.trigger).addClass('success');
        setTimeout(function () {
            $(e.trigger).removeClass('success');
        }, 1500);
    });

    return main;

});

/** 
 * All the jquery components dealing with manipulating the
 * UI layout of fontsamplers in the admin area
 */
fs.define('admin/js/admin-layout',['jquery'], function ($) {

    function main(specimentools, specimenttoolsUI) {

        var $admin = $("#fontsampler-admin"),
            $list = $("#fontsampler-ui-blocks-list"),
            $preview = $("#fontsampler-ui-layout-preview"),
            $previewOptions = $("#fontsampler-ui-layout-preview-options"),
            $ui_order = $("input[name=ui_order]"),
            $uiBlockCheckboxes = $("input.fontsampler-checkbox-ui-block"),

            layoutClasses = ["full", "column", "inline"],
            columnsClasses = "columns-1 columns-2 columns-3 columns-4",
            interfaceClass = "fontsampler-interface",
            blockMenuClass = "fontsampler-ui-block-menu-open";

        if ($preview.length) {
            reloadPreview();
        }


        /**
         * Listen for changes to the block layout via the block overlay in the preview
         */
        $preview.on("change", ".fontsampler-ui-block-overlay input[type=radio]", changeBlockClass);
        function changeBlockClass() {
            var item = $(this).closest(".fontsampler-ui-block-overlay").data("item");
            var $previewBlock = $preview.find(".fontsampler-ui-block[data-block=" + item + "]");
            $previewBlock.removeClass(layoutClasses.join(" ")).addClass($(this).val());
            setUIOrder();
        }


        /**
         * Listen for changes to the layout column count
         */
        $previewOptions.on("change", "input[type=radio]", changeColumnCount);
        function changeColumnCount() {
            var cols = $(this).data('value'),
                colsClass = "columns-" + cols;

            $preview.removeClass(columnsClasses).addClass(colsClass);
            $("." + interfaceClass).removeClass(columnsClasses).addClass(colsClass);

            // trigger resize to make the sliders' bar and handle update implicitly
            $(document, window).trigger("resize");
        }


        /**
         * Listen for changes in the buy and specimen URL input fields
         *
         * When either of the field is not empty, make sure it is included in the
         * layout preview
         */
        $admin.find("input[name=buy],input[name=specimen]").on("change keyup", onUrlInput);
        function onUrlInput() {
            var item = $(this).attr("name"),
                val = $.trim($(this).val()),
                included = inUIOrder(item);

            if (!included && val !== "") {
                addToUIOrder(item);
                reloadPreview();
            }

            if (included && val === "") {
                removeFromUIOrder(item);
                reloadPreview();
            }
        }


        $preview.on("click", ".fontsampler-ui-block-settings", onToggleBlockSettings);
        function onToggleBlockSettings(e) {
            e.preventDefault();
            var $block = $(this).closest(".fontsampler-ui-block"),
                hasMenuClass = $block.hasClass(blockMenuClass);

            $(this).closest(".fontsampler-interface").find("." + blockMenuClass).removeClass(blockMenuClass);
            if (!hasMenuClass) {
                $(this).closest(".fontsampler-ui-block").addClass(blockMenuClass);
            }
        }


        $preview.on("hover", ".fontsampler-ui-block", onHoverUiBlock);
        function onHoverUiBlock() {
            $(this).closest(".fontsampler-interface").find("." + blockMenuClass).removeClass(blockMenuClass);
        }


        $preview.on("click", ".fontsampler-ui-block-add-break", onAddRowBreak);
        function onAddRowBreak(e) {
            e.preventDefault();
            $(this).closest(".fontsampler-ui-block").after('<div class="fontsampler-interface-row-break">ROW BREAK</div>');
            setUIOrder();
        }


        /**
         * Reloading the preview mock
         */
        function reloadPreview() {
            var ui_order = $ui_order.val(),
                ui_columns = $previewOptions.find("input[type=radio]:checked").data('value'),

                data = {
                    'action': 'get_mock_fontsampler',
                    'data': {
                        "ui_columns": ui_columns,
                        "ui_order": ui_order,
                        "initial": "Layout preview only, for arranging the layout blocks"
                    }
                };

            //console.log(data.data);

            // since 2.8 ajaxurl is always defined in the admin header and points to admin-ajax.php
            $.post(ajaxurl, data, function (response) {
                $preview.html(response);

                specimentools(window, function (wrapper, pubsub) {
                    specimenttoolsUI( wrapper, pubsub );
                    $preview.find('.fontsampler-wrapper').removeClass("on-loading");

                    $(".fontsampler-interface").sortable({
                        stop: onSortEnd
                    });

                });
            });
        }


        /**
         * After each sorting ends iterate through the elements in the preview and
         * compile a new and updated ui_order
         */
        function onSortEnd() {
            var sortedOrder = $(".fontsampler-interface").children().map(function () {
                var cssClasses = $(this).attr("class").split(" "),
                    layoutClass = "",
                    isRowBreak = $(this).hasClass("fontsampler-interface-row-break");

                if (isRowBreak) {
                    return "|";
                } else {
                    for (var i = 0; i < cssClasses.length; i++) {
                        var cl = cssClasses[i];
                        if (layoutClasses.indexOf(cl) > -1) {
                            layoutClass = cl;
                            break;
                        }
                    }
                    return $(this).data('block') + "_" + layoutClass;
                }
            }).get().join(",");

            setUIOrder(sortedOrder);

            return sortedOrder;
        }


        $preview.on("mouseenter", ".fontsampler-ui-block", onMouseOverPreviewBlock);
        function onMouseOverPreviewBlock() {

            // only add the overlay on the first hover
            // after mouseleave if will be hidden by css
            if ($(this).find(".fontsampler-ui-block-overlay").length > 0)
                return;

            // copy the radios into the overlay from the $list (which has all
            // possible blocks)
            var item = $(this).data("block"),
                $clone = $list.find("div[data-item=" + item + "]").clone();

            $(this).append($clone);
        }


        $preview.on("mouseenter", ".fontsampler-interface-row-break", onMouseOverRowBreak);
        function onMouseOverRowBreak() {
            if ($(this).find(".fontsampler-delete-row-break").length > 0)
                return;

            $(this).append('<button class="fontsampler-delete-row-break">&times;</button>');
        }


        $preview.on("click", ".fontsampler-delete-row-break", onDeleteRowBreak);
        function onDeleteRowBreak(e) {
            e.preventDefault();
            $(this).closest(".fontsampler-interface-row-break").remove();
            onSortEnd();
        }


        /**
         * Switching from defaults to individual checkboxes
         */
        $("input[name=use_default_options]").on("change", function () {
            var $this = $(this);

            $uiBlockCheckboxes.each(function () {
                var $that = $(this),
                    name = $that.attr('name');

                if (parseInt($this.val()) === 1) {
                    // use defaults:
                    if (parseInt($that.data('default')) === 1) {
                        $that.attr('checked', 'checked');
                    } else {
                        $that.removeAttr('checked');
                    }
                } else {
                    if (parseInt($that.data('set')) === 1) {
                        $that.attr('checked', 'checked');
                    } else {
                        $that.removeAttr('checked');
                    }
                }
                checkboxUiOrderCheck($that);
            });
        });


        // sampler checkboxes & UI preview interaction
        $uiBlockCheckboxes.on("change", function () {
            checkboxUiOrderCheck($(this));
        });

        /**
         * Function that gets called when any of the checkboxes controlling the display of a UI element get toggled
         * If the element is currently hidden, it gets appended to the sortable
         * If the element is currently visible, it gets stashed in the placeholder list
         *
         * @param $this - the checkbox
         * @returns {boolean}
         */
        function checkboxUiOrderCheck($this) {
            var item = $this.attr("name"),
                checked = $this.is(":checked");

            if ('multiline' === item) {
                return;
            }

            if (checked) {
                if (!inUIOrder(item)) {
                    addToUIOrder(item);
                    reloadPreview();
                }
            } else {
                if (inUIOrder(item)) {
                    removeFromUIOrder(item);
                    reloadPreview();
                }
            }
        }


        function setUIOrder(order) {
            if (typeof order === "undefined") {
                order = calculateUIOrder();
            }
            $ui_order.val(order);
        }


        function calculateUIOrder() {
            return onSortEnd();
        }


        function inUIOrder(item) {
            return getUIItems().indexOf(item) > -1;
        }


        function removeFromUIOrder(item) {
            var items = getUIItems(),
                pos = items.indexOf(item),
                newitems = getUIItems(true);

            if (pos > -1) {
                newitems.splice(pos, 1);
            }
            setUIOrder(newitems.join(","));
        }


        function addToUIOrder(item) {
            var layout = $(".fontsampler-ui-block-overlay[data-item='" + item + "']").data('default-class');
            var items = [];
            if (!inUIOrder(item)) {
                items = getUIItems(true);
                items.push(item + "_" + layout);
                setUIOrder(items.join(","));
            }
        }


        function getUIItems(withLayout) {
            var items = $ui_order.val().split(",");

            if (withLayout !== true) {
                items = items.map(function (ui_item) {
                    return ui_item.substring(0, ui_item.indexOf("_"));
                });
            }

            return items;
        }
    }

    return main;

});
/**
 * All the jquery components dealing with file uploads on the admin side
 */
fs.define('admin/js/admin-upload',['jquery'], function ($) {

    function main() {

        // Set all variables to be used in scope
        var frame,
            $wrappers = $('.fontsampler-upload-wrapper');

        $wrappers.each(function () {
            MediaUploader($(this));
        });

    }


    // Simple wrapper for the functionality of any uploader
    function MediaUploader($wrapper) {
        var frame,
            addImgLink = $wrapper.find('.upload-custom-img'),
            delImgLink = $wrapper.find('.delete-custom-img'),
            imgContainer = $wrapper.find('.custom-img-container'),
            imgIdInput = $wrapper.find('.custom-img-id');

        init();

        function init () {
            // ADD IMAGE LINK
            addImgLink.on('click', onAddClick);

            // DELETE IMAGE LINK
            delImgLink.on('click', onDelClick);
        }


        function onAddClick(event) {
            event.preventDefault();

            // If the media frame already exists, reopen it.
            if (frame) {
                frame.open();
                return;
            }

            // Create a new media frame
            frame = wp.media({
                title: 'Select or Upload Media Of Your Chosen Persuasion',
                button: {
                    text: 'Use this media'
                },
                multiple: false  // Set to true to allow multiple files to be selected
            });

            // When an image is selected in the media frame...
            frame.on('select', function () {
                // Get media attachment details from the frame state
                var attachment = frame.state().get('selection').first().toJSON();
                imgContainer.append('<img src="' + attachment.url + '" alt="" />');
                imgIdInput.val(attachment.id);
                addImgLink.addClass('hidden');
                delImgLink.removeClass('hidden');
            });

            // Finally, open the modal on click
            frame.open();
        }

        function onDelClick(event) {
            event.preventDefault();
            imgContainer.html('');
            addImgLink.removeClass('hidden');
            delImgLink.addClass('hidden');
            imgIdInput.val('');
        }
    }

    return main;

});
/**
 * All the jquery components dealing with file uploads on the admin side
 */
fs.define('admin/js/admin-font-upload',['jquery'], function ($) {

    function main(specimentools) {

        var that = this,
            $wrappers = $('.fontsampler-font-set .fontsampler-fontset-files');

        $wrappers.each(function (index, elem) {
            MediaUploader($(this));
        });

        // Simple wrapper for the functionality of any uploader
        function MediaUploader($wrapper) {

            var frame,
                addButton = $wrapper.find('.fontsampler-upload-font'),
                delButton = $wrapper.find('.fontsampler-remove-font'),
                idInput = $wrapper.find('.fontsampler-font-id'),
                preview = $wrapper.find('.fontsampler-font-upload-preview'),
                // this one is outside the row wrapper, so search upwards to the font-set wrapper
                nameContainer = $wrapper.closest(".fontsampler-font-set").find('input[name="fontname[]"]'),
                tools = specimentools;

            init();

            function init() {
                // ADD IMAGE LINK
                $wrapper.on('click', ".fontsampler-upload-font", onAddClick);

                // DELETE IMAGE LINK
                delButton.on('click', onDelClick);
            }

            function onAddClick(event) {

                // If the media frame already exists, reopen it.
                if (frame) {
                    frame.open();
                    return;
                }

                // Create a new media frame
                frame = wp.media({
                    title: 'Select or Upload the webfont',
                    button: {
                        text: 'Use this media'
                    },
                    multiple: false  // Set to true to allow multiple files to be selected
                });

                // When an image is selected in the media frame...
                frame.on('select', (function () {
                    // Get media attachment details from the frame state
                    var attachment = frame.state().get('selection').first().toJSON();

                    nameContainer.html(attachment.url);
                    idInput.val(attachment.id);
                    delButton.removeClass('hidden');

                    var file = attachment.filename;
                    var format = file.substr(file.lastIndexOf(".") + 1, file.length);

                    preview.html('<div data-fonts="' + attachment.url +'" data-initial-font="' + attachment.url + '" ' +
                        'class="fontsampler-wrapper">' +
                        '<div class="type-tester"><div class="fontsampler-interface">' +
                        '   <div autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"' +
                            'class="current-font type-tester__content">Preview</div></div></div></div>');

                    // speciment tools extracts the postscript name and adds it (by default) as
                    // data attribute; get that value and insert it as suggestion into name input
                    specimentools(window, (function () {
                        var fontName = nameContainer.closest(".fontsampler-font-set").find(".fontsampler-wrapper").data("initial-font-name")
                        var val = $.trim(nameContainer.val())
                        if ($.trim(nameContainer.val()) === "") {
                            nameContainer.val(fontName);

                            // trigger blur to trigger validation
                            nameContainer.trigger("blur");
                        }
                    }).bind(this));

                }).bind(this));

                // Finally, open the modal on click
                frame.open();
            }

            function onDelClick(event) {
                event.preventDefault();
                nameContainer.html('');
                delButton.addClass('hidden');
                idInput.val('');
            }
        }
    }

    return main;

});

// same setup as frontend: /js/main.js
fs.define('jquery', [], function () {
    return jQuery;
});

fs.require([
    'js/specimentools-init',
    'js/ui-setup',

    'admin/js/admin-ui',
    'admin/js/admin-layout', 
    'admin/js/admin-upload', // for uploading images for the UI icons 
    'admin/js/admin-font-upload'
], function (init, fontsamplerUI, adminUI, adminLayout, adminUpload, adminFontupload) {
    // init any fontsampler instance on the page, i.e. when editing a fontsampler and
    // there is a preview layout rendered at the bottom
    window.fontsamplerSetup = function () {
        init(window, fontsamplerUI);
    };
    
    window.fontsamplers = init(window, fontsamplerUI);
    
    // in the adminUI the font upload instantiates a specimentools for uploaded fonts
    // but doesn't render anything; just used for extracting the font name from the OTF
    adminUI(adminFontupload, init);

    // dealing with the layout in the fontsampler creation form we also need to render the 
    // fetched preview fontsampler instance, so pass in fontsamplerUI to init it
    adminLayout(init, fontsamplerUI); // pass in specimentools (init) so we can re-init after ajax update

    // init the WP ajax upload for image uplaods in the admin forms
    adminUpload();
});
fs.define("admin/js/admin-main", function(){});

