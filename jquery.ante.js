/* ===================================================
 * jquery-ante v1.0
 * https://github.com/acavailhez/jquery-ante
 * ===================================================
 * Copyright 2014 Arnaud CAVAILHEZ
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ===================================================
 *
 * jquery-ante allows you to insert code before bound events are triggered
 *
 * In the following example we make an ajax call (fetching external content needed
 * for the action) before executing the code on click
 *
 * $('#element').ante('click',function(){
 *   return $.ajax({
 *     url:'[url-of-content-to-fetch]',
 *     success:function(html){
 *       $(body).append(html);
 *     }
 *   })
 * });
 * $('#element').click(function(){
 *   ...use content
 * });
 *
 * ========================================================== */

new function () {
    var KEY_ROOT = 'acavailhez-ante-';
    var KEY_FUNCTIONS = '__functions_bound';
    var KEY_ANTES = '__antes_bound';
    var ALREADY_CALLED = '__done';
    var ALREADY_BOUND = '__bound';
    //replace $().on so that every call to bind(), live(), click() etc will
    //prepend a call to the ante function defined if any
    var jQueryOn = jQuery.fn.on;

    //trickle down the namespace tree, triggering asynchronous ante functions first
    //and then normal bound functions
    function recursiveTriggerNamespaceKnot($element, knot, bindingEvent) {
        var anteFunctions = knot[KEY_ANTES];
        var normalBoundFunctions = knot[KEY_FUNCTIONS];

        function recursiveTriggerAnteFunction(index, callback) {
            if (index >= anteFunctions.length) {
                callback();
                return;
            }
            var anteReturn = anteFunctions[index].apply($element, [bindingEvent]);
            if (typeof anteReturn !== 'undefined') {
                //delay the call,
                //do not trigger if the promise returned an error
                jQuery.when(anteReturn).then(function () {
                    recursiveTriggerAnteFunction(index + 1, callback);
                }, function () {
                    throw new Error("a Promise passed to jquery-ante was rejected");
                });
            }
            else {
                recursiveTriggerAnteFunction(index + 1, callback);
            }
        }

        function triggerAfterAnte() {
            if (normalBoundFunctions) {
                for (var i = 0; i < normalBoundFunctions.length; i++) {
                    normalBoundFunctions[i].apply($element, [bindingEvent]);
                }
            }
            //go deeper in namespace
            $.each(knot, function (key, deeperKnot) {
                if (key === KEY_ANTES || key === KEY_FUNCTIONS || key === ALREADY_BOUND)return;
                recursiveTriggerNamespaceKnot($element, deeperKnot, bindingEvent);
            });
        }

        if (anteFunctions) {
            recursiveTriggerAnteFunction(0, triggerAfterAnte);
        }
        else {
            triggerAfterAnte();
        }
    }

    function rebindOn($element, event) {
        var eventNamespaces = event.split('.');
        var eventNamespaceForRebinding = '';
        var key = KEY_ROOT + eventNamespaces[0];
        var namespacedObject = $element.data(key);

        for (var deep = 0; deep < eventNamespaces.length; deep++) {
            if (eventNamespaceForRebinding && eventNamespaceForRebinding.length > 0) {
                eventNamespaceForRebinding += '.';
            }
            if (namespacedObject)namespacedObject = namespacedObject[eventNamespaces[deep]];
            eventNamespaceForRebinding += eventNamespaces[deep];
            if (!namespacedObject || !namespacedObject[ALREADY_BOUND]) {
                if (namespacedObject)namespacedObject[ALREADY_BOUND] = true;
                jQueryOn.apply($element, [eventNamespaceForRebinding, function (bindingEvent) {
                    if (bindingEvent[ALREADY_CALLED])return;
                    bindingEvent[ALREADY_CALLED] = true;
                    var key = KEY_ROOT + bindingEvent.type;
                    var fullEvent = bindingEvent.type;
                    if (bindingEvent.namespace) {
                        fullEvent += '.' + bindingEvent.namespace;
                    }
                    var eventNamespaces = fullEvent.split('.');
                    var namespacedObject = $element.data(key);
                    //find correct element
                    for (var deeper = 1; deeper < eventNamespaces.length; deeper++) {
                        if (namespacedObject) {
                            namespacedObject = namespacedObject[eventNamespaces[deeper]];
                        }
                    }
                    if (namespacedObject) {
                        recursiveTriggerNamespaceKnot($element, namespacedObject, bindingEvent);
                    }
                }]);
            }
        }
    }

    jQuery.fn.on = function () {
        var $elements = $(this);
        var args = jQuery.makeArray(arguments);
        var events = args[0];
        if (typeof events === 'object') {
            //events in the shape of {'click':..,'hover':...}
            jQuery.each(events, function (event, handler) {
                jQuery.fn.on.apply($elements, [event, handler]);
            });
            return this;
        }
        if (args.length > 1 && typeof args[1] === 'string') {
            //call to all sub-elements with selector
            $(args[1], $elements).each(function (i, element) {
                var cloneArgs = args.slice();
                cloneArgs.splice(1, 1);
                jQuery.fn.on.apply($(element), cloneArgs);
            });
            return this;
        }
        var eventsSplat = events.split(' ');
        for (var splitIndex = 0; splitIndex < eventsSplat.length; splitIndex++) {
            var event = eventsSplat[splitIndex];
            //remove namespaces progressively for key
            var eventNamespaces = event.split('.');
            var key = KEY_ROOT + eventNamespaces[0];

            for (var i = 0; i < $elements.length; i++) {
                var $element = $($elements[i]);
                var namespacedObject = $element.data(key);

                if (namespacedObject) {
                    for (var deep = 1; deep < eventNamespaces.length; deep++) {
                        if (!namespacedObject[eventNamespaces[deep]]) {
                            namespacedObject[eventNamespaces[deep]] = {};
                        }
                        namespacedObject = namespacedObject[eventNamespaces[deep]];
                    }
                    //find handler: it's the last argument that is a function
                    var argumentIndex = args.length;
                    while ((argumentIndex-- > -1) && (typeof args[argumentIndex] !== 'function') && (!args[argumentIndex] || typeof args[argumentIndex].handler !== 'function')) {

                    }
                    if (argumentIndex === -1) {
                        //no function found, not setting ante
                        return jQueryOn.apply(this, arguments);
                    }
                    var handler = args[argumentIndex];
                    if (typeof args[argumentIndex] !== 'function' && typeof args[argumentIndex].handler === 'function') {
                        handler = args[argumentIndex].handler;
                    }

                    //add the function at the namespace knot
                    if (!namespacedObject[KEY_FUNCTIONS]) {
                        namespacedObject[KEY_FUNCTIONS] = []
                    }

                    rebindOn($element, event);

                    namespacedObject[KEY_FUNCTIONS].push(handler);
                    return this;
                }
                else {
                    jQueryOn.apply(this, arguments);
                }
            }
        }
        return this;
    };

    jQuery.fn.ante = function (events, handler) {
        var $elements = $(this);
        var eventsSplat = events.split(' ');
        for (var splitIndex = 0; splitIndex < eventsSplat.length; splitIndex++) {
            var event = eventsSplat[splitIndex];
            var eventNamespaces = event.split('.');
            var rootEvent = eventNamespaces[0];
            var key = KEY_ROOT + rootEvent;
            if (!$elements.length) {
                throw new Error("jquery-ante called on 0 element, your selector is most likely empty");
            }
            for (var i = 0; i < $elements.length; i++) {
                var $element = $($elements[i]);

                //get functions directly bound to the event
                var functionsBound = [];
                var allFunctionsBound = $._data($element[0], "events");
                //get functions inderectly bound to the event (using $(document).on('click','selector',function))
                var indirectlyBoundFunctions = $._data($(document)[0], 'events');
                if (indirectlyBoundFunctions && indirectlyBoundFunctions[rootEvent] && indirectlyBoundFunctions[rootEvent].length > 0) {
                    for (var k = 0; k < indirectlyBoundFunctions[rootEvent].length; k++) {
                        var functionInderctlyBound = indirectlyBoundFunctions[rootEvent][k];
                        //check that selector matches current element
                        if (functionInderctlyBound.selector && $element.is(functionInderctlyBound.selector)) {
                            functionsBound.push(functionInderctlyBound);
                        }
                    }
                }
                if (allFunctionsBound && allFunctionsBound[rootEvent] && allFunctionsBound[rootEvent].length > 0) {
                    var objectsBound = allFunctionsBound[rootEvent];
                    for (var k = 0; k < objectsBound.length; k++) {
                        functionsBound.push(objectsBound[k]);
                    }
                }
                //remove functions bound
                $element.off(event);

                var namespacedObject = $element.data(key);
                if (!namespacedObject) {
                    namespacedObject = {};
                    $element.data(key, namespacedObject);
                }

                rebindOn($element, event);

                for (var deep = 1; deep < eventNamespaces.length; deep++) {
                    if (!namespacedObject[eventNamespaces[deep]]) {
                        namespacedObject[eventNamespaces[deep]] = {};
                    }
                    namespacedObject = namespacedObject[eventNamespaces[deep]];
                }

                //bind normal-bound ante
                if (functionsBound.length > 0) {
                    $.each(functionsBound, function (i, functionBound) {
                        //get correct namespace
                        var correctNamespacedObject = namespacedObject;
                        if (functionBound.namespace) {
                            var subNamespaces = functionBound.namespace.split('.');
                            for (var deep = 0; deep < subNamespaces.length; deep++) {
                                if (!namespacedObject[subNamespaces[deep]]) {
                                    namespacedObject[subNamespaces[deep]] = {};
                                }
                                correctNamespacedObject = namespacedObject[subNamespaces[deep]];
                            }
                            rebindOn($element, rootEvent + '.' + functionBound.namespace);
                        }
                        if (!correctNamespacedObject[KEY_FUNCTIONS]) {
                            correctNamespacedObject[KEY_FUNCTIONS] = [];
                        }
                        correctNamespacedObject[KEY_FUNCTIONS].push(functionBound.handler);
                    });
                }

                //bind ante
                if (!namespacedObject[KEY_ANTES]) {
                    namespacedObject[KEY_ANTES] = [];
                }
                namespacedObject[KEY_ANTES].push(handler);
            }
        }
        return $elements;
    };
}();