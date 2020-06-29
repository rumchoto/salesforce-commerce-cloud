'use strict';

var Logger = require('dw/system/Logger');

/**
 * Feed Download Service
 *
 * This file acts as a wrapper for the TurnTo Feed Download Service calls
 */
/* API Modules */
var dwsvc = require('dw/svc');

/* Script Modules */
var ServiceFactory = require('~/cartridge/scripts/util/ServiceFactory');

/* Constants */
var serviceName = ServiceFactory.SERVICES.UPLOAD;

/**
 *
 * HTTP Services
 *
 */
var serviceConfig = {
    createRequest: function (service, requestDataContainer) {
        var request;

        service.URL = requestDataContainer.path;
        service.requestMethod = requestDataContainer.requestMethod;

        var client = service.getClient();
        client.setTimeout(-1);
        client.open("POST", requestDataContainer.path);
        result = client.sendMultiPart( requestDataContainer.args);
        Logger.error("result: " + result);
        Logger.error("text?: " + client.getText());
        Logger.error("text?: " + client.getStatusMessage());
        Logger.error("requestDataContainer: " + JSON.stringify(requestDataContainer));
        Logger.error("error?: " + client.getErrorText());
        client.close();

        return request;
    },
    parseResponse: function (service, response) {
        return response.text;
    },
    mockCall: function (service, request) {
        return {};
    },
    filterLogMessage: function (msg) {
        return msg;
    }
};

module.exports = dwsvc.LocalServiceRegistry.createService(serviceName, serviceConfig);
