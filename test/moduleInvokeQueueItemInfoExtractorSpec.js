describe('moduleInvokeQueueItemInfoExtractor service', function() {
    'use strict';

    beforeEach(module('ngModuleIntrospector'));

    var moduleInvokeQueueItemInfoExtractor;

    beforeEach(inject(function(_moduleInvokeQueueItemInfoExtractor_) {
        moduleInvokeQueueItemInfoExtractor = _moduleInvokeQueueItemInfoExtractor_;
    }));



    describe('findProviderDeclarationOnInvokeQueue method', function() {

        var currentModule;

        beforeEach(function() {
            currentModule = angular.module('aTestingModule', []);
        });

        describe('for a declaration registered the regular way (using documented API)', function() {
            it('should return only non-constant declaration', function() {
                var service = {aServiceMethod: angular.noop};

                currentModule.value('aService', service);

                var providerDeclaration = moduleInvokeQueueItemInfoExtractor.findProviderDeclarationOnInvokeQueue(
                        null, currentModule,
                        {providerName: '$provide', providerMethods: ['value'], itemName: 'aService'});

                expect(providerDeclaration).toEqual({providerMethod: 'value', declaration: service});
            });

            it('should return last non-constant declaration where more than one is registered', function() {
                var valueDeclaration = {};
                var factoryDeclaration = function() {};

                currentModule.value('aService', valueDeclaration);
                currentModule.factory('aService', factoryDeclaration);

                var providerDeclaration = moduleInvokeQueueItemInfoExtractor.findProviderDeclarationOnInvokeQueue(
                        null, currentModule,
                        {providerName: '$provide', providerMethods: ['value', 'factory'], itemName: 'aService'});

                expect(providerDeclaration).toEqual({providerMethod: 'factory', declaration: factoryDeclaration});
            });

            it('should return first constant declaration', function() {
                var firstConstantDeclaration = {};
                var secondConstantDeclaration = {};

                currentModule.constant('aService', firstConstantDeclaration);
                currentModule.constant('aService', secondConstantDeclaration);

                var providerDeclaration = moduleInvokeQueueItemInfoExtractor.findProviderDeclarationOnInvokeQueue(
                        null, currentModule,
                        {providerName: '$provide', providerMethods: ['constant'], itemName: 'aService'});

                expect(providerDeclaration)
                    .toEqual({providerMethod: 'constant', declaration: firstConstantDeclaration});
            });
        });



        describe('for a declaration registered using a map (using non-documented API)', function() {
            it('should return only non-constant declaration', function() {
                var service = {aServiceMethod: angular.noop};

                currentModule.value({anotherService: {}, aService: service});

                var providerDeclaration = moduleInvokeQueueItemInfoExtractor.findProviderDeclarationOnInvokeQueue(
                        null, currentModule,
                        {providerName: '$provide', providerMethods: ['value'], itemName: 'aService'});

                expect(providerDeclaration).toEqual({providerMethod: 'value', declaration: service});
            });

            it('should return last non-constant declaration where more than one is registered', function() {
                var valueDeclaration = {};
                var factoryDeclaration = function() {};

                currentModule.value({anotherService1: {}, aService: valueDeclaration});
                currentModule.factory({anotherService2: angular.noop, aService: factoryDeclaration});

                var providerDeclaration = moduleInvokeQueueItemInfoExtractor.findProviderDeclarationOnInvokeQueue(
                        null, currentModule,
                        {providerName: '$provide', providerMethods: ['value', 'factory'], itemName: 'aService'});

                expect(providerDeclaration).toEqual({providerMethod: 'factory', declaration: factoryDeclaration});
            });

            it('should return first constant declaration', function() {
                var firstConstantDeclaration = {};
                var secondConstantDeclaration = {};

                currentModule.constant({anotherService1: {}, aService: firstConstantDeclaration});
                currentModule.constant({anotherService2: {}, aService: secondConstantDeclaration});

                var providerDeclaration = moduleInvokeQueueItemInfoExtractor.findProviderDeclarationOnInvokeQueue(
                        null, currentModule,
                        {providerName: '$provide', providerMethods: ['constant'], itemName: 'aService'});

                expect(providerDeclaration)
                    .toEqual({providerMethod: 'constant', declaration: firstConstantDeclaration});
            });

        });
    });



    describe('findInvokeQueueItemInfoRecursive method', function() {

        function invokeFindInvokeQueueItemInfoForService(serviceName) {
            return moduleInvokeQueueItemInfoExtractor.findInvokeQueueItemInfo(
                    module, '$provide', ['provider', 'factory', 'service', 'value', 'constant'], serviceName);
        }


        /** @const */
        var originalService = Object.freeze({original: 'service'});
        /** @const */
        var overriddenService = Object.freeze({overridden: 'service'});


        var anotherModule;
        var module;

        beforeEach(function() {
            anotherModule = angular.module('anotherModule', []);
            module = angular.module('aModule', [anotherModule.name]);
        });


        it('should return null for an original service from the (built-in) "ng" module', function() {
            module = angular.module('aModule', []);

            var result = invokeFindInvokeQueueItemInfoForService('$http');

            expect(result).toBeNull();
        });

        it('should return overridden service declared in your own module for a (built-in) service (of the "ng" ' +
                'module)', function() {
            module = angular.module('aModule', []);
            module.value('$http', overriddenService);

            var result = invokeFindInvokeQueueItemInfoForService('$http');

            expect(result).toEqual({module: module, providerMethod: 'value', declaration: overriddenService});
        });

        it('should return overridden service when (built-in) "ng" module service was overridden in another module ' +
                ' used by your own module', function() {
            anotherModule.value('$http', overriddenService);

            var result = invokeFindInvokeQueueItemInfoForService('$http');

            expect(result).toEqual({module: anotherModule, providerMethod: 'value', declaration: overriddenService});
        });

        it('should return overridden constant service for original constant service from another module', function() {
            anotherModule.constant('aService', originalService);
            module.constant('aService', overriddenService);

            var result = invokeFindInvokeQueueItemInfoForService('aService');

            expect(result).toEqual({module: module, providerMethod: 'constant', declaration: overriddenService});
        });

        it('should return original constant service for overridden non-constant service from another ' +
                'module', function() {
            anotherModule.constant('aService', originalService);
            module.value('aService', overriddenService);

            var result = invokeFindInvokeQueueItemInfoForService('aService');

            expect(result).toEqual({module: anotherModule, providerMethod: 'constant', declaration: originalService});
        });

        it('should return original constant service for overridden non-constant service in the same ' +
                'module', function() {
            module.constant('aService', originalService);
            module.value('aService', overriddenService);

            var result = invokeFindInvokeQueueItemInfoForService('aService');

            expect(result).toEqual({module: module, providerMethod: 'constant', declaration: originalService});
        });

        it('should return overridden constant service for original constant service from another module', function() {
            anotherModule.constant('aService', originalService);
            module.constant('aService', overriddenService);

            var result = invokeFindInvokeQueueItemInfoForService('aService');

            expect(result).toEqual({module: module, providerMethod: 'constant', declaration: overriddenService});
        });

        it('should return overridden non-constant service for original non-constant service from another ' +
                'module', function() {
            anotherModule.value('aService', originalService);
            module.value('aService', overriddenService);

            var result = invokeFindInvokeQueueItemInfoForService('aService');

            expect(result).toEqual({module: module, providerMethod: 'value', declaration: overriddenService});
        });

        it('should return overridden constant service for original non-constant service from another ' +
                'module', function() {
            anotherModule.value('aService', originalService);
            module.constant('aService', overriddenService);

            var result = invokeFindInvokeQueueItemInfoForService('aService');

            expect(result).toEqual({module: module, providerMethod: 'constant', declaration: overriddenService});
        });

        it('should return overridden non-constant service for original non-constant service from same ' +
                'module', function() {
            module.value('aService', originalService);
            module.value('aService', overriddenService);

            var result = invokeFindInvokeQueueItemInfoForService('aService');

            expect(result).toEqual({module: module, providerMethod: 'value', declaration: overriddenService});
        });

        it('should return original constant service for overridden constant service from same module', function() {
            module.constant('aService', originalService);
            module.constant('aService', overriddenService);

            var result = invokeFindInvokeQueueItemInfoForService('aService');

            expect(result).toEqual({module: module, providerMethod: 'constant', declaration: originalService});
        });
    });
});
