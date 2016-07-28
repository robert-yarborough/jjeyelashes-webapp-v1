/*!
 * angular-seed
 * 
 * 
 * @author 
 * @version 0.0.0
 * Copyright 2016. MIT licensed.
 */
//self invoking function = Global Angular
(function(){
    // Declare app level module which depends on views, and components
    var jjEyelashes = angular.module('jjEyelashes', [
        'ui.router',
        'ui.bootstrap',
        'ui.router.tabs',
        'ngAnimate',
        'ngMaterial',
        'formly',
        'formlyBootstrap',
        'duParallax',
        'uiGmapgoogle-maps'
    ]);
// custom sticky nav directive
    jjEyelashes.directive('sticky', ['$window', '$timeout', function($window, $timeout) {
        return {
            restrict: 'A', // this directive can only be used as an attribute.
            scope: {
                disabled: '=disabledSticky'
            },
            link: function linkFn($scope, $elem, $attrs) {

                // Initial scope
                var scrollableNodeTagName = 'sticky-scroll';
                var initialPosition = $elem.css('position');
                var initialStyle = $elem.attr('style') || '';
                var stickyBottomLine = 0;
                var isSticking = false;
                var onStickyHeighUnbind;
                var originalInitialCSS;
                var originalOffset;
                var placeholder;
                var stickyLine;
                var initialCSS;

                // Optional Classes
                var stickyClass = $attrs.stickyClass || '';
                var unstickyClass = $attrs.unstickyClass || '';
                var bodyClass = $attrs.bodyClass || '';
                var bottomClass = $attrs.bottomClass || '';

                // Find scrollbar
                var scrollbar = deriveScrollingViewport ($elem);

                // Define elements
                var windowElement = angular.element($window);
                var scrollbarElement = angular.element(scrollbar);
                var $body = angular.element(document.body);

                // Resize callback
                var $onResize = $scope.$apply.bind($scope, onResize);

                // Define options
                var usePlaceholder = ($attrs.usePlaceholder !== 'false');
                var anchor = $attrs.anchor === 'bottom' ? 'bottom' : 'top';
                var confine = ($attrs.confine === 'true');

                // flag: can react to recalculating the initial CSS dimensions later
                // as link executes prematurely. defaults to immediate checking
                var isStickyLayoutDeferred = $attrs.isStickyLayoutDeferred !== undefined
                    ? ($attrs.isStickyLayoutDeferred === 'true')
                    : false;

                // flag: is sticky content constantly observed for changes.
                // Should be true if content uses ngBind to show text
                // that may vary in size over time
                var isStickyLayoutWatched = $attrs.isStickyLayoutWatched !== undefined
                    ? ($attrs.isStickyLayoutWatched === 'true')
                    : true;


                var offset = $attrs.offset
                    ? parseInt ($attrs.offset.replace(/px;?/, ''))
                    : 0;

                /**
                 * Trigger to initialize the sticky
                 * Because of the `timeout()` method for the call of
                 * @type {Boolean}
                 */
                var shouldInitialize = true;

                /**
                 * Initialize Sticky
                 */
                function initSticky() {

                    if (shouldInitialize) {

                        // Listeners
                        scrollbarElement.on('scroll', checkIfShouldStick);
                        windowElement.on('resize', $scope.$apply.bind($scope, onResize));

                        memorizeDimensions(); // remember sticky's layout dimensions

                        // Setup watcher on digest and change
                        $scope.$watch(onDigest, onChange);

                        // Clean up
                        $scope.$on('$destroy', onDestroy);
                        shouldInitialize = false;
                    }
                };

                /**
                 * need to recall sticky's DOM attributes (make sure layout has occured)
                 */
                function memorizeDimensions() {
                    // immediate assignment, but there is the potential for wrong values if content not ready
                    initialCSS = $scope.getInitialDimensions();

                    // option to calculate the dimensions when layout is 'ready'
                    if (isStickyLayoutDeferred) {

                        // logic: when this directive link() runs before the content has had a chance to layout on browser, height could be 0
                        if (!$elem[0].getBoundingClientRect().height) {

                            onStickyHeighUnbind = $scope.$watch(
                                function() {
                                    return $elem.height();
                                },

                                // state change: sticky content's height set
                                function onStickyContentLayoutInitialHeightSet(newValue, oldValue) {
                                    if (newValue > 0) {
                                        // now can memorize
                                        initialCSS = $scope.getInitialDimensions();

                                        if (!isStickyLayoutWatched) {
                                            // preference was to do just a one-time async watch on the sticky's content; now stop watching
                                            onStickyHeighUnbind();
                                        }
                                    }
                                }
                            );
                        }
                    }
                }

                /**
                 * Determine if the element should be sticking or not.
                 */
                var checkIfShouldStick = function() {
                    if ($scope.disabled === true || mediaQueryMatches()) {
                        if (isSticking) unStickElement();
                        return false;
                    }

                    // What's the document client top for?
                    var scrollbarPosition = scrollbarYPos();
                    var shouldStick;

                    if (anchor === 'top') {
                        if (confine === true) {
                            shouldStick = scrollbarPosition > stickyLine && scrollbarPosition <= stickyBottomLine;
                        } else {
                            shouldStick = scrollbarPosition > stickyLine;
                        }
                    } else {
                        shouldStick = scrollbarPosition <= stickyLine;
                    }

                    // Switch the sticky mode if the element crosses the sticky line
                    // $attrs.stickLimit - when it's equal to true it enables the user
                    // to turn off the sticky function when the elem height is
                    // bigger then the viewport
                    var closestLine = getClosest (scrollbarPosition, stickyLine, stickyBottomLine);

                    if (shouldStick && !shouldStickWithLimit ($attrs.stickLimit) && !isSticking) {
                        stickElement (closestLine);
                    } else if (!shouldStick && isSticking) {
                        unStickElement(closestLine, scrollbarPosition);
                    } else if (confine && !shouldStick) {
                        // If we are confined to the parent, refresh, and past the stickyBottomLine
                        // We should 'remember' the original offset and unstick the element which places it at the stickyBottomLine
                        originalOffset = elementsOffsetFromTop ($elem[0]);
                        unStickElement (closestLine, scrollbarPosition);
                    }
                };

                /**
                 * determine the respective node that handles scrolling, defaulting to browser window
                 */
                function deriveScrollingViewport(stickyNode) {
                    // derive relevant scrolling by ascending the DOM tree
                    var match =findAncestorTag (scrollableNodeTagName, stickyNode);
                    return (match.length === 1) ? match[0] : $window;
                }

                /**
                 * since jqLite lacks closest(), this is a pseudo emulator (by tag name)
                 */
                function findAncestorTag(tag, context) {
                    var m = []; // nodelist container
                    var n = context.parent(); // starting point
                    var p;

                    do {
                        var node = n[0]; // break out of jqLite
                        // limit DOM territory
                        if (node.nodeType !== 1) {
                            break;
                        }

                        // success
                        if (node.tagName.toUpperCase() === tag.toUpperCase()) {
                            return n;
                        }

                        p = n.parent();
                        n = p; // set to parent
                    } while (p.length !== 0);

                    return m; // empty set
                }

                /**
                 * Seems to be undocumented functionality
                 */
                function shouldStickWithLimit(shouldApplyWithLimit) {
                    return shouldApplyWithLimit === 'true'
                        ? ($window.innerHeight - ($elem[0].offsetHeight + parseInt(offset)) < 0)
                        : false;
                }

                /**
                 * Finds the closest value from a set of numbers in an array.
                 */
                function getClosest(scrollTop, stickyLine, stickyBottomLine) {
                    var closest = 'top';
                    var topDistance = Math.abs(scrollTop - stickyLine);
                    var bottomDistance = Math.abs(scrollTop - stickyBottomLine);

                    if (topDistance > bottomDistance) {
                        closest = 'bottom';
                    }

                    return closest;
                }

                /**
                 * Unsticks the element
                 */
                function unStickElement(fromDirection) {
                    $elem.attr('style', initialStyle);
                    isSticking = false;

                    $body.removeClass(bodyClass);
                    $elem.removeClass(stickyClass);
                    $elem.addClass(unstickyClass);

                    if (fromDirection === 'top') {
                        $elem.removeClass(bottomClass);

                        $elem
                            .css('z-index', 10)
                            .css('width', initialCSS.width)
                            .css('top', initialCSS.top)
                            .css('position', initialCSS.position)
                            .css('left', initialCSS.cssLeft)
                            .css('margin-top', initialCSS.marginTop)
                            .css('height', initialCSS.height);
                    } else if (fromDirection === 'bottom' && confine === true) {
                        $elem.addClass(bottomClass);

                        // It's possible to page down page and skip the 'stickElement'.
                        // In that case we should create a placeholder so the offsets don't get off.
                        createPlaceholder();

                        $elem
                            .css('z-index', 10)
                            .css('width', initialCSS.width)
                            .css('top', '')
                            .css('bottom', 0)
                            .css('position', 'absolute')
                            .css('left', initialCSS.cssLeft)
                            .css('margin-top', initialCSS.marginTop)
                            .css('margin-bottom', initialCSS.marginBottom)
                            .css('height', initialCSS.height);
                    }

                    if (placeholder && fromDirection === anchor) {
                        placeholder.remove();
                    }
                }

                /**
                 * Sticks the element
                 */
                function stickElement(closestLine) {
                    // Set sticky state
                    isSticking = true;
                    $timeout(function() {
                        initialCSS.offsetWidth = $elem[0].offsetWidth;
                    }, 0);
                    $body.addClass(bodyClass);
                    $elem.removeClass(unstickyClass);
                    $elem.removeClass(bottomClass);
                    $elem.addClass(stickyClass);

                    createPlaceholder();

                    $elem
                        .css('z-index', '10')
                        .css('width', $elem[0].offsetWidth + 'px')
                        .css('position', 'fixed')
                        .css('left', $elem.css('left').replace('px', '') + 'px')
                        .css(anchor, (offset + elementsOffsetFromTop (scrollbar)) + 'px')
                        .css('margin-top', 0);

                    if (anchor === 'bottom') {
                        $elem.css('margin-bottom', 0);
                    }
                }

                /**
                 * Clean up directive
                 */
                var onDestroy = function() {
                    scrollbarElement.off('scroll', checkIfShouldStick);
                    windowElement.off('resize', $onResize);

                    $onResize = null;

                    $body.removeClass(bodyClass);

                    if (placeholder) {
                        placeholder.remove();
                    }
                };

                /**
                 * Updates on resize.
                 */
                function onResize() {
                    unStickElement (anchor);
                    checkIfShouldStick();
                }

                /**
                 * Triggered on load / digest cycle
                 * return `0` if the DOM element is hidden
                 */
                var onDigest = function() {
                    if ($scope.disabled === true) {
                        return unStickElement();
                    }
                    var offsetFromTop = elementsOffsetFromTop ($elem[0]);
                    if (offsetFromTop === 0) {
                        return offsetFromTop;
                    }
                    if (anchor === 'top') {
                        return (originalOffset || offsetFromTop) - elementsOffsetFromTop (scrollbar) + scrollbarYPos();
                    } else {
                        return offsetFromTop - scrollbarHeight() + $elem[0].offsetHeight + scrollbarYPos();
                    }
                };

                /**
                 * Triggered on change
                 */
                var onChange = function (newVal, oldVal) {

                    /**
                     * Indicate if the DOM element is showed, or not
                     * @type {boolean}
                     */
                    var elemIsShowed = !!newVal;

                    /**
                     * Indicate if the DOM element was showed, or not
                     * @type {boolean}
                     */
                    var elemWasHidden = !oldVal;
                    var valChange = (newVal !== oldVal || typeof stickyLine === 'undefined');
                    var notSticking = (!isSticking && !isBottomedOut());

                    if (valChange && notSticking && newVal !== 0 && elemIsShowed) {
                        stickyLine = newVal - offset;
                        //Update dimensions of sticky element when is showed
                        if (elemIsShowed && elemWasHidden) {
                            $scope.updateStickyContentUpdateDimensions($elem[0].offsetWidth, $elem[0].offsetHeight);
                        }
                        // IF the sticky is confined, we want to make sure the parent is relatively positioned,
                        // otherwise it won't bottom out properly
                        if (confine) {
                            $elem.parent().css({
                                'position': 'relative'
                            });
                        }

                        // Get Parent height, so we know when to bottom out for confined stickies
                        var parent = $elem.parent()[0];

                        // Offset parent height by the elements height, if we're not using a placeholder
                        var parentHeight = parseInt (parent.offsetHeight) - (usePlaceholder ? 0 : $elem[0].offsetHeight);

                        // and now lets ensure we adhere to the bottom margins
                        // TODO: make this an attribute? Maybe like ignore-margin?
                        var marginBottom = parseInt ($elem.css('margin-bottom').replace(/px;?/, '')) || 0;

                        // specify the bottom out line for the sticky to unstick
                        var elementsDistanceFromTop = elementsOffsetFromTop ($elem[0]);
                        var parentsDistanceFromTop = elementsOffsetFromTop (parent)
                        var scrollbarDistanceFromTop = elementsOffsetFromTop (scrollbar);

                        var elementsDistanceFromScrollbarStart = elementsDistanceFromTop - scrollbarDistanceFromTop;
                        var elementsDistanceFromBottom = parentsDistanceFromTop + parentHeight - elementsDistanceFromTop;

                        stickyBottomLine = elementsDistanceFromScrollbarStart
                            + elementsDistanceFromBottom
                            - $elem[0].offsetHeight
                            - marginBottom
                            - offset
                            + +scrollbarYPos();

                        checkIfShouldStick();
                    }
                };

                /**
                 * Helper Functions
                 */

                /**
                 * Create a placeholder
                 */
                function createPlaceholder() {
                    if (usePlaceholder) {
                        // Remove the previous placeholder
                        if (placeholder) {
                            placeholder.remove();
                        }

                        placeholder = angular.element('<div>');
                        var elementsHeight = $elem[0].offsetHeight;
                        var computedStyle = $elem[0].currentStyle || window.getComputedStyle($elem[0]);
                        elementsHeight += parseInt(computedStyle.marginTop, 10);
                        elementsHeight += parseInt(computedStyle.marginBottom, 10);
                        elementsHeight += parseInt(computedStyle.borderTopWidth, 10);
                        elementsHeight += parseInt(computedStyle.borderBottomWidth, 10);
                        placeholder.css('height', $elem[0].offsetHeight + 'px');

                        $elem.after(placeholder);
                    }
                }

                /**
                 * Are we bottomed out of the parent element?
                 */
                function isBottomedOut() {
                    if (confine && scrollbarYPos() > stickyBottomLine) {
                        return true;
                    }

                    return false;
                }

                /**
                 * Fetch top offset of element
                 */
                function elementsOffsetFromTop(element) {
                    var offset = 120;

                    if (element.getBoundingClientRect) {
                        offset = element.getBoundingClientRect().top;
                    }

                    return offset;
                }

                /**
                 * Retrieves top scroll distance
                 */
                function scrollbarYPos() {
                    var position;

                    if (typeof scrollbar.scrollTop !== 'undefined') {
                        position = scrollbar.scrollTop;
                    } else if (typeof scrollbar.pageYOffset !== 'undefined') {
                        position = scrollbar.pageYOffset;
                    } else {
                        position = document.documentElement.scrollTop;
                    }

                    return position;
                }

                /**
                 * Determine scrollbar's height
                 */
                function scrollbarHeight() {
                    var height;

                    if (scrollbarElement[0] instanceof HTMLElement) {
                        // isn't bounding client rect cleaner than insane regex mess?
                        height = $window.getComputedStyle(scrollbarElement[0], null)
                            .getPropertyValue('height')
                            .replace(/px;?/, '');
                    } else {
                        height = $window.innerHeight;
                    }

                    return parseInt (height) || 0;
                }

                /**
                 * Checks if the media matches
                 */
                function mediaQueryMatches() {
                    var mediaQuery = $attrs.mediaQuery || false;
                    var matchMedia = $window.matchMedia;

                    return mediaQuery && !(matchMedia ('(' + mediaQuery + ')').matches || matchMedia (mediaQuery).matches);
                }

                // public accessors for the controller to hitch into. Helps with external API access
                $scope.getElement = function() { return $elem; };
                $scope.getScrollbar = function() { return scrollbar; };
                $scope.getInitialCSS = function() { return initialCSS; };
                $scope.getAnchor = function() { return anchor; };
                $scope.isSticking = function() { return isSticking; };
                $scope.getOriginalInitialCSS = function() { return originalInitialCSS; };
                // pass through aliases
                $scope.processUnStickElement = function(anchor) { unStickElement(anchor)};
                $scope.processCheckIfShouldStick =function() { checkIfShouldStick(); };

                /**
                 * set the dimensions for the defaults of the content block occupied by the sticky element
                 */
                $scope.getInitialDimensions = function() {
                    return {
                        zIndex: $elem.css('z-index'),
                        top: $elem.css('top'),
                        position: initialPosition, // revert to true initial state
                        marginTop: $elem.css('margin-top'),
                        marginBottom: $elem.css('margin-bottom'),
                        cssLeft: $elem.css('left'),
                        width: $elem[0].offsetWidth,
                        height: $elem.css('height')
                    };
                };

                /**
                 * only change content box dimensions
                 */
                $scope.updateStickyContentUpdateDimensions = function(width, height) {
                    if (width && height) {
                        initSticky();
                        initialCSS.width = width + 'px';
                        initialCSS.height = height + 'px';
                    }
                };

                // ----------- configuration -----------

                $timeout(function() {
                    originalInitialCSS = $scope.getInitialDimensions(); // preserve a copy
                    // Init the directive
                    initSticky();
                },0);
            },

            /**
             * +++++++++ public APIs+++++++++++++
             */
            controller: ['$scope', '$window', function($scope, $window) {

                /**
                 * integration method allows for an outside client to reset the pinned state back to unpinned.
                 * Useful for when refreshing the scrollable DIV content completely
                 * if newWidth and newHeight integer values are not supplied then function will make a best guess
                 */
                this.resetLayout = function(newWidth, newHeight) {

                    var scrollbar = $scope.getScrollbar(),
                        initialCSS = $scope.getInitialCSS(),
                        anchor = $scope.getAnchor();

                    function _resetScrollPosition() {

                        // reset means content is scrolled to anchor position
                        if (anchor === 'top') {
                            // window based scroller
                            if (scrollbar === $window) {
                                $window.scrollTo(110, 0);
                                // DIV based sticky scroller
                            } else {
                                if (scrollbar.scrollTop > 0) {
                                    scrollbar.scrollTop = 110;
                                }
                            }
                        }
                        // todo: need bottom use case
                    }

                    // only if pinned, force unpinning, otherwise height is inadvertently reset to 0
                    if ($scope.isSticking()) {
                        $scope.processUnStickElement (anchor);
                        $scope.processCheckIfShouldStick();
                    }
                    // remove layout-affecting attributes that were modified by this sticky
                    $scope.getElement().css({ 'width': '', 'height': '', 'position': '', 'top': '', zIndex: '' });
                    // model resets
                    initialCSS.position = $scope.getOriginalInitialCSS().position; // revert to original state
                    delete initialCSS.offsetWidth; // stickElement affected

                    // use this directive element's as default, if no measurements passed in
                    if (newWidth === undefined && newHeight === undefined) {
                        var e_bcr = $scope.getElement()[0].getBoundingClientRect();
                        newWidth = e_bcr.width;
                        newHeight = e_bcr.height;
                    }

                    // update model with new dimensions (if supplied from client's own measurement)
                    $scope.updateStickyContentUpdateDimensions(newWidth, newHeight); // update layout dimensions only

                    _resetScrollPosition();
                };

                /**
                 * return a reference to the scrolling element (window or DIV with overflow)
                 */
                this.getScrollbar = function() {
                    return $scope.getScrollbar();
                };
            }]
        };
    }]);
    jjEyelashes.directive("fmpCard", function($timeout, $window) {
        var getCssVendorPrefix = function (operation){
            var retval = "";

            var userAgent = $window.navigator.userAgent.toLowerCase();
            if (operation == "transform"){
                if (userAgent.indexOf('chrome') > -1){
                    retval = "";
                } else if (userAgent.indexOf('safari') > -1){
                    retval = "-webkit-";
                } else if (userAgent.indexOf('msie') > -1){
                    retval = "";
                } else if (userAgent.indexOf('opera') > -1){
                    retval = "";
                } else if (userAgent.indexOf('firefox') > -1){
                    retval = "";
                } else{
                    retval = "-webkit-";
                }
            } else if (operation == "transition"){
                if (userAgent.indexOf('chrome') > -1){
                    retval = "";
                } else if (userAgent.indexOf('safari') > -1){
                    retval = "-webkit-";
                } else if (userAgent.indexOf('msie') > -1){
                    retval = "";
                } else if (userAgent.indexOf('opera') > -1){
                    retval = "";
                } else if (userAgent.indexOf('firefox') > -1){
                    retval = "";
                } else{
                    retval = "-webkit-";
                }
            }
            return retval;
        };

        var getFlipCardTransitionStartPointStyle = function (smallCard, largeCard){
            //transition flip from small card to large card
            /*var flipCardLeftInitialTransition =  smallCard.offsetLeft - (largeCard.largeCardLeft + (largeCard.largeCardWidthSize - (largeCard.largeCardWidthSize / (largeCard.largeCardWidthSize/smallCard.clientWidth))) / 2);*/
            var flipCardTopInitialTransition = smallCard.offsetTop - (largeCard.largeCardTop + (largeCard.largeCardHeightSize - (largeCard.largeCardHeightSize / (largeCard.largeCardHeightSize/smallCard.clientHeight))) / 2) + 2;
            var flipCardInitialWidthScale = smallCard.clientWidth / largeCard.largeCardWidthSize;
            var flipCardInitialHeightScale = smallCard.clientHeight / largeCard.largeCardHeightSize;
            return "-webkit-transform: translate(" + 0 + "px, " +
                flipCardTopInitialTransition + "px) " +
                "scale(" + flipCardInitialWidthScale + "," + flipCardInitialHeightScale + ");";
        };

        var animateCardMovingIn = function(smallCard, largeCard, flipCard, transitionSpeed) {
            //Set the large card in center of view-port
            largeCard.largeCardWidthSize = smallCard.clientWidth * 2;
            largeCard.largeCardHeightSize = smallCard.clientHeight * 2;
            largeCard.largeCardLeft = $window.innerWidth/2 - largeCard.largeCardWidthSize/2;
            largeCard.largeCardTop = $window.innerHeight/2 - largeCard.largeCardHeightSize/2;

            var startFlipCardStyle = getFlipCardTransitionStartPointStyle(smallCard, largeCard);

            var cssVendorPrefix = getCssVendorPrefix("transform");

            var endFlipCardStyle = cssVendorPrefix + "transform: translate(0px, 0px) scale(1) rotateY(180deg);";
            angular.element(flipCard).attr("style", startFlipCardStyle);

            $timeout(function() {
                angular.element(flipCard).attr("style", startFlipCardStyle + 'z-index:700;');

                //Place large card in display
                var newLargeCardStyle =
                    "left:" + largeCard.largeCardLeft + "px;" +
                    "top:" + largeCard.largeCardTop + "px;" +
                    "width:" + largeCard.largeCardWidthSize + "px;" +
                    "height:" + largeCard.largeCardHeightSize + "px;" +
                    "display:block;";
                angular.element(largeCard).attr('style', newLargeCardStyle);

                //After first preparation for animate do animation changes
                $timeout(function () {
                    //Hide small card
                    var oldSmallCardStyle = angular.element(smallCard).attr("style");
                    angular.element(smallCard).attr("style",oldSmallCardStyle + "visibility: hidden;");

                    angular.element(largeCard).addClass('unflip');
                    var transitionStyleAddition = '';
                    if (transitionSpeed !== null && transitionSpeed !== undefined && transitionSpeed !== ""){
                        transitionStyleAddition = getCssVendorPrefix('transition') + 'transition:' + transitionSpeed + "s;";
                    }
                    angular.element(flipCard).attr("style", endFlipCardStyle + 'z-index:700;' + transitionStyleAddition);
                }, 100);//Not 0 since sometimes animation not happening in browser
            },100);
        };

        var animateCardMovingOutStrategy = function(smallCard, largeCard){
            //Make small Card reappear
            var oldSmallCardStyle = angular.element(smallCard).attr("style");
            if (oldSmallCardStyle) {
                var newSmallCardStyle = oldSmallCardStyle.replace("visibility: hidden;", "");
                angular.element(smallCard).attr('style', newSmallCardStyle);
            }

            //Hide Large card after it shrank
            var largeCardOldStyle = angular.element(largeCard).attr('style');
            if (largeCardOldStyle) {
                var newLargeCardStyle = largeCardOldStyle.replace("display:block", "display:none");
                angular.element(largeCard).attr('style', newLargeCardStyle);
            }
        };

        var animateCardMovingOut = function(smallCard, largeCard, flipCard, transitionSpeed) {
            var transitions = "transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd";

            angular.element(flipCard).one(transitions, function(){
                angular.element(largeCard).removeClass('unflip');
                angular.element(flipCard).unbind(transitions);
                animateCardMovingOutStrategy(smallCard, largeCard);
            });

            var endFlipCardStyle = getFlipCardTransitionStartPointStyle(smallCard, largeCard);
            if (transitionSpeed !== null && transitionSpeed !== undefined && transitions !== "") { //Change animation speed
                endFlipCardStyle = endFlipCardStyle + getCssVendorPrefix('transition') + 'transition:' + transitionSpeed + "s;";
                //angular.element(largeCard).removeClass('unflip');
                if (transitionSpeed === 0) { //Immediate flip
                    angular.element(largeCard).removeClass('unflip');
                    angular.element(flipCard).unbind(transitions);
                    animateCardMovingOutStrategy(smallCard, largeCard);
                }
            }

            angular.element(flipCard).attr("style", endFlipCardStyle);
        };

        return {
            restrict: 'E',
            transclude: true,
            scope: {
                smallCardWidth: "@",
                smallCardHeight: "@",
                image: "@",
                frontCaption: "@",
                suffix: "@",
                onCardOpened: "&",
                onCardClosed: "&",
                cardControl: '='
            },
            link: function (scope, element) {
                //Get all existing small cards to check if clicking outside of this card not clicking
                //on another card. is so don't open it
                scope.allSmallCardDOMElements = null;

                //Small card representation
                scope.smallCardDOMElement = element[0].querySelector('.fmp-card-small');

                //Large card final point representation
                scope.largeCardDOMElement = element[0].querySelector('.fmp-card-large');

                //flipping card representation
                scope.flipperCardDOMElement = element[0].querySelector('.fmp-flipper');

                //Initialize card states to animate card moving back out final state
                animateCardMovingOutStrategy(scope.smallCardDOMElement, scope.largeCardDOMElement);

                ////Set initial large card position and hide it
                angular.element(scope.largeCardDOMElement).attr('style',"display:none;");

                //Event when clicking outside current card which is opened
                var onLargeCardSelected = function(e, transitionSpeed) {
                    var isClosingCard = false;
                    if (scope.onCardClosed){
                        isClosingCard = scope.onCardClosed();
                    }

                    if (isClosingCard !== false) { //During tests this received 'undefined'
                        animateCardMovingOut(scope.smallCardDOMElement, scope.largeCardDOMElement, scope.flipperCardDOMElement, transitionSpeed);
                        //scope.$digest();
                    }
                };

                //Event when clicking on a closed small card
                var onSmallCardSelected = function(e, transitionSpeed){
                    var isCardAlreadyOpen = false;// if we have a different card already open then don't open another
                    if (!scope.allSmallCardDOMElements){
                        scope.allSmallCardDOMElements = angular.element(document.getElementsByClassName('fmp-card-small'));
                    }
                    //Check if we got another card already open
                    for (var i = 0; i < scope.allSmallCardDOMElements.length; i++) {
                        isCardAlreadyOpen = (scope.allSmallCardDOMElements[i].style.visibility == "hidden");
                        if (isCardAlreadyOpen) {
                            break;
                        }
                    }
                    if (!isCardAlreadyOpen) { //We don't have a different card already open
                        animateCardMovingIn(scope.smallCardDOMElement, scope.largeCardDOMElement, scope.flipperCardDOMElement, transitionSpeed);
                        if (scope.onCardOpened){
                            scope.onCardOpened();
                        }
                        if (e) {
                            e.stopPropagation();
                        }
                    }
                };

                scope.onSmallCardClicked = function(e){
                    //if Angular only
                    if (scope.clickEvent == 'click'){
                        onSmallCardSelected(e);
                    }
                };

                scope.onSmallCardTouched = function(e){
                    //if Ionic
                    if (scope.clickEvent == 'touch'){
                        onSmallCardSelected(e);
                    }
                };

                scope.onLargeCardClicked = function(e){
                    //if Angular only
                    if (scope.clickEvent == 'click'){
                        onLargeCardSelected(e);
                    }
                };

                scope.onLargeCardTouched = function(e){
                    //if Ionic
                    if (scope.clickEvent == 'touch'){
                        onLargeCardSelected(e);
                    }
                };

                var getRandomNumberForId = function(){
                    return parseInt((Math.random() * (1000000 - 1 + 1)), 10) + 1;
                };

                //If suffix input not given use a random number
                scope.directiveSuffix = (scope.suffix)? scope.suffix : getRandomNumberForId();

                var newSmallCardStyle = angular.element(scope.smallCardDOMElement).attr("style");

                if (!newSmallCardStyle){
                    newSmallCardStyle = "";
                }

                //Set small card width if have input
                if (scope.smallCardWidth){
                    newSmallCardStyle = newSmallCardStyle + "width: " + scope.smallCardWidth + ";";
                }

                //Set small card height if have input
                if (scope.smallCardHeight){
                    newSmallCardStyle = newSmallCardStyle + "height: " + scope.smallCardHeight + ";";
                }

                angular.element(scope.smallCardDOMElement).attr("style", newSmallCardStyle);

                //Check if ionic is installed and if so modify events to use on-touch instead of ng-click. faster
                scope.clickEvent = 'click';
                //noinspection JSUnresolvedVariable
                if (typeof ionic !== 'undefined' && !isTesting) { //Might need to comment this out if fails build on angular only machine
                    scope.clickEvent = 'touch';
                }
                if (scope.cardControl) {
                    scope.cardControl.flipToLarge = function (transitionSpeed) {
                        onSmallCardSelected(null, transitionSpeed);
                    };

                    scope.cardControl.flipToSmall = function (transitionSpeed) {
                        onLargeCardSelected(null, transitionSpeed);
                    };
                }
            },
            template:
            '<!--suppress ALL --><div class="fmp-card-small" id="fmp-card-small-{{directiveSuffix}}" ng-click="onSmallCardClicked($event)" on-touch="onSmallCardTouched($event)">' +
            '<div class="fmp-card fmp-card-small-image" ng-style="{\'background-image\':\'url(\'+ image +\')\'}">' +
            '<div class="card-caption"><div ng-bind="frontCaption"></div></div>' +
            '</div>' +
            '</div>' +
            '<!--suppress ALL --><div class="fmp-card-large" id="fmp-card-large-{{directiveSuffix}}" ng-click="onLargeCardClicked($event)" on-touch="onLargeCardTouched($event)">' +
            '<div class="fmp-card fmp-flipper">' +
            '<div class="fmp-card-front-large fmp-paper" ng-style="{\'background-image\':\'url(\'+ image +\')\'}">' +
                //'<div ng-bind="frontCaption"></div>' +
            '</div>' +
            '<div class="fmp-card-back" ng-transclude></div>' +
            '</div>' +
            '</div>'
        };
    });

    /*jjEyelashes.directive('product-card', ['$animate', function($animate){
     return function(scope, element, attrs){
     element.hover(
     function(){
     $animate.addClass(element, 'animate');
     $animate.$('div.carouselNext, div.carouselPrev').addClass('visible');
     },
     function(){
     $animate.removeClass(element, 'animate');
     });

     };

     // Flip card to the back side
     $('#view_details').click(function(){
     $('div.carouselNext, div.carouselPrev').removeClass('visible');
     $('#product-card').addClass('flip-10');
     setTimeout(function(){
     $('#product-card').removeClass('flip-10').addClass('flip90').find('div.shadow').show().fadeTo( 80 , 1, function(){
     $('#product-front, #product-front div.shadow').hide();
     });
     }, 50);

     setTimeout(function(){
     $('#product-card').removeClass('flip90').addClass('flip190');
     $('#product-back').show().find('div.shadow').show().fadeTo( 90 , 0);
     setTimeout(function(){
     $('#product-card').removeClass('flip190').addClass('flip180').find('div.shadow').hide();
     setTimeout(function(){
     $('#product-card').css('transition', '100ms ease-out');
     $('#cx, #cy').addClass('s1');
     setTimeout(function(){$('#cx, #cy').addClass('s2');}, 100);
     setTimeout(function(){$('#cx, #cy').addClass('s3');}, 200);
     $('div.carouselNext, div.carouselPrev').addClass('visible');
     }, 100);
     }, 100);
     }, 150);
     });

     // Flip card back to the front side
     $('#flip-back').click(function(){

     $('#product-card').removeClass('flip180').addClass('flip190');
     setTimeout(function(){
     $('#product-card').removeClass('flip190').addClass('flip90');

     $('#product-back div.shadow').css('opacity', 0).fadeTo( 100 , 1, function(){
     $('#product-back, #product-back div.shadow').hide();
     $('#product-front, #product-front div.shadow').show();
     });
     }, 50);

     setTimeout(function(){
     $('#product-card').removeClass('flip90').addClass('flip-10');
     $('#product-front div.shadow').show().fadeTo( 100 , 0);
     setTimeout(function(){
     $('#product-front div.shadow').hide();
     $('#product-card').removeClass('flip-10').css('transition', '100ms ease-out');
     $('#cx, #cy').removeClass('s1 s2 s3');
     }, 100);
     }, 150);

     });


     /* ----  Image Gallery Carousel   ---- */
    /*}]);*/

// configure our routes using ui-router
    jjEyelashes.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider){
        'use strict';
        $urlRouterProvider.when("/locations", "/locations/madison")
            .otherwise('/home');
        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: 'views/page-home.html',
                controller: 'mainController'
            })
            .state('services', {
                url: '/services',
                templateUrl: 'views/page-services.html',
                controller: 'servicesController'
            })
            .state('products', {
                url: '/products',
                templateUrl: 'views/page-products.html',
                controller: 'productsController'
            })
            .state('locations', {
                url: '/locations',
                templateUrl: 'views/page-locations.html',
                controller: 'locationsController'
            })
            .state('locations.madison', {
                url: '/madison',
                templateUrl: 'views/child-locations-madison.html'
            })
            .state('locations.soho', {
                url: '/soho',
                templateUrl: 'views/child-locations-soho.html'
            })
            .state('locations.midtown', {
                url: '/midtown',
                templateUrl: 'views/child-locations-midtown.html'
            })
            .state('locations.heraldsquare', {
                url: '/heraldSquare',
                templateUrl: 'views/child-locations-heraldsquare.html'
            })
            .state('bookings', {
                url: '/bookings',
                templateUrl: 'views/page-bookings.html',
                controller: 'BookingsCtrl'
            });


    }]);
