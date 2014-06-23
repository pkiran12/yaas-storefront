'use strict';

angular.module('ds.products')
    .controller('BrowseProductsCtrl', [ '$scope', 'ProductSvc', 'PriceSvc', 'GlobalData', function ($scope, ProductSvc, PriceSvc, GlobalData) {


        $scope.pageSize = 10;
        $scope.pageNumber = 1;
        $scope.sort = '';
        $scope.products = [];
        $scope.total = GlobalData.products.meta.total;
        $scope.productsFrom = 1;
        $scope.productsTo = $scope.pageSize;
        $scope.prices = {};

        $scope.addMore = function () {
            var query = {
                pageNumber: $scope.pageNumber++,
                pageSize: $scope.pageSize
            };

            if ($scope.sort) {
                query.sort = $scope.sort;
            }

            //we only want to show published products on this list
            query.q = 'published:true';

            // prevent additional API calls if all products are retrieved
            // invfinite scroller initiates lots of API calls when scrolling to the bottom of the page
            if (!GlobalData.products.meta.total || $scope.products.length < GlobalData.products.meta.total) {
                ProductSvc.queryWithResultHandler(query,
                    function (products) {
                        if (products) {
                            $scope.products = $scope.products.concat(products);
                            $scope.productsTo = $scope.products.length;
                            $scope.total = GlobalData.products.meta.total;
                            var productIds = $.map(products, function(product) {
                                return product.id;
                            });
                            var queryPrices = {
                                q: "productId:(" + productIds + ")"
                            };

                            PriceSvc.queryWithResultHandler(queryPrices,
                                function (pricesResponse) {
                                    if(pricesResponse) {
                                        var prices = pricesResponse.prices;
                                        var pricesMap = {};

                                        prices.forEach(function(price){
                                            pricesMap[price.productId] = price;
                                        });

                                        $scope.prices = $.extend($scope.prices, pricesMap);
                                    }
                                }
                            );
                        }
                    });
            }
        };

        // trigger initial load of items
        $scope.addMore();

        $scope.backToTop = function () {
            window.scrollTo(0, 0);
        };


        $scope.setSortedPage = function (pageNo) {

            $scope.products = [];
            $scope.pageNumber = pageNo;
            $scope.addMore();
        };

        $scope.showRefineContainer = function () {
            $scope.refineContainerShowing = !$scope.refineContainerShowing;
        };

    }]);
