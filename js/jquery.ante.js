/* ===================================================
 * jquery-async v0.1
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
    //replace $().on so that every call to bind(), live(), click() etc will
    //prepend a call to the ante function defined if any
    var jQueryOn = jQuery.fn.on;
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
        var eventsSplat = events.split(' ');
        for (var splitIndex = 0; splitIndex < eventsSplat.length; splitIndex++) {
            var event = eventsSplat[splitIndex];
            var key = 'acavailhez-ante-' + event;

            for (var i = 0; i < $elements.length; i++) {
                var $element = $($elements[i]);
                if ($element.data(key)) {
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
                    $element.data(key + '-functions-bound').push(handler);
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
            var key = 'acavailhez-ante-' + event;
            if (!$elements.length) {
                throw new Error("jquery-ante called on 0 element, your selector is most likely empty");
            }
            for (var i = 0; i < $elements.length; i++) {
                var $element = $($elements[i]);
                var functionToRebind;
                if ($element.data(key)) {
                    //the element already has an ante defined
                    functionToRebind = function () {

                    }
                }
                else {
                    //set a property to know that this element is managed by a ante call
                    $element.data(key, true);
                    //get functions directly bound to the event
                    var functionsBound = [];
                    var allFunctionsBound = $._data($element[0], "events");
                    //get functions inderectly bound to the event (using $(document).on('click','selector',function))
                    var indirectlyBoundFunctions = $._data($(document)[0], 'events');
                    if (indirectlyBoundFunctions && indirectlyBoundFunctions[event] && indirectlyBoundFunctions[event].length > 0) {
                        for (var k = 0; k < indirectlyBoundFunctions[event].length; k++) {
                            var functionInderctlyBound = indirectlyBoundFunctions[event][k];
                            //check that selector matches current element
                            if (functionInderctlyBound.selector && $element.is(functionInderctlyBound.selector)) {
                                functionsBound.push(functionInderctlyBound.handler);
                            }
                        }
                    }
                    if (allFunctionsBound && allFunctionsBound[event] && allFunctionsBound[event].length > 0) {
                        var objectsBound = allFunctionsBound[event];
                        for (var k = 0; k < objectsBound.length; k++) {
                            functionsBound.push(objectsBound[k].handler);
                        }
                    }
                    if (functionsBound.length > 0) {
                        $element.data(key + '-functions-bound', functionsBound);
                        //remove functions bound
                        $element.off(event);
                    }
                    else {
                        //no function was yet bound on this event
                        $element.data(key + '-functions-bound', []);
                    }
                    functionToRebind = function (bindingEvent) {
                        var delayed = function () {
                            var functions = $element.data(key + '-functions-bound');
                            for (var j = 0; j < functions.length; j++) {
                                var functionBound = functions[j];
                                functionBound.apply($element, [bindingEvent]);
                            }
                        };
                        var handlerReturn = handler.apply($element, []);
                        if (typeof handlerReturn !== 'undefined') {
                            //delay the call,
                            //do not trigger if the promise returned an error
                            jQuery.when(handlerReturn).then(function () {
                                delayed();
                            }, function () {
                                throw new Error("a Promise passed to jquery-ante was rejected");
                            });
                        }
                        else {
                            delayed();
                        }
                    }
                }
                jQueryOn.apply($element, [event, functionToRebind]);
            }
        }
        return $elements;
    };
}();