// create the controller and inject Angular's $scope
    jjEyelashes.controller('mainController', function ($scope, $interval, uiGmapGoogleMapApi) {
        'use strict';
        $scope.pageClass = 'page-home';
        $scope.scrollTo = function (target){

        };
        $scope.map = {
            center: {
                latitude: 45,
                longitude: -73
            },
            zoom: 8,
            options: {
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControl: false,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                    position: google.maps.ControlPosition.BOTTOM_CENTER
                },
                minZoom: 2,
                maxZoom: 20,
                panControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                },
                disableDefaultUI: true,
                styles: [{
                    featureType: "poi",
                    stylers: [{
                        visibility: "off"
                    }]
                },
                    {
                        elementType : 'labels',
                        stylers : [{
                            visibility : 'off'
                        }]
                    }],
                panControl: true,
                zoomControl: true,
                scaleControl: false,
                streetViewControl: false,
                overviewMapControl: false
            }
        };
        $scope.marker = {
            coords: {
                latitude: 45,
                longitude: -73
            },
            options: {
                draggable: true,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControl: false,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                    position: google.maps.ControlPosition.BOTTOM_CENTER
                },
                minZoom: 2,
                maxZoom: 20,
                panControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                },
                disableDefaultUI: true,
                styles: [{
                    featureType: "poi",
                    stylers: [{
                        visibility: "off"
                    }]
                },
                    {
                        elementType : 'labels',
                        stylers : [{
                            visibility : 'off'
                        }]
                    }],
                panControl: true,
                zoomControl: true,
                scaleControl: false,
                streetViewControl: false,
                overviewMapControl: false
            }
        };


        uiGmapGoogleMapApi.then(function(maps) {
            $scope.map = { center: { latitude: 45, longitude: -73 }, zoom: 8 };
            $scope.marker = {
                id: 0,
                coords: {
                    latitude: 45,
                    longitude: -73
                }
            };
        });

        $scope.leftBackText = '';
        $scope.rightBackText = 'This is the right cards back, you can place whatever you feel like';
    });
    jjEyelashes.controller('servicesController', function ($scope, $http) {
        'use strict';
        $scope.pageClass = 'page-services';
        $scope.projects=[{"id":1,"title":"P1"},{"id":2,"title":"P2"},{"id":3,"title":"P3"},{"id":4,"title":"P4"}];

    });
    jjEyelashes.controller('productsController', function ($scope) {
        'use strict';
        $scope.pageClass = 'page-products';
    });
    jjEyelashes.controller('locationsController', function ($scope, $window) {
        'use strict';
        //ng-animate pageClass reference
        $scope.pageClass = 'page-locations';
        //ng-route array TODO: Create templates via ui-router states instead of ng-router hashchanges;
        /*$scope.tabs = [
         { title:'Madison', content: 'Madison Square', active: true },
         { title:'Soho', content:'soho'},
         { title:'Midtown', content:'midtown'},
         { title:'Herald Square', content:'herald square'}
         ];*/

        //angular-ui tabs array
        $scope.tabData   = [
            {
                heading: 'Madison',
                route:   'locations.madison'
            },
            {
                heading: 'Soho',
                route:   'locations.soho'
            },
            {
                heading: 'Midtown',
                route: 'locations.midtown'
            },
            {
                heading: 'Herald Square',
                route: 'locations.heraldsquare'
            }
        ];



        $scope.model = {
            name: 'Tabs'
        };
    });
    jjEyelashes.controller('BookingsCtrl', ['$scope', function ($scope) {
        //self-reference
        var booking = this;
        //use closure to exspose self-reference
        var subConfig = function(){
            booking.submitPhone = submitPhone;
            //booking.phoneNumber = /^\+?\d{2}[- ]?\d{3}[- ]?\d{5}$/;
            //bind model to form input
            booking.model = {
                "phone": {
                    "first": "Gandalf",
                    "last": "The Gray"
                }

            };
            booking.fields = [
                {
                    key: 'phone',
                    type: 'input',
                    name: 'phone',
                    model: {
                        "first": "Gandalf",
                        "last": "The Gray"
                    },
                    templateOptions: {
                        label: 'Phone',
                        placeholder: 'add your phone number'
                    }
                }

            ]; //fields are an array
        };
        // scope variables here
        $scope.pageClass = 'page-bookings';

        // instantiate methods and data on scope here
        subConfig();


    }]);
