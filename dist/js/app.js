/*!
 * angular-seed
 * 
 * 
 * @author 
 * @version 0.0.0
 * Copyright 2016. MIT licensed.
 */
// Declare app level module which depends on views, and components
var myApp = angular.module('myApp', [
  'ngRoute',
  'ui.bootstrap',
  'ngAnimate',
  'duParallax'
]);
// configure our routes
myApp.config( ['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider){
    $routeProvider

    // route for the home page
        .when('/', {
            templateUrl : 'views/page-home.html',
            controller  : 'mainController'
        })

        // route for the services page
        .when('/services', {
            templateUrl : 'views/page-services.html',
            controller  : 'servicesController'
        })

        // route for the products page
        .when('/products', {
            templateUrl : 'views/page-products.html',
            controller  : 'productsController'
        }).otherwise({redirectTo: '/'});

    //$locationProvider.html5Mode(true);


}]);

// create the controller and inject Angular's $scope
myApp.controller('mainController', function($scope, parallaxHelper) {
    'use strict';
    $scope.pageClass = 'page-home';
    $scope.background = parallaxHelper.createAnimator(-0.3);
});

myApp.controller('servicesController', function($scope) {
    'use strict';
    $scope.pageClass = 'page-services';
});

myApp.controller('productsController', function($scope) {
    'use strict';
    $scope.pageClass = 'page-products';
});


// controllers of widgets
myApp.controller('CarouselCtrl', function ($scope) {
    $scope.myInterval = 5000;
    $scope.noWrapSlides = false;
    $scope.active = 0;
    var slides = $scope.slides = [];
    var currIndex = 0;

    $scope.addSlide = function() {
        var newWidth = 1280 + slides.length + 1;
        slides.push({
            image: 'http://lorempixel.com/' + newWidth + '/632',
            text: ['Nice image','Awesome photograph','That is so cool','I love that'][slides.length % 5],
            id: currIndex++
        });
    };

    $scope.randomize = function() {
        var indexes = generateIndexesArray();
        assignNewIndexesToSlides(indexes);
    };

    for (var i = 0; i < 4; i++) {
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