// controllers of widgets
    jjEyelashes.controller('CarouselCtrl', function ($scope) {
        $scope.myInterval = 5000;
        $scope.noWrapSlides = false;
        $scope.active = 0;
        var slides = $scope.slides = [];
        var currIndex = 0;

        $scope.addSlide = function() {
            var newWidth = 1280 + slides.length + 1;
            slides.push({
                image: ['http://gdurl.com/YAXT', 'http://gdurl.com/0SCO', 'http://gdurl.com/t8eb'][slides.length % 3],
                text: ['Nice image','Awesome photograph','That is so cool'][slides.length % 3],
                id: currIndex++
            });
        };

        $scope.randomize = function() {
            var indexes = generateIndexesArray();
            assignNewIndexesToSlides(indexes);
        };

        for (var i = 0; i < 3; i++) {
            $scope.addSlide();
        }

        // Randomize logic below

        function assignNewIndexesToSlides(indexes) {
            for (var i = 0, l = slides.length; i < l; i++) {
                slides[i].id = indexes.pop();
            }
        }

        function generateIndexesArray() {
            var indexes = [];
            for (var i = 0; i < currIndex; ++i) {
                indexes[i] = i;
            }
            return shuffle(indexes);
        }

        // http://stackoverflow.com/questions/962802#962890
        function shuffle(array) {
            var tmp, current, top = array.length;

            if (top) {
                while (--top) {
                    current = Math.floor(Math.random() * (top + 1));
                    tmp = array[current];
                    array[current] = array[top];
                    array[top] = tmp;
                }
            }

            return array;
        }
    });
    jjEyelashes.controller('CarouselCtrlservices', function ($scope) {
        $scope.myInterval = 5000;
        $scope.noWrapSlides = false;
        $scope.active = 0;
        var slides = $scope.slides = [];
        var currIndex = 0;

        $scope.addSlide = function() {
            var newWidth = 1280 + slides.length + 1;
            slides.push({
                image: 'http://lorempixel.com/' + newWidth + '/451',
                text: ['Nice image','Awesome photograph','That is so cool','I love that'][slides.length % 3],
                id: currIndex++
            });
        };

        $scope.randomize = function() {
            var indexes = generateIndexesArray();
            assignNewIndexesToSlides(indexes);
        };

        for (var i = 0; i < 3; i++) {
            $scope.addSlide();
        }

        // Randomize logic below

        function assignNewIndexesToSlides(indexes) {
            for (var i = 0, l = slides.length; i < l; i++) {
                slides[i].id = indexes.pop();
            }
        }

        function generateIndexesArray() {
            var indexes = [];
            for (var i = 0; i < currIndex; ++i) {
                indexes[i] = i;
            }
            return shuffle(indexes);
        }

        // http://stackoverflow.com/questions/962802#962890
        function shuffle(array) {
            var tmp, current, top = array.length;

            if (top) {
                while (--top) {
                    current = Math.floor(Math.random() * (top + 1));
                    tmp = array[current];
                    array[current] = array[top];
                    array[top] = tmp;
                }
            }

            return array;
        }
    });
    jjEyelashes.controller('CarouselCtrltestimony', function ($scope) {
        $scope.myInterval = 5000;
        $scope.noWrapSlides = false;
        $scope.active = 0;
        var slides = $scope.slides = [];
        var currIndex = 0;

        $scope.addSlide = function() {
            var newWidth = 1280 + slides.length + 1;
            slides.push({
                image: ['http://gdurl.com/4Crk', 'http://gdurl.com/JePe', 'http://gdurl.com/k7CS'][slides.length % 3],
                header: ['"At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur ' +
                'a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat."', '"At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias ' +
                'consequatur aut perferendis doloribus asperiores repellat."', '"At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus ' +
                'maiores alias consequatur aut perferendis doloribus asperiores repellat."'][slides.length % 3],
                text: ['Client 1','Client 2','Client 3'][slides.length % 3],
                id: currIndex++
            });
        };


        $scope.randomize = function() {
            var indexes = generateIndexesArray();
            assignNewIndexesToSlides(indexes);
        };

        for (var i = 0; i < 3; i++) {
            $scope.addSlide();
        }

    });
    jjEyelashes.controller('ScrollCtrl', ['$scope', '$location', '$anchorScroll', function($scope, $location, $anchorScroll){
        $scope.disableSticking = false;
        $scope.gotoTop = function(){
            //set the location.hash to the id of
            // the element to scroll to...
            $location.hash('top');
            // call $anchorScroll();
            $anchorScroll();
        };
    }]);

}());


